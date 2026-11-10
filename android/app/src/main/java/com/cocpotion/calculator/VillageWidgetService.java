package com.cocpotion.calculator;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class VillageWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new VillageWidgetItemFactory(this.getApplicationContext());
    }

    private static class WidgetUpgradeRow {
        String sectionHeader;
        String name;
        String rawId;
        String targetLvl;
        String finishPrimary;
        String finishSub;
        String category;
        int progressPercent;
        List<String> iconCandidates;
    }

    private static class VillageWidgetItemFactory implements RemoteViewsFactory {
        private final Context context;
        private final List<WidgetUpgradeRow> rows = new ArrayList<>();

        VillageWidgetItemFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {
            loadRowsFromPrefs();
        }

        @Override
        public void onDataSetChanged() {
            loadRowsFromPrefs();
        }

        @Override
        public void onDestroy() {
            rows.clear();
        }

        private void loadRowsFromPrefs() {
            rows.clear();
            try {
                JSONObject village = VillageAppWidget.getActiveVillageJson(context);
                if (village == null) return;

                long now = System.currentTimeMillis();
                String[] liveHeaders = VillageAppWidget.computeLiveBuilderHeaders(village, now);
                String buildersHeader = liveHeaders[1];
                JSONArray upgrades = village.optJSONArray("upgrades");
                if (upgrades == null || upgrades.length() == 0) return;

                List<JSONObject> builderItems = new ArrayList<>();
                List<JSONObject> labAndPetItems = new ArrayList<>();

                for (int i = 0; i < upgrades.length(); i++) {
                    JSONObject upg = upgrades.optJSONObject(i);
                    if (upg == null) continue;
                    long targetTs = upg.optLong("targetTimestamp", 0L);
                    if (targetTs > 0L && targetTs <= now) {
                        // Already finished in real time
                        continue;
                    }
                    String cat = upg.optString("category", "builders");
                    if ("laboratory".equalsIgnoreCase(cat) || "pethouse".equalsIgnoreCase(cat)) {
                        labAndPetItems.add(upg);
                    } else {
                        builderItems.add(upg);
                    }
                }

                SimpleDateFormat primaryFmt = new SimpleDateFormat("MMM d, h:mm a", Locale.US);
                SimpleDateFormat subDateFmt = new SimpleDateFormat("dd/MM/yyyy h:mm a", Locale.US);

                for (int i = 0; i < builderItems.size(); i++) {
                    JSONObject upg = builderItems.get(i);
                    WidgetUpgradeRow row = parseUpgradeRow(
                        upg,
                        i == 0 ? buildersHeader : null,
                        now,
                        primaryFmt,
                        subDateFmt
                    );
                    rows.add(row);
                }

                for (int i = 0; i < labAndPetItems.size(); i++) {
                    JSONObject upg = labAndPetItems.get(i);
                    WidgetUpgradeRow row = parseUpgradeRow(
                        upg,
                        i == 0 ? "LAB & PETS  " + labAndPetItems.size() + " Active" : null,
                        now,
                        primaryFmt,
                        subDateFmt
                    );
                    rows.add(row);
                }
            } catch (Exception ignored) {
                // Safe fallback
            }
        }

        private WidgetUpgradeRow parseUpgradeRow(
            JSONObject upg,
            String sectionHeader,
            long now,
            SimpleDateFormat primaryFmt,
            SimpleDateFormat subDateFmt
        ) {
            WidgetUpgradeRow row = new WidgetUpgradeRow();
            row.sectionHeader = sectionHeader;
            row.category = upg.optString("category", "builders");
            row.name = upg.optString("name", "Upgrade");
            row.rawId = upg.optString("rawId", "");
            row.targetLvl = upg.optString("targetLvl", "");

            long targetTs = upg.optLong("targetTimestamp", 0L);
            String fallbackFinish = upg.optString("finishFormatted", "");
            if (targetTs > 0L) {
                Date finishDate = new Date(targetTs);
                row.finishPrimary = primaryFmt.format(finishDate);
                row.finishSub = "Finishes " + subDateFmt.format(finishDate).toLowerCase(Locale.US);
            } else {
                row.finishPrimary = fallbackFinish;
                row.finishSub = fallbackFinish.isEmpty() ? "" : "Finishes " + fallbackFinish;
            }

            long remSec = targetTs > now ? (targetTs - now) / 1000L : 0L;
            int explicitProgress = upg.optInt("progressPercent", -1);
            if (explicitProgress >= 8 && explicitProgress <= 96 && targetTs <= 0L) {
                row.progressPercent = explicitProgress;
            } else if (remSec > 0L) {
                double maxRefSec = Math.max(remSec, 14.0 * 86400.0);
                int calc = (int) Math.round(100.0 - (remSec / maxRefSec) * 85.0);
                row.progressPercent = Math.min(95, Math.max(12, calc));
            } else {
                row.progressPercent = 65;
            }

            row.iconCandidates = new ArrayList<>();
            JSONArray candArr = upg.optJSONArray("iconCandidates");
            if (candArr != null) {
                for (int c = 0; c < candArr.length(); c++) {
                    String path = candArr.optString(c, "");
                    if (!path.isEmpty()) {
                        row.iconCandidates.add(path);
                    }
                }
            }
            String singleIcon = upg.optString("iconFile", "");
            if (!singleIcon.isEmpty() && !row.iconCandidates.contains(singleIcon)) {
                row.iconCandidates.add(singleIcon);
            }
            return row;
        }

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= rows.size()) {
                return null;
            }
            WidgetUpgradeRow row = rows.get(position);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.village_widget_item);

            if (row.sectionHeader != null && !row.sectionHeader.trim().isEmpty()) {
                views.setTextViewText(R.id.widget_item_section_header, row.sectionHeader);
                views.setViewVisibility(R.id.widget_item_section_header, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_item_section_header, View.GONE);
            }

            views.setTextViewText(R.id.widget_item_title, row.name);

            if (row.targetLvl != null && !row.targetLvl.trim().isEmpty()) {
                views.setTextViewText(R.id.widget_item_target_lvl, row.targetLvl);
                views.setViewVisibility(R.id.widget_item_target_lvl, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_item_target_lvl, View.GONE);
            }

            views.setTextViewText(R.id.widget_item_finish_primary, row.finishPrimary);
            if ("laboratory".equalsIgnoreCase(row.category)) {
                views.setTextColor(R.id.widget_item_finish_primary, Color.parseColor("#60A5FA"));
            } else {
                views.setTextColor(R.id.widget_item_finish_primary, Color.parseColor("#4ADE80"));
            }

            views.setProgressBar(R.id.widget_item_progress, 100, row.progressPercent, false);
            views.setTextViewText(R.id.widget_item_finish_sub, row.finishSub);

            String defaultCategoryIcon = "art_1000015";
            if ("laboratory".equalsIgnoreCase(row.category)) {
                defaultCategoryIcon = "art_1000007";
            } else if ("pethouse".equalsIgnoreCase(row.category)) {
                defaultCategoryIcon = "art_1000068";
            }

            Uri iconUri = VillageAppWidget.resolveUpgradeIconUri(
                context,
                row.name,
                row.rawId,
                row.targetLvl,
                row.iconCandidates,
                defaultCategoryIcon
            );
            views.setImageViewUri(R.id.widget_item_icon, iconUri);

            Intent fillInIntent = new Intent();
            views.setOnClickFillInIntent(R.id.widget_item_card, fillInIntent);

            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            if (position < 0 || position >= rows.size()) {
                return position;
            }
            WidgetUpgradeRow r = rows.get(position);
            String key = r.name + "|" + r.targetLvl + "|" + r.finishPrimary;
            return ((long) position << 32) | (key.hashCode() & 0xFFFFFFFFL);
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }
    }
}
