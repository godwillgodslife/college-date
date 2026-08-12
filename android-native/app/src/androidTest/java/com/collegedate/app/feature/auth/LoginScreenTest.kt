package com.collegedate.app.feature.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.collegedate.app.core.designsystem.theme.CollegeDateTheme
import org.junit.Assert.assertTrue
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

    @Test
    fun loginFieldsAcceptInputAndTogglePasswordVisibility() {
        var emailInput = ""
        var passwordInput = ""

        composeRule.setContent {
            CollegeDateTheme {
                LoginScreen(
                    uiState = AuthUiState(email = emailInput, password = passwordInput),
                    onEmailChange = { emailInput = it },
                    onPasswordChange = { passwordInput = it },
                    onSubmit = {},
                    onRegisterClick = {},
                    onPasswordRecoveryClick = {},
                )
            }
        }

        composeRule.onNodeWithTag("login_email").performTextInput("student@unilag.edu.ng")
        composeRule.onNodeWithTag("login_password").performTextInput("SecretPass123!")

        // Password visibility toggle
        composeRule.onNodeWithContentDescription("Show password").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Show password").performClick()
        composeRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }

    @Test
    fun loginScreenTriggersNavigationCallbacks() {
        var registerClicked = false
        var recoveryClicked = false

        composeRule.setContent {
            CollegeDateTheme {
                LoginScreen(
                    uiState = AuthUiState(),
                    onEmailChange = {},
                    onPasswordChange = {},
                    onSubmit = {},
                    onRegisterClick = { registerClicked = true },
                    onPasswordRecoveryClick = { recoveryClicked = true },
                )
            }
        }

        composeRule.onNodeWithTag("login_create_account").performClick()
        assertTrue(registerClicked)

        composeRule.onNodeWithTag("login_forgot_password").performClick()
        assertTrue(recoveryClicked)
    }
}
