package com.collegedate.app.feature.discovery

import android.content.res.Configuration
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.input.pointer.AwaitPointerEventScope
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.collegedate.app.core.designsystem.components.CollegeDateBadge
import com.collegedate.app.core.designsystem.components.CollegeDateIconButton
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.EmptyStateCard
import com.collegedate.app.core.designsystem.components.ErrorCard
import com.collegedate.app.core.designsystem.components.LoadingState
import com.collegedate.app.core.designsystem.components.OfflineBanner
import com.collegedate.app.core.designsystem.components.StateBanner
import com.collegedate.app.core.designsystem.theme.CollegePink
import com.collegedate.app.core.designsystem.theme.CollegePurple
import com.collegedate.app.domain.discovery.DiscoveryProfileCard
import com.collegedate.app.domain.matching.SwipeDirection
import kotlin.math.abs

@Composable
fun DiscoveryScreen(
    onViewMatchedProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DiscoveryViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val isLandscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        when {
            state.isOffline -> OfflineBanner()
            state.servedFromCache -> StateBanner(
                title = "Saved profiles",
                message = "Showing saved cards while discovery refreshes.",
            )
        }
        val error = state.error
        if (error != null && state.cards.isNotEmpty()) {
            ErrorCard(message = error, onRetryClick = viewModel::refresh)
        }

        if (!isLandscape) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Discover", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Staging profile cards from the safe discovery RPC",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                CollegeDateIconButton(
                    icon = Icons.Outlined.PersonSearch,
                    contentDescription = "Refresh discovery",
                    onClick = viewModel::refresh,
                )
            }
        }

        when {
            state.isLoading -> LoadingState(label = "Loading discovery profiles")
            error != null && state.cards.isEmpty() -> ErrorCard(
                message = error,
                onRetryClick = viewModel::refresh,
            )

            state.cards.isEmpty() -> EmptyStateCard(
                title = "No profiles right now",
                message = "Check again after more staging profiles complete onboarding.",
                emoji = "",
                actionText = "Refresh",
                onActionClick = viewModel::refresh,
            )

            else -> {
                SwipeDeck(
                    cards = state.cards,
                    locked = state.activeSwipeProfileId != null,
                    onSwipe = viewModel::submitSwipe,
                    compactLayout = isLandscape,
                    modifier = Modifier.weight(1f),
                )
                SwipeActions(
                    locked = state.activeSwipeProfileId != null,
                    onPass = { viewModel.submitSwipe(SwipeDirection.Pass) },
                    onLike = { viewModel.submitSwipe(SwipeDirection.Like) },
                )
                if (state.isRefreshing) {
                    LoadingState(label = "Refreshing")
                }
            }
        }
    }

    state.matchDialog?.let { match ->
        MatchSuccessDialog(
            profile = match.profile,
            onDismiss = viewModel::dismissMatchDialog,
            onViewProfile = {
                viewModel.dismissMatchDialog()
                onViewMatchedProfile(match.profile.id)
            },
        )
    }
}

@Composable
private fun SwipeDeck(
    cards: List<DiscoveryProfileCard>,
    locked: Boolean,
    onSwipe: (SwipeDirection) -> Unit,
    compactLayout: Boolean,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val thresholdPx = with(density) { 120.dp.toPx() }
    val velocityThresholdPx = with(density) { 900.dp.toPx() }
    val current = cards.first()
    var offsetX by remember(current.id) { mutableFloatStateOf(0f) }
    val animatedOffset by animateFloatAsState(offsetX, label = "cardOffset")
    val rotation = (animatedOffset / 38f).coerceIn(-10f, 10f)

    LaunchedEffect(current.id) {
        offsetX = 0f
    }

    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center,
    ) {
        cards.drop(1).take(2).reversed().forEachIndexed { index, card ->
            ProfileSwipeCard(
                profile = card,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = (16 + index * 10).dp, vertical = (18 + index * 10).dp)
                    .graphicsLayer {
                        scaleX = 0.95f - (index * 0.03f)
                        scaleY = 0.95f - (index * 0.03f)
                    },
                isBackCard = true,
                compactLayout = compactLayout,
            )
        }
        ProfileSwipeCard(
            profile = current,
            modifier = Modifier
                .fillMaxWidth()
                .graphicsLayer {
                    translationX = animatedOffset
                    rotationZ = rotation
                }
                .pointerInput(current.id, locked) {
                    if (locked) return@pointerInput
                    awaitEachGesture {
                        handleSwipeGesture(
                            onOffset = { offsetX = it },
                            thresholdPx = thresholdPx,
                            velocityThresholdPx = velocityThresholdPx,
                            onSwipe = onSwipe,
                            onCancel = { offsetX = 0f },
                        )
                    }
                },
            isBackCard = false,
            compactLayout = compactLayout,
        )
        SwipeCue(offsetX = animatedOffset)
    }
}

