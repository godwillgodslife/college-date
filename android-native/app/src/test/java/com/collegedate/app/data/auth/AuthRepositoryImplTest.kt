package com.collegedate.app.data.auth

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.datastore.SessionPreferences
import com.collegedate.app.core.network.PublicSupabaseConfig
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.UserProfile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryImplTest {
    private val dispatcher = StandardTestDispatcher()

    @Test
    fun restoreSessionRoutesOnboardedUserToSignedIn() = runTest(dispatcher) {
        val repository = repository(
            remote = FakeAuthRemoteDataSource(
                currentUser = RemoteAuthUser("user-1", "student@example.com", true),
            ),
            profile = FakeProfileRepository(
                profile = UserProfile("user-1", "Ada", "ada", null, true),
            ),
            scope = this,
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
) : AuthRemoteDataSource {
    var didSignOut = false

    override fun observeAuthStatus(): Flow<RemoteAuthStatus> = emptyFlow()

    override suspend fun currentUser(): RemoteAuthUser? = currentUser

    override suspend fun signIn(email: String, password: String): RemoteAuthUser =
        currentUser ?: RemoteAuthUser("user-1", email, true)

    override suspend fun signUp(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): RemoteAuthUser = currentUser ?: RemoteAuthUser("user-1", email, false)

    override suspend fun resetPassword(email: String, redirectUrl: String) = Unit

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
