package com.collegedate.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.collegeDateDataStore by preferencesDataStore("college_date_preferences")

class AppPreferences(
    private val context: Context,
) : SessionPreferences {
    val lastUserId: Flow<String?> =
        context.collegeDateDataStore.data.map { preferences ->
            preferences[Keys.LastUserId]
        }

    val hasCompletedOnboarding: Flow<Boolean?> =
        context.collegeDateDataStore.data.map { preferences ->
            preferences[Keys.HasCompletedOnboarding]
        }

    override suspend fun setLastUserId(userId: String?) {
        context.collegeDateDataStore.edit { preferences ->
            if (userId == null) {
                preferences.remove(Keys.LastUserId)
            } else {
                preferences[Keys.LastUserId] = userId
            }
        }
    }

    override suspend fun setHasCompletedOnboarding(value: Boolean?) {
        context.collegeDateDataStore.edit { preferences ->
            if (value == null) {
                preferences.remove(Keys.HasCompletedOnboarding)
            } else {
                preferences[Keys.HasCompletedOnboarding] = value
            }
        }
    }

    override suspend fun clearPersonalState() {
        context.collegeDateDataStore.edit { preferences ->
            preferences.remove(Keys.LastUserId)
            preferences.remove(Keys.HasCompletedOnboarding)
        }
    }

    private object Keys {
        val LastUserId = stringPreferencesKey("last_user_id")
        val HasCompletedOnboarding = booleanPreferencesKey("has_completed_onboarding")
    }
}
