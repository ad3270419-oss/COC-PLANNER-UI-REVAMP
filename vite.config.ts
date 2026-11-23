import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const ASSET_MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.json': 'application/json; charset=utf-8',
};

function createBundledCocAssetsPlugin(rootDir: string): Plugin {
  const zipPath = path.resolve(rootDir, 'assets-bundle.zip');
  const workspacePublicDir = path.resolve(rootDir, 'public');
  const extractRootDir = path.join(os.tmpdir(), 'clash-planner-assets');
  const extractPublicDir = path.join(extractRootDir, 'public');
  const stampPath = path.join(extractRootDir, '.bundle-stamp');
  const VIRTUAL_PREFIX = '\0bundled-coc-asset:';

  function hasWorkspaceAssets(): boolean {
    return (
      fs.existsSync(path.join(workspacePublicDir, 'icons', 'item_names.json')) &&
      fs.existsSync(path.join(workspacePublicDir, 'icons', 'art_index.json')) &&
      fs.existsSync(path.join(workspacePublicDir, 'coc-assets'))
    );
  }

  function ensureExtractedToTmp(): string | null {
    if (hasWorkspaceAssets()) return null;
    if (!fs.existsSync(zipPath)) return null;

    const stat = fs.statSync(zipPath);
    const expectedStamp = `${stat.size}:${Math.floor(stat.mtimeMs)}`;
    const hasExtractedFiles =
      fs.existsSync(path.join(extractPublicDir, 'icons', 'item_names.json')) &&
      fs.existsSync(path.join(extractPublicDir, 'icons', 'art_index.json')) &&
      fs.existsSync(path.join(extractPublicDir, 'coc-assets'));

    if (
      hasExtractedFiles &&
      fs.existsSync(stampPath) &&
      fs.readFileSync(stampPath, 'utf8').trim() === expectedStamp
    ) {
      return extractPublicDir;
    }

    fs.rmSync(extractRootDir, {recursive: true, force: true});
    fs.mkdirSync(extractRootDir, {recursive: true});

    try {
      execFileSync('unzip', ['-qo', zipPath, '-d', extractRootDir], {
        stdio: 'ignore',
      });
    } catch {
      execFileSync(
        'python3',
        [
          '-c',
          'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
          zipPath,
          extractRootDir,
        ],
        {stdio: 'ignore'}
      );
    }

    fs.writeFileSync(stampPath, expectedStamp, 'utf8');
    return extractPublicDir;
  }

  function createStaticMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const rawUrl = req.url || '';
    const pathnameOnly = rawUrl.split('?')[0].split('#')[0];
    if (
      !pathnameOnly.startsWith('/coc-assets/') &&
      !pathnameOnly.startsWith('/icons/')
    ) {
      next();
      return;
    }

    const tmpPublic = ensureExtractedToTmp();
    if (!tmpPublic) {
      next();
      return;
    }

    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(pathnameOnly);
    } catch {
      next();
      return;
    }

    const relativeAssetPath = decodedPath.replace(/^\/+/, '');
    const workspaceCandidate = path.resolve(workspacePublicDir, relativeAssetPath);
    if (
      workspaceCandidate.startsWith(workspacePublicDir + path.sep) &&
      fs.existsSync(workspaceCandidate) &&
      fs.statSync(workspaceCandidate).isFile()
    ) {
      next();
      return;
    }

    const extractedCandidate = path.resolve(tmpPublic, relativeAssetPath);
    if (
      !extractedCandidate.startsWith(tmpPublic + path.sep) ||
      !fs.existsSync(extractedCandidate) ||
      !fs.statSync(extractedCandidate).isFile()
    ) {
      next();
      return;
    }

    const ext = path.extname(extractedCandidate).toLowerCase();
    const contentType = ASSET_MIME_TYPES[ext] || 'application/octet-stream';
    const fileStat = fs.statSync(extractedCandidate);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(fileStat.size));
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(extractedCandidate).pipe(res);
  }

  return {
    name: 'bundled-coc-assets-tmp',
    enforce: 'pre',
    buildStart() {
      ensureExtractedToTmp();
    },
    resolveId(source, importer) {
      if (!importer || !source.endsWith('.json')) return null;
      const resolvedInWorkspace = path.resolve(path.dirname(importer), source);
      if (fs.existsSync(resolvedInWorkspace)) return null;

      const relToPublic = path.relative(workspacePublicDir, resolvedInWorkspace);
      if (
        relToPublic.startsWith('..') ||
        (!relToPublic.startsWith('icons' + path.sep) &&
          !relToPublic.startsWith('coc-assets' + path.sep))
      ) {
        return null;
      }

      const tmpPublic = ensureExtractedToTmp();
      if (!tmpPublic) return null;

      const extractedTarget = path.resolve(tmpPublic, relToPublic);
      if (
        extractedTarget.startsWith(tmpPublic + path.sep) &&
        fs.existsSync(extractedTarget)
      ) {
        return VIRTUAL_PREFIX + relToPublic + '.mjs';
      }
      return null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX) || !id.endsWith('.mjs')) return null;
      const tmpPublic = ensureExtractedToTmp();
      if (!tmpPublic) return null;

      const relToPublic = id.slice(VIRTUAL_PREFIX.length, -4);
      const extractedTarget = path.resolve(tmpPublic, relToPublic);
      if (
        !extractedTarget.startsWith(tmpPublic + path.sep) ||
        !fs.existsSync(extractedTarget)
      ) {
        return null;
      }

      const rawJson = fs.readFileSync(extractedTarget, 'utf8');
      return `export default ${rawJson};`;
    },
    configureServer(server) {
      ensureExtractedToTmp();
      server.middlewares.use(createStaticMiddleware);
    },
    configurePreviewServer(server) {
      ensureExtractedToTmp();
      server.middlewares.use(createStaticMiddleware);
    },
    closeBundle() {
      const tmpPublic = ensureExtractedToTmp();
      if (!tmpPublic) return;

      const distDir = path.resolve(rootDir, 'dist');
      if (!fs.existsSync(distDir)) return;

      for (const folder of ['coc-assets', 'icons']) {
        const srcDir = path.join(tmpPublic, folder);
        const destDir = path.join(distDir, folder);
        if (fs.existsSync(srcDir) && !fs.existsSync(destDir)) {
          fs.cpSync(srcDir, destDir, {recursive: true});
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      createBundledCocAssetsPlugin(__dirname),
      react(),
      tailwindcss(),
      {
        name: 'exclude-aistudio-chat-screenshots',
        closeBundle() {
          const chatAssetsDir = path.resolve(__dirname, 'dist/assets/aistudio');
          if (fs.existsSync(chatAssetsDir)) {
            fs.rmSync(chatAssetsDir, {recursive: true, force: true});
          }
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.png',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Clash Planner',
          short_name: 'Clash Planner',
          description:
            'Clash Planner — Clash of Clans Upgrade Companion for Builders, Laboratory, and Pet House with 10x/24x potion math and background notifications.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['utilities', 'games'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
