package com.collegedate.app.data.matching

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.data.discovery.DiscoveryRepository
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryPage
import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeDirection
import com.collegedate.app.domain.matching.SwipeResult
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MatchingRepositoryImplTest {
    private val dispatcher = StandardTestDispatcher()

    @Test
    fun submitSwipeSuccessInvalidatesDiscoveryProfile() = runTest(dispatcher) {
        val discovery = FakeDiscoveryRepository()
        val repository = repository(
            remote = FakeMatchingRemoteDataSource(
                swipeResult = SwipeResult(
                    success = true,
                    direction = SwipeDirection.Like,
                    targetProfileId = "target-1",
                    isMatch = true,
                    matchId = "match-1",
                ),
            ),
            discovery = discovery,
        )

        val result = repository.submitSwipe(SwipeAction("target-1", SwipeDirection.Like, "op-1"))

        assertTrue(result is OperationResult.Success)
        assertEquals("target-1", discovery.invalidatedProfileId)
    }

    @Test
    fun submitSwipeNetworkFailureReturnsSafeMessage() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeMatchingRemoteDataSource(error = IOException("timeout token abc")),
            discovery = FakeDiscoveryRepository(),
        )

        val result = repository.submitSwipe(SwipeAction("target-1", SwipeDirection.Pass, "op-1"))

        assertTrue(result is OperationResult.Failure)
        assertEquals(
            "Swipe will need a connection. Try again when you are online.",
            (result as OperationResult.Failure).message,
        )
    }

    @Test
    fun matchedProfileSuccessReturnsSafeProfileModel() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeMatchingRemoteDataSource(matchedProfile = matchedProfileFixture("target-1")),
            discovery = FakeDiscoveryRepository(),
        )

        val result = repository.getMatchedProfile("target-1")

        assertTrue(result is OperationResult.Success)
        assertEquals("target-1", (result as OperationResult.Success).value.id)
    }

    private fun repository(
        remote: MatchingRemoteDataSource,
        discovery: DiscoveryRepository,
    ) = MatchingRepositoryImpl(
        remoteDataSource = remote,
        discoveryRepository = discovery,
        dispatchersProvider = TestDispatchersProvider(dispatcher),
    )
}

private class FakeMatchingRemoteDataSource(
    private val swipeResult: SwipeResult? = null,
    private val matchedProfile: MatchedProfile? = null,
    private val error: Throwable? = null,
) : MatchingRemoteDataSource {
    override suspend fun submitSwipe(action: SwipeAction): SwipeResult {
        error?.let { throw it }
        return swipeResult ?: SwipeResult(
            success = true,
            direction = action.direction,
            targetProfileId = action.targetProfileId,
        )
    }

    override suspend fun getMatchedProfile(profileId: String): MatchedProfile {
        error?.let { throw it }
        return matchedProfile ?: matchedProfileFixture(profileId)
    }
}

private class FakeDiscoveryRepository : DiscoveryRepository {
    var invalidatedProfileId: String? = null

    override fun observeCachedDiscovery(): Flow<DiscoveryPage> =
        flowOf(DiscoveryPage(emptyList(), 20, 0, isEndReached = false, servedFromCache = true))

    override suspend fun refreshDiscovery(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): OperationResult<DiscoveryPage> =
        OperationResult.Success(DiscoveryPage(emptyList(), limit, offset, true, false))

    override suspend fun invalidateProfile(profileId: String) {
        invalidatedProfileId = profileId
    }

    override suspend fun clearDiscoveryCache() = Unit
}

private fun matchedProfileFixture(id: String): MatchedProfile =
    MatchedProfile(
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
    )
