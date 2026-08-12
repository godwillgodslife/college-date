package com.collegedate.app.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.collegedate.app.core.database.dao.CachedDiscoveryProfileDao
import com.collegedate.app.core.database.dao.CachedProfileDao
import com.collegedate.app.core.database.dao.PendingWriteDao
import com.collegedate.app.core.database.entity.CachedDiscoveryProfileEntity
import com.collegedate.app.core.database.entity.CachedProfileEntity
import com.collegedate.app.core.database.entity.PendingWriteEntity

@Database(
    entities = [
        CachedProfileEntity::class,
        CachedDiscoveryProfileEntity::class,
        PendingWriteEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class CollegeDateDatabase : RoomDatabase() {
    abstract fun cachedProfileDao(): CachedProfileDao
    abstract fun cachedDiscoveryProfileDao(): CachedDiscoveryProfileDao
    abstract fun pendingWriteDao(): PendingWriteDao
}