private suspend fun AwaitPointerEventScope.handleSwipeGesture(
    onOffset: (Float) -> Unit,
    thresholdPx: Float,
    velocityThresholdPx: Float,
    onSwipe: (SwipeDirection) -> Unit,
    onCancel: () -> Unit,
) {
    val down = awaitFirstDown(requireUnconsumed = false)
    val velocityTracker = VelocityTracker()
    velocityTracker.addPosition(down.uptimeMillis, down.position)
    var totalOffset = 0f
    drag(down.id) { change ->
        val delta = change.positionChange()
        totalOffset += delta.x
        onOffset(totalOffset)
        velocityTracker.addPosition(change.uptimeMillis, change.position)
        change.consume()
    }
    val velocityX = velocityTracker.calculateVelocity().x
    when {
        totalOffset > thresholdPx || velocityX > velocityThresholdPx -> onSwipe(SwipeDirection.Like)
        totalOffset < -thresholdPx || velocityX < -velocityThresholdPx -> onSwipe(SwipeDirection.Pass)
        else -> onCancel()
    }
}

@Composable
private fun ProfileSwipeCard(
    profile: DiscoveryProfileCard,
    modifier: Modifier = Modifier,
    isBackCard: Boolean,
    compactLayout: Boolean,
) {
    Surface(
        modifier = (if (compactLayout) modifier.fillMaxSize() else modifier.aspectRatio(0.72f))
            .semantics {
                contentDescription = "${profile.firstName}, ${profile.age ?: "age unknown"}, ${profile.university ?: "campus unknown"}"
            },
        shape = RoundedCornerShape(28.dp),
        tonalElevation = if (isBackCard) 1.dp else 6.dp,
        shadowElevation = if (isBackCard) 1.dp else 8.dp,
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Box {
            val photo = profile.primaryPhotoUrl
            if (photo != null) {
                AsyncImage(
                    model = photo,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.linearGradient(listOf(CollegePurple, CollegePink))),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = profile.firstName.take(1).uppercase(),
                        style = MaterialTheme.typography.displayLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                        ),
                    ),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(if (compactLayout) 12.dp else 20.dp),
                verticalArrangement = Arrangement.spacedBy(if (compactLayout) 4.dp else 8.dp),
            ) {
                Text(
                    text = listOfNotNull(profile.displayName, profile.age?.toString()).joinToString(", ")
                        .ifBlank { profile.firstName },
                    style = if (compactLayout) {
                        MaterialTheme.typography.titleLarge
                    } else {
                        MaterialTheme.typography.headlineMedium
                    },
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = listOfNotNull(profile.university, profile.department).joinToString(" / "),
                    style = if (compactLayout) {
                        MaterialTheme.typography.bodyMedium
                    } else {
                        MaterialTheme.typography.bodyLarge
                    },
                    color = Color.White.copy(alpha = 0.9f),
                    maxLines = if (compactLayout) 1 else 2,
                    overflow = TextOverflow.Ellipsis,
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    profile.attractionGoal?.let { CollegeDateBadge(it) }
                    profile.interests.take(if (compactLayout) 1 else 2).forEach { CollegeDateBadge(it) }
                }
                profile.bio?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.86f),
                        maxLines = if (compactLayout) 1 else 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun SwipeCue(offsetX: Float) {
    val alpha = (abs(offsetX) / 180f).coerceIn(0f, 1f)
    if (alpha <= 0f) return
    val isLike = offsetX > 0f
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = if (isLike) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
        tonalElevation = 4.dp,
    ) {
        Text(
            text = if (isLike) "LIKE" else "PASS",
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Black,
            color = if (isLike) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer,
        )
    }
}

@Composable
private fun SwipeActions(
    locked: Boolean,
    onPass: () -> Unit,
    onLike: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(shape = CircleShape, tonalElevation = 4.dp) {
            CollegeDateIconButton(
                icon = Icons.Outlined.Close,
                contentDescription = "Pass",
                onClick = onPass,
                enabled = !locked,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(8.dp),
            )
        }
        Surface(shape = CircleShape, tonalElevation = 4.dp) {
            CollegeDateIconButton(
                icon = Icons.Outlined.Favorite,
                contentDescription = "Like",
                onClick = onLike,
                enabled = !locked,
                tint = CollegePink,
                modifier = Modifier.padding(8.dp),
            )
        }
    }
}

@Composable
private fun MatchSuccessDialog(
    profile: DiscoveryProfileCard,
    onDismiss: () -> Unit,
    onViewProfile: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.Favorite, contentDescription = null, tint = CollegePink) },
        title = { Text("It's a match") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("You and ${profile.firstName} liked each other.")
                profile.primaryPhotoUrl?.let {
                    AsyncImage(
                        model = it,
                        contentDescription = "Matched profile photo",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(18.dp)),
                        contentScale = ContentScale.Crop,
                    )
                }
                Text(
                    text = "Messaging is deferred in Phase 2.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        confirmButton = {
            CollegeDatePrimaryButton(text = "View profile", onClick = onViewProfile, useGradient = false)
        },
        dismissButton = {
            CollegeDateSecondaryButton(text = "Keep swiping", onClick = onDismiss)
        },
    )
}
