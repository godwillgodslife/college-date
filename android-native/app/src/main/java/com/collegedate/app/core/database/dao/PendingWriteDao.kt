package com.collegedate.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.collegedate.app.core.database.entity.PendingWriteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingWriteDao {
    @Query("SELECT * FROM pending_writes ORDER BY createdAtMillis ASC")
    fun observePendingWrites(): Flow<List<PendingWriteEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(write: PendingWriteEntity)

    @Query("UPDATE pending_writes SET attemptCount = attemptCount + 1, lastError = :error WHERE id = :id")
    suspend fun markAttempt(id: String, error: String?)

    @Query("DELETE FROM pending_writes WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM pending_writes WHERE ownerUserId = :ownerUserId")
    suspend fun clearForUser(ownerUserId: String)
}
