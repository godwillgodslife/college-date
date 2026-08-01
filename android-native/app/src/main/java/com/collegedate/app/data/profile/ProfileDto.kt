package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.UserProfile
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProfileDto(
    val id: String,
    @SerialName("name") val displayName: String? = null,
    @SerialName("username") val username: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("is_onboarded") val isOnboarded: Boolean? = null,
) {
    fun toDomain(): UserProfile =
        UserProfile(
            id = id,
            displayName = displayName,
            username = username,
            avatarUrl = avatarUrl,
            isOnboarded = isOnboarded == true,
        )
}
