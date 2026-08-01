package com.collegedate.app.domain.profile

import com.collegedate.app.core.common.OperationResult
import kotlinx.coroutines.flow.Flow

interface ProfileRepository {
    fun observeCachedProfile(profileId: String): Flow<UserProfile?>
    suspend fun refreshCurrentUserProfile(profileId: String): OperationResult<UserProfile?>
    suspend fun clearLocalProfile(profileId: String)
    suspend fun clearAllLocalProfiles()
}
