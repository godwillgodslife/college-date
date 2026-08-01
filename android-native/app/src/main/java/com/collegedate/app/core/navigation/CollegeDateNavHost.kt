package com.collegedate.app.core.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.feature.auth.AuthViewModel
import com.collegedate.app.feature.auth.EmailVerificationScreen
import com.collegedate.app.feature.auth.LoginScreen
import com.collegedate.app.feature.auth.PasswordRecoveryScreen
import com.collegedate.app.feature.auth.RegistrationScreen
import com.collegedate.app.feature.auth.WelcomeScreen
import com.collegedate.app.feature.main.MainShell
import com.collegedate.app.feature.onboarding.OnboardingPlaceholderScreen
import com.collegedate.app.feature.splash.SplashScreen

@Composable
fun CollegeDateNavHost(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val uiState = authViewModel.uiState.collectAsStateWithLifecycle().value
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    LaunchedEffect(uiState.authState, currentRoute) {
        val target = AuthRouteDecider.destinationFor(uiState.authState)
        val route = currentRoute

        val shouldNavigate =
            route != target.route &&
                when (uiState.authState) {
                    AuthState.Checking -> route != AppRoute.Splash.route
                    AuthState.SignedOut,
                    AuthState.ConfigurationMissing,
                    -> route?.startsWith("main/") == true || route == AppRoute.Onboarding.route
                    is AuthState.EmailVerificationRequired -> route != AppRoute.EmailVerification.route
                    is AuthState.NeedsOnboarding -> route != AppRoute.Onboarding.route
                    is AuthState.SignedIn -> route?.startsWith("main/") != true
                }

        if (shouldNavigate) {
            navController.navigate(target.route) {
                popUpTo(AppRoute.Splash.route) {
                    inclusive = true
                }
                launchSingleTop = true
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = AppRoute.Splash.route,
    ) {
        composable(AppRoute.Splash.route) {
            SplashScreen()
        }
        composable(AppRoute.Welcome.route) {
            WelcomeScreen(
                configurationMissing = uiState.authState is AuthState.ConfigurationMissing,
                onLoginClick = { navController.navigate(AppRoute.Login.route) },
                onRegisterClick = { navController.navigate(AppRoute.Register.route) },
            )
        }
        composable(AppRoute.Login.route) {
            LoginScreen(
                uiState = uiState,
                onEmailChange = authViewModel::onEmailChange,
                onPasswordChange = authViewModel::onPasswordChange,
                onSubmit = authViewModel::submitLogin,
                onRegisterClick = { navController.navigate(AppRoute.Register.route) },
                onPasswordRecoveryClick = { navController.navigate(AppRoute.PasswordRecovery.route) },
            )
        }
        composable(AppRoute.Register.route) {
            RegistrationScreen(
                uiState = uiState,
                onEmailChange = authViewModel::onEmailChange,
                onPasswordChange = authViewModel::onPasswordChange,
                onConfirmPasswordChange = authViewModel::onConfirmPasswordChange,
                onRoleChange = authViewModel::onRoleChange,
                onReferralCodeChange = authViewModel::onReferralCodeChange,
                onSubmit = authViewModel::submitRegistration,
                onLoginClick = { navController.popBackStack(AppRoute.Login.route, inclusive = false) },
            )
        }
        composable(AppRoute.PasswordRecovery.route) {
            PasswordRecoveryScreen(
                uiState = uiState,
                onEmailChange = authViewModel::onEmailChange,
                onSubmit = authViewModel::requestPasswordReset,
                onBackToLoginClick = { navController.navigate(AppRoute.Login.route) },
            )
        }
        composable(AppRoute.EmailVerification.route) {
            EmailVerificationScreen(
                email = (uiState.authState as? AuthState.EmailVerificationRequired)?.email,
                onBackToLoginClick = {
                    authViewModel.clearFormMessages()
                    navController.navigate(AppRoute.Login.route)
                },
            )
        }
        composable(AppRoute.Onboarding.route) {
            OnboardingPlaceholderScreen(
                onLogout = authViewModel::logout,
            )
        }
        composable(AppRoute.Main.route) {
            MainShell(onLogout = authViewModel::logout)
        }
    }
}
