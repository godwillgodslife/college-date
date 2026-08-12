package com.collegedate.app.domain.profile

data class UserProfile(
    val id: String,
    val displayName: String?,
    val username: String?,
    val avatarUrl: String?,
    val isOnboarded: Boolean,
    val email: String? = null,
    val gender: String? = null,
    val age: Int? = null,
    val university: String? = null,
    val bio: String? = null,
    val phone: String? = null,
    val photos: List<String> = emptyList(),
    val profilePhotos: List<String> = emptyList(),
    val interests: List<String> = emptyList(),
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
) {
    val photoUrls: List<String> =
        (profilePhotos + photos + listOfNotNull(avatarUrl))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()

    val isCompleteForNativeDiscovery: Boolean =
        isOnboarded &&
            !displayName.isNullOrBlank() &&
            (age ?: 0) >= 18 &&
            !university.isNullOrBlank() &&
            photoUrls.isNotEmpty()
}

data class EditableProfile(
    val fullName: String? = null,
    val age: Int? = null,
    val gender: String? = null,
    val university: String? = null,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val phone: String? = null,
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
    val photos: List<String>? = null,
    val profilePhotos: List<String>? = null,
    val interests: List<String>? = null,
    val isOnboarded: Boolean? = null,
) {
    fun sanitized(): EditableProfile =
        copy(
            fullName = fullName?.trim(),
            gender = gender?.trim(),
            university = university?.trim(),
            bio = bio?.trim(),
            avatarUrl = avatarUrl?.trim(),
            phone = phone?.trim(),
            faculty = faculty?.trim(),
            department = department?.trim(),
            level = level?.trim(),
            mbti = mbti?.trim(),
            attractionGoal = attractionGoal?.trim(),
            interestGender = interestGender?.trim(),
            introPrompt = introPrompt?.trim(),
            voiceIntroUrl = voiceIntroUrl?.trim(),
            anthem = anthem?.trim(),
            locationStatus = locationStatus?.trim(),
            photos = photos?.map { it.trim() }?.filter { it.isNotBlank() }?.distinct(),
            profilePhotos = profilePhotos?.map { it.trim() }?.filter { it.isNotBlank() }?.distinct(),
            interests = interests?.map { it.trim() }?.filter { it.isNotBlank() }?.distinct()?.take(10),
        )
}

data class ProfilePhoto(
    val url: String,
    val path: String,
    val isPrimary: Boolean,
)

data class University(
    val name: String,
    val searchTokens: String = name.lowercase(),
)

data class AcademicDetails(
    val university: String,
    val faculty: String? = null,
    val department: String? = null,
    val level: String,
)

enum class DatingIntent(val backendValue: String, val label: String) {
    Casual("Casual", "Casual"),
    Serious("Serious", "Serious"),
    Friends("Friends", "Friends");

    companion object {
        fun fromBackend(value: String?): DatingIntent? =
            entries.firstOrNull { it.backendValue.equals(value, ignoreCase = true) }
    }
}

enum class DatingPreference(val backendValue: String, val label: String) {
    Male("Male", "Men"),
    Female("Female", "Women"),
    All("All", "Everyone");

    companion object {
        fun fromBackend(value: String?): DatingPreference =
            entries.firstOrNull { it.backendValue.equals(value, ignoreCase = true) } ?: All
    }
}
