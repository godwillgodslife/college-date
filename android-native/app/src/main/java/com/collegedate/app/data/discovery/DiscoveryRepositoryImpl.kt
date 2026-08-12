package com.collegedate.app.data.discovery

import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedDiscoveryProfileDao
import com.collegedate.app.core.database.entity.CachedDiscoveryProfileEntity
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryPage
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Singleton
class DiscoveryRepositoryImpl @Inject constructor(
    private val remoteDataSource: DiscoveryRemoteDataSource,
    private val cachedDiscoveryProfileDao: CachedDiscoveryProfileDao,
    private val dispatchersProvider: DispatchersProvider,
) : DiscoveryRepository {
    override fun observeCachedDiscovery(): Flow<DiscoveryPage> =
        cachedDiscoveryProfileDao.observeProfiles().map { profiles ->
            DiscoveryPage(
                profiles = profiles.map { it.toDomain() },
                pageSize = profiles.size,
                nextOffset = profiles.size,
                isEndReached = false,
                servedFromCache = true,
            )
        }

    override suspend fun refreshDiscovery(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): OperationResult<DiscoveryPage> =
        withContext(dispatchersProvider.io) {
            runCatching {
                val profiles = remoteDataSource.fetchDiscoveryProfiles(filters, limit, offset)
                if (offset == 0) cachedDiscoveryProfileDao.clear()
                cachedDiscoveryProfileDao.upsertAll(
                    profiles.mapIndexed { index, profile ->
                        profile.toEntity(sortIndex = offset + index)
                    },
                )
                DiscoveryPage(
                    profiles = profiles,
                    pageSize = limit,
                    nextOffset = offset + profiles.size,
                    isEndReached = profiles.size < limit,
                    servedFromCache = false,
                )
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    val cached = cachedDiscoveryProfileDao.profilesSnapshot().map { it.toDomain() }
                    if (cached.isNotEmpty()) {
                        OperationResult.Success(
                            DiscoveryPage(
                                profiles = cached,
                                pageSize = cached.size,
                                nextOffset = cached.size,
                                isEndReached = false,
                                servedFromCache = true,
                            ),
                        )
                    } else {
                        OperationResult.Failure(
                            if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                            if (throwable is IOException) {
                                "Discovery is unavailable offline."
                            } else {
                                "Unable to load discovery profiles."
                            },
                        )
                    }
                },
            )
        }

    override suspend fun invalidateProfile(profileId: String) {
        withContext(dispatchersProvider.io) {
            cachedDiscoveryProfileDao.delete(profileId)
        }
    }

    override suspend fun clearDiscoveryCache() {
        withContext(dispatchersProvider.io) {
            cachedDiscoveryProfileDao.clear()
        }
    }

    private fun CachedDiscoveryProfileEntity.toDomain(): DiscoveryProfileCard =
        DiscoveryProfileCard(
            id = id,
            displayName = displayName,
            username = username,
            gender = gender,
            age = age,
            university = university,
            faculty = faculty,
            department = department,
            level = level,
            bio = bio,
            avatarUrl = avatarUrl,
            photos = decodeList(photosJson),
            profilePhotos = decodeList(profilePhotosJson),
            interests = decodeList(interestsJson),
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            attractionGoal = attractionGoal,
            isVerified = isVerified,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
            isLive = isLive,
            isBoosted = isBoosted,
            seenCount = seenCount,
        )

    private fun DiscoveryProfileCard.toEntity(sortIndex: Int): CachedDiscoveryProfileEntity =
        CachedDiscoveryProfileEntity(
            id = id,
            displayName = displayName,
            username = username,
            gender = gender,
            age = age,
            university = university,
            faculty = faculty,
            department = department,
            level = level,
            bio = bio,
            avatarUrl = avatarUrl,
            photosJson = Json.encodeToString(photos),
            profilePhotosJson = Json.encodeToString(profilePhotos),
            interestsJson = Json.encodeToString(interests),
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            attractionGoal = attractionGoal,
            isVerified = isVerified,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
            isLive = isLive,
            isBoosted = isBoosted,
            seenCount = seenCount,
            sortIndex = sortIndex,
            cachedAtMillis = System.currentTimeMillis(),
        )

    private fun decodeList(value: String): List<String> =
        runCatching {
            Json.decodeFromString<List<String>>(value)
        }.getOrDefault(emptyList()).filterNot(String::isBlank)
}
