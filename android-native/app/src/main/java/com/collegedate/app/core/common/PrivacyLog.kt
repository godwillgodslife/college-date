package com.collegedate.app.core.common

import android.util.Log
import com.collegedate.app.BuildConfig

object PrivacyLog {
    fun debug(tag: String, message: String) {
        if (BuildConfig.DEBUG) {
            Log.d(tag, SensitiveDataRedactor.redact(message))
        }
    }

    fun warning(tag: String, message: String, throwable: Throwable? = null) {
        if (BuildConfig.DEBUG) {
            Log.w(tag, SensitiveDataRedactor.redact(message), throwable)
        }
    }
}
