package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.UserProfile
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProfileDto(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val username: String? = null,
    val email: String? = null,
    val gender: String? = null,
    val age: Int? = null,
    val university: String? = null,
    val bio: String? = null,
    val phone: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val photos: List<String>? = null,
    @SerialName("profile_photos") val profilePhotos: List<String>? = null,
    val interests: List<String>? = null,
    val faculty: String? = null,
    val department: String? = null,
    val level: String? = null,
    val mbti: String? = null,
    @SerialName("attraction_goal") val attractionGoal: String? = null,
    @SerialName("interest_gender") val interestGender: String? = null,
    @SerialName("intro_prompt") val introPrompt: String? = null,
    @SerialName("voice_intro_url") val voiceIntroUrl: String? = null,
    val anthem: String? = null,
    @SerialName("location_status") val locationStatus: String? = null,
    @SerialName("is_verified") val isVerified: Boolean? = null,
    @SerialName("completion_score") val completionScore: Int? = null,
    @SerialName("is_onboarded") val isOnboarded: Boolean? = null,
    @SerialName("last_seen_at") val lastSeenAt: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
) {
    fun toDomain(): UserProfile =
        UserProfile(
            id = id,
            displayName = fullName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded == true,
            email = email,
            gender = gender,
            age = age,
            university = university,
            bio = bio,
            phone = phone,
            photos = photos.orEmpty().filterNot(String::isBlank),
            profilePhotos = profilePhotos.orEmpty().filterNot(String::isBlank),
            interests = interests.orEmpty().filterNot(String::isBlank),
            faculty = faculty,
            department = department,
            level = level,
            mbti = mbti,
            attractionGoal = attractionGoal,
            interestGender = interestGender,
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            locationStatus = locationStatus,
            isVerified = isVerified == true,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
        )
}
