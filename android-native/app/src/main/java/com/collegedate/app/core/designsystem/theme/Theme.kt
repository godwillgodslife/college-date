package com.collegedate.app.core.designsystem.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val ColorOnPrimary = Color.White
private val ColorLightText = Color(0xFF17131F)

private val DarkColorScheme = darkColorScheme(
    primary = CollegePurple,
    onPrimary = CollegeText,
    secondary = CollegePink,
    onSecondary = CollegeNight,
    tertiary = CollegeBlue,
    background = CollegeNight,
    onBackground = CollegeText,
    surface = CollegeSurface,
    onSurface = CollegeText,
    surfaceVariant = CollegeSurfaceRaised,
    onSurfaceVariant = CollegeTextSecondary,
    error = CollegeError,
)

private val LightColorScheme = lightColorScheme(
    primary = CollegePurple,
    onPrimary = ColorOnPrimary,
    secondary = CollegePink,
    onSecondary = CollegeNight,
    tertiary = CollegeBlue,
    background = CollegeLightBackground,
    onBackground = ColorLightText,
    surface = CollegeLightSurface,
    onSurface = ColorLightText,
    surfaceVariant = Color(0xFFE7E1F8),
    onSurfaceVariant = Color(0xFF504B62),
    error = CollegeError,
)

@Composable
fun CollegeDateTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
            }
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    CompositionLocalProvider(LocalCollegeSpacing provides CollegeSpacing()) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = CollegeDateTypography,
            shapes = CollegeDateShapes,
            content = content,
        )
    }
}
