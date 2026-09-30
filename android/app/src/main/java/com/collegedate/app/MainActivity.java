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

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayUpdatePlugin.class);

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

        // Pre-request dangerous runtime permissions for calls (Mic, Camera, Audio Settings)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            }, 1001);
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
}
