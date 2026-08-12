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

    fun shouldNavigate(authState: AuthState, currentRoute: String?): Boolean {
        if (currentRoute == null) return false

        val targetRoute = destinationFor(authState).route
        if (currentRoute == targetRoute) return false

        return when (authState) {
            AuthState.Checking -> false
            AuthState.SignedOut,
            AuthState.ConfigurationMissing,
            -> currentRoute != AppRoute.Welcome.route &&
                currentRoute != AppRoute.Login.route &&
                currentRoute != AppRoute.Register.route &&
                currentRoute != AppRoute.PasswordRecovery.route

            is AuthState.EmailVerificationRequired -> true
            is AuthState.NeedsOnboarding -> true
            is AuthState.SignedIn ->
                currentRoute != AppRoute.Main.route && !currentRoute.startsWith("main/")
        }
    }
}
