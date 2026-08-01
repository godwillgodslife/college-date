package com.collegedate.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_profiles")
data class CachedProfileEntity(
    @PrimaryKey val id: String,
    val displayName: String?,
    val username: String?,
    val avatarUrl: String?,
    val isOnboarded: Boolean,
    val cachedAtMillis: Long,
)
