package com.cocpotion.calculator;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final int REQ_STORAGE_PERMISSION = 9401;
    private String pendingBase64Image = null;
    private String pendingImageFileName = null;

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
                new ClashWidgetJsBridge(this, getApplicationContext()),
                "ClashWidgetBridge"
            );
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        VillageAppWidget.updateAllWidgets(getApplicationContext());
    }

    public boolean checkHasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ (API 29+) allows inserting into MediaStore.Images without runtime permission
            return true;
        }
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        ) == PackageManager.PERMISSION_GRANTED;
    }

    public void triggerRuntimeStoragePermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            ActivityCompat.requestPermissions(
                this,
                new String[] {
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE
                },
                REQ_STORAGE_PERMISSION
            );
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.READ_MEDIA_IMAGES },
                REQ_STORAGE_PERMISSION
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        @NonNull String[] permissions,
        @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_STORAGE_PERMISSION) {
            boolean granted =
                grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted && pendingBase64Image != null && pendingImageFileName != null) {
                final String b64 = pendingBase64Image;
                final String fName = pendingImageFileName;
                pendingBase64Image = null;
                pendingImageFileName = null;
                writeBase64PngToGallery(b64, fName);
            } else if (!granted) {
                runOnUiThread(() ->
                    Toast.makeText(
                        getApplicationContext(),
                        "Storage permission is required to save images to your device.",
                        Toast.LENGTH_LONG
                    ).show()
                );
            }
        }
    }

    public boolean saveBase64PngWithPermissionCheck(String base64Png, String fileName) {
        if (base64Png == null || base64Png.isEmpty()) {
            return false;
        }
        String cleanFileName = (fileName != null && !fileName.trim().isEmpty())
            ? fileName.trim()
            : ("Clash_Wrapped_" + System.currentTimeMillis() + ".png");
        if (!cleanFileName.toLowerCase().endsWith(".png")) {
            cleanFileName = cleanFileName + ".png";
        }

        if (!checkHasStoragePermission()) {
            pendingBase64Image = base64Png;
            pendingImageFileName = cleanFileName;
            runOnUiThread(this::triggerRuntimeStoragePermission);
            return true;
        }

        return writeBase64PngToGallery(base64Png, cleanFileName);
    }

    private boolean writeBase64PngToGallery(String base64Png, String fileName) {
        try {
            String pureBase64 = base64Png;
            int commaIdx = base64Png.indexOf(',');
            if (commaIdx != -1) {
                pureBase64 = base64Png.substring(commaIdx + 1);
            }
            byte[] imageBytes = Base64.decode(pureBase64, Base64.DEFAULT);
            if (imageBytes == null || imageBytes.length == 0) {
                return false;
            }

            Context context = getApplicationContext();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES + "/ClashPlanner"
                );
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(
                    MediaStore.VOLUME_EXTERNAL_PRIMARY
                );
                Uri itemUri = resolver.insert(collection, values);
                if (itemUri == null) {
                    return false;
                }

                try (OutputStream out = resolver.openOutputStream(itemUri)) {
                    if (out == null) {
                        return false;
                    }
                    out.write(imageBytes);
                    out.flush();
                }

                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(itemUri, values, null, null);
            } else {
                File picturesDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_PICTURES
                );
                File albumDir = new File(picturesDir, "ClashPlanner");
                if (!albumDir.exists()) {
                    albumDir.mkdirs();
                }
                File outFile = new File(albumDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }
                MediaScannerConnection.scanFile(
                    context,
                    new String[] { outFile.getAbsolutePath() },
                    new String[] { "image/png" },
                    null
                );
            }

            final String savedName = fileName;
            runOnUiThread(() ->
                Toast.makeText(
                    context,
                    "Saved to Gallery: Pictures/ClashPlanner/" + savedName,
                    Toast.LENGTH_LONG
                ).show()
            );
            return true;
        } catch (Exception e) {
            runOnUiThread(() ->
                Toast.makeText(
                    getApplicationContext(),
                    "Failed to save image: " + e.getMessage(),
                    Toast.LENGTH_LONG
                ).show()
            );
            return false;
        }
    }

    public static class ClashWidgetJsBridge {
        private final MainActivity activity;
        private final Context appContext;

        public ClashWidgetJsBridge(MainActivity activity, Context context) {
            this.activity = activity;
            this.appContext = context;
        }

        @JavascriptInterface
        public void syncVillages(String villagesJson, int activeIndex) {
            VillageAppWidget.saveWidgetDataAndRefresh(appContext, villagesJson, activeIndex);
        }

        @JavascriptInterface
        public boolean hasStoragePermission() {
            return activity != null && activity.checkHasStoragePermission();
        }

        @JavascriptInterface
        public void requestStoragePermission() {
            if (activity != null) {
                activity.runOnUiThread(activity::triggerRuntimeStoragePermission);
            }
        }

        @JavascriptInterface
        public boolean saveImageToGallery(String base64Png, String fileName) {
            if (activity == null) {
                return false;
            }
            return activity.saveBase64PngWithPermissionCheck(base64Png, fileName);
        }
    }
}



