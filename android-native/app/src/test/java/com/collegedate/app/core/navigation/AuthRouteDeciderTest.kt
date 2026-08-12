package com.collegedate.app.core.navigation

import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.auth.UserSession
import org.junit.Assert.assertEquals
import org.junit.Test

class AuthRouteDeciderTest {
    private val session = UserSession(
        userId = "user-1",
        email = "student@example.com",
        isEmailVerified = true,
        isOnboarded = true,
    )

    @Test
    fun signedOutUsersGoToWelcome() {
        assertEquals(AppRoute.Welcome, AuthRouteDecider.destinationFor(AuthState.SignedOut))
    }

    @Test
    fun missingConfigurationGoesToWelcome() {
        assertEquals(AppRoute.Welcome, AuthRouteDecider.destinationFor(AuthState.ConfigurationMissing))
    }

    @Test
    fun emailVerificationRequiredGoesToVerificationScreen() {
        assertEquals(
            AppRoute.EmailVerification,
            AuthRouteDecider.destinationFor(AuthState.EmailVerificationRequired("student@example.com")),
        )
    }

    @Test
    fun authenticatedOnboardedUsersGoToMain() {
        assertEquals(AppRoute.Main, AuthRouteDecider.destinationFor(AuthState.SignedIn(session)))
    }

    @Test
    fun authenticatedUsersWithoutOnboardingGoToOnboarding() {
        assertEquals(
            AppRoute.Onboarding,
            AuthRouteDecider.destinationFor(AuthState.NeedsOnboarding(session.copy(isOnboarded = false))),
        )
    }

    @Test
    fun expiredOrSignedOutSessionRoutesAwayFromMain() {
        assertEquals(AppRoute.Welcome, AuthRouteDecider.destinationFor(AuthState.SignedOut))
    }

    @Test
    fun noSessionRoutesFromSplashToWelcome() {
        assertEquals(
            true,
            AuthRouteDecider.shouldNavigate(AuthState.SignedOut, AppRoute.Splash.route),
        )
    }

    @Test
    fun signedOutStatePreservesLoginForm() {
        assertEquals(
            false,
            AuthRouteDecider.shouldNavigate(AuthState.SignedOut, AppRoute.Login.route),
        )
    }

    @Test
    fun loginLoadingDoesNotNavigateBackToSplash() {
        assertEquals(
            false,
            AuthRouteDecider.shouldNavigate(AuthState.Checking, AppRoute.Login.route),
        )
    }

    @Test
    fun authenticatedStateRoutesFromLoginToMain() {
        assertEquals(
            true,
            AuthRouteDecider.shouldNavigate(AuthState.SignedIn(session), AppRoute.Login.route),
        )
    }

    @Test
    fun authenticatedStatePreservesMainDestination() {
        assertEquals(
            false,
            AuthRouteDecider.shouldNavigate(AuthState.SignedIn(session), AppRoute.Main.route),
        )
    }
}
