package com.collegedate.app.feature.onboarding

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.collegedate.app.core.designsystem.components.CollegeDateBadge
import com.collegedate.app.core.designsystem.components.CollegeDateFilterChip
import com.collegedate.app.core.designsystem.components.CollegeDateLinearProgress
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.ErrorCard
import com.collegedate.app.core.designsystem.components.StateBanner
import com.collegedate.app.domain.profile.DatingIntent
import com.collegedate.app.domain.profile.University
import com.collegedate.app.domain.profile.UniversityCatalog
import com.collegedate.app.feature.common.readCompressedProfilePhoto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: OnboardingViewModel = hiltViewModel(),
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

    Scaffold(
        modifier = modifier.fillMaxSize(),
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(paddingValues)
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text = "Set up your profile",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Step ${state.currentStep + 1} of ${state.totalSteps}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                CollegeDateSecondaryButton(text = "Log out", onClick = onLogout)
            }

            CollegeDateLinearProgress(
                progress = (state.currentStep + 1).toFloat() / state.totalSteps,
            )

            state.error?.let {
                ErrorCard(
                    title = "Needs attention",
                    message = it,
                    onRetryClick = viewModel::completeOnboarding,
                )
            }

            when (state.currentStep) {
                0 -> IdentityStep(state, viewModel)
                1 -> CampusStep(state, viewModel)
                2 -> VibeStep(state, viewModel)
                3 -> IntentStep(state, viewModel)
                4 -> PhotoStep(
                    state = state,
                    onPickPhoto = {
                        photoPicker.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (state.currentStep > 0) {
                    CollegeDateSecondaryButton(
                        text = "Back",
                        onClick = viewModel::onBack,
                        enabled = !state.isSubmitting && !state.isUploadingPhoto,
                        modifier = Modifier.weight(1f),
                    )
                }
                CollegeDatePrimaryButton(
                    text = if (state.currentStep == state.totalSteps - 1) "Complete" else "Continue",
                    onClick = {
                        if (state.currentStep == state.totalSteps - 1) {
                            viewModel.completeOnboarding()
                        } else {
                            viewModel.onNext()
                        }
                    },
                    enabled = !state.isSubmitting && !state.isUploadingPhoto,
                    loading = state.isSubmitting,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun IdentityStep(
    state: OnboardingUiState,
    viewModel: OnboardingViewModel,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Adult student eligibility", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        StateBanner(
            title = "Adults only",
            message = "The College Date is for students who are 18 or older.",
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = state.adultConfirmed,
                onCheckedChange = viewModel::onAdultConfirmedChange,
            )
            Text("I confirm that I am at least 18.")
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
        Text("Gender", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        ChoiceRow(
            options = listOf("female" to "Female", "male" to "Male", "other" to "Other"),
            selected = state.gender,
            onSelected = viewModel::onGenderSelected,
        )
    }
}

@Composable
private fun CampusStep(
    state: OnboardingUiState,
    viewModel: OnboardingViewModel,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Choose your campus", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        CollegeDateTextField(
            value = state.universityQuery,
            onValueChange = viewModel::onUniversityQueryChange,
            label = "Search university or polytechnic",
            modifier = Modifier.fillMaxWidth(),
        )
        UniversityResults(
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
            label = "Department or course",
            modifier = Modifier.fillMaxWidth(),
        )
        Text("Level", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        ChunkedChips(
            options = UniversityCatalog.academicLevels,
            selected = state.level,
            onSelected = viewModel::onLevelSelected,
        )
    }
}

@Composable
private fun UniversityResults(
    results: List<University>,
    selected: String,
    onSelected: (University) -> Unit,
) {
    if (results.isEmpty()) {
        StateBanner(
            title = "No result",
            message = "Try a different spelling or abbreviation.",
        )
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        results.take(6).forEach { university ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSelected(university) },
                color = if (selected == university.name) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                },
                shape = RoundedCornerShape(12.dp),
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(university.name, style = MaterialTheme.typography.bodyMedium)
                    if (selected == university.name) CollegeDateBadge("Selected")
                }
            }
        }
    }
}

@Composable
private fun VibeStep(
    state: OnboardingUiState,
    viewModel: OnboardingViewModel,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Your interests", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            text = "Pick at least three interests. You can change these later.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ChunkedChips(
            options = UniversityCatalog.interestOptions,
            selectedItems = state.interests,
            onToggle = viewModel::onInterestToggled,
        )
    }
}

@Composable
private fun IntentStep(
    state: OnboardingUiState,
    viewModel: OnboardingViewModel,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("What are you looking for?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        DatingIntent.entries.forEach { intent ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { viewModel.onAttractionGoalSelected(intent.backendValue) },
                shape = RoundedCornerShape(16.dp),
                color = if (state.attractionGoal == intent.backendValue) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                },
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(intent.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = when (intent) {
                            DatingIntent.Casual -> "Meet people and see where it goes."
                            DatingIntent.Serious -> "Look for a committed connection."
                            DatingIntent.Friends -> "Make campus friends and social circles."
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun PhotoStep(
    state: OnboardingUiState,
    onPickPhoto: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Add your photo", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            text = "Add at least one clear profile photo. Uploads are scoped to your own account.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            (state.profilePhotos + listOf("")).take(4).forEach { url ->
                PhotoTile(url = url, uploading = state.isUploadingPhoto, onPickPhoto = onPickPhoto)
            }
        }
        CollegeDateSecondaryButton(
            text = if (state.profilePhotos.isEmpty()) "Choose photo" else "Add another photo",
            onClick = onPickPhoto,
            enabled = !state.isUploadingPhoto,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PhotoTile(
    url: String,
    uploading: Boolean,
    onPickPhoto: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.4f)
            .clip(RoundedCornerShape(18.dp))
            .clickable(enabled = !uploading, onClick = onPickPhoto),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(18.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (url.isNotBlank()) {
                AsyncImage(
                    model = url,
                    contentDescription = "Selected profile photo",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Text(
                    text = if (uploading) "Uploading..." else "Tap to add photo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ChoiceRow(
    options: List<Pair<String, String>>,
    selected: String,
    onSelected: (String) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { (value, label) ->
            CollegeDateFilterChip(
                selected = selected == value,
                onClick = { onSelected(value) },
                label = label,
            )
        }
    }
}

@Composable
private fun ChunkedChips(
    options: List<String>,
    selected: String,
    onSelected: (String) -> Unit,
) {
    options.chunked(3).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { option ->
                CollegeDateFilterChip(
                    selected = selected == option,
                    onClick = { onSelected(option) },
                    label = option,
                )
            }
        }
    }
}

@Composable
private fun ChunkedChips(
    options: List<String>,
    selectedItems: Set<String>,
    onToggle: (String) -> Unit,
) {
    options.chunked(3).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { option ->
                CollegeDateFilterChip(
                    selected = selectedItems.contains(option),
                    onClick = { onToggle(option) },
                    label = option,
                )
            }
        }
    }
}
