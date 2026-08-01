package com.collegedate.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDatePasswordField
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.ErrorBanner
import com.collegedate.app.domain.auth.RegistrationRole

@Composable
fun RegistrationScreen(
    uiState: AuthUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onRoleChange: (RegistrationRole) -> Unit,
    onReferralCodeChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onLoginClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Create account", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("For adult students only. Full campus onboarding follows after authentication.")

        uiState.registrationError?.let { ErrorBanner(it, modifier = Modifier.testTag("registration_error")) }

        CollegeDateTextField(
            value = uiState.email,
            onValueChange = onEmailChange,
            label = "Email",
            modifier = Modifier.fillMaxWidth(),
            keyboardType = KeyboardType.Email,
        )
        CollegeDatePasswordField(
            value = uiState.password,
            onValueChange = onPasswordChange,
            label = "Password",
            modifier = Modifier.fillMaxWidth(),
            imeAction = ImeAction.Next,
        )
        CollegeDatePasswordField(
            value = uiState.confirmPassword,
            onValueChange = onConfirmPasswordChange,
            label = "Confirm password",
            modifier = Modifier.fillMaxWidth(),
            imeAction = ImeAction.Next,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            RegistrationRole.entries.forEach { role ->
                FilterChip(
                    selected = uiState.selectedRole == role,
                    onClick = { onRoleChange(role) },
                    label = { Text(role.name) },
                )
            }
        }
        CollegeDateTextField(
            value = uiState.referralCode,
            onValueChange = onReferralCodeChange,
            label = "Referral code",
            modifier = Modifier.fillMaxWidth(),
            imeAction = ImeAction.Done,
        )
        CollegeDatePrimaryButton(
            text = "Create account",
            onClick = onSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("registration_submit"),
            loading = uiState.isSubmitting,
        )
        TextButton(onClick = onLoginClick) {
            Text("Already have an account?")
        }
    }
}
