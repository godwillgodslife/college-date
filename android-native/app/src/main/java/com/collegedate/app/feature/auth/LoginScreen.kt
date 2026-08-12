package com.collegedate.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDatePasswordField
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.ErrorBanner
import com.collegedate.app.core.designsystem.components.OfflineBanner

@Composable
fun LoginScreen(
    uiState: AuthUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onRegisterClick: () -> Unit,
    onPasswordRecoveryClick: () -> Unit,
    isOffline: Boolean = false,
) {
    val keyboardController = LocalSoftwareKeyboardController.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        if (isOffline) {
            OfflineBanner(modifier = Modifier.testTag("offline_banner"))
        }

        Text(
            text = "Welcome back",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "Sign in with the email and password from your existing College Date account.",
            style = MaterialTheme.typography.bodyLarge,
        )

        uiState.loginError?.let { ErrorBanner(it, modifier = Modifier.testTag("login_error")) }

        CollegeDateTextField(
            value = uiState.email,
            onValueChange = onEmailChange,
            label = "Email",
            modifier = Modifier
                .fillMaxWidth()
                .testTag("login_email"),
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Next,
        )

        CollegeDatePasswordField(
            value = uiState.password,
            onValueChange = onPasswordChange,
            label = "Password",
            modifier = Modifier
                .fillMaxWidth()
                .testTag("login_password"),
            imeAction = ImeAction.Done,
            keyboardActions = KeyboardActions(
                onDone = {
                    keyboardController?.hide()
                    onSubmit()
                },
            ),
        )

        CollegeDatePrimaryButton(
            text = "Log in",
            onClick = {
                keyboardController?.hide()
                onSubmit()
            },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("login_submit"),
            loading = uiState.isSubmitting,
            enabled = !isOffline,
        )

        TextButton(
            onClick = onPasswordRecoveryClick,
            modifier = Modifier.testTag("login_forgot_password"),
        ) {
            Text("Forgot password?")
        }

        TextButton(
            onClick = onRegisterClick,
            modifier = Modifier.testTag("login_create_account"),
        ) {
            Text("Create a new account")
        }
    }
}
