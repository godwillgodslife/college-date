package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.UserProfile

interface ProfileRemoteDataSource {
    suspend fun fetchCurrentUserProfile(profileId: String): UserProfile?
}
