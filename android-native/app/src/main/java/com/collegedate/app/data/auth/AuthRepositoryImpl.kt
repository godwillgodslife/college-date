package com.collegedate.app.data.auth

import com.collegedate.app.core.common.ApplicationScope
import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.datastore.SessionPreferences
import com.collegedate.app.core.network.PublicSupabaseConfig
import com.collegedate.app.data.messaging.MessagingRepository
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole
import com.collegedate.app.domain.auth.UserSession
import com.collegedate.app.domain.profile.ProfileRepository
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val config: PublicSupabaseConfig,
    private val remoteDataSource: AuthRemoteDataSource,
    private val profileRepository: ProfileRepository,
    private val messagingRepository: MessagingRepository,
    private val appPreferences: SessionPreferences,
    private val dispatchersProvider: DispatchersProvider,
    @param:ApplicationScope private val applicationScope: CoroutineScope,
) : AuthRepository {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Checking)
    override val authState: StateFlow<AuthState> = _authState

    init {
        if (!config.isConfigured) {
            _authState.value = AuthState.ConfigurationMissing
        } else {
            applicationScope.launch(dispatchersProvider.io) {
                remoteDataSource.observeAuthStatus().collect { status ->
                    when (status) {
                        RemoteAuthStatus.Initializing -> _authState.value = AuthState.Checking
                        RemoteAuthStatus.RefreshFailure,
                        RemoteAuthStatus.SignedOut,
                        -> {
                            appPreferences.clearPersonalState()
                            profileRepository.clearAllLocalProfiles()
                            messagingRepository.clearAllLocalMessages()
                            _authState.value = AuthState.SignedOut
                        }

                        is RemoteAuthStatus.Authenticated -> {
                            _authState.value = hydrateSession(status.user)
                        }
                    }
                }
            }
        }
    }

    override suspend fun restoreSession(): OperationResult<AuthState> =
        withContext(dispatchersProvider.io) {
            if (!config.isConfigured) {
                val state = AuthState.ConfigurationMissing
                _authState.value = state
                return@withContext OperationResult.Success(state)
            }

            runCatching {
                val user = remoteDataSource.currentUser()
                if (user == null) {
                    appPreferences.clearPersonalState()
                    profileRepository.clearAllLocalProfiles()
                    messagingRepository.clearAllLocalMessages()
                    AuthState.SignedOut
                } else {
                    hydrateSession(user)
                }
            }.fold(
                onSuccess = {
                    _authState.value = it
                    OperationResult.Success(it)
                },
                onFailure = { throwable ->
                    failureFor(throwable, "We could not restore your session.")
                },
            )
        }

    override suspend fun login(
        email: String,
        password: String,
    ): OperationResult<AuthState> =
        withContext(dispatchersProvider.io) {
            if (!config.isConfigured) return@withContext configFailure()
            _authState.value = AuthState.Checking
            runCatching {
                hydrateSession(remoteDataSource.signIn(email, password))
            }.fold(
                onSuccess = {
                    _authState.value = it
                    OperationResult.Success(it)
                },
                onFailure = { throwable ->
                    _authState.value = AuthState.SignedOut
                    failureFor(throwable, "Unable to sign in.")
                },
            )
        }

    override suspend fun register(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): OperationResult<AuthState> =
        withContext(dispatchersProvider.io) {
            if (!config.isConfigured) return@withContext configFailure()
            _authState.value = AuthState.Checking
            runCatching {
                val user = remoteDataSource.signUp(email, password, role, referralCode)
                val state = if (user.isEmailVerified) {
                    hydrateSession(user)
                } else {
                    AuthState.EmailVerificationRequired(user.email)
                }
                state
            }.fold(
                onSuccess = {
                    _authState.value = it
                    OperationResult.Success(it)
                },
                onFailure = { throwable ->
                    _authState.value = AuthState.SignedOut
                    failureFor(throwable, "Unable to create your account.")
                },
            )
        }

    override suspend fun requestPasswordReset(email: String): OperationResult<Unit> =
        withContext(dispatchersProvider.io) {
            if (!config.isConfigured) return@withContext configFailure()
            runCatching {
                remoteDataSource.resetPassword(email, config.passwordResetCallbackUrl)
            }.fold(
                onSuccess = { OperationResult.Success(Unit) },
                onFailure = { throwable ->
                    failureFor(throwable, "Unable to send a password reset email.")
                },
            )
        }

    override suspend fun logout(): OperationResult<Unit> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.signOut()
                appPreferences.clearPersonalState()
                profileRepository.clearAllLocalProfiles()
                messagingRepository.clearAllLocalMessages()
            }.fold(
                onSuccess = {
                    _authState.value = AuthState.SignedOut
                    OperationResult.Success(Unit)
                },
                onFailure = { throwable ->
                    _authState.value = AuthState.SignedOut
                    failureFor(throwable, "You have been signed out locally.")
                },
            )
        }

    override suspend fun markOnboardingComplete() {
        appPreferences.setHasCompletedOnboarding(true)
        val current = _authState.value
        if (current is AuthState.NeedsOnboarding) {
            _authState.value = AuthState.SignedIn(current.session.copy(isOnboarded = true))
        }
    }

    private suspend fun hydrateSession(user: RemoteAuthUser): AuthState {
        val profile = profileRepository.refreshCurrentUserProfile(user.userId)
        val isOnboarded = when (profile) {
            is OperationResult.Success -> profile.value?.isOnboarded == true
            is OperationResult.Failure -> false
        }
        appPreferences.setLastUserId(user.userId)
        appPreferences.setHasCompletedOnboarding(isOnboarded)
        val session = UserSession(
            userId = user.userId,
            email = user.email,
            isEmailVerified = user.isEmailVerified,
            isOnboarded = isOnboarded,
        )
        return if (isOnboarded) AuthState.SignedIn(session) else AuthState.NeedsOnboarding(session)
    }

    private fun configFailure(): OperationResult.Failure =
        OperationResult.Failure(
            FailureType.Configuration,
            "Supabase public client configuration is missing.",
        )

    private fun failureFor(throwable: Throwable, fallbackMessage: String): OperationResult.Failure {
        val rawMessage = throwable.message.orEmpty()
        val type = when {
            throwable is IOException -> FailureType.Network
            rawMessage.contains("invalid login", ignoreCase = true) ||
                rawMessage.contains("invalid credentials", ignoreCase = true) ||
                rawMessage.contains("invalid_grant", ignoreCase = true) -> FailureType.InvalidCredentials
            rawMessage.contains("network", ignoreCase = true) ||
                rawMessage.contains("timeout", ignoreCase = true) -> FailureType.Network
            else -> FailureType.Unknown
        }
        val safeMessage = when (type) {
            FailureType.InvalidCredentials -> "Email or password is incorrect."
            FailureType.Network -> "Check your connection and try again."
            else -> fallbackMessage
        }
        return OperationResult.Failure(type, safeMessage)
    }
}
