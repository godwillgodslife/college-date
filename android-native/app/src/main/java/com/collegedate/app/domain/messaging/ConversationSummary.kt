package com.collegedate.app.domain.messaging

data class ConversationSummary(
    val matchId: String,
    val otherUserId: String,
    val otherDisplayName: String,
    val otherAvatarUrl: String?,
    val otherLastActive: String?,
    val lastMessageId: String?,
    val lastMessageContent: String?,
    val lastMessageType: MessageType?,
    val lastMessageSenderId: String?,
    val lastMessageIsRead: Boolean,
    val lastMessageCreatedAt: String?,
    val unreadCount: Long,
) {
    val preview: String
        get() = when (lastMessageType) {
            null -> "You matched. Say hello."
            MessageType.Text -> lastMessageContent.orEmpty()
            MessageType.Voice -> "Voice note"
            MessageType.Sticker -> "Sticker"
            MessageType.Gift -> "Gift"
            MessageType.Emoji -> "Emoji"
            MessageType.CallLog -> "Call"
            MessageType.Unsupported -> "Message"
        }
}
