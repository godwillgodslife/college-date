package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.UserProfile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import javax.inject.Inject

class SupabaseProfileRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
) : ProfileRemoteDataSource {
    override suspend fun fetchCurrentUserProfile(profileId: String): UserProfile? =
        supabaseClient
            .from("profiles")
            .select(columns = Columns.raw("id,name,username,avatar_url,is_onboarded")) {
                filter {
                    eq("id", profileId)
                }
            }
            .decodeList<ProfileDto>()
            .firstOrNull()
            ?.toDomain()
}
