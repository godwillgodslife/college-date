package com.collegedate.app.feature.profile

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Leaderboard
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.collegedate.app.core.designsystem.components.AccountGridTileCard
import com.collegedate.app.core.designsystem.components.CollegeDateBadge
import com.collegedate.app.core.designsystem.components.CollegeDateCard
import com.collegedate.app.core.designsystem.components.CollegeDateFilterChip
import com.collegedate.app.core.designsystem.components.CollegeDateIconButton
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.EmptyStateCard
import com.collegedate.app.core.designsystem.components.ErrorCard
import com.collegedate.app.domain.profile.DatingIntent
import com.collegedate.app.domain.profile.DatingPreference
import com.collegedate.app.domain.profile.University
import com.collegedate.app.domain.profile.UniversityCatalog
import com.collegedate.app.feature.common.readCompressedProfilePhoto

@Composable
fun ProfileHubScreen(
    onEditProfile: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToLeaderboard: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val profile = state.profile

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        val error = state.error
        if (error != null && profile == null) {
            ErrorCard(message = error, onRetryClick = viewModel::refresh)
        }

        if (profile == null && state.isLoading) {
            EmptyStateCard(
                title = "Loading profile",
                message = "Fetching your staging profile.",
                emoji = "",
            )
        } else if (profile == null) {
            EmptyStateCard(
                title = "Profile not ready",
                message = "Complete onboarding to unlock discovery.",
                emoji = "",
                actionText = "Refresh",
                onActionClick = viewModel::refresh,
            )
        } else {
            CollegeDateCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ProfileAvatar(url = profile.photoUrls.firstOrNull(), size = 76)
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = profile.displayName ?: "Student Member",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = listOfNotNull(profile.university, profile.department).joinToString(" / ")
                                .ifBlank { "Campus details pending" },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CollegeDateBadge(if (profile.isOnboarded) "Onboarded" else "Incomplete")
                            if (profile.isVerified) CollegeDateBadge("Verified")
                        }
                    }
                    CollegeDateIconButton(
                        icon = Icons.Outlined.Refresh,
                        contentDescription = "Refresh profile",
                        onClick = viewModel::refresh,
                    )
                }
            }
        }

        state.savedMessage?.let {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
            ) {
                Text(
                    text = it,
                    modifier = Modifier.padding(14.dp),
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
        }

        Text("Account", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AccountGridTileCard(
                title = "Edit Profile",
                subtitle = "Photos, campus, bio",
                icon = Icons.Outlined.Edit,
                onClick = onEditProfile,
            )
            AccountGridTileCard(
                title = "Settings",
                subtitle = "Account controls",
                icon = Icons.Outlined.Settings,
                onClick = onNavigateToSettings,
            )
            AccountGridTileCard(
                title = "Leaderboard",
                subtitle = "Deferred feature",
                icon = Icons.Outlined.Leaderboard,
                onClick = onNavigateToLeaderboard,
            )
            AccountGridTileCard(
                title = "Sign Out",
                subtitle = "Clear local session",
                icon = Icons.AutoMirrored.Outlined.Logout,
                onClick = onLogout,
            )
        }
    }
}

