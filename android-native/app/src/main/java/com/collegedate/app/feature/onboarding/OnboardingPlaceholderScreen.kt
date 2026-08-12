package com.collegedate.app.feature.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDateBadge
import com.collegedate.app.core.designsystem.components.CollegeDateDropdownField
import com.collegedate.app.core.designsystem.components.CollegeDateFilterChip
import com.collegedate.app.core.designsystem.components.CollegeDateLinearProgress
import com.collegedate.app.core.designsystem.components.CollegeDatePhotoPlaceholderCard
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.StateBanner

private val NIGERIAN_UNIVERSITIES = listOf(
    "University of Lagos (UNILAG)",
    "Obafemi Awolowo University (OAU)",
    "University of Ibadan (UI)",
    "Federal University of Technology Akure (FUTA)",
    "Lagos State University (LASU)",
    "Covenant University",
    "Babcock University",
    "Ahmadu Bello University (ABU)",
    "University of Nigeria Nsukka (UNN)",
    "University of Benin (UNIBEN)",
)

private val ACADEMIC_LEVELS = listOf(
    "100 Level (Freshman)",
    "200 Level (Sophomore)",
    "300 Level (Junior)",
    "400 Level (Senior)",
    "500 Level (Final Year)",
    "Postgraduate (MSc / PhD)",
)

/**
 * Static Onboarding Layout Wizard (Phase 1 Visual Preview)
 *
 * Implements the 5-step UI onboarding layout with local preview state.
 * Database profile writes are explicitly deferred until Phase 2 RLS approval.
 */
@Composable
fun OnboardingPlaceholderScreen(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var currentStep by remember { mutableIntStateOf(1) }

    // Visual-only preview state
    var isAdultConfirmed by remember { mutableStateOf(true) }
    var selectedUniversity by remember { mutableStateOf(NIGERIAN_UNIVERSITIES.first()) }
    var departmentInput by remember { mutableStateOf("") }
    var selectedLevel by remember { mutableStateOf(ACADEMIC_LEVELS[2]) }
    var selectedGender by remember { mutableStateOf("Female") }
    var selectedIntent by remember { mutableStateOf("Serious 💍") }
    var selectedInterests by remember { mutableStateOf(setOf("Music 🎵", "Tech 💻", "Sports ⚽")) }

    val totalSteps = 5

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Development Notice
        StateBanner(
            title = "Static Preview Layout",
            message = "Visual onboarding state only. Profile database writes remain deferred in Phase 1.",
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CollegeDateBadge("Step $currentStep of $totalSteps")
            CollegeDateSecondaryButton(text = "Log out", onClick = onLogout)
        }

        CollegeDateLinearProgress(progress = currentStep.toFloat() / totalSteps)

        when (currentStep) {
            1 -> Step1AdultEligibility(
                isConfirmed = isAdultConfirmed,
                onConfirmedChange = { isAdultConfirmed = it },
            )
            2 -> Step2UniversitySelection(
                selectedUniversity = selectedUniversity,
                onUniversitySelected = { selectedUniversity = it },
            )
            3 -> Step3AcademicDetails(
                department = departmentInput,
                onDepartmentChange = { departmentInput = it },
                selectedLevel = selectedLevel,
                onLevelSelected = { selectedLevel = it },
                selectedGender = selectedGender,
                onGenderSelected = { selectedGender = it },
            )
            4 -> Step4DatingIntentAndInterests(
                selectedIntent = selectedIntent,
                onIntentSelected = { selectedIntent = it },
                selectedInterests = selectedInterests,
                onInterestToggle = { interest ->
                    selectedInterests = if (selectedInterests.contains(interest)) {
                        selectedInterests - interest
                    } else {
                        selectedInterests + interest
                    }
                },
            )
            5 -> Step5PhotoUploadPlaceholder()
        }

        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (currentStep > 1) {
                CollegeDateSecondaryButton(
                    text = "← Back",
                    onClick = { currentStep-- },
                    modifier = Modifier.weight(1f),
                )
            }
            CollegeDatePrimaryButton(
                text = if (currentStep == totalSteps) "Complete Preview" else "Continue →",
                onClick = {
                    if (currentStep < totalSteps) {
                        currentStep++
                    }
                },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun Step1AdultEligibility(
    isConfirmed: Boolean,
    onConfirmedChange: (Boolean) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Adult Age Eligibility", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("The College Date is an exclusive campus network for adult students aged 18 and above.")
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 8.dp),
        ) {
            Checkbox(checked = isConfirmed, onCheckedChange = onConfirmedChange)
            Text("I confirm that I am at least 18 years of age and currently enrolled in a tertiary institution.")
        }
    }
}

@Composable
private fun Step2UniversitySelection(
    selectedUniversity: String,
    onUniversitySelected: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Select Your University", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Choose your institution to connect with students on your campus.")
        CollegeDateDropdownField(
            options = NIGERIAN_UNIVERSITIES,
            selectedOption = selectedUniversity,
            onOptionSelected = onUniversitySelected,
            label = "University / Higher Institution",
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun Step3AcademicDetails(
    department: String,
    onDepartmentChange: (String) -> Unit,
    selectedLevel: String,
    onLevelSelected: (String) -> Unit,
    selectedGender: String,
    onGenderSelected: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Academic Profile", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        CollegeDateTextField(
            value = department,
            onValueChange = onDepartmentChange,
            label = "Department / Course of Study",
            modifier = Modifier.fillMaxWidth(),
        )
        CollegeDateDropdownField(
            options = ACADEMIC_LEVELS,
            selectedOption = selectedLevel,
            onOptionSelected = onLevelSelected,
            label = "Academic Level",
            modifier = Modifier.fillMaxWidth(),
        )
        Text("Gender Role", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("Female", "Male").forEach { gender ->
                CollegeDateFilterChip(
                    selected = selectedGender == gender,
                    onClick = { onGenderSelected(gender) },
                    label = gender,
                )
            }
        }
    }
}

@Composable
private fun Step4DatingIntentAndInterests(
    selectedIntent: String,
    onIntentSelected: (String) -> Unit,
    selectedInterests: Set<String>,
    onInterestToggle: (String) -> Unit,
) {
    val intents = listOf("Casual 🔥", "Serious 💍", "Friends 🤝")
    val interests = listOf("Music 🎵", "Tech 💻", "Sports ⚽", "Movies 🍿", "Gaming 🎮", "Art 🎨", "Food 🍕")

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Dating Goals & Interests", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Dating Intent", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            intents.forEach { intent ->
                CollegeDateFilterChip(
                    selected = selectedIntent == intent,
                    onClick = { onIntentSelected(intent) },
                    label = intent,
                )
            }
        }
        Text("Select Interests (at least 3)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            interests.take(4).forEach { interest ->
                CollegeDateFilterChip(
                    selected = selectedInterests.contains(interest),
                    onClick = { onInterestToggle(interest) },
                    label = interest,
                )
            }
        }
    }
}

@Composable
private fun Step5PhotoUploadPlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Profile Photos", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Upload at least 1 photo to complete your profile preview.")
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CollegeDatePhotoPlaceholderCard(
                slotNumber = 1,
                isPrimary = true,
                onClick = {},
                modifier = Modifier.weight(1f),
            )
            CollegeDatePhotoPlaceholderCard(
                slotNumber = 2,
                isPrimary = false,
                onClick = {},
                modifier = Modifier.weight(1f),
            )
        }
    }
}
