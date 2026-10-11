package com.collegedate.app.plugins;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.collegedate.app.R;

import me.leolin.shortcutbadger.ShortcutBadger;

@CapacitorPlugin(name = "AppBadge")
public class AppBadgePlugin extends Plugin {
    private static final String TAG = "AppBadgePlugin";
    private static final String PREFS_NAME = "college_date_app_badge";
    private static final String KEY_BADGE_COUNT = "unread_count";
    public static final int BADGE_NOTIFICATION_ID = 9991;
    public static final String BADGE_CHANNEL_ID = "channel_messages";

    @PluginMethod
    public void set(PluginCall call) {
        int count = call.getInt("count", 0);
        if (count < 0) {
            count = 0;
        }

        saveBadgeCount(count);
        applyBadgeToDevice(count);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("count", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        saveBadgeCount(0);
        applyBadgeToDevice(0);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("count", 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void get(PluginCall call) {
        int count = getSavedBadgeCount();
        JSObject ret = new JSObject();
        ret.put("count", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        boolean supported = true;
        try {
            Context context = getContext();
            if (context != null) {
                supported = ShortcutBadger.isBadgeCounterSupported(context) || Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
            }
        } catch (Throwable t) {
            Log.w(TAG, "isSupported check warning: " + t.getMessage());
            supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
        }

        JSObject ret = new JSObject();
        ret.put("isSupported", supported);
        call.resolve(ret);
    }

    private void applyBadgeToDevice(int count) {
        Context context = getContext();
        if (context == null) return;

        // 1. OEM launcher badge update via ShortcutBadger (Samsung, Xiaomi, Huawei, Sony, Nova, etc.)
        try {
            if (count > 0) {
                ShortcutBadger.applyCount(context, count);
            } else {
                ShortcutBadger.removeCount(context);
            }
        } catch (Throwable t) {
            Log.w(TAG, "ShortcutBadger update ignored: " + t.getMessage());
        }

        // 2. Android 8.0+ / AOSP / Pixel launcher badging via NotificationManager & NotificationCompat
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (count <= 0) {
                    nm.cancel(BADGE_NOTIFICATION_ID);
                } else {
                    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent contentIntent = launchIntent != null ? PendingIntent.getActivity(context, 0, launchIntent, flags) : null;

                    String copy = count == 1 ? "1 unread notification" : count + " unread notifications";

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, BADGE_CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle("The College Date")
                        .setContentText(copy)
                        .setNumber(count)
                        .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setOngoing(false)
                        .setAutoCancel(true)
                        .setContentIntent(contentIntent);

                    nm.notify(BADGE_NOTIFICATION_ID, builder.build());
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "NotificationManager badge sync warning: " + t.getMessage());
        }
    }

    private void saveBadgeCount(int count) {
        try {
            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putInt(KEY_BADGE_COUNT, count).apply();
            }
        } catch (Exception e) {
            Log.w(TAG, "saveBadgeCount error: " + e.getMessage());
        }
    }

    private int getSavedBadgeCount() {
        try {
            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                return prefs.getInt(KEY_BADGE_COUNT, 0);
            }
        } catch (Exception e) {
            Log.w(TAG, "getSavedBadgeCount error: " + e.getMessage());
        }
        return 0;
    }
}
