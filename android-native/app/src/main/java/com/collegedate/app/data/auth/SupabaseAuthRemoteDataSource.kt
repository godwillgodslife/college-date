package com.collegedate.app.data.auth

import com.collegedate.app.core.network.PublicSupabaseConfig
import com.collegedate.app.domain.auth.RegistrationRole
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

class SupabaseAuthRemoteDataSource @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val config: PublicSupabaseConfig,
) : AuthRemoteDataSource {
    override fun observeAuthStatus(): Flow<RemoteAuthStatus> =
        supabaseClient.auth.sessionStatus.map { status ->
            when (status) {
                is SessionStatus.Authenticated -> {
                    val user = status.session.user
                    RemoteAuthStatus.Authenticated(
                        RemoteAuthUser(
                            userId = user?.id.orEmpty(),
                            email = user?.email,
                            isEmailVerified = user?.emailConfirmedAt != null,
                        ),
                    )
                }

                SessionStatus.Initializing -> RemoteAuthStatus.Initializing
                is SessionStatus.NotAuthenticated -> RemoteAuthStatus.SignedOut
                is SessionStatus.RefreshFailure -> RemoteAuthStatus.RefreshFailure
            }
        }

    override suspend fun currentUser(): RemoteAuthUser? {
        val user = supabaseClient.auth.currentUserOrNull() ?: return null
        return RemoteAuthUser(
            userId = user.id,
            email = user.email,
            isEmailVerified = user.emailConfirmedAt != null,
        )
    }

    override suspend fun signIn(email: String, password: String): RemoteAuthUser {
        supabaseClient.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
        return requireNotNull(currentUser()) { "Supabase login completed without a user." }
    }

    override suspend fun signUp(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): RemoteAuthUser {
        supabaseClient.auth.signUpWith(Email) {
            this.email = email.trim()
            this.password = password
            data = buildJsonObject {
                put("role", role.name)
                referralCode?.trim()?.takeIf { it.isNotEmpty() }?.let { put("referral_code", it) }
            }
        }
        return requireNotNull(currentUser()) { "Supabase registration completed without a user." }
    }

    override suspend fun resetPassword(email: String, redirectUrl: String) {
        supabaseClient.auth.resetPasswordForEmail(
            email = email.trim(),
            redirectUrl = redirectUrl.ifBlank { config.passwordResetCallbackUrl },
        )
    }

    override suspend fun signOut() {
        supabaseClient.auth.signOut()
    }
}
