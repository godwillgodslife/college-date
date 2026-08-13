package com.collegedate.app.data.messaging

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import kotlinx.coroutines.flow.Flow

interface MessagingRepository {
    fun observeConversations(): Flow<List<ConversationSummary>>
    fun observeConversation(matchId: String): Flow<ConversationSummary?>
    fun observeMessages(matchId: String): Flow<List<ChatMessage>>
    fun observeRealtimeMessages(matchId: String): Flow<ChatMessage>
    suspend fun refreshConversations(): OperationResult<List<ConversationSummary>>
    suspend fun refreshMessages(matchId: String): OperationResult<List<ChatMessage>>
    suspend fun sendTextMessage(matchId: String, content: String, clientNonce: String): OperationResult<ChatMessage>
    suspend fun markMessagesRead(matchId: String): OperationResult<Int>
    suspend fun cacheRealtimeMessage(message: ChatMessage)
    suspend fun currentUserId(): String?
    suspend fun clearAllLocalMessages()
}
