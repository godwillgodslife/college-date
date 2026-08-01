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
    fun loginBlankPasswordSetsValidationError() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository())

        viewModel.onEmailChange("student@example.com")
        viewModel.onPasswordChange("")
        viewModel.submitLogin()

        assertEquals("Enter your password.", viewModel.uiState.value.loginError)
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
    fun registrationSuccessClearsPasswordsAndUpdatesAuthState() = runTest {
        val repository = FakeAuthRepository(
            registerResult = OperationResult.Success(
                AuthState.EmailVerificationRequired("new-student@example.com"),
            ),
        )
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("new-student@example.com")
        viewModel.onPasswordChange("safe-password")
        viewModel.onConfirmPasswordChange("safe-password")
        viewModel.submitRegistration()

        assertEquals("", viewModel.uiState.value.password)
        assertEquals("", viewModel.uiState.value.confirmPassword)
        assertTrue(viewModel.uiState.value.authState is AuthState.EmailVerificationRequired)
    }

    @Test
    fun registrationFailureSetsErrorAndStopsLoading() = runTest {
        val repository = FakeAuthRepository(
            registerResult = OperationResult.Failure(FailureType.Unknown, "Unable to create your account."),
        )
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("new-student@example.com")
        viewModel.onPasswordChange("safe-password")
        viewModel.onConfirmPasswordChange("safe-password")
        viewModel.submitRegistration()

        assertFalse(viewModel.uiState.value.isSubmitting)
        assertEquals("Unable to create your account.", viewModel.uiState.value.registrationError)
    }

    @Test
    fun passwordResetSuccessSetsSentState() = runTest {
        val repository = FakeAuthRepository()
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("student@example.com")
        viewModel.requestPasswordReset()

        assertTrue(repository.didRequestPasswordReset)
        assertTrue(viewModel.uiState.value.passwordResetSent)
    }

    @Test
    fun passwordResetFailureSetsErrorAndStopsLoading() = runTest {
        val repository = FakeAuthRepository(
            passwordResetResult = OperationResult.Failure(
                FailureType.Network,
                "Check your connection and try again.",
            ),
        )
        val viewModel = AuthViewModel(repository)

        viewModel.onEmailChange("student@example.com")
        viewModel.requestPasswordReset()

        assertFalse(viewModel.uiState.value.isSubmitting)
        assertEquals("Check your connection and try again.", viewModel.uiState.value.passwordResetError)
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
    private val registerResult: OperationResult<AuthState> = loginResult,
    private val passwordResetResult: OperationResult<Unit> = OperationResult.Success(Unit),
) : AuthRepository {
    private val state = MutableStateFlow<AuthState>(AuthState.SignedOut)
    var didLogout = false
    var didRequestPasswordReset = false

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
    ): OperationResult<AuthState> {
        if (registerResult is OperationResult.Success) {
            state.value = registerResult.value
        }
        return registerResult
    }

    override suspend fun requestPasswordReset(email: String): OperationResult<Unit> {
        didRequestPasswordReset = true
        return passwordResetResult
    }

    override suspend fun logout(): OperationResult<Unit> {
        didLogout = true
        state.value = AuthState.SignedOut
        return OperationResult.Success(Unit)
    }

    override suspend fun markOnboardingComplete() = Unit
}
