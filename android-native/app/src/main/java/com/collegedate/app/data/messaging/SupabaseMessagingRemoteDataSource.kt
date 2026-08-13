package com.collegedate.app.data.messaging

import com.collegedate.app.core.common.ApplicationScope
import com.collegedate.app.domain.messaging.ChatMessage
import com.collegedate.app.domain.messaging.ConversationSummary
import com.collegedate.app.domain.messaging.MessageType
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.decodeRecordOrNull
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseMessagingRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
    @param:ApplicationScope private val applicationScope: CoroutineScope,
) : MessagingRemoteDataSource {
    override suspend fun getConversations(limit: Int, offset: Int): List<ConversationSummary> =
        supabaseClient.postgrest
            .rpc(
                "get_native_conversations",
                buildJsonObject {
                    put("p_limit", limit.coerceIn(1, 100))
                    put("p_offset", offset.coerceAtLeast(0))
                },
            )
            .decodeList<ConversationDto>()
            .map(ConversationDto::toDomain)

    override suspend fun getMessages(matchId: String, limit: Int): List<ChatMessage> =
        supabaseClient.postgrest
            .rpc(
                "get_native_messages",
                buildJsonObject {
                    put("p_match_id", matchId)
                    put("p_limit", limit.coerceIn(1, 100))
                },
            )
            .decodeList<MessageDto>()
            .map(MessageDto::toDomain)

    override suspend fun sendTextMessage(
        matchId: String,
        content: String,
        clientNonce: String,
    ): ChatMessage =
        supabaseClient.postgrest
            .rpc(
                "send_native_text_message",
                buildJsonObject {
                    put("p_match_id", matchId)
                    put("p_content", content)
                    put("p_client_nonce", clientNonce)
                },
            )
            .decodeList<MessageDto>()
            .first()
            .toDomain()

    override suspend fun markMessagesRead(matchId: String): Int =
        supabaseClient.postgrest
            .rpc(
                "mark_native_messages_read",
                buildJsonObject { put("p_match_id", matchId) },
            )
            .decodeAs()

    override fun observeMessages(matchId: String): Flow<ChatMessage> = callbackFlow {
        val channel = supabaseClient.channel("native-messages:$matchId")
        val changes = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = "messages"
            filter("match_id", FilterOperator.EQ, matchId)
        }
        val collector = launch {
            changes.collect { action ->
                when (action) {
                    is PostgresAction.Insert -> action.decodeRecordOrNull<MessageDto>()
                    is PostgresAction.Update -> action.decodeRecordOrNull<MessageDto>()
                    else -> null
                }?.toDomain()?.let { trySend(it) }
            }
        }

        runCatching {
            supabaseClient.realtime.setAuth()
            channel.subscribe(blockUntilSubscribed = true)
        }.onFailure { close(it) }

        awaitClose {
            collector.cancel()
            applicationScope.launch { supabaseClient.realtime.removeChannel(channel) }
        }
    }

    override fun currentUserId(): String? = supabaseClient.auth.currentUserOrNull()?.id
}

@Serializable
private data class ConversationDto(
    @SerialName("match_id") val matchId: String,
    @SerialName("other_user_id") val otherUserId: String,
    @SerialName("other_display_name") val otherDisplayName: String? = null,
    @SerialName("other_avatar_url") val otherAvatarUrl: String? = null,
    @SerialName("other_last_active") val otherLastActive: String? = null,
    @SerialName("last_message_id") val lastMessageId: String? = null,
    @SerialName("last_message_content") val lastMessageContent: String? = null,
    @SerialName("last_message_type") val lastMessageType: String? = null,
    @SerialName("last_message_sender_id") val lastMessageSenderId: String? = null,
    @SerialName("last_message_is_read") val lastMessageIsRead: Boolean? = null,
    @SerialName("last_message_created_at") val lastMessageCreatedAt: String? = null,
    @SerialName("unread_count") val unreadCount: Long? = null,
) {
    fun toDomain(): ConversationSummary = ConversationSummary(
        matchId = matchId,
        otherUserId = otherUserId,
        otherDisplayName = otherDisplayName?.takeIf(String::isNotBlank) ?: "Matched student",
        otherAvatarUrl = otherAvatarUrl,
        otherLastActive = otherLastActive,
        lastMessageId = lastMessageId,
        lastMessageContent = lastMessageContent,
        lastMessageType = lastMessageType?.let(MessageType::fromBackend),
        lastMessageSenderId = lastMessageSenderId,
        lastMessageIsRead = lastMessageIsRead != false,
        lastMessageCreatedAt = lastMessageCreatedAt,
        unreadCount = unreadCount ?: 0,
    )
}

@Serializable
private data class MessageDto(
    val id: String,
    @SerialName("match_id") val matchId: String,
    @SerialName("sender_id") val senderId: String,
    val content: String,
    val type: String? = null,
    @SerialName("is_read") val isRead: Boolean? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
) {
    fun toDomain(): ChatMessage = ChatMessage(
        id = id,
        matchId = matchId,
        senderId = senderId,
        content = content,
        type = MessageType.fromBackend(type),
        isRead = isRead == true,
        createdAt = createdAt,
        readAt = readAt,
        expiresAt = expiresAt,
    )
}