@Composable
fun EditProfileScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        context.readCompressedProfilePhoto(uri)
            .onSuccess { picked -> viewModel.uploadPhoto(picked.bytes, picked.contentType) }
            .onFailure { error -> viewModel.showError(error.message ?: "Unable to read selected photo.") }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Edit profile", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(
                    text = "Only approved profile fields are saved.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            CollegeDateSecondaryButton(text = "Back", onClick = onBack)
        }

        state.error?.let {
            ErrorCard(title = "Save failed", message = it, onRetryClick = viewModel::saveProfile)
        }

        CollegeDateCard {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    state.profilePhotos.take(3).forEach { url ->
                        EditablePhoto(url = url, onRemove = { viewModel.removePhoto(url) }, modifier = Modifier.weight(1f))
                    }
                    if (state.profilePhotos.size < 3) {
                        AddPhotoTile(
                            uploading = state.isUploadingPhoto,
                            onClick = {
                                photoPicker.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                                )
                            },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                CollegeDateSecondaryButton(
                    text = "Add photo",
                    onClick = {
                        photoPicker.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                    enabled = !state.isUploadingPhoto,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        CollegeDateTextField(
            value = state.fullName,
            onValueChange = viewModel::onFullNameChange,
            label = "Full name",
            modifier = Modifier.fillMaxWidth(),
        )
        CollegeDateTextField(
            value = state.age,
            onValueChange = viewModel::onAgeChange,
            label = "Age",
            keyboardType = KeyboardType.Number,
            modifier = Modifier.fillMaxWidth(),
        )
        ChoiceChips(
            title = "Gender",
            options = listOf("female" to "Female", "male" to "Male", "other" to "Other"),
            selected = state.gender,
            onSelected = viewModel::onGenderSelected,
        )
        CollegeDateTextField(
            value = state.universityQuery,
            onValueChange = viewModel::onUniversityQueryChange,
            label = "University",
            modifier = Modifier.fillMaxWidth(),
        )
        UniversityPickerList(
            results = state.visibleUniversities,
            selected = state.university,
            onSelected = viewModel::onUniversitySelected,
        )
        CollegeDateTextField(
            value = state.faculty,
            onValueChange = viewModel::onFacultyChange,
            label = "Faculty",
            modifier = Modifier.fillMaxWidth(),
        )
        CollegeDateTextField(
            value = state.department,
            onValueChange = viewModel::onDepartmentChange,
            label = "Department",
            modifier = Modifier.fillMaxWidth(),
        )
        Chips(
            title = "Level",
            options = UniversityCatalog.academicLevels,
            selected = state.level,
            onSelected = viewModel::onLevelSelected,
        )
        ChoiceChips(
            title = "Interested in",
            options = DatingPreference.entries.map { it.backendValue to it.label },
            selected = state.interestGender,
            onSelected = viewModel::onInterestGenderSelected,
        )
        Chips(
            title = "Goal",
            options = DatingIntent.entries.map { it.backendValue },
            selected = state.attractionGoal,
            onSelected = viewModel::onAttractionGoalSelected,
        )
        MultiChips(
            title = "Interests",
            options = UniversityCatalog.interestOptions,
            selected = state.interests,
            onToggle = viewModel::onInterestToggled,
        )
        CollegeDateTextField(
            value = state.bio,
            onValueChange = viewModel::onBioChange,
            label = "Bio",
            singleLine = false,
            modifier = Modifier.fillMaxWidth(),
        )

        state.savedMessage?.let {
            AssistChip(onClick = {}, label = { Text(it) })
        }

        CollegeDatePrimaryButton(
            text = "Save profile",
            onClick = viewModel::saveProfile,
            loading = state.isSaving,
            enabled = !state.isSaving && !state.isUploadingPhoto,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ProfileAvatar(url: String?, size: Int) {
    Surface(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .padding(0.dp),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        if (url != null) {
            AsyncImage(
                model = url,
                contentDescription = "Profile photo",
                modifier = Modifier
                    .size(size.dp)
                    .clip(CircleShape)
                    .padding(0.dp),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(
                modifier = Modifier.size(size.dp),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.PersonOutline, contentDescription = null)
            }
        }
    }
}

@Composable
private fun EditablePhoto(url: String, onRemove: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(14.dp)),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Box {
            AsyncImage(
                model = url,
                contentDescription = "Profile photo",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Surface(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .clickable(onClick = onRemove),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.errorContainer,
            ) {
                Text(
                    text = "Remove",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
    }
}

@Composable
private fun AddPhotoTile(uploading: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(14.dp))
            .clickable(enabled = !uploading, onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(if (uploading) "Uploading..." else "Add photo")
        }
    }
}

@Composable
private fun UniversityPickerList(
    results: List<University>,
    selected: String,
    onSelected: (University) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        results.take(4).forEach { university ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSelected(university) },
                shape = RoundedCornerShape(12.dp),
                color = if (selected == university.name) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
                },
            ) {
                Text(university.name, modifier = Modifier.padding(12.dp))
            }
        }
    }
}

@Composable
private fun ChoiceChips(
    title: String,
    options: List<Pair<String, String>>,
    selected: String,
    onSelected: (String) -> Unit,
) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { (value, label) ->
            CollegeDateFilterChip(selected = selected == value, onClick = { onSelected(value) }, label = label)
        }
    }
}

@Composable
private fun Chips(
    title: String,
    options: List<String>,
    selected: String,
    onSelected: (String) -> Unit,
) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    options.chunked(3).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { option ->
                CollegeDateFilterChip(selected = selected == option, onClick = { onSelected(option) }, label = option)
            }
        }
    }
}

@Composable
private fun MultiChips(
    title: String,
    options: List<String>,
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    options.chunked(3).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { option ->
                CollegeDateFilterChip(selected = selected.contains(option), onClick = { onToggle(option) }, label = option)
            }
        }
    }
}
