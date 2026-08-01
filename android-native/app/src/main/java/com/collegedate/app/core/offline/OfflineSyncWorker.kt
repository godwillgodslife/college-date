package com.collegedate.app.core.offline

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class OfflineSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result = Result.success()
}
