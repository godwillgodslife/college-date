package com.collegedate.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.EmptyState

@Composable
fun EmailVerificationScreen(
    email: String?,
    onBackToLoginClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text("Verify your email", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        EmptyState(
            title = "Check your inbox",
            message = if (email == null) {
                "Supabase requires email verification before this account can continue."
            } else {
                "Supabase requires email verification before $email can continue."
            },
        )
        CollegeDatePrimaryButton(
            text = "Back to login",
            onClick = onBackToLoginClick,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
