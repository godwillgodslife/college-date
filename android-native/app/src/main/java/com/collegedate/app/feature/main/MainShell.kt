package com.collegedate.app.feature.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.collegedate.app.core.designsystem.components.CollegeDateBottomBar
import com.collegedate.app.core.designsystem.components.CollegeDateNavItem
import com.collegedate.app.core.designsystem.components.CollegeDateTopBar
import com.collegedate.app.core.designsystem.components.DevelopmentPlaceholderScreen
import com.collegedate.app.core.navigation.AppRoute
import com.collegedate.app.feature.discovery.DiscoveryScreen
import com.collegedate.app.feature.matches.MatchedProfileScreen
import com.collegedate.app.feature.profile.EditProfileScreen
import com.collegedate.app.feature.profile.ProfileHubScreen
import com.collegedate.app.feature.settings.SettingsScreen

@Composable
fun MainShell(
    onLogout: () -> Unit,
    unreadNotificationCount: Int = 0,
    walletBalanceDisplay: String? = null,
) {
    val navController = rememberNavController()

    val navItems = listOf(
        CollegeDateNavItem(AppRoute.Discovery.route, "Discover", Icons.Outlined.Explore),
        CollegeDateNavItem(AppRoute.Matches.route, "Matches", Icons.Outlined.FavoriteBorder),
        CollegeDateNavItem(AppRoute.Messages.route, "Inbox", Icons.Outlined.ChatBubbleOutline, badgeCount = unreadNotificationCount),
        CollegeDateNavItem(AppRoute.Confessions.route, "Confessions", Icons.Outlined.Forum),
        CollegeDateNavItem(AppRoute.Profile.route, "Profile", Icons.Outlined.PersonOutline),
    )

    Scaffold(
        topBar = {
            CollegeDateTopBar(
                title = "The College Date",
                unreadNotificationCount = unreadNotificationCount,
                walletBalance = walletBalanceDisplay,
                onNotificationClick = {
                    navController.navigate(AppRoute.Messages.route)
                },
                onWalletClick = {
                    navController.navigate(AppRoute.Wallet.route)
                },
            )
        },
        bottomBar = {
            CollegeDateBottomBar(
                items = navItems,
                currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route,
                onDestinationClick = { item ->
                    navController.navigate(item.route) {
                        launchSingleTop = true
                        restoreState = true
                        popUpTo(AppRoute.Discovery.route) {
                            saveState = true
                        }
                    }
                },
            )
        },
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = AppRoute.Discovery.route,
        ) {
            composable(AppRoute.Discovery.route) {
                DiscoveryScreen(
                    onViewMatchedProfile = { profileId ->
                        navController.navigate(AppRoute.MatchedProfile.createRoute(profileId))
                    },
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Matches.route) {
                DevelopmentPlaceholderScreen(
                    title = "Matches List",
                    description = "The match list remains deferred. Match creation is verified from discovery swipes in Phase 2.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Messages.route) {
                DevelopmentPlaceholderScreen(
                    title = "Messages & Inbox",
                    description = "Realtime messaging, calls, and push notifications are deferred for a later native phase.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Confessions.route) {
                DevelopmentPlaceholderScreen(
                    title = "Campus Confessions",
                    description = "Confessions are outside the Phase 2 profile and discovery scope.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Profile.route) {
                ProfileHubScreen(
                    onEditProfile = { navController.navigate(AppRoute.EditProfile.route) },
                    onLogout = onLogout,
                    onNavigateToSettings = { navController.navigate(AppRoute.Settings.route) },
                    onNavigateToLeaderboard = { navController.navigate(AppRoute.Leaderboard.route) },
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.EditProfile.route) {
                EditProfileScreen(
                    onBack = { navController.popBackStack() },
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(
                route = AppRoute.MatchedProfile.route,
                arguments = listOf(navArgument("profileId") { type = NavType.StringType }),
            ) {
                MatchedProfileScreen(
                    onBack = { navController.popBackStack() },
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Premium.route) {
                DevelopmentPlaceholderScreen(
                    title = "Premium Upgrade",
                    description = "Premium and RevenueCat are deferred for native Phase 2.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Wallet.route) {
                DevelopmentPlaceholderScreen(
                    title = "Student Wallet",
                    description = "Wallet and Paystack flows remain deferred and untouched.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Referrals.route) {
                DevelopmentPlaceholderScreen(
                    title = "Referral Program",
                    description = "Referral features are deferred for a later native phase.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Leaderboard.route) {
                DevelopmentPlaceholderScreen(
                    title = "Campus Leaderboard",
                    description = "Leaderboard is deferred for a later native phase.",
                    modifier = Modifier.padding(paddingValues),
                )
            }
            composable(AppRoute.Settings.route) {
                SettingsScreen(
                    onLogout = onLogout,
                    modifier = Modifier.padding(paddingValues),
                )
            }
        }
    }
}
