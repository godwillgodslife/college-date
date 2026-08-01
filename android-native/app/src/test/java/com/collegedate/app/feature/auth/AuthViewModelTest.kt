package com.collegedate.app.feature.auth

import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.testing.MainDispatcherRule
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole
import com.collegedate.app.domain.auth.UserSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class AuthViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun loginValidationSetsErrorState() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository())

        viewModel.onEmailChange("bad-email")
        viewModel.onPasswordChange("password")
        viewModel.submitLogin()

        assertEquals("Enter a valid email address.", viewModel.uiState.value.loginError)
    }

    @Test
    fun loginSuccessClearsPasswordAndUpdatesAuthState() = runTest {
        val repository = FakeAuthRepository()
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("student@example.com")
        viewModel.onPasswordChange("password")
        viewModel.submitLogin()

        assertEquals("", viewModel.uiState.value.password)
        assertTrue(viewModel.uiState.value.authState is AuthState.SignedIn)
    }

    @Test
    fun loginFailureSetsErrorAndStopsLoading() = runTest {
        val repository = FakeAuthRepository(
            loginResult = OperationResult.Failure(FailureType.Network, "Check your connection and try again."),
        )
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("student@example.com")
        viewModel.onPasswordChange("password")
        viewModel.submitLogin()

        assertFalse(viewModel.uiState.value.isSubmitting)
        assertEquals("Check your connection and try again.", viewModel.uiState.value.loginError)
    }

    @Test
    fun logoutDelegatesToRepository() = runTest {
        val repository = FakeAuthRepository()
        val viewModel = AuthViewModel(repository)

        viewModel.logout()

        assertTrue(repository.didLogout)
        assertEquals(AuthState.SignedOut, viewModel.uiState.value.authState)
    }
}

private class FakeAuthRepository(
    private val loginResult: OperationResult<AuthState> = OperationResult.Success(
        AuthState.SignedIn(
            UserSession(
                userId = "user-1",
                email = "student@example.com",
                isEmailVerified = true,
                isOnboarded = true,
            ),
        ),
    ),
) : AuthRepository {
    private val state = MutableStateFlow<AuthState>(AuthState.SignedOut)
    var didLogout = false

    override val authState: StateFlow<AuthState> = state

    override suspend fun restoreSession(): OperationResult<AuthState> =
        OperationResult.Success(state.value)

    override suspend fun login(email: String, password: String): OperationResult<AuthState> {
        if (loginResult is OperationResult.Success) {
            state.value = loginResult.value
        }
        return loginResult
    }

    override suspend fun register(
        email: String,
        password: String,
        role: RegistrationRole,
        referralCode: String?,
    ): OperationResult<AuthState> = login(email, password)

    override suspend fun requestPasswordReset(email: String): OperationResult<Unit> =
        OperationResult.Success(Unit)

    override suspend fun logout(): OperationResult<Unit> {
        didLogout = true
        state.value = AuthState.SignedOut
        return OperationResult.Success(Unit)
    }

    override suspend fun markOnboardingComplete() = Unit
}
