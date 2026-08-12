package com.collegedate.app.data.matching

import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.data.discovery.DiscoveryRepository
import com.collegedate.app.domain.matching.MatchedProfile
import com.collegedate.app.domain.matching.SwipeAction
import com.collegedate.app.domain.matching.SwipeResult
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.withContext

@Singleton
class MatchingRepositoryImpl @Inject constructor(
    private val remoteDataSource: MatchingRemoteDataSource,
    private val discoveryRepository: DiscoveryRepository,
    private val dispatchersProvider: DispatchersProvider,
) : MatchingRepository {
    override suspend fun submitSwipe(action: SwipeAction): OperationResult<SwipeResult> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.submitSwipe(action).also { result ->
                    if (result.success) {
                        discoveryRepository.invalidateProfile(action.targetProfileId)
                    }
                }
            }.fold(
                onSuccess = { result ->
                    if (result.success) {
                        OperationResult.Success(result)
                    } else {
                        OperationResult.Failure(
                            FailureType.Validation,
                            result.message ?: "Swipe could not be recorded.",
                        )
                    }
                },
                onFailure = { throwable ->
                    OperationResult.Failure(
                        if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                        if (throwable is IOException) {
                            "Swipe will need a connection. Try again when you are online."
                        } else {
                            "Unable to submit swipe."
                        },
                    )
                },
            )
        }

    override suspend fun getMatchedProfile(profileId: String): OperationResult<MatchedProfile> =
        withContext(dispatchersProvider.io) {
            runCatching {
                remoteDataSource.getMatchedProfile(profileId)
            }.fold(
                onSuccess = { OperationResult.Success(it) },
                onFailure = { throwable ->
                    OperationResult.Failure(
                        if (throwable is IOException) FailureType.Network else FailureType.Unknown,
                        "Unable to open this matched profile.",
                    )
                },
            )
        }
}
