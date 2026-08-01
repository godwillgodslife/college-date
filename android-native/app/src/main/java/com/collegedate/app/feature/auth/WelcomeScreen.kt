package com.collegedate.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.collegedate.app.core.designsystem.components.CollegeDateGradientHeader
import com.collegedate.app.core.designsystem.components.CollegeDatePrimaryButton
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton
import com.collegedate.app.core.designsystem.components.ErrorBanner

@Composable
fun WelcomeScreen(
    configurationMissing: Boolean,
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(22.dp)) {
            CollegeDateGradientHeader(
                title = "The College Date",
                subtitle = "Meet verified adult students across Nigerian campuses.",
            )
            Text(
                text = "Native Android foundation",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "This client is being migrated feature by feature. Authentication is the first production path.",
                style = MaterialTheme.typography.bodyLarge,
            )
            if (configurationMissing) {
                ErrorBanner("Set the public Supabase configuration before using live authentication.")
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Spacer(Modifier.height(8.dp))
            CollegeDatePrimaryButton(
                text = "Log in",
                onClick = onLoginClick,
                modifier = Modifier.fillMaxWidth(),
            )
            CollegeDateSecondaryButton(
                text = "Create account",
                onClick = onRegisterClick,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
