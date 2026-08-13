package com.collegedate.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.collegedate.app.core.database.entity.CachedMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedMessageDao {
    @Query(
        """
        SELECT * FROM cached_messages
        WHERE ownerUserId = :ownerUserId AND matchId = :matchId
        ORDER BY createdAt ASC, id ASC
        """,
    )
    fun observeMessages(ownerUserId: String, matchId: String): Flow<List<CachedMessageEntity>>

    @Query(
        """
        SELECT COUNT(*) FROM cached_messages
        WHERE ownerUserId = :ownerUserId AND matchId = :matchId
        """,
    )
    suspend fun count(ownerUserId: String, matchId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(messages: List<CachedMessageEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(message: CachedMessageEntity)

    @Query("DELETE FROM cached_messages WHERE ownerUserId = :ownerUserId AND matchId = :matchId")
    suspend fun clearMatch(ownerUserId: String, matchId: String)

    @Query("DELETE FROM cached_messages WHERE ownerUserId = :ownerUserId")
    suspend fun clearForUser(ownerUserId: String)

    @Query("DELETE FROM cached_messages")
    suspend fun clearAll()
}
