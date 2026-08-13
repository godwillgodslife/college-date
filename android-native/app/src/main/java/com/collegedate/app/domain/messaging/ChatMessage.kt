package com.collegedate.app.domain.messaging

data class ChatMessage(
    val id: String,
    val matchId: String,
    val senderId: String,
    val content: String,
    val type: MessageType,
    val isRead: Boolean,
    val createdAt: String?,
    val readAt: String?,
    val expiresAt: String?,
) {
    fun displayContent(): String = when (type) {
        MessageType.Text -> content
        MessageType.Voice -> "Voice note is available in the current app."
        MessageType.Sticker -> "Sticker is available in the current app."
        MessageType.Gift -> "Gift is available in the current app."
        MessageType.Emoji -> content.ifBlank { "Emoji" }
        MessageType.CallLog -> "Call activity"
        MessageType.Unsupported -> "This message type is not supported yet."
    }
}

enum class MessageType(val backendValue: String) {
    Text("text"),
    Voice("voice"),
    Sticker("sticker"),
    Gift("gift"),
    Emoji("emoji"),
    CallLog("call_log"),
    Unsupported("unsupported"),
    ;

    companion object {
        fun fromBackend(value: String?): MessageType =
            entries.firstOrNull { it.backendValue == value?.lowercase() } ?: Unsupported
    }
}
