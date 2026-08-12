package com.collegedate.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.collegedate.app.core.database.entity.CachedProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedProfileDao {
    @Query("SELECT * FROM cached_profiles WHERE id = :profileId")
    fun observeProfile(profileId: String): Flow<CachedProfileEntity?>

    @Query("SELECT * FROM cached_profiles WHERE id = :profileId")
    suspend fun profileSnapshot(profileId: String): CachedProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: CachedProfileEntity)

    @Query("DELETE FROM cached_profiles WHERE id = :profileId")
    suspend fun delete(profileId: String)

    @Query("DELETE FROM cached_profiles")
    suspend fun clear()
}
