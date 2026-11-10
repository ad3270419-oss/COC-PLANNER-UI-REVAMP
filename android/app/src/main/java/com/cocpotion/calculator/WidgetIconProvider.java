package com.cocpotion.calculator;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Locale;

/**
 * Serves bundled 3D WebP icons directly from APK assets (assets/public/icons/*.webp)
 * via content://com.cocpotion.calculator.icons/<name>.webp so AppWidget RemoteViews
 * can bind images using setImageViewUri() without duplicating 250 icons in res/drawable
 * and without touching RemoteViews.mBitmapCache.
 */
public class WidgetIconProvider extends ContentProvider {

    public static final String AUTHORITY = "com.cocpotion.calculator.icons";

    public static Uri buildIconUri(String cleanEntryName) {
        String safe = sanitizeIconBaseName(cleanEntryName);
        if (safe.isEmpty()) {
            safe = "art_1000015";
        }
        return Uri.parse("content://" + AUTHORITY + "/" + safe + ".webp");
    }

    private static String sanitizeIconBaseName(String raw) {
        if (raw == null) return "";
        String clean = raw.trim().toLowerCase(Locale.US);
        int slashIdx = clean.lastIndexOf('/');
        if (slashIdx >= 0) {
            clean = clean.substring(slashIdx + 1);
        }
        if (clean.endsWith(".webp")) {
            clean = clean.substring(0, clean.length() - 5);
        }
        return clean.replaceAll("[^a-z0-9_]", "");
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        return "image/webp";
    }

    @Override
    public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        Context context = getContext();
        if (context == null || uri == null) {
            throw new FileNotFoundException("Invalid context or URI");
        }
        String segment = uri.getLastPathSegment();
        String baseName = sanitizeIconBaseName(segment);
        if (baseName.isEmpty()) {
            throw new FileNotFoundException("Empty icon name");
        }
        String fileName = baseName + ".webp";
        AssetManager assets = context.getAssets();

        // 1. Fast path: open uncompressed asset descriptor directly from APK (zero copy)
        String[] assetCandidates = new String[] {
            "public/icons/" + fileName,
            "icons/" + fileName
        };
        for (String path : assetCandidates) {
            try {
                return assets.openFd(path);
            } catch (Exception ignored) {
                // Asset may be compressed in APK; fall through to cache file descriptor
            }
        }

        // 2. Fallback path: lazily materialize into app cache dir and return read-only ParcelFileDescriptor
        ParcelFileDescriptor pfd = openFile(uri, mode);
        if (pfd != null) {
            return new AssetFileDescriptor(pfd, 0, AssetFileDescriptor.UNKNOWN_LENGTH);
        }
        throw new FileNotFoundException("Icon asset not found: " + fileName);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        Context context = getContext();
        if (context == null || uri == null) {
            throw new FileNotFoundException("Invalid context or URI");
        }
        String segment = uri.getLastPathSegment();
        String baseName = sanitizeIconBaseName(segment);
        if (baseName.isEmpty()) {
            throw new FileNotFoundException("Empty icon name");
        }
        String fileName = baseName + ".webp";

        File cacheDir = new File(context.getCacheDir(), "widget_icons");
        if (!cacheDir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            cacheDir.mkdirs();
        }
        File cachedFile = new File(cacheDir, fileName);
        if (!cachedFile.exists() || cachedFile.length() == 0L) {
            AssetManager assets = context.getAssets();
            String[] assetCandidates = new String[] {
                "public/icons/" + fileName,
                "icons/" + fileName
            };
            boolean copied = false;
            for (String assetPath : assetCandidates) {
                InputStream is = null;
                FileOutputStream fos = null;
                try {
                    is = assets.open(assetPath);
                    File tmpFile = new File(cacheDir, fileName + ".tmp");
                    fos = new FileOutputStream(tmpFile);
                    byte[] buffer = new byte[4096];
                    int read;
                    while ((read = is.read(buffer)) != -1) {
                        fos.write(buffer, 0, read);
                    }
                    fos.flush();
                    fos.close();
                    fos = null;
                    if (!tmpFile.renameTo(cachedFile)) {
                        //noinspection ResultOfMethodCallIgnored
                        cachedFile.delete();
                        //noinspection ResultOfMethodCallIgnored
                        tmpFile.renameTo(cachedFile);
                    }
                    copied = true;
                    break;
                } catch (Exception ignored) {
                    // Try next candidate
                } finally {
                    if (is != null) {
                        try {
                            is.close();
                        } catch (Exception ignored) {}
                    }
                    if (fos != null) {
                        try {
                            fos.close();
                        } catch (Exception ignored) {}
                    }
                }
            }
            if (!copied && !cachedFile.exists()) {
                throw new FileNotFoundException("Unable to load asset: " + fileName);
            }
        }
        return ParcelFileDescriptor.open(cachedFile, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(
        Uri uri,
        String[] projection,
        String selection,
        String[] selectionArgs,
        String sortOrder
    ) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
