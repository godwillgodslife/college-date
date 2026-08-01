package com.collegedate.app.domain.auth

data class UserSession(
    val userId: String,
    val email: String?,
    val isEmailVerified: Boolean,
    val isOnboarded: Boolean,
)

sealed interface AuthState {
    data object Checking : AuthState
    data object SignedOut : AuthState
    data object ConfigurationMissing : AuthState
    data class EmailVerificationRequired(val email: String?) : AuthState
    data class NeedsOnboarding(val session: UserSession) : AuthState
    data class SignedIn(val session: UserSession) : AuthState
}

enum class RegistrationRole {
    Male,
    Female,
}
