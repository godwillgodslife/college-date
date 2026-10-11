package com.collegedate.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

import com.collegedate.app.plugins.PlayUpdatePlugin;
import com.collegedate.app.plugins.AppBadgePlugin;

import android.os.Build;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayUpdatePlugin.class);
        registerPlugin(AppBadgePlugin.class);

        // Install AndroidX Splash Screen so postSplashScreenTheme is applied
        SplashScreen.installSplashScreen(this);

        // Suppress native platform title & action bar before decor is installed
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);

        // Enable backward-compatible edge-to-edge display (Android 15+ SDK 35 standard)
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        // Defensively hide native or AppCompat action bar if attached
        if (getActionBar() != null) {
            getActionBar().hide();
        }
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        // Initialize Android 8.0+ Notification Channels
        createNotificationChannels();

        // Pre-request critical runtime permissions (Mic, Camera, and Android 13+ Push Notifications)
        List<String> permissionsToRequest = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= 33) { // Android 13 (TIRAMISU)
            if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add("android.permission.POST_NOTIFICATIONS");
            }
        }
        permissionsToRequest.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);

        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest.toArray(new String[0]), 1001);
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // CRITICAL: Allow incoming audio & video playout without manual touch gesture
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null) {
            com.getcapacitor.PluginHandle handle = getBridge().getPlugin("PlayUpdate");
            if (handle != null && handle.getInstance() instanceof PlayUpdatePlugin) {
                ((PlayUpdatePlugin) handle.getInstance()).checkResumeState();
            }
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                NotificationChannel channelMessages = new NotificationChannel(
                    "channel_messages",
                    "Messages & Chats",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channelMessages.setDescription("Notifications for direct chat messages and replies");
                channelMessages.enableVibration(true);
                channelMessages.setShowBadge(true);

                NotificationChannel channelMatches = new NotificationChannel(
                    "channel_matches",
                    "Matches & Connections",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channelMatches.setDescription("Notifications for new likes and mutual matches");
                channelMatches.enableVibration(true);
                channelMatches.setShowBadge(true);

                NotificationChannel channelActivity = new NotificationChannel(
                    "channel_activity",
                    "Campus Activity & Social",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channelActivity.setDescription("Notifications for confessions, questions, and streak updates");
                channelActivity.setShowBadge(true);

                notificationManager.createNotificationChannel(channelMessages);
                notificationManager.createNotificationChannel(channelMatches);
                notificationManager.createNotificationChannel(channelActivity);
            }
        }
    }
}

