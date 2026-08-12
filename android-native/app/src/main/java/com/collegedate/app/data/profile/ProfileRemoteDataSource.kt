package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.UserProfile
import com.collegedate.app.domain.profile.EditableProfile
import com.collegedate.app.domain.profile.ProfilePhoto

interface ProfileRemoteDataSource {
    suspend fun fetchCurrentUserProfile(): UserProfile?
    suspend fun updateCurrentProfile(profile: EditableProfile): UserProfile
    suspend fun uploadProfilePhoto(
        ownerUserId: String,
        bytes: ByteArray,
        contentType: String,
    ): ProfilePhoto
}
