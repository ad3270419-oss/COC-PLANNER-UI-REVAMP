import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import {Capacitor} from '@capacitor/core';
import {StatusBar, Style} from '@capacitor/status-bar';
import App from './App.tsx';
import './index.css';

async function initNativeStatusBarTheme() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
  } catch {
    // Ignore on platforms where status bar customization is unsupported
  }
}

async function cleanupNativeServiceWorkersAndCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch (err) {
    console.error('[Notifications] Failed to unregister native Service Workers:', err);
  }
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (err) {
    console.error('[Notifications] Failed to clear native caches:', err);
  }
}

void initNativeStatusBarTheme();
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
} else {
  void cleanupNativeServiceWorkersAndCaches();
}

createRoot(document.getElementById('root')!).render(<App />);



