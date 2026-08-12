package com.collegedate.app.data.discovery

import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryProfileCard

interface DiscoveryRemoteDataSource {
    suspend fun fetchDiscoveryProfiles(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): List<DiscoveryProfileCard>
}
