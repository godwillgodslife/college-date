package com.collegedate.app.feature.onboarding

import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.testing.MainDispatcherRule
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.RegistrationRole
import com.collegedate.app.domain.auth.UserSession
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.UserProfile
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OnboardingViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(dispatcher)

    @Test
    fun profileRetryRoutesAlreadyOnboardedUserToMain() = runTest(dispatcher) {
        val session = UserSession(
            userId = "user-1",
            email = "student@example.com",
            isEmailVerified = true,
            isOnboarded = false,
        )
        val authState = MutableStateFlow<AuthState>(AuthState.NeedsOnboarding(session))
        val authRepository = mockk<AuthRepository>()
        every { authRepository.authState } returns authState
        coEvery { authRepository.markOnboardingComplete() } answers {
            authState.value = AuthState.SignedIn(session.copy(isOnboarded = true))
        }
        val profileRepository = mockk<ProfileRepository>()
        coEvery { profileRepository.refreshCurrentUserProfile("user-1") } returnsMany listOf(
            OperationResult.Failure(FailureType.Network, "Unable to load profile state."),
            OperationResult.Success(
                UserProfile(
                    id = "user-1",
                    displayName = "Ada",
                    username = "ada",
                    avatarUrl = null,
                    isOnboarded = true,
                ),
            ),
        )

        val viewModel = OnboardingViewModel(authRepository, profileRepository)
        advanceUntilIdle()
        assertTrue(viewModel.uiState.value.error != null)

        viewModel.loadProfile()
        advanceUntilIdle()

        assertNull(viewModel.uiState.value.error)
        assertTrue(authState.value is AuthState.SignedIn)
        coVerify(exactly = 1) { authRepository.markOnboardingComplete() }
    }
}
