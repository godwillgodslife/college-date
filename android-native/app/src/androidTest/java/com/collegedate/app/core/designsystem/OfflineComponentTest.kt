package com.collegedate.app.core.designsystem

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.collegedate.app.core.designsystem.components.OfflineBanner
import com.collegedate.app.core.designsystem.theme.CollegeDateTheme
import org.junit.Rule
import org.junit.Test

class OfflineComponentTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun offlineBannerRendersTitleAndMessage() {
        composeRule.setContent {
            CollegeDateTheme {
                OfflineBanner()
            }
        }

        composeRule.onNodeWithText("Offline").assertIsDisplayed()
        composeRule.onNodeWithText("Some actions will wait until your connection returns.").assertIsDisplayed()
    }
}
