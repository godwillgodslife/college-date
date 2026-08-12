package com.collegedate.app.data.discovery

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryPage
import kotlinx.coroutines.flow.Flow

interface DiscoveryRepository {
    fun observeCachedDiscovery(): Flow<DiscoveryPage>
    suspend fun refreshDiscovery(
        filters: DiscoveryFilters = DiscoveryFilters(),
        limit: Int = 20,
        offset: Int = 0,
    ): OperationResult<DiscoveryPage>

    suspend fun invalidateProfile(profileId: String)
    suspend fun clearDiscoveryCache()
}
