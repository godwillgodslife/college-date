package com.collegedate.prototype.data

import com.collegedate.prototype.config.AppConfig
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

data class ChatUser(
    val id: String,
    val fullName: String?,
    val avatarUrl: String?,
    val lastSeenAt: String?
)

data class ConversationPreview(
    val id: String,
    val createdAt: String?,
    val otherUser: ChatUser?,
    val lastMessage: String?,
    val lastMessageType: String?,
    val hasUnread: Boolean,
    val disappearingSeconds: Int
)

data class ChatMessage(
    val id: String,
    val matchId: String,
    val senderId: String?,
    val content: String?,
    val mediaUrl: String?,
    val type: String,
    val isRead: Boolean,
    val createdAt: String?,
    val metadata: JSONObject = JSONObject()
)

sealed interface ConversationsResult {
    data class Success(val conversations: List<ConversationPreview>) : ConversationsResult
    data class Failure(val message: String) : ConversationsResult
}

sealed interface MessagesResult {
    data class Success(val messages: List<ChatMessage>) : MessagesResult
    data class Failure(val message: String) : MessagesResult
}

sealed interface SendMessageResult {
    data class Success(val message: ChatMessage) : SendMessageResult
    data class Failure(val message: String) : SendMessageResult
}

sealed interface ChatMutationResult {
    data object Success : ChatMutationResult
    data class Failure(val message: String) : ChatMutationResult
}

class ChatRepository(private val config: AppConfig) {
    fun loadConversations(session: NativeSession, profile: NativeProfile): ConversationsResult {
        if (!config.hasSupabase) {
            return ConversationsResult.Failure("Supabase config is missing.")
        }

        val select = """
            id,
            created_at,
            user1_id,
            user2_id,
            disappearing_messages_seconds,
            user1:profiles!user1_id(id,full_name,avatar_url,last_seen_at),
            user2:profiles!user2_id(id,full_name,avatar_url,last_seen_at),
            messages(id,content,type,sender_id,is_read,created_at,expires_at,metadata)
        """.trimIndent().replace("\n", "")

        val query = buildList {
            add("select=${encode(select)}")
            add("or=${encode("(user1_id.eq.${profile.id},user2_id.eq.${profile.id})")}")
            add("order=${encode("created_at.desc")}")
            add("messages.order=${encode("created_at.desc")}")
            add("messages.limit=1")
        }.joinToString("&")

        val connection = (URL("${config.supabaseUrl}/rest/v1/matches?$query")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.setRequestProperty("Accept", "application/json")

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return ConversationsResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            val conversations = (0 until rows.length())
                .map { parseConversation(rows.getJSONObject(it), profile.id) }
                .sortedByDescending { it.createdAt.orEmpty() }

            ConversationsResult.Success(conversations)
        } catch (error: Exception) {
            ConversationsResult.Failure(error.message ?: "Conversations request failed.")
        } finally {
            connection.disconnect()
        }
    }

    fun loadMessages(session: NativeSession, matchId: String): MessagesResult {
        if (!config.hasSupabase) {
            return MessagesResult.Failure("Supabase config is missing.")
        }

        val select = "id,match_id,sender_id,content,type,is_read,created_at,expires_at,metadata"
        val query = buildList {
            add("select=${encode(select)}")
            add("match_id=eq.${encode(matchId)}")
            add("or=${encode("(expires_at.is.null,expires_at.gt.${java.time.Instant.now()})")}")
            add("order=${encode("created_at.desc")}")
            add("limit=30")
        }.joinToString("&")

        val connection = (URL("${config.supabaseUrl}/rest/v1/messages?$query")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.setRequestProperty("Accept", "application/json")

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return MessagesResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            val messages = (0 until rows.length())
                .map { parseMessage(rows.getJSONObject(it), session) }
                .asReversed()

            MessagesResult.Success(messages)
        } catch (error: Exception) {
            MessagesResult.Failure(error.message ?: "Messages request failed.")
        } finally {
            connection.disconnect()
        }
    }

