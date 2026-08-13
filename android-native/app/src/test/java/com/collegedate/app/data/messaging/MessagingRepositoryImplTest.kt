package com.collegedate.app.data.messaging

import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedConversationDao
import com.collegedate.app.core.database.dao.CachedMessageDao
import com.collegedate.app.core.database.entity.CachedConversationEntity
import com.collegedate.app.core.database.entity.CachedMessageEntity
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import com.collegedate.app.domain.messaging.MessageType
import java.io.IOException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class MessagingRepositoryImplTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Test
    fun refreshConversationsCachesOnlyForCurrentUser() = runTest(dispatcher) {
        val conversationDao = FakeConversationDao()
        val repository = repository(
            remote = FakeMessagingRemote(conversations = listOf(conversation())),
            conversationDao = conversationDao,
        )

        val result = repository.refreshConversations()

        assertTrue(result is OperationResult.Success)
        assertEquals("owner-1", conversationDao.rows.value.single().ownerUserId)
        assertEquals("match-1", conversationDao.rows.value.single().matchId)
    }

    @Test
    fun networkFailureUsesExistingConversationCache() = runTest(dispatcher) {
        val conversationDao = FakeConversationDao(
            initial = listOf(conversationEntity(ownerId = "owner-1")),
        )
        val repository = repository(
            remote = FakeMessagingRemote(conversationError = IOException("offline")),
            conversationDao = conversationDao,
        )

        val result = repository.refreshConversations()

        assertTrue(result is OperationResult.Success)
        assertEquals(1, conversationDao.rows.value.size)
    }

    @Test
    fun networkFailureWithoutCacheReturnsRedactedNetworkFailure() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeMessagingRemote(conversationError = IOException("token=secret")),
        )

        val result = repository.refreshConversations()

        assertTrue(result is OperationResult.Failure)
        result as OperationResult.Failure
        assertEquals(FailureType.Network, result.type)
        assertEquals("Check your connection and try again.", result.message)
    }

    @Test
    fun successfulSendCachesReturnedMessageForCurrentUser() = runTest(dispatcher) {
        val messageDao = FakeMessageDao()
        val repository = repository(
            remote = FakeMessagingRemote(sentMessage = message()),
            messageDao = messageDao,
        )

        val result = repository.sendTextMessage("match-1", "Hello", "nonce")

        assertTrue(result is OperationResult.Success)
        assertEquals("owner-1", messageDao.rows.value.single().ownerUserId)
        assertEquals("Hello", messageDao.rows.value.single().content)
    }

    private fun repository(
        remote: FakeMessagingRemote,
        conversationDao: FakeConversationDao = FakeConversationDao(),
        messageDao: FakeMessageDao = FakeMessageDao(),
    ) = MessagingRepositoryImpl(
        remoteDataSource = remote,
        cachedConversationDao = conversationDao,
        cachedMessageDao = messageDao,
        dispatchersProvider = TestDispatchersProvider(dispatcher),
    )
}

private class FakeMessagingRemote(
    private val conversations: List<ConversationSummary> = emptyList(),
    private val conversationError: Throwable? = null,
    private val sentMessage: ChatMessage = message(),
) : MessagingRemoteDataSource {
    override suspend fun getConversations(limit: Int, offset: Int): List<ConversationSummary> {
        conversationError?.let { throw it }
        return conversations
    }
    override suspend fun getMessages(matchId: String, limit: Int): List<ChatMessage> = emptyList()
    override suspend fun sendTextMessage(matchId: String, content: String, clientNonce: String) =
        sentMessage.copy(content = content)
    override suspend fun markMessagesRead(matchId: String): Int = 0
    override fun observeMessages(matchId: String): Flow<ChatMessage> = emptyFlow()
    override fun currentUserId(): String = "owner-1"
}

private class FakeConversationDao(
    initial: List<CachedConversationEntity> = emptyList(),
) : CachedConversationDao {
    val rows = MutableStateFlow(initial)
    override fun observeConversations(ownerUserId: String): Flow<List<CachedConversationEntity>> = rows
    override fun observeConversation(ownerUserId: String, matchId: String): Flow<CachedConversationEntity?> =
        MutableStateFlow(rows.value.firstOrNull { it.ownerUserId == ownerUserId && it.matchId == matchId })
    override suspend fun count(ownerUserId: String) = rows.value.count { it.ownerUserId == ownerUserId }
    override suspend fun upsertAll(conversations: List<CachedConversationEntity>) { rows.value = conversations }
    override suspend fun clearForUser(ownerUserId: String) { rows.value = rows.value.filterNot { it.ownerUserId == ownerUserId } }
    override suspend fun clearAll() { rows.value = emptyList() }
}

private class FakeMessageDao : CachedMessageDao {
    val rows = MutableStateFlow<List<CachedMessageEntity>>(emptyList())
    override fun observeMessages(ownerUserId: String, matchId: String): Flow<List<CachedMessageEntity>> = rows
    override suspend fun count(ownerUserId: String, matchId: String) =
        rows.value.count { it.ownerUserId == ownerUserId && it.matchId == matchId }
    override suspend fun upsertAll(messages: List<CachedMessageEntity>) { rows.value = messages }
    override suspend fun upsert(message: CachedMessageEntity) {
        rows.value = rows.value.filterNot { it.ownerUserId == message.ownerUserId && it.id == message.id } + message
    }
    override suspend fun clearMatch(ownerUserId: String, matchId: String) {
        rows.value = rows.value.filterNot { it.ownerUserId == ownerUserId && it.matchId == matchId }
    }
    override suspend fun clearForUser(ownerUserId: String) { rows.value = rows.value.filterNot { it.ownerUserId == ownerUserId } }
    override suspend fun clearAll() { rows.value = emptyList() }
}

private fun conversation() = ConversationSummary(
    matchId = "match-1",
    otherUserId = "other-1",
    otherDisplayName = "Ada",
    otherAvatarUrl = null,
    otherLastActive = null,
    lastMessageId = null,
    lastMessageContent = null,
    lastMessageType = null,
    lastMessageSenderId = null,
    lastMessageIsRead = true,
    lastMessageCreatedAt = null,
    unreadCount = 0,
)

private fun conversationEntity(ownerId: String) = CachedConversationEntity(
    ownerUserId = ownerId,
    matchId = "match-1",
    otherUserId = "other-1",
    otherDisplayName = "Ada",
    otherAvatarUrl = null,
    otherLastActive = null,
    lastMessageId = null,
    lastMessageContent = null,
    lastMessageType = null,
    lastMessageSenderId = null,
    lastMessageIsRead = true,
    lastMessageCreatedAt = null,
    unreadCount = 0,
    sortIndex = 0,
    cachedAtMillis = 1,
)

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
