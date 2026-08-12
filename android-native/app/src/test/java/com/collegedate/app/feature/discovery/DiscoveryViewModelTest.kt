package com.collegedate.app.feature.discovery

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.network.ConnectivityObserver
import com.collegedate.app.core.network.NetworkStatus
import com.collegedate.app.core.testing.MainDispatcherRule
import com.collegedate.app.data.discovery.DiscoveryRepository
import com.collegedate.app.data.matching.MatchingRepository
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryPage
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeDirection
import com.collegedate.app.domain.matching.SwipeResult
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import io.mockk.every
import io.mockk.mockk

@OptIn(ExperimentalCoroutinesApi::class)
class DiscoveryViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(dispatcher)

    @Test
    fun refreshLoadsDiscoveryCards() = runTest(dispatcher) {
        val viewModel = viewModel(cards = listOf(discoveryCard("target-1")))

        assertEquals("target-1", viewModel.uiState.value.cards.first().id)
        assertNull(viewModel.uiState.value.error)
        assertFalse(viewModel.uiState.value.servedFromCache)
    }

    @Test
    fun cachedFallbackRemainsMarkedAsCached() = runTest(dispatcher) {
        val viewModel = viewModel(
            cards = listOf(discoveryCard("target-1")),
            remoteServedFromCache = true,
        )

        assertTrue(viewModel.uiState.value.servedFromCache)
    }

    @Test
    fun successfulLikeRemovesCardAndShowsMatchDialog() = runTest(dispatcher) {
        val viewModel = viewModel(
            cards = listOf(discoveryCard("target-1")),
            swipeResult = SwipeResult(
                success = true,
                direction = SwipeDirection.Like,
                targetProfileId = "target-1",
                isMatch = true,
                matchId = "match-1",
            ),
        )

        viewModel.submitSwipe(SwipeDirection.Like)

        assertEquals(0, viewModel.uiState.value.cards.size)
        assertNotNull(viewModel.uiState.value.matchDialog)
    }

    @Test
    fun failedSwipeKeepsCardInDeck() = runTest(dispatcher) {
        val viewModel = viewModel(
            cards = listOf(discoveryCard("target-1")),
            swipeFailure = OperationResult.Failure(
                type = com.collegedate.app.core.common.FailureType.Network,
                message = "Offline",
            ),
        )

        viewModel.submitSwipe(SwipeDirection.Pass)

        assertEquals("target-1", viewModel.uiState.value.cards.first().id)
        assertEquals("Offline", viewModel.uiState.value.error)
    }

    @Test
    fun validatedReconnectRefreshesCachedDiscovery() = runTest(dispatcher) {
        val connectivityStatus = MutableStateFlow(NetworkStatus.Unavailable)
        val connectivity = mockk<ConnectivityObserver>()
        every { connectivity.observe() } returns connectivityStatus
        val repository = FakeDiscoveryRepository(
            cards = listOf(discoveryCard("target-1")),
            remoteServedFromCache = true,
        )
        val viewModel = DiscoveryViewModel(
            discoveryRepository = repository,
            matchingRepository = FakeMatchingRepository(
                SwipeResult(true, SwipeDirection.Pass, "target-1"),
                null,
            ),
            connectivityObserver = connectivity,
        )

        assertTrue(viewModel.uiState.value.isOffline)
        assertTrue(viewModel.uiState.value.servedFromCache)
        repository.remoteServedFromCache = false
        connectivityStatus.value = NetworkStatus.Available

        assertFalse(viewModel.uiState.value.isOffline)
        assertFalse(viewModel.uiState.value.servedFromCache)
        assertEquals(2, repository.refreshCount)
    }

    private fun viewModel(
        cards: List<DiscoveryProfileCard>,
        swipeResult: SwipeResult = SwipeResult(true, SwipeDirection.Pass, cards.firstOrNull()?.id.orEmpty()),
        swipeFailure: OperationResult.Failure? = null,
        remoteServedFromCache: Boolean = false,
    ): DiscoveryViewModel {
        val connectivity = mockk<ConnectivityObserver>()
        every { connectivity.observe() } returns flowOf(NetworkStatus.Available)
        return DiscoveryViewModel(
            discoveryRepository = FakeDiscoveryRepository(cards, remoteServedFromCache),
            matchingRepository = FakeMatchingRepository(swipeResult, swipeFailure),
            connectivityObserver = connectivity,
        )
    }
}

private class FakeDiscoveryRepository(
    private val cards: List<DiscoveryProfileCard>,
    var remoteServedFromCache: Boolean,
) : DiscoveryRepository {
    private val cached = MutableStateFlow(DiscoveryPage(emptyList(), 20, 0, false, true))
    var refreshCount = 0

    override fun observeCachedDiscovery(): Flow<DiscoveryPage> = cached

    override suspend fun refreshDiscovery(
        filters: DiscoveryFilters,
        limit: Int,
        offset: Int,
    ): OperationResult<DiscoveryPage> {
        refreshCount += 1
        val page = DiscoveryPage(cards, limit, cards.size, cards.size < limit, remoteServedFromCache)
        cached.value = page.copy(servedFromCache = true)
        return OperationResult.Success(page)
    }

    override suspend fun invalidateProfile(profileId: String) {
        cached.value = cached.value.copy(profiles = cached.value.profiles.filterNot { it.id == profileId })
    }

    override suspend fun clearDiscoveryCache() {
        cached.value = cached.value.copy(profiles = emptyList())
    }
}

private class FakeMatchingRepository(
    private val swipeResult: SwipeResult,
    private val swipeFailure: OperationResult.Failure?,
) : MatchingRepository {
    override suspend fun submitSwipe(action: SwipeAction): OperationResult<SwipeResult> =
        swipeFailure ?: OperationResult.Success(swipeResult)

    override suspend fun getMatchedProfile(profileId: String): OperationResult<MatchedProfile> =
        OperationResult.Failure(com.collegedate.app.core.common.FailureType.Unknown, "Deferred")
}

private fun discoveryCard(id: String): DiscoveryProfileCard =
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
