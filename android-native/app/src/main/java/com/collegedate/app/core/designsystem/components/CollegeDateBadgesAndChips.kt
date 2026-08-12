package com.collegedate.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.collegedate.app.core.designsystem.theme.CollegeBlue
import com.collegedate.app.core.designsystem.theme.CollegeError
import com.collegedate.app.core.designsystem.theme.CollegePurple
import com.collegedate.app.core.designsystem.theme.CollegeSuccess

/**
 * Live Status Badge (`🔴 LIVE`)
 */
@Composable
fun LiveBadge(
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        color = CollegeError.copy(alpha = 0.9f),
        shape = CircleShape,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(Color.White, CircleShape),
            )
            Spacer(Modifier.width(6.dp))
            Text(
                text = "LIVE",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

/**
 * Online Dot Indicator (`● Online`)
 */
@Composable
fun OnlineDot(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(10.dp)
            .background(CollegeSuccess, CircleShape),
    )
}

/**
 * AI Verification Badge (`💙 AI Verified`)
 */
@Composable
fun AIVerifiedBadge(
    modifier: Modifier = Modifier,
) {
    Icon(
        imageVector = Icons.Outlined.CheckCircle,
        contentDescription = "AI Verified Profile",
        tint = CollegeBlue,
        modifier = modifier.size(18.dp),
    )
}

/**
 * Campus Verification Badge (`🎓 Student Verified`)
 */
@Composable
fun CampusVerifiedBadge(
    modifier: Modifier = Modifier,
) {
    Icon(
        imageVector = Icons.Outlined.School,
        contentDescription = "Student Verified Campus",
        tint = CollegePurple,
        modifier = modifier.size(18.dp),
    )
}

/**
 * Notification Unread Count Pill Badge
 */
@Composable
fun NotificationUnreadBadge(
    count: Int,
    modifier: Modifier = Modifier,
) {
    if (count <= 0) return
    val displayText = if (count > 9) "9+" else count.toString()

    Surface(
        modifier = modifier,
        color = CollegeError,
        shape = CircleShape,
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = displayText,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

/**
 * Category & Filter Chip Component
 */
@Composable
fun CollegeDateFilterChip(
    selected: Boolean,
    onClick: () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: (@Composable () -> Unit)? = null,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        modifier = modifier,
        leadingIcon = leadingIcon,
    )
}
