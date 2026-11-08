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

void initNativeStatusBarTheme();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);



