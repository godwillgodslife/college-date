package com.collegedate.app.data.profile

import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedProfileDao
import com.collegedate.app.core.database.entity.CachedProfileEntity
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.UserProfile
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    private val remoteDataSource: ProfileRemoteDataSource,
    private val cachedProfileDao: CachedProfileDao,
    private val dispatchersProvider: DispatchersProvider,
) : ProfileRepository {
    override fun observeCachedProfile(profileId: String): Flow<UserProfile?> =
        cachedProfileDao.observeProfile(profileId).map { it?.toDomain() }

    override suspend fun refreshCurrentUserProfile(profileId: String): OperationResult<UserProfile?> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.fetchCurrentUserProfile(profileId)?.also { profile ->
                    cachedProfileDao.upsert(profile.toEntity())
                }
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    OperationResult.Failure(
                        if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                        "Unable to load profile state.",
                    )
                },
            )
        }

    override suspend fun clearLocalProfile(profileId: String) {
        withContext(dispatchersProvider.io) {
            cachedProfileDao.delete(profileId)
        }
    }

    override suspend fun clearAllLocalProfiles() {
        withContext(dispatchersProvider.io) {
            cachedProfileDao.clear()
        }
    }

    private fun CachedProfileEntity.toDomain(): UserProfile =
        UserProfile(
            id = id,
            displayName = displayName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded,
        )

    private fun UserProfile.toEntity(): CachedProfileEntity =
        CachedProfileEntity(
            id = id,
            displayName = displayName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded,
            cachedAtMillis = System.currentTimeMillis(),
        )
}
