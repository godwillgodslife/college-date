package com.collegedate.app.data.discovery

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedDiscoveryProfileDao
import com.collegedate.app.core.database.entity.CachedDiscoveryProfileEntity
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DiscoveryRepositoryImplTest {
    private val dispatcher = StandardTestDispatcher()

    @Test
    fun refreshDiscoveryUsesRemoteAndCachesResults() = runTest(dispatcher) {
        val remote = FakeDiscoveryRemoteDataSource(listOf(card("profile-1")))
        val dao = FakeCachedDiscoveryProfileDao()
        val repository = repository(remote, dao)

        val result = repository.refreshDiscovery(limit = 20, offset = 0)

        assertTrue(result is OperationResult.Success)
        assertEquals("profile-1", dao.rows.value.first().id)
        assertEquals(1, (result as OperationResult.Success).value.nextOffset)
    }

    @Test
    fun refreshDiscoveryReturnsCachedProfilesOnNetworkFailure() = runTest(dispatcher) {
        val dao = FakeCachedDiscoveryProfileDao()
        repository(FakeDiscoveryRemoteDataSource(listOf(card("cached-1"))), dao)
            .refreshDiscovery(limit = 20, offset = 0)
        val repository = repository(
            FakeDiscoveryRemoteDataSource(error = IOException("offline")),
            dao,
        )

        val result = repository.refreshDiscovery(limit = 20, offset = 0)

        assertTrue(result is OperationResult.Success)
        val page = (result as OperationResult.Success).value
        assertTrue(page.servedFromCache)
        assertEquals("cached-1", page.profiles.first().id)
    }

    private fun repository(
        remote: DiscoveryRemoteDataSource,
        dao: FakeCachedDiscoveryProfileDao,
    ) = DiscoveryRepositoryImpl(
        remoteDataSource = remote,
        cachedDiscoveryProfileDao = dao,
        dispatchersProvider = TestDispatchersProvider(dispatcher),
    )
}

private class FakeDiscoveryRemoteDataSource(
    private val profiles: List<DiscoveryProfileCard> = emptyList(),
    private val error: Throwable? = null,
) : DiscoveryRemoteDataSource {
    override suspend fun fetchDiscoveryProfiles(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): List<DiscoveryProfileCard> {
        error?.let { throw it }
        return profiles
    }
}

private class FakeCachedDiscoveryProfileDao : CachedDiscoveryProfileDao {
    val rows = MutableStateFlow<List<CachedDiscoveryProfileEntity>>(emptyList())

    override fun observeProfiles(): Flow<List<CachedDiscoveryProfileEntity>> = rows

    override suspend fun profilesSnapshot(): List<CachedDiscoveryProfileEntity> = rows.value

    override suspend fun upsertAll(profiles: List<CachedDiscoveryProfileEntity>) {
        rows.value = (rows.value.filterNot { existing -> profiles.any { it.id == existing.id } } + profiles)
            .sortedBy { it.sortIndex }
    }

    override suspend fun delete(profileId: String) {
        rows.value = rows.value.filterNot { it.id == profileId }
    }

    override suspend fun clear() {
        rows.value = emptyList()
    }
}

private fun card(id: String): DiscoveryProfileCard =
    DiscoveryProfileCard(
        id = id,
        displayName = "Ada",
        username = "ada",
        gender = "female",
        age = 21,
        university = "University of Lagos (UNILAG)",
        faculty = null,
        department = "Law",
        level = "300 Level",
        bio = "Campus reader.",
        avatarUrl = "https://example.com/photo.jpg",
        photos = emptyList(),
        profilePhotos = listOf("https://example.com/photo.jpg"),
        interests = listOf("Music", "Tech", "Foodie"),
        introPrompt = null,
        voiceIntroUrl = null,
        anthem = null,
        attractionGoal = "Serious",
        isVerified = false,
        completionScore = 80,
        lastSeenAt = null,
        lastActive = null,
        isLive = false,
        isBoosted = false,
        seenCount = 0,
    )
