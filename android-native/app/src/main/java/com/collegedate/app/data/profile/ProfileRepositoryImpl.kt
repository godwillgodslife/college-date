package com.collegedate.app.data.profile

import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedDiscoveryProfileDao
import com.collegedate.app.core.database.dao.CachedProfileDao
import com.collegedate.app.core.database.entity.CachedProfileEntity
import com.collegedate.app.domain.profile.EditableProfile
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.ProfilePhoto
import com.collegedate.app.domain.profile.University
import com.collegedate.app.domain.profile.UniversityCatalog
import com.collegedate.app.domain.profile.UserProfile
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    private val remoteDataSource: ProfileRemoteDataSource,
    private val cachedProfileDao: CachedProfileDao,
    private val cachedDiscoveryProfileDao: CachedDiscoveryProfileDao,
    private val dispatchersProvider: DispatchersProvider,
) : ProfileRepository {
    override fun observeCachedProfile(profileId: String): Flow<UserProfile?> =
        cachedProfileDao.observeProfile(profileId).map { it?.toDomain() }

    override suspend fun refreshCurrentUserProfile(profileId: String): OperationResult<UserProfile?> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.fetchCurrentUserProfile()?.also { profile ->
                    cachedProfileDao.upsert(profile.toEntity())
                }
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    val cachedProfile = if (throwable is IOException) {
                        cachedProfileDao.profileSnapshot(profileId)?.toDomain()
                    } else {
                        null
                    }
                    if (cachedProfile != null) {
                        OperationResult.Success(cachedProfile)
                    } else {
                        profileLoadFailure(throwable)
                    }
                },
            )
        }

    override suspend fun refreshCurrentUserProfile(): OperationResult<UserProfile?> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.fetchCurrentUserProfile()?.also { profile ->
                    cachedProfileDao.upsert(profile.toEntity())
                }
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure =(::profileLoadFailure),
            )
        }

    override suspend fun updateCurrentProfile(profile: EditableProfile): OperationResult<UserProfile> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.updateCurrentProfile(profile).also { updated ->
                    cachedProfileDao.upsert(updated.toEntity())
                }
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    OperationResult.Failure(
                        if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                        "Unable to save profile changes.",
                    )
                },
            )
        }

    override suspend fun completeOnboarding(profile: EditableProfile): OperationResult<UserProfile> =
        updateCurrentProfile(profile.copy(isOnboarded = true))

    override suspend fun uploadProfilePhoto(
        ownerUserId: String,
        bytes: ByteArray,
        contentType: String,
    ): OperationResult<ProfilePhoto> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.uploadProfilePhoto(ownerUserId, bytes, contentType)
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    OperationResult.Failure(
                        if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                        throwable.message ?: "Unable to upload profile photo.",
                    )
                },
            )
        }

    override fun searchUniversities(query: String): List<University> =
        UniversityCatalog.search(query)

    override suspend fun clearLocalProfile(profileId: String) {
        withContext(dispatchersProvider.io) {
            cachedProfileDao.delete(profileId)
        }
    }

    override suspend fun clearAllLocalProfiles() {
        withContext(dispatchersProvider.io) {
            cachedProfileDao.clear()
            cachedDiscoveryProfileDao.clear()
        }
    }

    private fun profileLoadFailure(throwable: Throwable): OperationResult.Failure =
        OperationResult.Failure(
            if (throwable is IOException) FailureType.Network else FailureType.Unknown,
            "Unable to load profile state.",
        )

    private fun CachedProfileEntity.toDomain(): UserProfile =
        UserProfile(
            id = id,
            displayName = displayName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded,
            email = email,
            gender = gender,
            age = age,
            university = university,
            bio = bio,
            phone = phone,
            photos = decodeList(photosJson),
            profilePhotos = decodeList(profilePhotosJson),
            interests = decodeList(interestsJson),
            faculty = faculty,
            department = department,
            level = level,
            mbti = mbti,
            attractionGoal = attractionGoal,
            interestGender = interestGender,
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            locationStatus = locationStatus,
            isVerified = isVerified,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
        )

    private fun UserProfile.toEntity(): CachedProfileEntity =
        CachedProfileEntity(
            id = id,
            displayName = displayName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded,
            cachedAtMillis = System.currentTimeMillis(),
            email = email,
            gender = gender,
            age = age,
            university = university,
            bio = bio,
            phone = phone,
            photosJson = Json.encodeToString(photos),
            profilePhotosJson = Json.encodeToString(profilePhotos),
            interestsJson = Json.encodeToString(interests),
            faculty = faculty,
            department = department,
            level = level,
            mbti = mbti,
            attractionGoal = attractionGoal,
            interestGender = interestGender,
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            locationStatus = locationStatus,
            isVerified = isVerified,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
        )

    private fun decodeList(value: String): List<String> =
        runCatching {
            Json.decodeFromString<List<String>>(value)
        }.getOrDefault(emptyList()).filterNot(String::isBlank)
}
