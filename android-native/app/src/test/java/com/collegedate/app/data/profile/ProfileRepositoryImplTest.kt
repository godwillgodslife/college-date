package com.collegedate.app.data.profile

import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.core.database.dao.CachedProfileDao
import com.collegedate.app.core.database.entity.CachedProfileEntity
import com.collegedate.app.core.testing.TestDispatchersProvider
import com.collegedate.app.domain.profile.UserProfile
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileRepositoryImplTest {
    private val dispatcher = StandardTestDispatcher()
    private val dao = FakeCachedProfileDao()

    @Test
    fun refreshCurrentUserProfileReturnsSuccessAndCachesProfile() = runTest(dispatcher) {
        val remote = FakeProfileRemoteDataSource(
            profile = UserProfile(
                id = "user-1",
                displayName = "Ada",
                username = "ada",
                avatarUrl = "https://example.com/ada.jpg",
                isOnboarded = true,
            ),
        )
        val repository = repository(remote)

        val result = repository.refreshCurrentUserProfile("user-1")

        assertTrue(result is OperationResult.Success)
        assertEquals("Ada", (result as OperationResult.Success).value?.displayName)
        assertEquals("Ada", dao.lastUpsert?.displayName)
    }

    @Test
    fun refreshCurrentUserProfileReturnsNetworkFailure() = runTest(dispatcher) {
        val repository = repository(FakeProfileRemoteDataSource(error = IOException("offline")))

        val result = repository.refreshCurrentUserProfile("user-1")

        assertTrue(result is OperationResult.Failure)
        assertEquals("Unable to load profile state.", (result as OperationResult.Failure).message)
    }

    private fun repository(remote: ProfileRemoteDataSource): ProfileRepositoryImpl =
        ProfileRepositoryImpl(
            remoteDataSource = remote,
            cachedProfileDao = dao,
            dispatchersProvider = TestDispatchersProvider(dispatcher),
        )
}

private class FakeProfileRemoteDataSource(
    private val profile: UserProfile? = null,
    private val error: Throwable? = null,
) : ProfileRemoteDataSource {
    override suspend fun fetchCurrentUserProfile(profileId: String): UserProfile? {
        error?.let { throw it }
        return profile
    }
}

private class FakeCachedProfileDao : CachedProfileDao {
    private val profiles = MutableStateFlow<CachedProfileEntity?>(null)
    var lastUpsert: CachedProfileEntity? = null

    override fun observeProfile(profileId: String): Flow<CachedProfileEntity?> = profiles

    override suspend fun upsert(profile: CachedProfileEntity) {
        lastUpsert = profile
        profiles.value = profile
    }

    override suspend fun delete(profileId: String) {
        profiles.value = null
    }

    override suspend fun clear() {
        profiles.value = null
    }
}
