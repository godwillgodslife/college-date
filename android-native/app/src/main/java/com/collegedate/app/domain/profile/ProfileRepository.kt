package com.collegedate.app.domain.profile

import com.collegedate.app.core.common.OperationResult
import kotlinx.coroutines.flow.Flow

interface ProfileRepository {
    fun observeCachedProfile(profileId: String): Flow<UserProfile?>
    suspend fun refreshCurrentUserProfile(profileId: String): OperationResult<UserProfile?>
    suspend fun refreshCurrentUserProfile(): OperationResult<UserProfile?>
    suspend fun updateCurrentProfile(profile: EditableProfile): OperationResult<UserProfile>
    suspend fun completeOnboarding(profile: EditableProfile): OperationResult<UserProfile>
    suspend fun uploadProfilePhoto(
        ownerUserId: String,
        bytes: ByteArray,
        contentType: String,
    ): OperationResult<ProfilePhoto>

    fun searchUniversities(query: String): List<University>
    suspend fun clearLocalProfile(profileId: String)
    suspend fun clearAllLocalProfiles()
}
