package com.collegedate.app.data.discovery

import com.collegedate.app.data.profile.ProfileCardDto
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import javax.inject.Inject
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseDiscoveryRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
) : DiscoveryRemoteDataSource {
    override suspend fun fetchDiscoveryProfiles(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): List<DiscoveryProfileCard> {
        val safeLimit = limit.coerceIn(1, 50)
        val safeOffset = offset.coerceAtLeast(0)
        return supabaseClient.postgrest
            .rpc(
                "get_discovery_profiles",
                buildJsonObject {
                    put("p_limit", safeLimit)
                    put("p_offset", safeOffset)
                    put("p_filters", filters.toRpcJson())
                },
            )
            .decodeList<ProfileCardDto>()
            .map { it.toDiscoveryCard() }
    }
}

private fun DiscoveryFilters.toRpcJson(): JsonObject =
    buildJsonObject {
        university?.trim()?.takeIf { it.isNotBlank() && it != "All" }?.let { put("university", it) }
        gender?.trim()?.takeIf { it.isNotBlank() && it != "All" }?.let { put("gender", it) }
        if (liveOnly) put("live_only", true)
    }
