package com.cocpotion.calculator;

import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (window != null) {
            int topThemeColor = Color.parseColor("#0f172a");
            int bottomThemeColor = Color.parseColor("#1e1b4b");
            View decorView = window.getDecorView();
            decorView.setBackgroundColor(topThemeColor);
            window.setStatusBarColor(topThemeColor);
            window.setNavigationBarColor(bottomThemeColor);
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(
                new ClashWidgetJsBridge(getApplicationContext()),
                "ClashWidgetBridge"
            );
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        VillageAppWidget.updateAllWidgets(getApplicationContext());
    }

    public static class ClashWidgetJsBridge {
        private final Context appContext;

        public ClashWidgetJsBridge(Context context) {
            this.appContext = context;
        }

        @JavascriptInterface
        public void syncVillages(String villagesJson, int activeIndex) {
            VillageAppWidget.saveWidgetDataAndRefresh(appContext, villagesJson, activeIndex);
        }
    }
}


