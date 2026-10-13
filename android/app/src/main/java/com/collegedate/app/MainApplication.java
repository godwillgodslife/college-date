package com.collegedate.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import java.lang.reflect.Method;

public class MainApplication extends Application {
    private static final String TAG = "MainApplication";
    public static final String ONESIGNAL_APP_ID = "eda29312-5e13-406f-a1bd-5c8a8e27e6c4";

    @Override
    public void onCreate() {
        super.onCreate();

        // 1. Initialize Android 8.0+ Notification Channels at Application startup
        // Ensures channels exist with sound and vibration before any FCM push is received in background
        createNotificationChannels();

        // 2. Initialize OneSignal natively via runtime reflection
        // Guarantees background push handling, wakeups, sound, vibration, and badge counts
        // even when the app is completely closed, without compile-time classpath conflicts.
        initOneSignalSafely();
    }

    private void initOneSignalSafely() {
        try {
            Class<?> oneSignalClass = Class.forName("com.onesignal.OneSignal");
            Method initWithContextMethod = oneSignalClass.getMethod("initWithContext", Context.class, String.class);
            initWithContextMethod.invoke(null, this, ONESIGNAL_APP_ID);
            Log.i(TAG, "OneSignal native initialization via reflection completed successfully");
        } catch (Throwable t) {
            Log.w(TAG, "OneSignal native reflection initialization warning: " + t.getMessage());
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build();
            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            // Channel 1: Messages & Direct Chats (High priority with sound and vibration)
            NotificationChannel channelMessages = new NotificationChannel(
                "channel_messages",
                "Messages & Chats",
                NotificationManager.IMPORTANCE_HIGH
            );
            channelMessages.setDescription("Notifications for direct chat messages and replies");
            channelMessages.setSound(defaultSoundUri, audioAttributes);
            channelMessages.enableVibration(true);
            channelMessages.setVibrationPattern(new long[]{0, 250, 150, 250});
            channelMessages.setShowBadge(true);

            // Channel 2: Matches & Connections (High priority with sound and vibration)
            NotificationChannel channelMatches = new NotificationChannel(
                "channel_matches",
                "Matches & Connections",
                NotificationManager.IMPORTANCE_HIGH
            );
            channelMatches.setDescription("Notifications for new likes and mutual matches");
            channelMatches.setSound(defaultSoundUri, audioAttributes);
            channelMatches.enableVibration(true);
            channelMatches.setVibrationPattern(new long[]{0, 250, 150, 250});
            channelMatches.setShowBadge(true);

            // Channel 3: Campus Activity & Social (Default priority with sound)
            NotificationChannel channelActivity = new NotificationChannel(
                "channel_activity",
                "Campus Activity & Social",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channelActivity.setDescription("Notifications for confessions, questions, and streak updates");
            channelActivity.setSound(defaultSoundUri, audioAttributes);
            channelActivity.setShowBadge(true);

            notificationManager.createNotificationChannel(channelMessages);
            notificationManager.createNotificationChannel(channelMatches);
            notificationManager.createNotificationChannel(channelActivity);
        }
    }
}
