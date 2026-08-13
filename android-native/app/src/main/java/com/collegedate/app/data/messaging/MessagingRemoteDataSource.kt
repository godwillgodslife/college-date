package com.collegedate.app.data.messaging

import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import kotlinx.coroutines.flow.Flow

interface MessagingRemoteDataSource {
    suspend fun getConversations(limit: Int = 50, offset: Int = 0): List<ConversationSummary>
    suspend fun getMessages(matchId: String, limit: Int = 50): List<ChatMessage>
    suspend fun sendTextMessage(matchId: String, content: String, clientNonce: String): ChatMessage
    suspend fun markMessagesRead(matchId: String): Int
    fun observeMessages(matchId: String): Flow<ChatMessage>
    fun currentUserId(): String?
}
