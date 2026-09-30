package com.collegedate.app.plugins;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "PlayUpdate")
public class PlayUpdatePlugin extends Plugin {
    private static final String TAG = "PlayUpdatePlugin";
    public static final int REQUEST_CODE_FLEXIBLE_UPDATE = 5301;
    public static final int REQUEST_CODE_IMMEDIATE_UPDATE = 5302;

    private AppUpdateManager appUpdateManager;
    private AppUpdateInfo currentAppUpdateInfo;
    private InstallStateUpdatedListener installStateListener;

    // Simulation / QA Mock state for emulator testing
    private boolean isMockActive = false;
    private JSObject mockState = null;

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext();
            if (context != null) {
                appUpdateManager = AppUpdateManagerFactory.create(context);
                setupInstallListener();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to initialize AppUpdateManager: " + e.getMessage());
        }
    }

    private void setupInstallListener() {
        if (appUpdateManager == null || installStateListener != null) return;
        try {
            installStateListener = state -> {
                JSObject ret = new JSObject();
                String statusStr = mapInstallStatus(state.installStatus());
                ret.put("installStatus", statusStr);
                ret.put("bytesDownloaded", state.bytesDownloaded());
                ret.put("totalBytesToDownload", state.totalBytesToDownload());
                ret.put("installErrorCode", state.installErrorCode());
                notifyListeners("onInstallStatusChange", ret);
            };
            appUpdateManager.registerListener(installStateListener);
        } catch (Exception e) {
            Log.w(TAG, "Failed to register InstallStateUpdatedListener: " + e.getMessage());
        }
    }

    private long getAppVersionCode() {
        try {
            Context context = getContext();
            if (context != null) {
                PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    return pInfo.getLongVersionCode();
                } else {
                    return pInfo.versionCode;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not determine app versionCode: " + e.getMessage());
        }
        return 0;
    }

    private String mapInstallStatus(int status) {
        switch (status) {
            case InstallStatus.PENDING:
                return "PENDING";
            case InstallStatus.DOWNLOADING:
                return "DOWNLOADING";
            case InstallStatus.DOWNLOADED:
                return "DOWNLOADED";
            case InstallStatus.INSTALLING:
                return "INSTALLING";
            case InstallStatus.INSTALLED:
                return "INSTALLED";
            case InstallStatus.FAILED:
                return "FAILED";
            case InstallStatus.CANCELED:
                return "CANCELED";
            case InstallStatus.UNKNOWN:
            default:
                return "UNKNOWN";
        }
    }

    @PluginMethod
    public void getAppUpdateInfo(PluginCall call) {
        // Return mock state if active for automated QA on emulators
        if (isMockActive && mockState != null) {
            call.resolve(mockState);
            return;
        }

        if (appUpdateManager == null) {
            JSObject ret = new JSObject();
            ret.put("updateAvailable", false);
            ret.put("updateAvailability", UpdateAvailability.UPDATE_NOT_AVAILABLE);
            ret.put("currentVersionCode", getAppVersionCode());
            ret.put("isPlayServicesAvailable", false);
            ret.put("error", "AppUpdateManager not initialized");
            call.resolve(ret);
            return;
        }

        appUpdateManager.getAppUpdateInfo()
            .addOnSuccessListener(appUpdateInfo -> {
                currentAppUpdateInfo = appUpdateInfo;
                JSObject ret = new JSObject();
                int availability = appUpdateInfo.updateAvailability();
                boolean isAvailable = availability == UpdateAvailability.UPDATE_AVAILABLE;
                boolean isUpdateInProgress = availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;

                ret.put("updateAvailable", isAvailable);
                ret.put("updateAvailability", availability);
                ret.put("isUpdateInProgress", isUpdateInProgress);
                ret.put("availableVersionCode", appUpdateInfo.availableVersionCode());
                ret.put("currentVersionCode", getAppVersionCode());
                ret.put("updatePriority", appUpdateInfo.updatePriority());
                ret.put("clientVersionStalenessDays", appUpdateInfo.clientVersionStalenessDays() != null ? appUpdateInfo.clientVersionStalenessDays() : 0);
                ret.put("isFlexibleAllowed", appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
                ret.put("isImmediateAllowed", appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                ret.put("installStatus", mapInstallStatus(appUpdateInfo.installStatus()));
                ret.put("isPlayServicesAvailable", true);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> {
                Log.i(TAG, "Google Play In-App Update not available: " + e.getMessage());
                JSObject ret = new JSObject();
                ret.put("updateAvailable", false);
                ret.put("updateAvailability", UpdateAvailability.UPDATE_NOT_AVAILABLE);
                ret.put("currentVersionCode", getAppVersionCode());
                ret.put("isPlayServicesAvailable", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Play Store update check unavailable");
                call.resolve(ret);
            });
    }

    @PluginMethod
    public void startFlexibleUpdate(PluginCall call) {
        if (isMockActive) {
            // Emulate background download progression for QA
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("type", "FLEXIBLE");
            call.resolve(ret);

            // Simulate download complete after short delay
            Activity activity = getActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    JSObject state = new JSObject();
                    state.put("installStatus", "DOWNLOADED");
                    state.put("bytesDownloaded", 15000000);
                    state.put("totalBytesToDownload", 15000000);
                    state.put("installErrorCode", 0);
                    notifyListeners("onInstallStatusChange", state);
                });
            }
            return;
        }

        Activity activity = getActivity();
        if (activity == null || appUpdateManager == null || currentAppUpdateInfo == null) {
            call.reject("Cannot start flexible update: missing activity, manager, or update info");
            return;
        }

        if (!currentAppUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
            call.reject("Flexible update is not allowed by Google Play for this build");
            return;
        }

        try {
            appUpdateManager.startUpdateFlowForResult(
                currentAppUpdateInfo,
                activity,
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                REQUEST_CODE_FLEXIBLE_UPDATE
            );
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("type", "FLEXIBLE");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error launching flexible update flow: " + e.getMessage(), e);
            call.reject("Failed to launch flexible update: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startImmediateUpdate(PluginCall call) {
        if (isMockActive) {
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("type", "IMMEDIATE");
            call.resolve(ret);
            return;
        }

        Activity activity = getActivity();
        if (activity == null || appUpdateManager == null || currentAppUpdateInfo == null) {
            call.reject("Cannot start immediate update: missing activity, manager, or update info");
            return;
        }

        if (!currentAppUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
            call.reject("Immediate update is not allowed by Google Play for this build");
            return;
        }

        try {
            appUpdateManager.startUpdateFlowForResult(
                currentAppUpdateInfo,
                activity,
                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                REQUEST_CODE_IMMEDIATE_UPDATE
            );
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("type", "IMMEDIATE");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error launching immediate update flow: " + e.getMessage(), e);
            call.reject("Failed to launch immediate update: " + e.getMessage());
        }
    }

    @PluginMethod
    public void completeFlexibleUpdate(PluginCall call) {
        if (isMockActive) {
            JSObject ret = new JSObject();
            ret.put("completed", true);
            call.resolve(ret);
            return;
        }

        if (appUpdateManager == null) {
            call.reject("AppUpdateManager is not initialized");
            return;
        }

        try {
            appUpdateManager.completeUpdate()
                .addOnSuccessListener(aVoid -> {
                    JSObject ret = new JSObject();
                    ret.put("completed", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    call.reject("Failed to complete flexible update: " + e.getMessage());
                });
        } catch (Exception e) {
            call.reject("Exception calling completeUpdate: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setMockUpdateInfo(PluginCall call) {
        Boolean enable = call.getBoolean("enable", false);
        if (enable != null && enable) {
            isMockActive = true;
            mockState = new JSObject();
            mockState.put("updateAvailable", call.getBoolean("updateAvailable", true));
            mockState.put("updateAvailability", call.getInt("updateAvailability", UpdateAvailability.UPDATE_AVAILABLE));
            mockState.put("isUpdateInProgress", call.getBoolean("isUpdateInProgress", false));
            mockState.put("availableVersionCode", call.getInt("availableVersionCode", 58));
            mockState.put("currentVersionCode", getAppVersionCode());
            mockState.put("updatePriority", call.getInt("updatePriority", 0));
            mockState.put("clientVersionStalenessDays", call.getInt("clientVersionStalenessDays", 2));
            mockState.put("isFlexibleAllowed", call.getBoolean("isFlexibleAllowed", true));
            mockState.put("isImmediateAllowed", call.getBoolean("isImmediateAllowed", true));
            mockState.put("installStatus", call.getString("installStatus", "UNKNOWN"));
            mockState.put("isPlayServicesAvailable", true);
            call.resolve(mockState);
        } else {
            isMockActive = false;
            mockState = null;
            JSObject ret = new JSObject();
            ret.put("isMockActive", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void simulateInstallStatus(PluginCall call) {
        String status = call.getString("status", "DOWNLOADED");
        JSObject state = new JSObject();
        state.put("installStatus", status);
        state.put("bytesDownloaded", call.getInt("bytesDownloaded", 15000000));
        state.put("totalBytesToDownload", call.getInt("totalBytesToDownload", 15000000));
        state.put("installErrorCode", 0);
        notifyListeners("onInstallStatusChange", state);
        call.resolve(state);
    }

    public void checkResumeState() {
        if (appUpdateManager == null) return;
        try {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                    JSObject ret = new JSObject();
                    ret.put("installStatus", "DOWNLOADED");
                    notifyListeners("onInstallStatusChange", ret);
                } else if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    // Resume immediate update flow automatically
                    Activity activity = getActivity();
                    if (activity != null && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        try {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                activity,
                                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                                REQUEST_CODE_IMMEDIATE_UPDATE
                            );
                        } catch (Exception ex) {
                            Log.w(TAG, "Failed to resume immediate update in onResume: " + ex.getMessage());
                        }
                    }
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "checkResumeState exception: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (appUpdateManager != null && installStateListener != null) {
            try {
                appUpdateManager.unregisterListener(installStateListener);
            } catch (Exception ignored) {}
            installStateListener = null;
        }
        super.handleOnDestroy();
    }
}
