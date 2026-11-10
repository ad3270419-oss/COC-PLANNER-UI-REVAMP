package com.cocpotion.calculator;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

    private static Map<String, String> cachedArtByNameLower = null;

    private static synchronized Map<String, String> getArtByNameLowerMap(Context context) {
        if (cachedArtByNameLower != null && !cachedArtByNameLower.isEmpty()) {
            return cachedArtByNameLower;
        }
        Map<String, String> map = new HashMap<>();
        AssetManager assetManager = context.getAssets();
        String[] indexPaths = new String[] {
            "public/icons/art_index.json",
            "icons/art_index.json"
        };
        for (String path : indexPaths) {
            InputStream is = null;
            try {
                is = assetManager.open(path);
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int read;
                while ((read = is.read(buf)) != -1) {
                    bos.write(buf, 0, read);
                }
                String jsonStr = bos.toString("UTF-8");
                JSONObject obj = new JSONObject(jsonStr);
                Iterator<String> keys = obj.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String val = obj.optString(k, "").trim();
                    if (!k.trim().isEmpty() && !val.isEmpty()) {
                        map.put(k.trim().toLowerCase(Locale.US), val);
                    }
                }
                if (!map.isEmpty()) {
                    cachedArtByNameLower = map;
                    return map;
                }
            } catch (Exception ignored) {
                // Try next path
            } finally {
                if (is != null) {
                    try {
                        is.close();
                    } catch (Exception ignored) {}
                }
            }
        }
        cachedArtByNameLower = map;
        return map;
    }

    public static String cleanDrawableEntryName(String rawPath) {
        if (rawPath == null) return "";
        String clean = rawPath.trim();
        if (clean.startsWith("/")) {
            clean = clean.substring(1);
        }
        if (clean.startsWith("public/")) {
            clean = clean.substring("public/".length());
        }
        if (clean.startsWith("icons/")) {
            clean = clean.substring("icons/".length());
        }
        int dotIdx = clean.lastIndexOf('.');
        if (dotIdx > 0) {
            clean = clean.substring(0, dotIdx);
        }
        return clean.trim().toLowerCase(Locale.US);
    }

    public static String stripUpgradeDisplaySuffix(String displayTitle) {
        if (displayTitle == null) return "";
        String t = displayTitle.trim();
        String[] suffixes = new String[] {
            " · G-LAB",
            " · LAB",
            " · PET",
            " · G"
        };
        for (String s : suffixes) {
            if (t.endsWith(s)) {
                t = t.substring(0, t.length() - s.length()).trim();
                break;
            }
        }
        return t;
    }

    private static boolean assetIconExists(Context context, String cleanEntryName) {
        if (cleanEntryName == null || cleanEntryName.isEmpty()) return false;
        AssetManager assets = context.getAssets();
        String fileName = cleanEntryName + ".webp";
        String[] paths = new String[] {
            "public/icons/" + fileName,
            "icons/" + fileName
        };
        for (String p : paths) {
            InputStream is = null;
            try {
                is = assets.open(p);
                return true;
            } catch (Exception ignored) {
                // Not at this path
            } finally {
                if (is != null) {
                    try {
                        is.close();
                    } catch (Exception ignored) {}
                }
            }
        }
        return false;
    }

    public static Uri resolveUpgradeIconUri(
        Context context,
        String displayTitle,
        String rawId,
        String targetLvlText,
        List<String> candidates,
        String fallbackFile
    ) {
        List<String> orderedNames = new ArrayList<>();

        String baseTitle = stripUpgradeDisplaySuffix(displayTitle);
        String lowerTitle = baseTitle.toLowerCase(Locale.US);

        if ("town hall".equals(lowerTitle) || "1000001".equals(rawId != null ? rawId.trim() : "")) {
            int parsedTargetTh = -1;
            if (targetLvlText != null) {
                String digits = targetLvlText.replaceAll("[^0-9]", "");
                if (!digits.isEmpty()) {
                    try {
                        parsedTargetTh = Integer.parseInt(digits);
                    } catch (NumberFormatException ignored) {}
                }
            }
            if (parsedTargetTh >= 1 && parsedTargetTh <= 18 && "town hall".equals(lowerTitle)) {
                orderedNames.add("art_town_hall_" + parsedTargetTh);
            }
        }

        // 1. Exact title lookup in art_index.json so the icon is 100% locked to the displayed title
        if (!lowerTitle.isEmpty() && !"town hall".equals(lowerTitle)) {
            Map<String, String> artMap = getArtByNameLowerMap(context);
            String mappedArt = artMap.get(lowerTitle);
            if (mappedArt != null && !mappedArt.isEmpty()) {
                orderedNames.add(cleanDrawableEntryName(mappedArt));
            }
        }

        // 2. Direct rawId lookup (when not mislabeled as Town Hall)
        if (rawId != null && !rawId.trim().isEmpty()) {
            String cleanId = rawId.trim();
            if (!"1000001".equals(cleanId) || "town hall".equals(lowerTitle)) {
                orderedNames.add("art_" + cleanId);
            }
        }

        // 3. Explicit iconCandidates list from JS payload
        if (candidates != null) {
            for (String cand : candidates) {
                String cName = cleanDrawableEntryName(cand);
                if (!cName.isEmpty()) {
                    // Never allow a Town Hall icon candidate on a non-Town Hall upgrade row
                    if (cName.startsWith("art_town_hall_") && !"town hall".equals(lowerTitle) && !lowerTitle.isEmpty()) {
                        continue;
                    }
                    if (!orderedNames.contains(cName)) {
                        orderedNames.add(cName);
                    }
                }
            }
        }

        // 4. Category fallback
        String fallbackClean = cleanDrawableEntryName(
            fallbackFile != null && !fallbackFile.isEmpty() ? fallbackFile : "art_1000015"
        );
        if (!fallbackClean.isEmpty() && !orderedNames.contains(fallbackClean)) {
            orderedNames.add(fallbackClean);
        }

        for (String resName : orderedNames) {
            if (resName == null || resName.isEmpty()) continue;
            if (assetIconExists(context, resName)) {
                return WidgetIconProvider.buildIconUri(resName);
            }
        }
        return WidgetIconProvider.buildIconUri(fallbackClean.isEmpty() ? "art_1000015" : fallbackClean);
    }

    public static Uri resolveFirstAvailableIconUri(
        Context context,
        List<String> candidates,
        String fallbackFile
    ) {
        return resolveUpgradeIconUri(context, "", "", "", candidates, fallbackFile);
    }

    private static int parseBuilderCapFromStatus(String status) {
        if (status == null) return 6;
        int slashIdx = status.indexOf('/');
        if (slashIdx >= 0 && slashIdx + 1 < status.length()) {
            StringBuilder sb = new StringBuilder();
            for (int i = slashIdx + 1; i < status.length(); i++) {
                char ch = status.charAt(i);
                if (Character.isDigit(ch)) {
                    sb.append(ch);
                } else if (sb.length() > 0) {
                    break;
                }
            }
            if (sb.length() > 0) {
                try {
                    int val = Integer.parseInt(sb.toString());
                    if (val >= 1 && val <= 6) return val;
                } catch (NumberFormatException ignored) {}
            }
        }
        return 6;
    }

    public static String[] computeLiveBuilderHeaders(JSONObject village, long now) {
        int thNum = village.optInt("thNumber", 17);
        String savedSub = village.optString("headerSubtitle", "");
        String savedSec = village.optString("buildersSectionHeader", "BUILDERS");
        String bStat = village.optString("buildersStatus", "0/6 BUILDERS");
        int regularCap = parseBuilderCapFromStatus(bStat.isEmpty() ? savedSub : bStat);

        JSONArray upgrades = village.optJSONArray("upgrades");
        if (upgrades == null) {
            String sub = savedSub.isEmpty() ? ("TH " + thNum + " · " + bStat) : savedSub;
            return new String[] { sub, savedSec };
        }

        int busyRegular = 0;
        boolean goblinBusy = false;
        boolean sawTimestampedUpgrade = false;

        for (int i = 0; i < upgrades.length(); i++) {
            JSONObject upg = upgrades.optJSONObject(i);
            if (upg == null) continue;
            String cat = upg.optString("category", "builders");
            if ("laboratory".equalsIgnoreCase(cat) || "pethouse".equalsIgnoreCase(cat)) {
                continue;
            }
            long targetTs = upg.optLong("targetTimestamp", 0L);
            if (targetTs > 0L) {
                sawTimestampedUpgrade = true;
                if (targetTs <= now) {
                    continue;
                }
            }
            String badge = upg.optString("slotBadge", "");
            String name = upg.optString("name", "");
            if ("[GOBLIN]".equalsIgnoreCase(badge) || name.endsWith(" · G")) {
                goblinBusy = true;
            } else {
                busyRegular++;
            }
        }

        if (!sawTimestampedUpgrade && !savedSub.isEmpty()) {
            return new String[] { savedSub, savedSec };
        }

        String liveSub =
            "TH " + thNum + " · " + busyRegular + "/" + regularCap + " BUILDERS" + (goblinBusy ? " + G" : "");
        String liveSec =
            "BUILDERS  " + busyRegular + "/" + regularCap + (goblinBusy ? " + Goblin" : "");
        return new String[] { liveSub, liveSec };
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
                Uri defaultThUri = resolveFirstAvailableIconUri(context, null, "art_town_hall_17.webp");
                views.setImageViewUri(R.id.widget_th_icon, defaultThUri);
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

            // Live Subtitle: "TH 17 · 4/6 BUILDERS + G"
            String[] liveHeaders = computeLiveBuilderHeaders(village, now);
            views.setTextViewText(R.id.widget_builders_status, liveHeaders[0]);

            // Switch button shows account index (e.g. "⇄ 1/4")
            views.setTextViewText(
                R.id.widget_btn_switch,
                "⇄ " + (activeIdx + 1) + "/" + total
            );

            // Bind 3D Town Hall icon via setImageViewUri (zero duplicate drawables & zero BitmapCache collision)
            int thNum = village.optInt("thNumber", 17);
            String thIconFile = village.optString("thIcon", "");
            if (thIconFile.isEmpty()) {
                thIconFile = "art_town_hall_" + thNum + ".webp";
            }
            List<String> thCandidates = new ArrayList<>();
            thCandidates.add("art_town_hall_" + thNum);
            thCandidates.add(thIconFile);
            thCandidates.add("art_1000001");
            Uri thUri = resolveFirstAvailableIconUri(context, thCandidates, "art_town_hall_17");
            views.setImageViewUri(R.id.widget_th_icon, thUri);

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
