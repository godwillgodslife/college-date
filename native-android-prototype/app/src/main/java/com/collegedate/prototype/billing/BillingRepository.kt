package com.collegedate.prototype.billing

import android.app.Activity
import com.collegedate.prototype.config.ConfigProvider
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.PurchaseCallback
import com.revenuecat.purchases.interfaces.LogInCallback
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.interfaces.ReceiveOfferingsCallback
import com.revenuecat.purchases.models.StoreTransaction
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class PremiumPackagePreview(
    val identifier: String,
    val productId: String,
    val title: String,
    val price: String,
    val packageType: String
)

data class PremiumState(
    val configured: Boolean,
    val isPremium: Boolean,
    val entitlementActive: Boolean,
    val expirationDate: String?,
    val offeringId: String?,
    val packages: List<PremiumPackagePreview>,
    val message: String?
)

sealed interface BillingResult {
    data class Success(val state: PremiumState) : BillingResult
    data class Failure(val message: String) : BillingResult
}

class BillingRepository {
    suspend fun identifyUser(userId: String): BillingResult {
        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            return BillingResult.Success(
                PremiumState(
                    configured = false,
                    isPremium = false,
                    entitlementActive = false,
                    expirationDate = null,
                    offeringId = null,
                    packages = emptyList(),
                    message = BillingReadiness.statusMessage()
                )
            )
        }

