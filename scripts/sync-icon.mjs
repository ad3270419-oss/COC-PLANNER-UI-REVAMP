import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const resourcesDir = path.join(rootDir, 'resources');
const iconPath = path.join(publicDir, 'icon.png');

function hasImageMagickConvert() {
  try {
    execFileSync('convert', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isUpToDate(src, dest) {
  if (!fs.existsSync(dest)) return false;
  try {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    return destStat.size > 0 && destStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    return false;
  }
}

function resizePng(src, dest, width, height) {
  if (isUpToDate(src, dest)) return;
  if (hasImageMagickConvert()) {
    execFileSync('convert', [
      src,
      '-resize',
      `${width}x${height}!`,
      'PNG32:' + dest,
    ]);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function generateAdaptiveForeground(src, dest, canvasSize) {
  if (isUpToDate(src, dest)) return;
  const innerSize = Math.round(canvasSize * 0.72);
  if (hasImageMagickConvert()) {
    execFileSync('convert', [
      '-size',
      `${canvasSize}x${canvasSize}`,
      'xc:#090d16',
      '(',
      src,
      '-resize',
      `${innerSize}x${innerSize}!`,
      ')',
      '-gravity',
      'center',
      '-composite',
      'PNG32:' + dest,
    ]);
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(iconPath) && fs.statSync(iconPath).size > 0) {
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  resizePng(iconPath, path.join(resourcesDir, 'icon.png'), 1024, 1024);

  // 1. PWA & Web Icons
  resizePng(iconPath, path.join(publicDir, 'pwa-192x192.png'), 192, 192);
  resizePng(iconPath, path.join(publicDir, 'pwa-512x512.png'), 512, 512);
  resizePng(iconPath, path.join(publicDir, 'pwa-maskable-512x512.png'), 512, 512);
  resizePng(iconPath, path.join(publicDir, 'apple-touch-icon.png'), 180, 180);

  // 2. Android Mipmap Resolutions (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
  const mipmapSpecs = [
    { folder: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
    { folder: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
    { folder: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
    { folder: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
    { folder: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
  ];

  const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    for (const spec of mipmapSpecs) {
      const targetDir = path.join(androidResDir, spec.folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      resizePng(iconPath, path.join(targetDir, 'ic_launcher.png'), spec.launcherSize, spec.launcherSize);
      resizePng(iconPath, path.join(targetDir, 'ic_launcher_round.png'), spec.launcherSize, spec.launcherSize);
      generateAdaptiveForeground(
        iconPath,
        path.join(targetDir, 'ic_launcher_foreground.png'),
        spec.foregroundSize
      );
    }
  }

  console.log('✔ Generated resized PWA icons, resources/icon.png, and Android mipmap-* launcher icons.');
}

