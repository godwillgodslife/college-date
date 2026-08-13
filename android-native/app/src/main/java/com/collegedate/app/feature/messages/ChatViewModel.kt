package com.collegedate.app.feature.messages

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.network.ConnectivityObserver
import com.collegedate.app.core.network.NetworkStatus
import com.collegedate.app.data.messaging.MessagingRepository
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class ChatViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: MessagingRepository,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {
    val matchId: String = requireNotNull(savedStateHandle["matchId"])
    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()
    private var pendingNonce: String? = null
    private var realtimeJob: Job? = null

    init {
        viewModelScope.launch {
            _uiState.update { it.copy(currentUserId = repository.currentUserId()) }
        }
        viewModelScope.launch {
            repository.observeConversation(matchId).collect { conversation ->
                _uiState.update { it.copy(conversation = conversation) }
            }
        }
        viewModelScope.launch {
            repository.observeMessages(matchId).collect { messages ->
                _uiState.update { it.copy(messages = messages) }
            }
        }
        viewModelScope.launch {
            connectivityObserver.observe().collect { status ->
                val offline = status == NetworkStatus.Unavailable
                _uiState.update { it.copy(isOffline = offline) }
                if (!offline && realtimeJob == null) startRealtime()
                if (offline) {
                    realtimeJob?.cancel()
                    realtimeJob = null
                }
            }
        }
        refresh()
    }

    fun onDraftChange(value: String) {
        if (value.length <= MAX_MESSAGE_LENGTH) {
            if (value != _uiState.value.draft) pendingNonce = null
            _uiState.update { it.copy(draft = value, error = null) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.messages.isEmpty(), error = null) }
            when (val result = repository.refreshMessages(matchId)) {
                is OperationResult.Success -> {
                    _uiState.update { it.copy(isLoading = false) }
                    repository.markMessagesRead(matchId)
                    repository.refreshConversations()
                }
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
            }
        }
    }

    fun send() {
        val content = _uiState.value.draft.trim()
        if (content.isBlank() || _uiState.value.isSending || _uiState.value.isOffline) return
        val nonce = pendingNonce ?: UUID.randomUUID().toString().also { pendingNonce = it }
        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }
            when (val result = repository.sendTextMessage(matchId, content, nonce)) {
                is OperationResult.Success -> {
                    pendingNonce = null
                    _uiState.update { it.copy(draft = "", isSending = false) }
                    repository.refreshConversations()
                }
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isSending = false, error = result.message)
                }
            }
        }
    }

    private fun startRealtime() {
        realtimeJob = viewModelScope.launch {
            repository.observeRealtimeMessages(matchId).collect { message ->
                repository.cacheRealtimeMessage(message)
                val ownerId = repository.currentUserId()
                if (message.senderId != ownerId && !message.isRead) {
                    repository.markMessagesRead(matchId)
                }
                repository.refreshConversations()
            }
        }.also { job -> job.invokeOnCompletion { realtimeJob = null } }
    }

    private companion object {
        const val MAX_MESSAGE_LENGTH = 2000
    }
}

data class ChatUiState(
    val conversation: ConversationSummary? = null,
    val messages: List<ChatMessage> = emptyList(),
    val draft: String = "",
    val currentUserId: String? = null,
    val isLoading: Boolean = false,
    val isSending: Boolean = false,
    val isOffline: Boolean = false,
    val error: String? = null,
)
