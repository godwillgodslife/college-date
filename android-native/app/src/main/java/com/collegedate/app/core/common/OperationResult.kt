package com.collegedate.app.core.common

sealed interface OperationResult<out T> {
    data class Success<T>(val value: T) : OperationResult<T>
    data class Failure(
        val type: FailureType,
        val message: String,
    ) : OperationResult<Nothing>
}

enum class FailureType {
    Configuration,
    InvalidCredentials,
    Validation,
    Network,
    SessionExpired,
    Unknown,
}

inline fun <T> OperationResult<T>.onSuccess(block: (T) -> Unit): OperationResult<T> {
    if (this is OperationResult.Success) block(value)
    return this
}
