package com.cocpotion.calculator;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class VillageAppWidget extends AppWidgetProvider {

    public static final String PREFS_NAME = "clash_widget_prefs";
    public static final String CAP_PREFS_NAME = "CapacitorStorage";
    public static final String KEY_VILLAGES_DATA = "widget_villages_data";
    public static final String KEY_ACTIVE_INDEX = "widget_active_index";
    public static final String KEY_LAST_REFRESH_LABEL = "widget_last_refresh_label";
    public static final String ACTION_SWITCH_WIDGET_ACCOUNT =
        "com.cocpotion.calculator.ACTION_SWITCH_WIDGET_ACCOUNT";
    public static final String ACTION_REFRESH_WIDGET =
        "com.cocpotion.calculator.ACTION_REFRESH_WIDGET";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        if (appWidgetIds == null) return;
        for (int appWidgetId : appWidgetIds) {
            updateSingleWidget(context, appWidgetManager, appWidgetId);
        }
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_upgrades_list);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (ACTION_SWITCH_WIDGET_ACCOUNT.equals(action)) {
            handleSwitchAccount(context);
        } else if (ACTION_REFRESH_WIDGET.equals(action)) {
            handleManualRefresh(context);
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            updateAllWidgets(context);
        }
    }

    private static void handleSwitchAccount(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_VILLAGES_DATA, null);
            if (rawJson == null || rawJson.trim().isEmpty()) {
                SharedPreferences capPrefs = context.getSharedPreferences(CAP_PREFS_NAME, Context.MODE_PRIVATE);
                rawJson = capPrefs.getString(KEY_VILLAGES_DATA, "[]");
            }
            JSONArray villages = new JSONArray(rawJson != null ? rawJson : "[]");
            int totalVillages = villages.length();
            if (totalVillages > 1) {
                int currentIdx = prefs.getInt(KEY_ACTIVE_INDEX, 0);
                int nextIdx = (currentIdx + 1) % totalVillages;
                prefs.edit().putInt(KEY_ACTIVE_INDEX, nextIdx).apply();

                SharedPreferences capPrefs = context.getSharedPreferences(CAP_PREFS_NAME, Context.MODE_PRIVATE);
                capPrefs.edit().putString(KEY_ACTIVE_INDEX, String.valueOf(nextIdx)).apply();
            }
        } catch (Exception ignored) {
            // Safe fallback on malformed JSON
        }
        recordCurrentRefreshLabel(context);
        updateAllWidgets(context);
    }

    private static void handleManualRefresh(Context context) {
        recordCurrentRefreshLabel(context);
        updateAllWidgets(context);
    }

    private static void recordCurrentRefreshLabel(Context context) {
        if (context == null) return;
        try {
            SimpleDateFormat fmt = new SimpleDateFormat("h:mm a", Locale.US);
            String label = fmt.format(new Date()).toLowerCase(Locale.US);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_LAST_REFRESH_LABEL, label).apply();
        } catch (Exception ignored) {
            // Ignore
        }
    }

    public static void saveWidgetDataAndRefresh(Context context, String villagesJson, int activeIndex) {
        if (context == null) return;
        try {
            SimpleDateFormat fmt = new SimpleDateFormat("h:mm a", Locale.US);
            String label = fmt.format(new Date()).toLowerCase(Locale.US);

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if (villagesJson != null) {
                editor.putString(KEY_VILLAGES_DATA, villagesJson);
            }
            if (activeIndex >= 0) {
                editor.putInt(KEY_ACTIVE_INDEX, activeIndex);
            }
            editor.putString(KEY_LAST_REFRESH_LABEL, label);
            editor.apply();

            SharedPreferences capPrefs = context.getSharedPreferences(CAP_PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor capEditor = capPrefs.edit();
            if (villagesJson != null) {
                capEditor.putString(KEY_VILLAGES_DATA, villagesJson);
            }
            if (activeIndex >= 0) {
                capEditor.putString(KEY_ACTIVE_INDEX, String.valueOf(activeIndex));
            }
            capEditor.apply();
        } catch (Exception ignored) {
            // Ignore SharedPreferences write failure
        }
        updateAllWidgets(context);
    }

    public static void updateAllWidgets(Context context) {
        if (context == null) return;
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, VillageAppWidget.class);
            int[] widgetIds = manager.getAppWidgetIds(componentName);
            if (widgetIds != null && widgetIds.length > 0) {
                for (int widgetId : widgetIds) {
                    updateSingleWidget(context, manager, widgetId);
                }
                manager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_upgrades_list);
            }
        } catch (Exception ignored) {
            // Ignore widget manager error
        }
    }

    public static JSONObject getActiveVillageJson(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_VILLAGES_DATA, null);
            int activeIdx = prefs.getInt(KEY_ACTIVE_INDEX, 0);

            if (rawJson == null || rawJson.trim().isEmpty()) {
                SharedPreferences capPrefs = context.getSharedPreferences(CAP_PREFS_NAME, Context.MODE_PRIVATE);
                rawJson = capPrefs.getString(KEY_VILLAGES_DATA, "[]");
                String rawIdxStr = capPrefs.getString(KEY_ACTIVE_INDEX, "0");
                try {
                    activeIdx = Integer.parseInt(rawIdxStr);
                } catch (NumberFormatException ignored) {
                    activeIdx = 0;
                }
            }

            JSONArray villages = new JSONArray(rawJson != null ? rawJson : "[]");
            int total = villages.length();
            if (total == 0) return null;
            if (activeIdx < 0 || activeIdx >= total) {
                activeIdx = 0;
            }
            return villages.getJSONObject(activeIdx);
        } catch (Exception ignored) {
            return null;
        }
    }

    public static Bitmap loadFirstAvailableAssetBitmap(
        Context context,
        List<String> candidates,
        String fallbackFile
    ) {
        List<String> allPaths = new ArrayList<>();
        if (candidates != null) {
            allPaths.addAll(candidates);
        }
        if (fallbackFile != null && !fallbackFile.isEmpty()) {
            allPaths.add(fallbackFile);
        }
        AssetManager assetManager = context.getAssets();
        for (String rawPath : allPaths) {
            if (rawPath == null || rawPath.trim().isEmpty()) continue;
            String cleanName = rawPath.trim();
            if (cleanName.startsWith("/")) {
                cleanName = cleanName.substring(1);
            }
            if (cleanName.startsWith("public/")) {
                cleanName = cleanName.substring("public/".length());
            }
            if (cleanName.startsWith("icons/")) {
                cleanName = cleanName.substring("icons/".length());
            }
            String[] tryAssetPaths = new String[] {
                "public/icons/" + cleanName,
                "icons/" + cleanName
            };
            for (String assetPath : tryAssetPaths) {
                InputStream is = null;
                try {
                    is = assetManager.open(assetPath);
                    Bitmap decoded = BitmapFactory.decodeStream(is);
                    if (decoded != null) {
                        int maxDim = 112;
                        int w = decoded.getWidth();
                        int h = decoded.getHeight();
                        if (w > maxDim || h > maxDim) {
                            float ratio = Math.min((float) maxDim / w, (float) maxDim / h);
                            int nw = Math.max(1, Math.round(w * ratio));
                            int nh = Math.max(1, Math.round(h * ratio));
                            return Bitmap.createScaledBitmap(decoded, nw, nh, true);
                        }
                        return decoded;
                    }
                } catch (Exception ignored) {
                    // Try next candidate
                } finally {
                    if (is != null) {
                        try {
                            is.close();
                        } catch (Exception ignored) {}
                    }
                }
            }
        }
        return null;
    }

    private static String computeLiveBoostStatus(JSONObject village, long now) {
        long bEnd = village.optLong("builderBoostEndTime", 0L);
        long lEnd = village.optLong("labBoostEndTime", 0L);
        long pEnd = village.optLong("petBoostEndTime", 0L);

        List<String> activeParts = new ArrayList<>();
        if (bEnd > now) {
            activeParts.add("Builder 10x (" + formatRemainingShort((bEnd - now) / 1000L) + ")");
        }
        if (lEnd > now) {
            activeParts.add("Lab 24x (" + formatRemainingShort((lEnd - now) / 1000L) + ")");
        }
        if (pEnd > now) {
            activeParts.add("Pet 24x (" + formatRemainingShort((pEnd - now) / 1000L) + ")");
        }
        if (!activeParts.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < activeParts.size(); i++) {
                if (i > 0) sb.append(" · ");
                sb.append(activeParts.get(i));
            }
            return sb.toString();
        }

        String staticBoost = village.optString("boostStatus", "No active boosts");
        if (bEnd > 0L || lEnd > 0L || pEnd > 0L) {
            return "No active boosts";
        }
        if (staticBoost.equalsIgnoreCase("No Active Boosts") || staticBoost.trim().isEmpty()) {
            return "No active boosts";
        }
        return staticBoost;
    }

    private static String formatRemainingShort(long totalSec) {
        long clamped = Math.max(0L, totalSec);
        long h = clamped / 3600L;
        long m = (clamped % 3600L) / 60L;
        if (h > 0L) {
            return h + "h " + m + "m";
        }
        return Math.max(1L, m) + "m";
    }

    public static void updateSingleWidget(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId
    ) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.village_widget_layout);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // 1. Setup In-Widget Account Switch Broadcast PendingIntent on [ ⇄ ]
        Intent switchIntent = new Intent(context, VillageAppWidget.class);
        switchIntent.setAction(ACTION_SWITCH_WIDGET_ACCOUNT);
        PendingIntent switchPendingIntent = PendingIntent.getBroadcast(
            context,
            101,
            switchIntent,
            pendingFlags
        );
        views.setOnClickPendingIntent(R.id.widget_btn_switch, switchPendingIntent);

        // 2. Setup One-Tap Refresh Broadcast PendingIntent on [ ↻ ]
        Intent refreshIntent = new Intent(context, VillageAppWidget.class);
        refreshIntent.setAction(ACTION_REFRESH_WIDGET);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
            context,
            102,
            refreshIntent,
            pendingFlags
        );
        views.setOnClickPendingIntent(R.id.widget_btn_refresh, refreshPendingIntent);

        // 3. Setup Deep Link PendingIntent to Launch Clash Planner when tapping header or footer
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launchPendingIntent = PendingIntent.getActivity(
            context,
            100,
            launchIntent,
            pendingFlags
        );
        views.setOnClickPendingIntent(R.id.widget_header_title_box, launchPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_th_icon, launchPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_tap_hint, launchPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_upgrades_empty, launchPendingIntent);

        // Mutable PendingIntent template for ListView items so tapping any upgrade opens the app
        int mutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            mutableFlags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent listClickTemplate = PendingIntent.getActivity(
            context,
            103,
            launchIntent,
            mutableFlags
        );
        views.setPendingIntentTemplate(R.id.widget_upgrades_list, listClickTemplate);

        // Bind RemoteViewsService adapter for scrollable Builders + Lab + Pets list
        Intent serviceIntent = new Intent(context, VillageWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_upgrades_list, serviceIntent);
        views.setEmptyView(R.id.widget_upgrades_list, R.id.widget_upgrades_empty);

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_VILLAGES_DATA, null);
            int activeIdx = prefs.getInt(KEY_ACTIVE_INDEX, 0);
            String refreshLabel = prefs.getString(KEY_LAST_REFRESH_LABEL, null);

            if (rawJson == null || rawJson.trim().isEmpty()) {
                SharedPreferences capPrefs = context.getSharedPreferences(CAP_PREFS_NAME, Context.MODE_PRIVATE);
                rawJson = capPrefs.getString(KEY_VILLAGES_DATA, "[]");
                String rawIdxStr = capPrefs.getString(KEY_ACTIVE_INDEX, "0");
                try {
                    activeIdx = Integer.parseInt(rawIdxStr);
                } catch (NumberFormatException ignored) {
                    activeIdx = 0;
                }
            }

            JSONArray villages = new JSONArray(rawJson != null ? rawJson : "[]");
            int total = villages.length();

            if (total == 0) {
                views.setTextViewText(R.id.widget_village_name, "Clash Planner");
                views.setTextViewText(R.id.widget_builders_status, "Tap to import village JSON");
                views.setTextViewText(R.id.widget_btn_switch, "⇄ 0/0");
                views.setTextViewText(R.id.widget_boost_status, "No active boosts");
                views.setTextColor(R.id.widget_boost_status, Color.parseColor("#CBD5E1"));
                views.setTextViewText(R.id.widget_last_synced, "UPDATED --:--");
                Bitmap defaultTh = loadFirstAvailableAssetBitmap(context, null, "art_town_hall_17.webp");
                if (defaultTh != null) {
                    views.setImageViewBitmap(R.id.widget_th_icon, defaultTh);
                }
                appWidgetManager.updateAppWidget(appWidgetId, views);
                return;
            }

            if (activeIdx < 0 || activeIdx >= total) {
                activeIdx = 0;
            }

            JSONObject village = villages.getJSONObject(activeIdx);
            long now = System.currentTimeMillis();

            // Show Village Name prominently (never the raw player tag)
            String villageName = village.optString("name", "Village " + (activeIdx + 1)).trim();
            if (villageName.isEmpty()) {
                villageName = "Village " + (activeIdx + 1);
            }
            views.setTextViewText(R.id.widget_village_name, villageName);

            // Subtitle: "TH 17 · 6/6 BUILDERS + G"
            String headerSubtitle = village.optString("headerSubtitle", "");
            if (headerSubtitle.isEmpty()) {
                int thNum = village.optInt("thNumber", 17);
                String bStat = village.optString("buildersStatus", "0/6 BUILDERS");
                headerSubtitle = "TH " + thNum + " · " + bStat;
            }
            views.setTextViewText(R.id.widget_builders_status, headerSubtitle);

            // Switch button shows account index (e.g. "⇄ 1/4")
            views.setTextViewText(
                R.id.widget_btn_switch,
                "⇄ " + (activeIdx + 1) + "/" + total
            );

            // Load 3D Town Hall icon from bundled assets
            String thIconFile = village.optString("thIcon", "");
            if (thIconFile.isEmpty()) {
                int thNum = village.optInt("thNumber", 17);
                thIconFile = "art_town_hall_" + thNum + ".webp";
            }
            List<String> thCandidates = new ArrayList<>();
            thCandidates.add(thIconFile);
            thCandidates.add("art_1000001.webp");
            Bitmap thBmp = loadFirstAvailableAssetBitmap(context, thCandidates, "art_town_hall_17.webp");
            if (thBmp != null) {
                views.setImageViewBitmap(R.id.widget_th_icon, thBmp);
            } else {
                views.setImageViewResource(R.id.widget_th_icon, R.mipmap.ic_launcher);
            }

            // Live Boost Status Pill
            String liveBoost = computeLiveBoostStatus(village, now);
            views.setTextViewText(R.id.widget_boost_status, liveBoost);
            boolean hasActiveBoost = !liveBoost.equalsIgnoreCase("No active boosts");
            views.setTextColor(
                R.id.widget_boost_status,
                Color.parseColor(hasActiveBoost ? "#4ADE80" : "#CBD5E1")
            );

            // Footer Updated Timestamp
            String lastSynced = (refreshLabel != null && !refreshLabel.isEmpty())
                ? refreshLabel
                : village.optString("lastSynced", "--:--").toLowerCase(Locale.US);
            String cleanSynced = lastSynced
                .replace("Synced:", "")
                .replace("UPDATED", "")
                .trim();
            views.setTextViewText(R.id.widget_last_synced, "UPDATED " + cleanSynced);

        } catch (Exception ignored) {
            // Safe fallback
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
