package com.collegedate.app.feature.auth

import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole

data class AuthUiState(
    val authState: AuthState = AuthState.Checking,
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val selectedRole: RegistrationRole = RegistrationRole.Male,
    val referralCode: String = "",
    val isSubmitting: Boolean = false,
    val loginError: String? = null,
    val registrationError: String? = null,
    val passwordResetError: String? = null,
    val passwordResetSent: Boolean = false,
)
