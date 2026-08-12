package com.collegedate.app.domain.discovery

data class DiscoveryProfileCard(
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
    val isBoosted: Boolean,
    val seenCount: Int?,
) {
    val photoUrls: List<String> =
        (profilePhotos + photos + listOfNotNull(avatarUrl))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()

    val primaryPhotoUrl: String?
        get() = photoUrls.firstOrNull()

    val firstName: String
        get() = displayName?.trim()?.split(" ")?.firstOrNull()?.takeIf { it.isNotBlank() }
            ?: username?.trim()?.takeIf { it.isNotBlank() }
            ?: "Student"
}

data class DiscoveryFilters(
    val university: String? = null,
    val gender: String? = null,
    val liveOnly: Boolean = false,
)

data class DiscoveryPage(
    val profiles: List<DiscoveryProfileCard>,
    val pageSize: Int,
    val nextOffset: Int,
    val isEndReached: Boolean,
    val servedFromCache: Boolean,
)

data class PaginationState(
    val limit: Int = 20,
    val offset: Int = 0,
    val isEndReached: Boolean = false,
)

enum class SyncState {
    Fresh,
    Refreshing,
    OfflineCached,
    Error,
}
