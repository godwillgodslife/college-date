package com.collegedate.app.feature.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import com.collegedate.app.core.designsystem.theme.CollegeDateTheme
import org.junit.Rule
import org.junit.Test

class LoginScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun loginScreenShowsValidationError() {
        composeRule.setContent {
            CollegeDateTheme {
                LoginScreen(
                    uiState = AuthUiState(loginError = "Enter a valid email address."),
                    onEmailChange = {},
                    onPasswordChange = {},
                    onSubmit = {},
                    onRegisterClick = {},
                    onPasswordRecoveryClick = {},
                )
            }
        }

        composeRule.onNodeWithTag("login_error").assertIsDisplayed()
        composeRule.onNodeWithText("Enter a valid email address.").assertIsDisplayed()
    }
}
