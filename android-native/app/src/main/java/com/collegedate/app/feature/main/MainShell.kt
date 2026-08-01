package com.collegedate.app.feature.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.collegedate.app.core.designsystem.components.DevelopmentPlaceholderScreen
import com.collegedate.app.core.navigation.AppRoute
import com.collegedate.app.feature.settings.SettingsScreen

@Composable
fun MainShell(
    onLogout: () -> Unit,
) {
    val navController = rememberNavController()
    val items = listOf(
        MainNavItem(AppRoute.Discovery, "Discover", Icons.Outlined.Explore),
        MainNavItem(AppRoute.Matches, "Matches", Icons.Outlined.FavoriteBorder),
        MainNavItem(AppRoute.Messages, "Messages", Icons.Outlined.ChatBubbleOutline),
        MainNavItem(AppRoute.Profile, "Profile", Icons.Outlined.PersonOutline),
        MainNavItem(AppRoute.Settings, "Settings", Icons.Outlined.Settings),
    )

    Scaffold(
        bottomBar = {
            CollegeDateBottomNavigation(
                items = items,
                currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route,
                onDestinationClick = { route ->
                    navController.navigate(route.route) {
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
            modifier = Modifier.padding(paddingValues),
        ) {
            composable(AppRoute.Discovery.route) {
                DevelopmentPlaceholderScreen(
                    title = "Discovery",
                    description = "Swipe cards, filters, and profile discovery will be migrated after native auth is verified.",
                )
            }
            composable(AppRoute.Matches.route) {
                DevelopmentPlaceholderScreen(
                    title = "Matches",
                    description = "Mutual matches and admirers will be rebuilt on the existing match backend in a later phase.",
                )
            }
            composable(AppRoute.Messages.route) {
                DevelopmentPlaceholderScreen(
                    title = "Messages",
                    description = "Realtime chat, media, and call entry points are intentionally deferred.",
                )
            }
            composable(AppRoute.Profile.route) {
                DevelopmentPlaceholderScreen(
                    title = "Profile",
                    description = "Profile viewing and editing will use the native cache and existing profile policies in the next feature phase.",
                )
            }
            composable(AppRoute.Premium.route) {
                DevelopmentPlaceholderScreen(
                    title = "Premium",
                    description = "Premium entitlement display is planned, but purchase logic is not part of this native foundation phase.",
                )
            }
            composable(AppRoute.Wallet.route) {
                DevelopmentPlaceholderScreen(
                    title = "Wallet",
                    description = "Wallet balances and transactions remain in the existing app until the secure native payment phase.",
                )
            }
            composable(AppRoute.Referrals.route) {
                DevelopmentPlaceholderScreen(
                    title = "Referrals",
                    description = "Referral code validation and rewards will reuse existing backend contracts after auth migration.",
                )
            }
            composable(AppRoute.Leaderboard.route) {
                DevelopmentPlaceholderScreen(
                    title = "Leaderboard",
                    description = "Leaderboard screens are listed in navigation but deferred to a later migration slice.",
                )
            }
            composable(AppRoute.Settings.route) {
                SettingsScreen(onLogout = onLogout)
            }
        }
    }
}

@Composable
private fun CollegeDateBottomNavigation(
    items: List<MainNavItem>,
    currentRoute: String?,
    onDestinationClick: (AppRoute) -> Unit,
) {
    NavigationBar {
        items.forEach { item ->
            val selected = currentRoute == item.route.route
            NavigationBarItem(
                selected = selected,
                onClick = { onDestinationClick(item.route) },
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
            )
        }
    }
}

private data class MainNavItem(
    val route: AppRoute,
    val label: String,
    val icon: ImageVector,
)
