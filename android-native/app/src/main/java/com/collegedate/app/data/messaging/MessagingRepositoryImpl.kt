package com.collegedate.app.data.messaging

import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedConversationDao
import com.collegedate.app.core.database.dao.CachedMessageDao
import com.collegedate.app.core.database.entity.CachedConversationEntity
import com.collegedate.app.core.database.entity.CachedMessageEntity
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import com.collegedate.app.domain.messaging.MessageType
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class MessagingRepositoryImpl(
    private val remoteDataSource: MessagingRemoteDataSource,
    private val cachedConversationDao: CachedConversationDao,
    private val cachedMessageDao: CachedMessageDao,
    private val dispatchersProvider: DispatchersProvider,
) : MessagingRepository {
    override fun observeConversations(): Flow<List<ConversationSummary>> {
        val ownerId = currentUserIdBlocking() ?: return emptyFlow()
        return cachedConversationDao.observeConversations(ownerId).map { rows -> rows.map { it.toDomain() } }
    }

    override fun observeConversation(matchId: String): Flow<ConversationSummary?> {
        val ownerId = currentUserIdBlocking() ?: return emptyFlow()
        return cachedConversationDao.observeConversation(ownerId, matchId).map { it?.toDomain() }
    }

    override fun observeMessages(matchId: String): Flow<List<ChatMessage>> {
        val ownerId = currentUserIdBlocking() ?: return emptyFlow()
        return cachedMessageDao.observeMessages(ownerId, matchId).map { rows -> rows.map { it.toDomain() } }
    }

    override fun observeRealtimeMessages(matchId: String): Flow<ChatMessage> =
        remoteDataSource.observeMessages(matchId)

    override suspend fun refreshConversations(): OperationResult<List<ConversationSummary>> =
        withContext(dispatchersProvider.io) {
            val ownerId = remoteDataSource.currentUserId() ?: return@withContext sessionExpired()
            runCatching { remoteDataSource.getConversations() }.fold(
                onSuccess = { conversations ->
                    cachedConversationDao.clearForUser(ownerId)
                    cachedConversationDao.upsertAll(conversations.mapIndexed { index, item -> item.toEntity(ownerId, index) })
                    OperationResult.Success(conversations)
                },
                onFailure = { throwable ->
                    if (cachedConversationDao.count(ownerId) > 0 && throwable is IOException) {
                        OperationResult.Success(emptyList())
                    } else {
                        failureFor(throwable, "Unable to load conversations.")
                    }
                },
            )
        }

    override suspend fun refreshMessages(matchId: String): OperationResult<List<ChatMessage>> =
        withContext(dispatchersProvider.io) {
            val ownerId = remoteDataSource.currentUserId() ?: return@withContext sessionExpired()
            runCatching { remoteDataSource.getMessages(matchId) }.fold(
                onSuccess = { messages ->
                    cachedMessageDao.clearMatch(ownerId, matchId)
                    cachedMessageDao.upsertAll(messages.map { it.toEntity(ownerId) })
                    OperationResult.Success(messages)
                },
                onFailure = { throwable ->
                    if (cachedMessageDao.count(ownerId, matchId) > 0 && throwable is IOException) {
                        OperationResult.Success(emptyList())
                    } else {
                        failureFor(throwable, "Unable to load this chat.")
                    }
                },
            )
        }

    override suspend fun sendTextMessage(
        matchId: String,
        content: String,
        clientNonce: String,
    ): OperationResult<ChatMessage> = withContext(dispatchersProvider.io) {
        val ownerId = remoteDataSource.currentUserId() ?: return@withContext sessionExpired()
        runCatching { remoteDataSource.sendTextMessage(matchId, content, clientNonce) }.fold(
            onSuccess = { message ->
                cachedMessageDao.upsert(message.toEntity(ownerId))
                OperationResult.Success(message)
            },
            onFailure = { failureFor(it, "Unable to send your message.") },
        )
    }

    override suspend fun markMessagesRead(matchId: String): OperationResult<Int> =
        withContext(dispatchersProvider.io) {
            if (remoteDataSource.currentUserId() == null) return@withContext sessionExpired()
            runCatching { remoteDataSource.markMessagesRead(matchId) }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { failureFor(it, "Unable to update read receipts.") },
            )
        }

    override suspend fun cacheRealtimeMessage(message: ChatMessage) = withContext(dispatchersProvider.io) {
        val ownerId = remoteDataSource.currentUserId() ?: return@withContext
        cachedMessageDao.upsert(message.toEntity(ownerId))
    }

    override suspend fun currentUserId(): String? = remoteDataSource.currentUserId()

    override suspend fun clearAllLocalMessages() = withContext(dispatchersProvider.io) {
        cachedConversationDao.clearAll()
        cachedMessageDao.clearAll()
    }

    private fun currentUserIdBlocking(): String? = remoteDataSource.currentUserId()

    private fun sessionExpired() = OperationResult.Failure(
        FailureType.SessionExpired,
        "Your session has expired. Sign in again.",
    )

    private fun failureFor(throwable: Throwable, fallback: String): OperationResult.Failure {
        val raw = throwable.message.orEmpty()
        return when {
            throwable is IOException || raw.contains("network", true) || raw.contains("timeout", true) ->
                OperationResult.Failure(FailureType.Network, "Check your connection and try again.")
            raw.contains("not_authenticated", true) -> sessionExpired()
            raw.contains("not_authorized", true) ->
                OperationResult.Failure(FailureType.Validation, "This chat is no longer available.")
            raw.contains("invalid_message_length", true) ->
                OperationResult.Failure(FailureType.Validation, "Messages must be between 1 and 2,000 characters.")
            else -> OperationResult.Failure(FailureType.Unknown, fallback)
        }
    }

    private fun ConversationSummary.toEntity(ownerId: String, index: Int) = CachedConversationEntity(
        ownerUserId = ownerId,
        matchId = matchId,
        otherUserId = otherUserId,
        otherDisplayName = otherDisplayName,
        otherAvatarUrl = otherAvatarUrl,
        otherLastActive = otherLastActive,
        lastMessageId = lastMessageId,
        lastMessageContent = lastMessageContent,
        lastMessageType = lastMessageType?.backendValue,
        lastMessageSenderId = lastMessageSenderId,
        lastMessageIsRead = lastMessageIsRead,
        lastMessageCreatedAt = lastMessageCreatedAt,
        unreadCount = unreadCount,
        sortIndex = index,
        cachedAtMillis = System.currentTimeMillis(),
    )

    private fun CachedConversationEntity.toDomain() = ConversationSummary(
        matchId = matchId,
        otherUserId = otherUserId,
        otherDisplayName = otherDisplayName,
        otherAvatarUrl = otherAvatarUrl,
        otherLastActive = otherLastActive,
        lastMessageId = lastMessageId,
        lastMessageContent = lastMessageContent,
        lastMessageType = lastMessageType?.let(MessageType::fromBackend),
        lastMessageSenderId = lastMessageSenderId,
        lastMessageIsRead = lastMessageIsRead,
        lastMessageCreatedAt = lastMessageCreatedAt,
        unreadCount = unreadCount,
    )

    private fun ChatMessage.toEntity(ownerId: String) = CachedMessageEntity(
        ownerUserId = ownerId,
        id = id,
        matchId = matchId,
        senderId = senderId,
        content = content,
        type = type.backendValue,
        isRead = isRead,
        createdAt = createdAt,
        readAt = readAt,
        expiresAt = expiresAt,
        cachedAtMillis = System.currentTimeMillis(),
    )

    private fun CachedMessageEntity.toDomain() = ChatMessage(
        id = id,
        matchId = matchId,
        senderId = senderId,
        content = content,
        type = MessageType.fromBackend(type),
        isRead = isRead,
        createdAt = createdAt,
        readAt = readAt,
        expiresAt = expiresAt,
    )
}
