package com.collegedate.app.data.matching

import com.collegedate.app.data.profile.ProfileCardDto
import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeDirection
import com.collegedate.app.domain.matching.SwipeResult
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import javax.inject.Inject
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseMatchingRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
) : MatchingRemoteDataSource {
    override suspend fun submitSwipe(action: SwipeAction): SwipeResult {
        val response = supabaseClient.postgrest
            .rpc(
                "record_profile_swipe",
                buildJsonObject {
                    put("p_target_id", action.targetProfileId)
                    put("p_direction", action.direction.backendValue)
                    put("p_swipe_type", "standard")
                    put("p_message_teaser", JsonNull)
                    put("p_client_operation_id", action.clientOperationId)
                },
            )
            .decodeAs<SwipeResultDto>()

        return response.toDomain(action)
    }

    override suspend fun getMatchedProfile(profileId: String): MatchedProfile =
        supabaseClient.postgrest
            .rpc(
                "get_matched_profile",
                buildJsonObject {
                    put("p_profile_id", profileId)
                },
            )
            .decodeList<ProfileCardDto>()
            .first()
            .toMatchedProfile()
}

@Serializable
private data class SwipeResultDto(
    val success: Boolean? = null,
    @kotlinx.serialization.SerialName("swipe_id") val swipeId: String? = null,
    @kotlinx.serialization.SerialName("is_match") val isMatch: Boolean? = null,
    @kotlinx.serialization.SerialName("match_id") val matchId: String? = null,
    val direction: String? = null,
    val error: String? = null,
    val code: String? = null,
) {
    fun toDomain(action: SwipeAction): SwipeResult =
        SwipeResult(
            success = success == true,
            direction = direction.toSwipeDirection() ?: action.direction,
            targetProfileId = action.targetProfileId,
            swipeId = swipeId,
            isMatch = isMatch == true,
            matchId = matchId,
            errorCode = code,
            message = error,
        )
}

private fun String?.toSwipeDirection(): SwipeDirection? =
    when (this?.lowercase()) {
        "right" -> SwipeDirection.Like
        "left" -> SwipeDirection.Pass
        else -> null
    }
