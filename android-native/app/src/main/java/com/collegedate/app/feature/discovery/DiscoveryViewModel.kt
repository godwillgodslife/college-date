package com.collegedate.app.feature.discovery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.network.ConnectivityObserver
import com.collegedate.app.core.network.NetworkStatus
import com.collegedate.app.data.discovery.DiscoveryRepository
import com.collegedate.app.data.matching.MatchingRepository
import com.collegedate.app.domain.discovery.DiscoveryFilters
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeDirection
import com.collegedate.app.domain.matching.SwipeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository,
    private val matchingRepository: MatchingRepository,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {
    private val _uiState = MutableStateFlow(DiscoveryUiState())
    val uiState: StateFlow<DiscoveryUiState> = _uiState.asStateFlow()
    private var hasFreshRemoteData = false

    init {
        viewModelScope.launch {
            discoveryRepository.observeCachedDiscovery().collect { page ->
                if (page.profiles.isNotEmpty() || !_uiState.value.isLoading) {
                    _uiState.update {
                        it.copy(
                            cards = page.profiles,
                            nextOffset = page.nextOffset,
                            servedFromCache = page.servedFromCache && !hasFreshRemoteData,
                        )
                    }
                }
            }
        }
        viewModelScope.launch {
            connectivityObserver.observe().collect { status ->
                val shouldRefresh =
                    status == NetworkStatus.Available &&
                        _uiState.value.isOffline &&
                        _uiState.value.servedFromCache &&
                        !_uiState.value.isLoading &&
                        !_uiState.value.isRefreshing
                _uiState.update { it.copy(isOffline = status == NetworkStatus.Unavailable) }
                if (shouldRefresh) refresh()
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = it.cards.isEmpty(), isRefreshing = it.cards.isNotEmpty(), error = null)
            }
            when (
                val result = discoveryRepository.refreshDiscovery(
                    filters = _uiState.value.filters,
                    limit = PAGE_SIZE,
                    offset = 0,
                )
            ) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, error = result.message)
                }

                is OperationResult.Success -> {
                    hasFreshRemoteData = !result.value.servedFromCache
                    _uiState.update {
                        it.copy(
                            cards = result.value.profiles,
                            isLoading = false,
                            isRefreshing = false,
                            nextOffset = result.value.nextOffset,
                            isEndReached = result.value.isEndReached,
                            servedFromCache = result.value.servedFromCache,
                        )
                    }
                }
            }
        }
    }

    fun loadNextPage() {
        val state = _uiState.value
        if (state.isRefreshing || state.isLoading || state.isEndReached || state.activeSwipeProfileId != null) return
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }
            when (
                val result = discoveryRepository.refreshDiscovery(
                    filters = state.filters,
                    limit = PAGE_SIZE,
                    offset = state.nextOffset,
                )
            ) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isRefreshing = false, error = result.message)
                }

                is OperationResult.Success -> {
                    hasFreshRemoteData = !result.value.servedFromCache
                    _uiState.update {
                        it.copy(
                            cards = (it.cards + result.value.profiles).distinctBy(DiscoveryProfileCard::id),
                            isRefreshing = false,
                            nextOffset = result.value.nextOffset,
                            isEndReached = result.value.isEndReached,
                            servedFromCache = result.value.servedFromCache,
                        )
                    }
                }
            }
        }
    }

    fun submitSwipe(direction: SwipeDirection) {
        val current = _uiState.value.cards.firstOrNull() ?: return
        if (_uiState.value.activeSwipeProfileId != null) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(activeSwipeProfileId = current.id, error = null, lastSwipeErrorProfileId = null)
            }
            when (
                val result = matchingRepository.submitSwipe(
                    SwipeAction(targetProfileId = current.id, direction = direction),
                )
            ) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(
                        activeSwipeProfileId = null,
                        error = result.message,
                        lastSwipeErrorProfileId = current.id,
                    )
                }

                is OperationResult.Success -> {
                    val swipeResult = result.value
                    _uiState.update {
                        it.copy(
                            cards = it.cards.dropWhile { card -> card.id == current.id },
                            activeSwipeProfileId = null,
                            matchDialog = swipeResult.takeIf(SwipeResult::isMatch)
                                ?.let { matched -> MatchDialogState(current, matched.matchId) },
                        )
                    }
                    if (_uiState.value.cards.size <= 3) loadNextPage()
                }
            }
        }
    }

    fun dismissMatchDialog() = _uiState.update { it.copy(matchDialog = null) }

    private companion object {
        const val PAGE_SIZE = 20
    }
}

data class DiscoveryUiState(
    val cards: List<DiscoveryProfileCard> = emptyList(),
    val filters: DiscoveryFilters = DiscoveryFilters(),
    val nextOffset: Int = 0,
    val isEndReached: Boolean = false,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isOffline: Boolean = false,
    val servedFromCache: Boolean = false,
    val activeSwipeProfileId: String? = null,
    val lastSwipeErrorProfileId: String? = null,
    val error: String? = null,
    val matchDialog: MatchDialogState? = null,
)

data class MatchDialogState(
    val profile: DiscoveryProfileCard,
    val matchId: String?,
)
