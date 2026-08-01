package com.collegedate.app.core.datastore

interface SessionPreferences {
    suspend fun setLastUserId(userId: String?)
    suspend fun setHasCompletedOnboarding(value: Boolean?)
    suspend fun clearPersonalState()
}
