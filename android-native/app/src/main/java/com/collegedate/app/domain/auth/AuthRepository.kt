package com.collegedate.app.domain.auth

import com.collegedate.app.core.common.OperationResult
import kotlinx.coroutines.flow.StateFlow

interface AuthRepository {
    val authState: StateFlow<AuthState>

    suspend fun restoreSession(): OperationResult<AuthState>
    suspend fun login(email: String, password: String): OperationResult<AuthState>
    suspend fun register(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): OperationResult<AuthState>

    suspend fun requestPasswordReset(email: String): OperationResult<Unit>
    suspend fun logout(): OperationResult<Unit>
    suspend fun markOnboardingComplete()
}
