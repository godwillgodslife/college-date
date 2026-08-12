package com.collegedate.app.data.auth

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.datastore.SessionPreferences
import com.collegedate.app.core.network.PublicSupabaseConfig
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole
import com.collegedate.app.domain.profile.EditableProfile
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.ProfilePhoto
import com.collegedate.app.domain.profile.University
import com.collegedate.app.domain.profile.UserProfile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryImplTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Test
    fun restoreSessionRoutesOnboardedUserToSignedIn() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                currentUser = RemoteAuthUser("user-1", "student@example.com", true),
            ),
            profile = FakeProfileRepository(
                profile = UserProfile("user-1", "Ada", "ada", null, true),
            ),
            scope = backgroundScope,
        )

        val result = repository.restoreSession()

        assertTrue(result is OperationResult.Success)
        assertTrue((result as OperationResult.Success).value is AuthState.SignedIn)
    }

    @Test
    fun restoreSessionWithoutProfileRoutesToOnboarding() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                currentUser = RemoteAuthUser("user-1", "student@example.com", true),
            ),
            profile = FakeProfileRepository(profile = null),
            scope = this,
        )

        val result = repository.restoreSession()

        assertTrue(result is OperationResult.Success)
        assertTrue((result as OperationResult.Success).value is AuthState.NeedsOnboarding)
    }

    @Test
    fun loginSuccessCreatesSignedInSession() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(),
            profile = FakeProfileRepository(
                profile = UserProfile("user-1", "Ada", "ada", null, true),
            ),
            scope = this,
        )

        val result = repository.login("student@example.com", "safe-password")

        assertTrue(result is OperationResult.Success)
        assertTrue((result as OperationResult.Success).value is AuthState.SignedIn)
        assertEquals(result.value, repository.authState.value)
    }

    @Test
    fun loginInvalidCredentialsReturnsSafeMessage() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                signInError = IllegalArgumentException("invalid login credentials: token abc123"),
            ),
            scope = this,
        )

        val result = repository.login("student@example.com", "wrong-password")

        assertTrue(result is OperationResult.Failure)
        assertEquals("Email or password is incorrect.", (result as OperationResult.Failure).message)
        assertEquals(AuthState.SignedOut, repository.authState.value)
    }

    @Test
    fun loginNetworkFailureReturnsSafeMessage() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                signInError = java.io.IOException("timeout while connecting"),
            ),
            scope = this,
        )

        val result = repository.login("student@example.com", "safe-password")

        assertTrue(result is OperationResult.Failure)
        assertEquals("Check your connection and try again.", (result as OperationResult.Failure).message)
        assertEquals(AuthState.SignedOut, repository.authState.value)
    }

    @Test
    fun registrationWithoutVerifiedEmailRoutesToVerification() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                signUpUser = RemoteAuthUser("user-1", "new-student@example.com", false),
            ),
            scope = this,
        )

        val result = repository.register(
            email = "new-student@example.com",
            password = "safe-password",
            role = RegistrationRole.Male,
            referralCode = null,
        )

        assertTrue(result is OperationResult.Success)
        assertTrue((result as OperationResult.Success).value is AuthState.EmailVerificationRequired)
    }

    @Test
    fun passwordResetRequestReturnsSuccess() = runTest(dispatcher) {
        val remote = FakeAuthRemoteDataSource()
        val repository = repository(remote = remote, scope = this)

        val result = repository.requestPasswordReset("student@example.com")

        assertTrue(result is OperationResult.Success)
        assertEquals("student@example.com", remote.lastPasswordResetEmail)
        assertEquals("com.collegedate.app://reset-password", remote.lastPasswordResetRedirectUrl)
    }

    @Test
    fun authStatusObservationRoutesAuthenticatedUser() = runTest(dispatcher) {
        val statuses = MutableStateFlow<RemoteAuthStatus>(RemoteAuthStatus.Initializing)
        val repository = repository(
            remote = FakeAuthRemoteDataSource(statuses = statuses),
            profile = FakeProfileRepository(
                profile = UserProfile("user-1", "Ada", "ada", null, true),
            ),
            scope = backgroundScope,
        )

        advanceUntilIdle()
        statuses.value = RemoteAuthStatus.Authenticated(
            RemoteAuthUser("user-1", "student@example.com", true),
        )
        advanceUntilIdle()

        assertTrue(repository.authState.value is AuthState.SignedIn)
    }

    @Test
    fun authStatusObservationClearsLocalStateAfterSignOut() = runTest(dispatcher) {
        val statuses = MutableStateFlow<RemoteAuthStatus>(RemoteAuthStatus.Initializing)
        val preferences = FakeSessionPreferences()
        val repository = repository(
            remote = FakeAuthRemoteDataSource(statuses = statuses),
            preferences = preferences,
            scope = backgroundScope,
        )

        advanceUntilIdle()
        statuses.value = RemoteAuthStatus.SignedOut
        advanceUntilIdle()

        assertTrue(preferences.didClear)
        assertEquals(AuthState.SignedOut, repository.authState.value)
    }

    @Test
    fun logoutClearsLocalState() = runTest(dispatcher) {
        val remote = FakeAuthRemoteDataSource()
        val preferences = FakeSessionPreferences()
        val profile = FakeProfileRepository(profile = null)
        val repository = repository(remote, profile, preferences, this)

        val result = repository.logout()

        assertTrue(result is OperationResult.Success)
        assertTrue(remote.didSignOut)
        assertTrue(preferences.didClear)
        assertTrue(profile.didClearAll)
        assertEquals(AuthState.SignedOut, repository.authState.value)
    }

    private fun repository(
        remote: AuthRemoteDataSource = FakeAuthRemoteDataSource(),
        profile: FakeProfileRepository = FakeProfileRepository(profile = null),
        preferences: FakeSessionPreferences = FakeSessionPreferences(),
        scope: CoroutineScope,
    ): AuthRepositoryImpl =
        AuthRepositoryImpl(
            config = PublicSupabaseConfig(
                url = "https://example.supabase.co",
                anonKey = "anon",
                environment = "STAGING",
                projectRef = "pxobauvatbjncluuunyq",
                showEnvironmentBadge = true,
                callbackScheme = "com.collegedate.app",
                callbackHost = "auth",
                callbackPath = "callback",
                passwordResetHost = "reset-password",
            ),
            remoteDataSource = remote,
            profileRepository = profile,
            appPreferences = preferences,
            dispatchersProvider = TestDispatchersProvider(dispatcher),
            applicationScope = scope,
        )
}

