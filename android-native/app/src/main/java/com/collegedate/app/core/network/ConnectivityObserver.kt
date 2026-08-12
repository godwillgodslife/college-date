package com.collegedate.app.core.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.core.content.getSystemService
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import javax.inject.Inject
import javax.inject.Singleton

enum class NetworkStatus {
    Available,
    Unavailable,
}

@Singleton
class ConnectivityObserver @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun observe(): Flow<NetworkStatus> =
        callbackFlow {
            val connectivityManager = context.getSystemService<ConnectivityManager>()
            if (connectivityManager == null) {
                trySend(NetworkStatus.Unavailable)
                close()
                return@callbackFlow
            }

            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    trySend(NetworkStatus.Available)
                }

                override fun onLost(network: Network) {
                    trySend(NetworkStatus.Unavailable)
                }

                override fun onUnavailable() {
                    trySend(NetworkStatus.Unavailable)
                }

                override fun onCapabilitiesChanged(
                    network: Network,
                    networkCapabilities: NetworkCapabilities,
                ) {
                    trySend(networkStatus(networkCapabilities))
                }
            }

            trySend(currentStatus(connectivityManager))
            connectivityManager.registerDefaultNetworkCallback(callback)
            awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
        }.distinctUntilChanged()

    private fun currentStatus(connectivityManager: ConnectivityManager): NetworkStatus {
        val network = connectivityManager.activeNetwork ?: return NetworkStatus.Unavailable
        val capabilities =
            connectivityManager.getNetworkCapabilities(network) ?: return NetworkStatus.Unavailable
        return networkStatus(capabilities)
    }

    private fun networkStatus(capabilities: NetworkCapabilities): NetworkStatus =
        networkStatus(
            hasInternetCapability = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
            hasValidatedCapability = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
        )
}

internal fun networkStatus(
    hasInternetCapability: Boolean,
    hasValidatedCapability: Boolean,
): NetworkStatus =
    if (hasInternetCapability && hasValidatedCapability) {
        NetworkStatus.Available
    } else {
        NetworkStatus.Unavailable
    }
