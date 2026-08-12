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
    val email: String? = null,
    val gender: String? = null,
    val age: Int? = null,
    val university: String? = null,
    val bio: String? = null,
    val phone: String? = null,
    val photosJson: String = "[]",
    val profilePhotosJson: String = "[]",
    val interestsJson: String = "[]",
    val faculty: String? = null,
    val department: String? = null,
    val level: String? = null,
    val mbti: String? = null,
    val attractionGoal: String? = null,
    val interestGender: String? = null,
    val introPrompt: String? = null,
    val voiceIntroUrl: String? = null,
    val anthem: String? = null,
    val locationStatus: String? = null,
    val isVerified: Boolean = false,
    val completionScore: Int? = null,
    val lastSeenAt: String? = null,
    val lastActive: String? = null,
)