private class FakeAuthRemoteDataSource(
    private val currentUser: RemoteAuthUser? = null,
    private val signInError: Throwable? = null,
    private val signUpUser: RemoteAuthUser? = null,
    private val statuses: Flow<RemoteAuthStatus> = emptyFlow(),
) : AuthRemoteDataSource {
    var didSignOut = false
    var lastPasswordResetEmail: String? = null
    var lastPasswordResetRedirectUrl: String? = null

    override fun observeAuthStatus(): Flow<RemoteAuthStatus> = statuses

    override suspend fun currentUser(): RemoteAuthUser? = currentUser

    override suspend fun signIn(email: String, password: String): RemoteAuthUser {
        signInError?.let { throw it }
        return currentUser ?: RemoteAuthUser("user-1", email, true)
    }

    override suspend fun signUp(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): RemoteAuthUser = signUpUser ?: currentUser ?: RemoteAuthUser("user-1", email, false)

    override suspend fun resetPassword(email: String, redirectUrl: String) {
        lastPasswordResetEmail = email
        lastPasswordResetRedirectUrl = redirectUrl
    }

    override suspend fun signOut() {
        didSignOut = true
    }
}

private class FakeProfileRepository(
    private val profile: UserProfile?,
) : ProfileRepository {
    var didClearAll = false

    override fun observeCachedProfile(profileId: String): Flow<UserProfile?> =
        MutableStateFlow(profile)

    override suspend fun refreshCurrentUserProfile(profileId: String): OperationResult<UserProfile?> =
        OperationResult.Success(profile)

    override suspend fun refreshCurrentUserProfile(): OperationResult<UserProfile?> =
        OperationResult.Success(profile)

    override suspend fun updateCurrentProfile(profile: EditableProfile): OperationResult<UserProfile> =
        OperationResult.Success(
            UserProfile(
                id = "user-1",
                displayName = profile.fullName,
                username = "student",
                avatarUrl = profile.avatarUrl,
                isOnboarded = profile.isOnboarded == true,
            ),
        )

    override suspend fun completeOnboarding(profile: EditableProfile): OperationResult<UserProfile> =
        updateCurrentProfile(profile.copy(isOnboarded = true))

    override suspend fun uploadProfilePhoto(
        ownerUserId: String,
        bytes: ByteArray,
        contentType: String,
    ): OperationResult<ProfilePhoto> =
        OperationResult.Success(ProfilePhoto("https://example.com/photo.jpg", "$ownerUserId/photo.jpg", true))

    override fun searchUniversities(query: String): List<University> = emptyList()

    override suspend fun clearLocalProfile(profileId: String) = Unit

    override suspend fun clearAllLocalProfiles() {
        didClearAll = true
    }
}

private class FakeSessionPreferences : SessionPreferences {
    var didClear = false

    override suspend fun setLastUserId(userId: String?) = Unit

    override suspend fun setHasCompletedOnboarding(value: Boolean?) = Unit

    override suspend fun clearPersonalState() {
        didClear = true
    }
}
