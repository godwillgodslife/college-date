package com.collegedate.app.core.navigation

import com.collegedate.app.domain.auth.AuthState

object AuthRouteDecider {
    fun destinationFor(authState: AuthState): AppRoute =
        when (authState) {
            AuthState.Checking -> AppRoute.Splash
            AuthState.ConfigurationMissing -> AppRoute.Welcome
            AuthState.SignedOut -> AppRoute.Welcome
            is AuthState.EmailVerificationRequired -> AppRoute.EmailVerification
            is AuthState.NeedsOnboarding -> AppRoute.Onboarding
            is AuthState.SignedIn -> AppRoute.Main
        }

    fun isPublicAuthRoute(route: String?): Boolean =
        route == AppRoute.Welcome.route ||
            route == AppRoute.Login.route ||
            route == AppRoute.Register.route ||
            route == AppRoute.PasswordRecovery.route ||
            route == AppRoute.EmailVerification.route
}
