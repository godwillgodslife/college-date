package com.collegedate.app.data.matching

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeResult

interface MatchingRepository {
    suspend fun submitSwipe(action: SwipeAction): OperationResult<SwipeResult>
    suspend fun getMatchedProfile(profileId: String): OperationResult<MatchedProfile>
}
