package com.collegedate.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_writes")
data class PendingWriteEntity(
    @PrimaryKey val id: String,
    val ownerUserId: String,
    val type: String,
    val payloadJson: String,
    val createdAtMillis: Long,
    val attemptCount: Int = 0,
    val lastError: String? = null,
)
