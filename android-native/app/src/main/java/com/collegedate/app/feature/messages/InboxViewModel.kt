package com.collegedate.app.feature.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.network.ConnectivityObserver
import com.collegedate.app.core.network.NetworkStatus
import com.collegedate.app.data.messaging.MessagingRepository
import com.collegedate.app.domain.messaging.ConversationSummary
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class InboxViewModel @Inject constructor(
    private val repository: MessagingRepository,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {
    private val _uiState = MutableStateFlow(InboxUiState())
    val uiState: StateFlow<InboxUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.observeConversations().collect { conversations ->
                _uiState.update { it.copy(conversations = conversations) }
            }
        }
        viewModelScope.launch {
            connectivityObserver.observe().collect { status ->
                _uiState.update { it.copy(isOffline = status == NetworkStatus.Unavailable) }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.conversations.isEmpty(), isRefreshing = true, error = null) }
            when (val result = repository.refreshConversations()) {
                is OperationResult.Success -> _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false)
                }
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, error = result.message)
                }
            }
        }
    }
}

data class InboxUiState(
    val conversations: List<ConversationSummary> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isOffline: Boolean = false,
    val error: String? = null,
)
