package com.collegedate.app.feature.matches

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.collegedate.app.core.designsystem.components.CollegeDateCard
import com.collegedate.app.core.designsystem.components.CollegeDateIconButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.EmptyStateCard
import com.collegedate.app.core.designsystem.components.ErrorCard
import com.collegedate.app.core.designsystem.components.LoadingState
import com.collegedate.app.domain.matching.MatchedProfile

@Composable
fun MatchedProfileScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MatchedProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CollegeDateIconButton(
                icon = Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                onClick = onBack,
            )
            Text("Matched profile", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }

        val error = state.error
        val profile = state.profile
        when {
            state.isLoading -> LoadingState(label = "Opening matched profile")
            error != null -> ErrorCard(message = error, onRetryClick = viewModel::load)
            profile == null -> EmptyStateCard(
                title = "Profile unavailable",
                message = "This matched profile is not available from staging.",
                emoji = "",
            )

            else -> MatchedProfileContent(profile = profile)
        }
    }
}

@Composable
private fun MatchedProfileContent(profile: MatchedProfile) {
    val photo = profile.photoUrls.firstOrNull()
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (photo != null) {
            AsyncImage(
                model = photo,
                contentDescription = "Matched profile photo",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(420.dp)
                    .clip(RoundedCornerShape(24.dp)),
                contentScale = ContentScale.Crop,
            )
        }
        CollegeDateCard {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = listOfNotNull(profile.displayName, profile.age?.toString()).joinToString(", ")
                        .ifBlank { "Matched student" },
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = listOfNotNull(profile.university, profile.department, profile.level).joinToString(" / "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                profile.bio?.takeIf { it.isNotBlank() }?.let { Text(it) }
                if (profile.interests.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        profile.interests.take(3).forEach { interest ->
                            AssistChip(onClick = {}, label = { Text(interest) })
                        }
                    }
                }
                CollegeDateSecondaryButton(
                    text = "Messaging deferred",
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