    fun sendTextMessage(session: NativeSession, matchId: String, content: String): SendMessageResult {
        val senderId = session.userId
        if (senderId.isNullOrBlank()) {
            return SendMessageResult.Failure("Session is missing a sender id.")
        }
        if (!config.hasSupabase) {
            return SendMessageResult.Failure("Supabase config is missing.")
        }

        val body = JSONObject()
            .put("match_id", matchId)
            .put("sender_id", senderId)
            .put("content", content)
            .put("type", "text")
            .put("metadata", JSONObject())
            .put("created_at", Instant.now().toString())

        val connection = (URL("${config.supabaseUrl}/rest/v1/messages")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Prefer", "return=representation")
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.doOutput = true

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(JSONArray().put(body).toString())
            }

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return SendMessageResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            if (rows.length() == 0) {
                return SendMessageResult.Failure("Message insert returned no row.")
            }

            SendMessageResult.Success(parseMessage(rows.getJSONObject(0), session))
        } catch (error: Exception) {
            SendMessageResult.Failure(error.message ?: "Send message failed.")
        } finally {
            connection.disconnect()
        }
    }

    fun markConversationRead(session: NativeSession, matchId: String): ChatMutationResult {
        val userId = session.userId
        if (userId.isNullOrBlank()) {
            return ChatMutationResult.Failure("Session is missing a user id.")
        }
        if (!config.hasSupabase) {
            return ChatMutationResult.Failure("Supabase config is missing.")
        }

        val body = JSONObject().put("is_read", true)
        val query = buildList {
            add("match_id=eq.${encode(matchId)}")
            add("sender_id=neq.${encode(userId)}")
            add("is_read=eq.false")
        }.joinToString("&")

        val connection = (URL("${config.supabaseUrl}/rest/v1/messages?$query")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "PATCH"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Prefer", "return=minimal")
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.doOutput = true

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
            }

            val status = connection.responseCode
            if (status in 200..299 || status == 204) {
                ChatMutationResult.Success
            } else {
                val response = connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
                ChatMutationResult.Failure(parseError(response, status))
            }
        } catch (error: Exception) {
            ChatMutationResult.Failure(error.message ?: "Mark read failed.")
        } finally {
            connection.disconnect()
        }
    }

    private fun parseConversation(json: JSONObject, currentUserId: String): ConversationPreview {
        val isUser1 = json.optString("user1_id") == currentUserId
        val otherUser = parseUser(if (isUser1) json.optJSONObject("user2") else json.optJSONObject("user1"))
        val message = json.optJSONArray("messages")?.let { messages ->
            if (messages.length() > 0) messages.getJSONObject(0) else null
        }
        val isExpired = message?.optString("expires_at")?.takeIf { it.isNotBlank() && it != "null" }?.let {
            runCatching { java.time.Instant.parse(it).isBefore(java.time.Instant.now()) }.getOrDefault(false)
        } ?: false
        val visibleMessage = if (isExpired) null else message

        return ConversationPreview(
            id = json.optString("id"),
            createdAt = visibleMessage?.optString("created_at")?.ifBlank { null }
                ?: json.optString("created_at").ifBlank { null },
            otherUser = otherUser,
            lastMessage = visibleMessage?.let { previewForMessage(it) },
            lastMessageType = visibleMessage?.optString("type")?.ifBlank { null },
            hasUnread = visibleMessage?.let {
                it.optString("sender_id") != currentUserId && !it.optBoolean("is_read", true)
            } ?: false,
            disappearingSeconds = json.optInt("disappearing_messages_seconds", 0)
        )
    }

    private fun previewForMessage(message: JSONObject): String {
        return when (message.optString("type")) {
            "image" -> "Photo"
            "voice" -> "Voice note"
            "gift" -> "Gift"
            "sticker" -> "Sticker"
            "call_log" -> "Call"
            else -> message.optString("content").ifBlank { "Message" }
        }
    }

    private fun parseMessage(json: JSONObject, session: NativeSession): ChatMessage {
        val metadata = json.optJSONObject("metadata") ?: JSONObject()
        val type = json.optString("type").ifBlank { "text" }
        val content = json.optString("content").ifBlank { null }
        val mediaUrl = if (type == "image") {
            resolveImageUrl(session, metadata.optString("storage_path").ifBlank { null }, content)
        } else {
            null
        }

        return ChatMessage(
            id = json.optString("id"),
            matchId = json.optString("match_id"),
            senderId = json.optString("sender_id").ifBlank { null },
            content = content,
            mediaUrl = mediaUrl,
            type = type,
            isRead = json.optBoolean("is_read", false),
            createdAt = json.optString("created_at").ifBlank { null },
            metadata = metadata
        )
    }

    private fun resolveImageUrl(session: NativeSession, storagePath: String?, fallbackContent: String?): String? {
        if (!storagePath.isNullOrBlank()) {
            createSignedChatMediaUrl(session, storagePath)?.let { return it }
        }
        return fallbackContent?.takeIf { it.startsWith("http://") || it.startsWith("https://") }
    }

    private fun createSignedChatMediaUrl(session: NativeSession, storagePath: String): String? {
        val cleanedPath = storagePath.trim().removePrefix("/")
        val encodedPath = cleanedPath
            .split("/")
            .joinToString("/") { encode(it) }
        val connection = (URL("${config.supabaseUrl}/storage/v1/object/sign/chat-media/$encodedPath")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.doOutput = true

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(JSONObject().put("expiresIn", 60 * 60).toString())
            }

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) return null

            val signedPath = JSONObject(response)
                .optString("signedURL")
                .ifBlank { JSONObject(response).optString("signedUrl") }
                .ifBlank { null }
                ?: return null

            if (signedPath.startsWith("http://") || signedPath.startsWith("https://")) {
                signedPath
            } else {
                "${config.supabaseUrl}/storage/v1$signedPath"
            }
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    private fun parseUser(json: JSONObject?): ChatUser? {
        if (json == null) return null
        return ChatUser(
            id = json.optString("id"),
            fullName = json.optString("full_name").ifBlank { null },
            avatarUrl = json.optString("avatar_url").ifBlank { null },
            lastSeenAt = json.optString("last_seen_at").ifBlank { null }
        )
    }

    private fun parseError(response: String, status: Int): String {
        return runCatching {
            val json = JSONObject(response)
            json.optString("message")
                .ifBlank { json.optString("msg") }
                .ifBlank { json.optString("hint") }
        }.getOrNull()?.ifBlank { null } ?: "Conversations failed with HTTP $status."
    }

    private fun encode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8.name())
}
