package com.collegedate.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.ErrorBanner

@Composable
fun PasswordRecoveryScreen(
    uiState: AuthUiState,
    onEmailChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onBackToLoginClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text("Reset password", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("We will send a recovery link to the email on your College Date account.")
        uiState.passwordResetError?.let { ErrorBanner(it) }
        if (uiState.passwordResetSent) {
            Text(
                text = "Password reset email sent. Check your inbox and spam folder.",
                color = MaterialTheme.colorScheme.primary,
            )
        }
        CollegeDateTextField(
            value = uiState.email,
            onValueChange = onEmailChange,
            label = "Email",
            modifier = Modifier.fillMaxWidth(),
            keyboardType = KeyboardType.Email,
        )
        CollegeDatePrimaryButton(
            text = "Send reset email",
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth(),
            loading = uiState.isSubmitting,
        )
        TextButton(onClick = onBackToLoginClick) {
            Text("Back to login")
        }
    }
}
