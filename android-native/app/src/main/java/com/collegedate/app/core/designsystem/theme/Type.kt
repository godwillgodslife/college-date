package com.collegedate.app.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

val CollegeDateTypography = Typography().run {
    copy(
        displaySmall = displaySmall.copy(fontWeight = FontWeight.Bold, fontFamily = FontFamily.SansSerif),
        headlineLarge = headlineLarge.copy(fontWeight = FontWeight.Bold, fontFamily = FontFamily.SansSerif),
        headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold, fontFamily = FontFamily.SansSerif),
        titleLarge = titleLarge.copy(fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.SansSerif),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.SansSerif),
        labelLarge = labelLarge.copy(fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.SansSerif),
        bodyLarge = bodyLarge.copy(fontFamily = FontFamily.SansSerif),
        bodyMedium = bodyMedium.copy(fontFamily = FontFamily.SansSerif),
    )
}
