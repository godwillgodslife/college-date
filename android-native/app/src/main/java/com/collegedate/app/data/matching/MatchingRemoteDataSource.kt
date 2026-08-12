package com.collegedate.app.data.matching

import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeResult

interface MatchingRemoteDataSource {
    suspend fun submitSwipe(action: SwipeAction): SwipeResult
    suspend fun getMatchedProfile(profileId: String): MatchedProfile
}
