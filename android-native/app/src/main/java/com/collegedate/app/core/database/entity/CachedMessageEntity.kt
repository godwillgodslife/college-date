package com.collegedate.app.core.database.entity

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "cached_messages",
    primaryKeys = ["ownerUserId", "id"],
    indices = [Index(value = ["ownerUserId", "matchId", "createdAt"])],
)
data class CachedMessageEntity(
    val ownerUserId: String,
    val id: String,
    val matchId: String,
    val senderId: String,
    val content: String,
    val type: String,
    val isRead: Boolean,
    val createdAt: String?,
    val readAt: String?,
    val expiresAt: String?,
    val cachedAtMillis: Long,
)
