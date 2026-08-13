package com.collegedate.app.core.database.entity

import androidx.room.Entity

@Entity(
    tableName = "cached_conversations",
    primaryKeys = ["ownerUserId", "matchId"],
)
data class CachedConversationEntity(
    val ownerUserId: String,
    val matchId: String,
    val otherUserId: String,
    val otherDisplayName: String,
    val otherAvatarUrl: String?,
    val otherLastActive: String?,
    val lastMessageId: String?,
    val lastMessageContent: String?,
    val lastMessageType: String?,
    val lastMessageSenderId: String?,
    val lastMessageIsRead: Boolean,
    val lastMessageCreatedAt: String?,
    val unreadCount: Long,
    val sortIndex: Int,
    val cachedAtMillis: Long,
)
