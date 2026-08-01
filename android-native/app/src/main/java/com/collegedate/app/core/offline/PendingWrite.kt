package com.collegedate.app.core.offline

data class PendingWrite(
    val id: String,
    val ownerUserId: String,
    val type: PendingWriteType,
    val payloadJson: String,
    val createdAtMillis: Long,
    val attemptCount: Int,
    val lastError: String?,
)

enum class PendingWriteType {
    ProfileUpdate,
    NotificationTokenRegistration,
    Unknown,
}

data class SyncState(
    val isOnline: Boolean,
    val pendingWriteCount: Int,
    val lastSyncMillis: Long?,
    val lastError: String?,
)
