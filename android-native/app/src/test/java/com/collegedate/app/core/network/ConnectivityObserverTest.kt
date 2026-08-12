package com.collegedate.app.core.network

import org.junit.Assert.assertEquals
import org.junit.Test

class ConnectivityObserverTest {
    @Test
    fun validatedInternetNetworkIsAvailable() {
        assertEquals(
            NetworkStatus.Available,
            networkStatus(hasInternetCapability = true, hasValidatedCapability = true),
        )
    }

    @Test
    fun unvalidatedOrMissingInternetNetworkIsUnavailable() {
        assertEquals(
            NetworkStatus.Unavailable,
            networkStatus(hasInternetCapability = true, hasValidatedCapability = false),
        )
        assertEquals(
            NetworkStatus.Unavailable,
            networkStatus(hasInternetCapability = false, hasValidatedCapability = true),
        )
    }
}
