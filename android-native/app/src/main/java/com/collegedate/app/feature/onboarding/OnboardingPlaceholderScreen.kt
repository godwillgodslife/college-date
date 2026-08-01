package com.collegedate.app.feature.onboarding

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
import com.collegedate.app.core.designsystem.components.CollegeDateBadge
import com.collegedate.app.core.designsystem.components.CollegeDateSecondaryButton

@Composable
fun OnboardingPlaceholderScreen(
    onLogout: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        CollegeDateBadge("Development placeholder")
        Text("Campus onboarding", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            text = "The native app has authenticated this user, but full profile setup is intentionally deferred to the onboarding migration phase.",
            style = MaterialTheme.typography.bodyLarge,
        )
        CollegeDateSecondaryButton(
            text = "Log out",
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
