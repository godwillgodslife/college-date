package com.collegedate.app.core.navigation

sealed interface AppRoute {
    val route: String

    data object Splash : AppRoute {
        override val route = "splash"
    }

    data object Welcome : AppRoute {
        override val route = "welcome"
    }

    data object Login : AppRoute {
        override val route = "login"
    }

    data object Register : AppRoute {
        override val route = "register"
    }

    data object PasswordRecovery : AppRoute {
        override val route = "password-recovery"
    }

    data object EmailVerification : AppRoute {
        override val route = "email-verification"
    }

    data object Onboarding : AppRoute {
        override val route = "onboarding"
    }

    data object Main : AppRoute {
        override val route = "main"
    }

    data object Discovery : AppRoute {
        override val route = "main/discovery"
    }

    data object Matches : AppRoute {
        override val route = "main/matches"
    }

    data object Messages : AppRoute {
        override val route = "main/messages"
    }

    data object Profile : AppRoute {
        override val route = "main/profile"
    }

    data object Premium : AppRoute {
        override val route = "main/premium"
    }

    data object Wallet : AppRoute {
        override val route = "main/wallet"
    }

    data object Referrals : AppRoute {
        override val route = "main/referrals"
    }

    data object Leaderboard : AppRoute {
        override val route = "main/leaderboard"
    }

    data object Settings : AppRoute {
        override val route = "main/settings"
    }
}
