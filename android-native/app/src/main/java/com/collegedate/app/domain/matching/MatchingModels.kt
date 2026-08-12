package com.collegedate.app.domain.matching

import java.util.UUID

enum class SwipeDirection(val backendValue: String) {
    Like("right"),
    Pass("left"),
}

data class SwipeAction(
    val targetProfileId: String,
    val direction: SwipeDirection,
    val clientOperationId: String = UUID.randomUUID().toString(),
)

data class SwipeResult(
    val success: Boolean,
    val direction: SwipeDirection,
    val targetProfileId: String,
    val swipeId: String? = null,
    val isMatch: Boolean = false,
    val matchId: String? = null,
    val errorCode: String? = null,
    val message: String? = null,
)

data class MatchedProfile(
    val id: String,
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
    val photos: List<String>,
    val profilePhotos: List<String>,
    val interests: List<String>,
    val introPrompt: String?,
    val voiceIntroUrl: String?,
    val anthem: String?,
    val attractionGoal: String?,
    val isVerified: Boolean,
    val completionScore: Int?,
    val lastSeenAt: String?,
    val lastActive: String?,
    val isLive: Boolean,
) {
    val photoUrls: List<String> =
        (profilePhotos + photos + listOfNotNull(avatarUrl))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
}
