package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.EditableProfile
import com.collegedate.app.domain.profile.ProfilePhoto
import com.collegedate.app.domain.profile.UserProfile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import java.util.UUID
import javax.inject.Inject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import io.ktor.http.ContentType

class SupabaseProfileRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
) : ProfileRemoteDataSource {
    override suspend fun fetchCurrentUserProfile(): UserProfile? =
        supabaseClient.postgrest
            .rpc("get_current_profile")
            .decodeList<ProfileDto>()
            .firstOrNull()
            ?.toDomain()

    override suspend fun updateCurrentProfile(profile: EditableProfile): UserProfile =
        supabaseClient.postgrest
            .rpc(
                "update_current_profile",
                buildJsonObject {
                    put("p_profile", profile.toUpdatePayload())
                },
            )
            .decodeList<ProfileDto>()
            .first()
            .toDomain()

    override suspend fun uploadProfilePhoto(
        ownerUserId: String,
        bytes: ByteArray,
        contentType: String,
    ): ProfilePhoto {
        require(ownerUserId.isNotBlank()) { "Missing owner user id." }
        require(bytes.isNotEmpty()) { "Photo file is empty." }
        require(bytes.size <= MAX_PROFILE_PHOTO_BYTES) { "Photo must be 6 MB or smaller." }
        val extension = extensionFor(contentType)
        val path = "${ownerUserId.trim()}/${UUID.randomUUID()}.$extension"
        val bucket = supabaseClient.storage["profile-photos"]
        bucket.upload(path, bytes) {
            upsert = false
            this.contentType = ContentType.parse(contentType.ifBlank { "image/jpeg" })
        }
        return ProfilePhoto(
            url = bucket.publicUrl(path),
            path = path,
            isPrimary = false,
        )
    }

    private fun extensionFor(contentType: String): String =
        when (contentType.lowercase()) {
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "jpg"
        }

    private companion object {
        const val MAX_PROFILE_PHOTO_BYTES = 6 * 1024 * 1024
    }
}
