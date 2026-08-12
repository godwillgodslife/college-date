package com.collegedate.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_discovery_profiles")
data class CachedDiscoveryProfileEntity(
    @PrimaryKey val id: String,
    val displayName: String?,
    val username: String?,
    val gender: String?,
    val age: Int?,
    val university: String?,
    val faculty: String?,
    val department: String?,
    val level: String?,
    val bio: String?,
    val avatarUrl: String?,
    val photosJson: String,
    val profilePhotosJson: String,
    val interestsJson: String,
    val introPrompt: String?,
    val voiceIntroUrl: String?,
    val anthem: String?,
    val attractionGoal: String?,
    val isVerified: Boolean,
    val completionScore: Int?,
    val lastSeenAt: String?,
    val lastActive: String?,
    val isLive: Boolean,
    val isBoosted: Boolean,
    val seenCount: Int?,
    val sortIndex: Int,
    val cachedAtMillis: Long,
)
