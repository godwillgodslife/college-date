package com.collegedate.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.collegedate.app.core.database.entity.CachedDiscoveryProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedDiscoveryProfileDao {
    @Query("SELECT * FROM cached_discovery_profiles ORDER BY sortIndex ASC")
    fun observeProfiles(): Flow<List<CachedDiscoveryProfileEntity>>

    @Query("SELECT * FROM cached_discovery_profiles ORDER BY sortIndex ASC")
    suspend fun profilesSnapshot(): List<CachedDiscoveryProfileEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(profiles: List<CachedDiscoveryProfileEntity>)

    @Query("DELETE FROM cached_discovery_profiles WHERE id = :profileId")
    suspend fun delete(profileId: String)

    @Query("DELETE FROM cached_discovery_profiles")
    suspend fun clear()
}
