package com.collegedate.app.data.auth

import com.collegedate.app.domain.auth.RegistrationRole
import kotlinx.coroutines.flow.Flow

interface AuthRemoteDataSource {
    fun observeAuthStatus(): Flow<RemoteAuthStatus>
    suspend fun currentUser(): RemoteAuthUser?
    suspend fun signIn(email: String, password: String): RemoteAuthUser
    suspend fun signUp(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): RemoteAuthUser

    suspend fun resetPassword(email: String, redirectUrl: String)
    suspend fun signOut()
}

data class RemoteAuthUser(
    val userId: String,
    val email: String?,
    val isEmailVerified: Boolean,
)

sealed interface RemoteAuthStatus {
    data object Initializing : RemoteAuthStatus
    data object SignedOut : RemoteAuthStatus
    data object RefreshFailure : RemoteAuthStatus
    data class Authenticated(val user: RemoteAuthUser) : RemoteAuthStatus
}
