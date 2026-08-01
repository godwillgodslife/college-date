package com.collegedate.app.domain.profile

data class UserProfile(
    val id: String,
    val displayName: String?,
    val username: String?,
    val avatarUrl: String?,
    val isOnboarded: Boolean,
)