        val customerInfo = when (val result = logIn(userId)) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }
        val offerings = when (val result = getOfferings()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> null
        }
        return BillingResult.Success(stateFromCustomerAndOffering(
            customerInfo,
            offerings,
            "RevenueCat identified this Supabase user."
        ))
    }

    suspend fun logoutUser(): BillingResult {
        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            return BillingResult.Success(
                PremiumState(
                    configured = false,
                    isPremium = false,
                    entitlementActive = false,
                    expirationDate = null,
                    offeringId = null,
                    packages = emptyList(),
                    message = BillingReadiness.statusMessage()
                )
            )
        }

        val customerInfo = when (val result = logOut()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }
        return BillingResult.Success(stateFromCustomerAndOffering(
            customerInfo,
            null,
            "RevenueCat user logged out locally."
        ))
    }

    suspend fun loadPremiumState(): BillingResult {
        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            return BillingResult.Success(
                PremiumState(
                    configured = false,
                    isPremium = false,
                    entitlementActive = false,
                    expirationDate = null,
                    offeringId = null,
                    packages = emptyList(),
                    message = BillingReadiness.statusMessage()
                )
            )
        }

        val customerInfo = when (val result = getCustomerInfo()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }
        val offerings = when (val result = getOfferings()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }

        return BillingResult.Success(stateFromCustomerAndOffering(customerInfo, offerings, "RevenueCat offering loaded."))
    }

    suspend fun restorePurchases(): BillingResult {
        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            return BillingResult.Success(
                PremiumState(
                    configured = false,
                    isPremium = false,
                    entitlementActive = false,
                    expirationDate = null,
                    offeringId = null,
                    packages = emptyList(),
                    message = BillingReadiness.statusMessage()
                )
            )
        }

        val restoredInfo = when (val result = restoreCustomerInfo()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }

        val offerings = when (val result = getOfferings()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> null
        }

        return BillingResult.Success(stateFromCustomerAndOffering(
            restoredInfo,
            offerings,
            if (restoredInfo.entitlements[BillingReadiness.premiumEntitlement]?.isActive == true) {
                "Purchases restored. Premium is active."
            } else {
                "Restore completed. No active Premium entitlement found."
            }
        ))
    }

    suspend fun purchaseMonthlyPremium(activity: Activity): BillingResult {
        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            return BillingResult.Failure(BillingReadiness.statusMessage())
        }

        val offerings = when (val result = getOfferings()) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }
        val offering = offerings.current ?: offerings[BillingReadiness.expectedOffering]
            ?: return BillingResult.Failure("RevenueCat offering ${BillingReadiness.expectedOffering} was not found.")
        val packageToBuy = offering.monthly
            ?: offering.availablePackages.firstOrNull { pkg ->
                pkg.identifier == "\$rc_monthly" ||
                    pkg.product.id == BillingReadiness.expectedProduct ||
                    pkg.product.id.startsWith("premium_monthly")
            }
            ?: return BillingResult.Failure("Monthly premium package was not found.")

        val customerInfo = when (val result = purchasePackage(activity, packageToBuy)) {
            is CallbackResult.Success -> result.value
            is CallbackResult.Failure -> return BillingResult.Failure(result.message)
        }

        return BillingResult.Success(stateFromCustomerAndOffering(
            customerInfo,
            offerings,
            if (customerInfo.entitlements[BillingReadiness.premiumEntitlement]?.isActive == true) {
                "Purchase completed. Premium is active."
            } else {
                "Purchase completed, but Premium entitlement is not active yet."
            }
        ))
    }

    private fun stateFromCustomerAndOffering(
        customerInfo: CustomerInfo,
        offerings: Offerings?,
        message: String
    ): PremiumState {
        val entitlement = customerInfo.entitlements[BillingReadiness.premiumEntitlement]
        val offering = offerings?.current ?: offerings?.get(BillingReadiness.expectedOffering)
        val packages = offering?.availablePackages.orEmpty().map { pkg ->
            PremiumPackagePreview(
                identifier = pkg.identifier,
                productId = pkg.product.id,
                title = pkg.product.title,
                price = pkg.product.price.formatted,
                packageType = pkg.packageType.name
            )
        }

        return PremiumState(
            configured = true,
            isPremium = entitlement?.isActive == true,
            entitlementActive = entitlement?.isActive == true,
            expirationDate = entitlement?.expirationDate?.toString(),
            offeringId = offering?.identifier,
            packages = packages,
            message = if (packages.isEmpty() && message == "RevenueCat offering loaded.") {
                "RevenueCat configured, but no packages were returned."
            } else {
                message
            }
        )
    }

    private suspend fun getCustomerInfo(): CallbackResult<CustomerInfo> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.getCustomerInfo(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(customerInfo))
            }

            override fun onError(error: PurchasesError) {
                if (continuation.isActive) continuation.resume(CallbackResult.Failure(error.message))
            }
        })
    }

    private suspend fun getOfferings(): CallbackResult<Offerings> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.getOfferings(object : ReceiveOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(offerings))
            }

            override fun onError(error: PurchasesError) {
                if (continuation.isActive) continuation.resume(CallbackResult.Failure(error.message))
            }
        })
    }

    private suspend fun restoreCustomerInfo(): CallbackResult<CustomerInfo> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.restorePurchases(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(customerInfo))
            }

            override fun onError(error: PurchasesError) {
                if (continuation.isActive) continuation.resume(CallbackResult.Failure(error.message))
            }
        })
    }

    private suspend fun purchasePackage(
        activity: Activity,
        packageToBuy: com.revenuecat.purchases.Package
    ): CallbackResult<CustomerInfo> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.purchasePackage(activity, packageToBuy, object : PurchaseCallback {
            override fun onCompleted(storeTransaction: StoreTransaction, customerInfo: CustomerInfo) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(customerInfo))
            }

            override fun onError(error: PurchasesError, userCancelled: Boolean) {
                if (continuation.isActive) {
                    continuation.resume(CallbackResult.Failure(if (userCancelled) "Purchase cancelled." else error.message))
                }
            }
        })
    }

    private suspend fun logIn(userId: String): CallbackResult<CustomerInfo> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.logIn(userId, object : LogInCallback {
            override fun onReceived(customerInfo: CustomerInfo, created: Boolean) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(customerInfo))
            }

            override fun onError(error: PurchasesError) {
                if (continuation.isActive) continuation.resume(CallbackResult.Failure(error.message))
            }
        })
    }

    private suspend fun logOut(): CallbackResult<CustomerInfo> = suspendCancellableCoroutine { continuation ->
        Purchases.sharedInstance.logOut(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                if (continuation.isActive) continuation.resume(CallbackResult.Success(customerInfo))
            }

            override fun onError(error: PurchasesError) {
                if (continuation.isActive) continuation.resume(CallbackResult.Failure(error.message))
            }
        })
    }

    private sealed interface CallbackResult<out T> {
        data class Success<T>(val value: T) : CallbackResult<T>
        data class Failure(val message: String) : CallbackResult<Nothing>
    }
}
