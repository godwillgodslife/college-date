package com.collegedate.app.data.profile

import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import com.collegedate.app.domain.matching.MatchedProfile
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProfileCardDto(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val username: String? = null,
    val gender: String? = null,
    val age: Int? = null,
    val university: String? = null,
    val faculty: String? = null,
    val department: String? = null,
    val level: String? = null,
    val bio: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val photos: List<String>? = null,
    @SerialName("profile_photos") val profilePhotos: List<String>? = null,
    val interests: List<String>? = null,
    @SerialName("intro_prompt") val introPrompt: String? = null,
    @SerialName("voice_intro_url") val voiceIntroUrl: String? = null,
    val anthem: String? = null,
    @SerialName("attraction_goal") val attractionGoal: String? = null,
    @SerialName("is_verified") val isVerified: Boolean? = null,
    @SerialName("completion_score") val completionScore: Int? = null,
    @SerialName("last_seen_at") val lastSeenAt: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
    @SerialName("is_live") val isLive: Boolean? = null,
    @SerialName("is_boosted") val isBoosted: Boolean? = null,
    @SerialName("seen_count") val seenCount: Int? = null,
) {
    fun toDiscoveryCard(): DiscoveryProfileCard =
        DiscoveryProfileCard(
            id = id,
            displayName = fullName,
            username = username,
            gender = gender,
            age = age,
            university = university,
            faculty = faculty,
            department = department,
            level = level,
            bio = bio,
            avatarUrl = avatarUrl,
            photos = photos.orEmpty().filterNot(String::isBlank),
            profilePhotos = profilePhotos.orEmpty().filterNot(String::isBlank),
            interests = interests.orEmpty().filterNot(String::isBlank),
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            attractionGoal = attractionGoal,
            isVerified = isVerified == true,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
            isLive = isLive == true,
            isBoosted = isBoosted == true,
            seenCount = seenCount,
        )

    fun toMatchedProfile(): MatchedProfile =
        MatchedProfile(
            id = id,
            displayName = fullName,
            username = username,
            gender = gender,
            age = age,
            university = university,
            faculty = faculty,
            department = department,
            level = level,
            bio = bio,
            avatarUrl = avatarUrl,
            photos = photos.orEmpty().filterNot(String::isBlank),
            profilePhotos = profilePhotos.orEmpty().filterNot(String::isBlank),
            interests = interests.orEmpty().filterNot(String::isBlank),
            introPrompt = introPrompt,
            voiceIntroUrl = voiceIntroUrl,
            anthem = anthem,
            attractionGoal = attractionGoal,
            isVerified = isVerified == true,
            completionScore = completionScore,
            lastSeenAt = lastSeenAt,
            lastActive = lastActive,
            isLive = isLive == true,
        )
}
