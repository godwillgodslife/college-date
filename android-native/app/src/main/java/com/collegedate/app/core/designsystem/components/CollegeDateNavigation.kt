package com.collegedate.app.core.designsystem.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.theme.CollegePurple

/**
 * Top App Bar with brand title, notification unread badge placeholder API, and wallet balance pill API.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollegeDateTopBar(
    modifier: Modifier = Modifier,
    title: String = "The College Date",
    unreadNotificationCount: Int = 0,
    walletBalance: String? = null,
    onNotificationClick: () -> Unit = {},
    onWalletClick: () -> Unit = {},
) {
    TopAppBar(
        modifier = modifier,
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
            )
        },
        actions = {
            walletBalance?.let { balance ->
                Surface(
                    onClick = onWalletClick,
                    shape = CircleShape,
                    color = CollegePurple.copy(alpha = 0.15f),
                    modifier = Modifier.padding(end = 8.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.AccountBalanceWallet,
                            contentDescription = "Wallet Balance",
                            tint = CollegePurple,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = balance,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = CollegePurple,
                        )
                    }
                }
            }
            Box(
                modifier = Modifier
                    .padding(end = 12.dp)
                    .clickable(onClick = onNotificationClick),
            ) {
                IconButton(onClick = onNotificationClick) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = MaterialTheme.colorScheme.onBackground,
                    )
                }
                if (unreadNotificationCount > 0) {
                    NotificationUnreadBadge(
                        count = unreadNotificationCount,
                        modifier = Modifier.align(Alignment.TopEnd),
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
        ),
    )
}

/**
 * Main Shell Bottom Navigation Bar with 5 tabs and badge API support.
 */
@Composable
fun CollegeDateBottomBar(
    items: List<CollegeDateNavItem>,
    currentRoute: String?,
    onDestinationClick: (CollegeDateNavItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onDestinationClick(item) },
                icon = {
                    Box {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                        )
                        if (item.badgeCount > 0) {
                            NotificationUnreadBadge(
                                count = item.badgeCount,
                                modifier = Modifier.align(Alignment.TopEnd),
                            )
                        }
                    }
                },
                label = {
                    Text(
                        text = item.label,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = CollegePurple,
                    selectedTextColor = CollegePurple,
                    indicatorColor = CollegePurple.copy(alpha = 0.15f),
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}

data class CollegeDateNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val badgeCount: Int = 0,
)
