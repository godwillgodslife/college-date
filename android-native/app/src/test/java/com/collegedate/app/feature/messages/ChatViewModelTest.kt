package com.collegedate.app.feature.messages

import androidx.lifecycle.SavedStateHandle
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.network.ConnectivityObserver
import com.collegedate.app.core.network.NetworkStatus
import com.collegedate.app.core.testing.MainDispatcherRule
import com.collegedate.app.data.messaging.MessagingRepository
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import com.collegedate.app.domain.messaging.MessageType
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(dispatcher)

    @Test
    fun failedSendKeepsDraftAndReusesNonceOnRetry() = runTest(dispatcher) {
        val repository = FakeMessagingRepository(
            sendResults = ArrayDeque(
                listOf(
                    OperationResult.Failure(FailureType.Network, "Check your connection and try again."),
                    OperationResult.Success(message()),
                ),
            ),
        )
        val viewModel = viewModel(repository)

        viewModel.onDraftChange("Hello")
        viewModel.send()

        assertEquals("Hello", viewModel.uiState.value.draft)
        assertEquals("Check your connection and try again.", viewModel.uiState.value.error)

        viewModel.send()

        assertEquals("", viewModel.uiState.value.draft)
        assertEquals(2, repository.nonces.size)
        assertEquals(repository.nonces[0], repository.nonces[1])
    }

    @Test
    fun incomingRealtimeMessageIsCachedAndMarkedRead() = runTest(dispatcher) {
        val repository = FakeMessagingRepository()
        val viewModel = viewModel(repository)
        repository.realtime.emit(message().copy(senderId = "other-1"))

        assertEquals(1, repository.cachedRealtimeMessages.size)
        assertTrue(repository.markReadCalls > 0)
        assertFalse(viewModel.uiState.value.isOffline)
    }

    @Test
    fun offlineStateDisablesRealtimeCollectionButKeepsCachedMessages() = runTest(dispatcher) {
        val connectivity = MutableStateFlow(NetworkStatus.Unavailable)
        val repository = FakeMessagingRepository(
            messages = MutableStateFlow(listOf(message())),
        )
        val viewModel = viewModel(repository, connectivity)

        assertTrue(viewModel.uiState.value.isOffline)
        assertEquals(1, viewModel.uiState.value.messages.size)
    }

    @Test
    fun offlineStatePreventsSendFromEveryUiEntryPoint() = runTest(dispatcher) {
        val repository = FakeMessagingRepository()
        val viewModel = viewModel(repository, MutableStateFlow(NetworkStatus.Unavailable))

        viewModel.onDraftChange("Keep this draft")
        viewModel.send()

        assertEquals("Keep this draft", viewModel.uiState.value.draft)
        assertTrue(repository.nonces.isEmpty())
        assertFalse(viewModel.uiState.value.isSending)
    }

    private fun viewModel(
        repository: FakeMessagingRepository,
        connectivity: MutableStateFlow<NetworkStatus> = MutableStateFlow(NetworkStatus.Available),
    ): ChatViewModel {
        val observer = mockk<ConnectivityObserver>()
        every { observer.observe() } returns connectivity
        return ChatViewModel(
            savedStateHandle = SavedStateHandle(mapOf("matchId" to "match-1")),
            repository = repository,
            connectivityObserver = observer,
        )
    }
}

private class FakeMessagingRepository(
    private val sendResults: ArrayDeque<OperationResult<ChatMessage>> = ArrayDeque(),
    val messages: MutableStateFlow<List<ChatMessage>> = MutableStateFlow(emptyList()),
) : MessagingRepository {
    val realtime = MutableSharedFlow<ChatMessage>(extraBufferCapacity = 1)
    val nonces = mutableListOf<String>()
    val cachedRealtimeMessages = mutableListOf<ChatMessage>()
    var markReadCalls = 0
    private val conversation = MutableStateFlow<ConversationSummary?>(null)

    override fun observeConversations(): Flow<List<ConversationSummary>> = MutableStateFlow(emptyList())
    override fun observeConversation(matchId: String): Flow<ConversationSummary?> = conversation
    override fun observeMessages(matchId: String): Flow<List<ChatMessage>> = messages
    override fun observeRealtimeMessages(matchId: String): Flow<ChatMessage> = realtime
    override suspend fun refreshConversations() = OperationResult.Success(emptyList<ConversationSummary>())
    override suspend fun refreshMessages(matchId: String) = OperationResult.Success(messages.value)
    override suspend fun sendTextMessage(matchId: String, content: String, clientNonce: String): OperationResult<ChatMessage> {
        nonces += clientNonce
        return if (sendResults.isEmpty()) OperationResult.Success(message().copy(content = content)) else sendResults.removeFirst()
    }
    override suspend fun markMessagesRead(matchId: String): OperationResult<Int> {
        markReadCalls += 1
        return OperationResult.Success(1)
    }
    override suspend fun cacheRealtimeMessage(message: ChatMessage) {
        cachedRealtimeMessages += message
        messages.value = (messages.value + message).distinctBy(ChatMessage::id)
    }
    override suspend fun currentUserId(): String = "owner-1"
    override suspend fun clearAllLocalMessages() = Unit
}

private fun message() = ChatMessage(
    id = "message-1",
    matchId = "match-1",
    senderId = "owner-1",
    content = "Hello",
    type = MessageType.Text,
    isRead = false,
    createdAt = "2026-08-13T10:00:00Z",
    readAt = null,
    expiresAt = null,
)
