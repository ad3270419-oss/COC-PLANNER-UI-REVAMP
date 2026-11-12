import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { getTownHallIconSrc, resolveUpgradeIconSources } from '../cocAssets';

export type HistoryCategoryKey =
  | 'heroes'
  | 'pethouse'
  | 'laboratory'
  | 'buildings'
  | 'walls';

export interface StandardUpgradeHistoryItem {
  id: string;
  rawId?: string | number;
  name: string;
  fromLevel: number;
  toLevel: number;
  completedDate: string; // e.g. "Nov 12"
}

/**
 * Represents only the positive calculated wall diff for a target level:
 * Wall: Lvl {fromLevel} ➔ {lvl} (x{upgradedCount} upgraded)
 */
export interface WallUpgradeHistoryItem {
  id: string;
  data: 1000010;
  fromLevel: number;
  lvl: number; // Target level
  upgradedCount: number; // Positive difference (newCount - oldCount)
}

export interface PotionHistoryBreakdownItem {
  key: 'builder' | 'research' | 'pet' | 'builderBite' | 'studySoup';
  name: string;
  iconSrc: string;
  usedCount: number;
  timeSavedText: string;
  accentTextClass: string;
  badgeColorClass: string;
}

export interface MonthUpgradeHistoryData {
  monthKey: string; // e.g. "2026_11"
  monthLabel: string; // e.g. "Nov 2026"
  hasData: boolean; // True if localStorage has saved data for this account & month
  totalUpgrades: number;
  timeSavedText: string; // Combined saved time across all potions/snacks
  potionsBreakdown: PotionHistoryBreakdownItem[];
  heroes: StandardUpgradeHistoryItem[];
  pethouse: StandardUpgradeHistoryItem[];
  laboratory: StandardUpgradeHistoryItem[];
  buildings: StandardUpgradeHistoryItem[];
  walls: WallUpgradeHistoryItem[];
}

export interface FiveMonthUpgradeHistoryProps {
  accountKey: string; // Strictly scoped per village (playerTag or accountId)
  accountName: string;
  playerTag?: string;
  townHallLevel?: number;
  nowTick?: number;
  loadAccountMonthData: (
    accountKey: string,
    yearMonthKey: string,
    monthLabel: string
  ) => MonthUpgradeHistoryData;
  onBackToSummary?: () => void;
}

export interface GeneratedWrappedImagePayload {
  dataUrl: string;
  blob: Blob;
  file: File;
  fileName: string;
  savedViaNativeBridge: boolean;
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: Record<string, unknown>
    ) => Promise<HTMLCanvasElement>;
    ClashWidgetBridge?: {
      syncVillages: (villagesJson: string, activeIndex: number) => void;
      hasStoragePermission?: () => boolean;
      requestStoragePermission?: () => void;
      saveImageToGallery?: (base64Png: string, fileName: string) => boolean;
    };
  }
}

const ACCORDION_CATEGORIES: Array<{
  key: HistoryCategoryKey;
  icon: string;
  title: string;
  badgeColorClass: string;
  categoryType: 'builders' | 'laboratory' | 'pethouse';
}> = [
  {
    key: 'heroes',
    icon: '👑',
    title: 'Heroes',
    badgeColorClass: 'bg-amber-500/15 text-[#F3CA65] border-amber-400/35',
    categoryType: 'builders',
  },
  {
    key: 'pethouse',
    icon: '🐾',
    title: 'Pet House',
    badgeColorClass: 'bg-emerald-500/15 text-[#4ADE80] border-emerald-400/35',
    categoryType: 'pethouse',
  },
  {
    key: 'laboratory',
    icon: '🧪',
    title: 'Laboratory',
    badgeColorClass: 'bg-indigo-500/15 text-[#A5B4FC] border-indigo-400/35',
    categoryType: 'laboratory',
  },
  {
    key: 'buildings',
    icon: '🛡️',
    title: 'Defenses & Buildings',
    badgeColorClass: 'bg-sky-500/15 text-[#93C5FD] border-sky-400/35',
    categoryType: 'builders',
  },
  {
    key: 'walls',
    icon: '🧱',
    title: 'Walls',
    badgeColorClass: 'bg-amber-500/15 text-[#F3CA65] border-amber-400/35',
    categoryType: 'builders',
  },
];

function buildLastFiveMonthsList(nowMs: number): Array<{ monthKey: string; monthLabel: string }> {
  const baseDate = new Date(nowMs);
  const baseYear = baseDate.getFullYear();
  const baseMonthIdx = baseDate.getMonth(); // 0..11

  const list: Array<{ monthKey: string; monthLabel: string }> = [];
  for (let offset = 0; offset < 5; offset++) {
    const d = new Date(baseYear, baseMonthIdx - offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const shortMonth = d.toLocaleString('en-US', { month: 'short' });
    list.push({
      monthKey: `${yyyy}_${mm}`,
      monthLabel: `${shortMonth} ${yyyy}`,
    });
  }
  return list;
}

/**
 * Returns bundled html2canvas (or window.html2canvas fallback) so offline APK & PWA builds
 * never require a network connection to generate the PNG.
 */
export async function ensureHtml2CanvasLoaded(): Promise<
  ((element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>) | null
> {
  if (typeof html2canvas === 'function') {
    return html2canvas as unknown as (
      element: HTMLElement,
      options?: Record<string, unknown>
    ) => Promise<HTMLCanvasElement>;
  }
  if (typeof window !== 'undefined' && typeof window.html2canvas === 'function') {
    return window.html2canvas;
  }
  return null;
}

/**
 * Converts all <img> elements inside `container` to inline base64 `data:` URLs prior to
 * running html2canvas so Android WebViews and installed PWAs never taint the canvas.
 */
async function inlineAllImagesInContainer(container: HTMLElement): Promise<void> {
  const imgNodes = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgNodes.map(async (img) => {
      const currentSrc = img.getAttribute('src') || img.src;
      if (!currentSrc || currentSrc.startsWith('data:')) return;
      try {
        const res = await fetch(img.src);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        if (dataUrl) {
          img.src = dataUrl;
          if (typeof img.decode === 'function') {
            await img.decode().catch(() => {});
          }
        }
      } catch {
        // Ignore individual icon fetch errors; fallback canvas drawing still works
      }
    })
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binaryStr = atob(parts[1] || '');
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Pure offline 2D Canvas fallback generator
 * in case html2canvas fails for any reason.
 * Strictly renders ONLY UPGRADES (no potions, no magic snacks, no time saved).
 */
function renderOfflineFallbackWrappedCanvas(
  accountName: string,
  playerTag: string | undefined,
  monthData: MonthUpgradeHistoryData
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#0B0E14');
  bgGrad.addColorStop(0.5, '#111726');
  bgGrad.addColorStop(1, '#090C12');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer frame border
  ctx.strokeStyle = 'rgba(243, 202, 101, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Header: App Branding & Month
  ctx.fillStyle = '#F3CA65';
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.fillText('CLASH PLANNER · MONTHLY WRAPPED', 84, 110);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 54px Inter, system-ui, sans-serif';
  ctx.fillText(accountName.toUpperCase(), 84, 178);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${playerTag ? `${playerTag} · ` : ''}${monthData.monthLabel.toUpperCase()}`,
    84,
    222
  );

  // Total Upgrades Hero Box
  ctx.fillStyle = '#161C2B';
  ctx.fillRect(84, 258, 912, 130);
  ctx.strokeStyle = 'rgba(243, 202, 101, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(84, 258, 912, 130);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.fillText('TOTAL UPGRADES COMPLETED', 120, 312);

  ctx.fillStyle = '#F3CA65';
  ctx.font = '900 56px Inter, system-ui, sans-serif';
  ctx.fillText(String(monthData.totalUpgrades), 120, 368);

  // Compact Categorized Upgrades List
  let y = 445;
  const sections: Array<{ title: string; pills: string[] }> = [
    {
      title: `HEROES (${monthData.heroes.length})`,
      pills: monthData.heroes.map((h) => `${h.fromLevel} ➔ ${h.toLevel}`),
    },
    {
      title: `PET HOUSE (${monthData.pethouse.length})`,
      pills: monthData.pethouse.map((p) => `${p.fromLevel} ➔ ${p.toLevel}`),
    },
    {
      title: `LABORATORY (${monthData.laboratory.length})`,
      pills: monthData.laboratory.map((l) => `${l.fromLevel} ➔ ${l.toLevel}`),
    },
    {
      title: `DEFENSES & BUILDINGS (${monthData.buildings.length})`,
      pills: monthData.buildings.map((b) => `${b.fromLevel} ➔ ${b.toLevel}`),
    },
    {
      title: `WALLS (x${monthData.walls.reduce((s, w) => s + w.upgradedCount, 0)})`,
      pills: monthData.walls.map((w) => `${w.fromLevel} ➔ ${w.lvl} (x${w.upgradedCount})`),
    },
  ];

  for (const sec of sections) {
    if (sec.pills.length === 0) continue;
    if (y > 1220) break;
    ctx.fillStyle = '#F3CA65';
    ctx.font = '800 26px Inter, system-ui, sans-serif';
    ctx.fillText(sec.title, 84, y);
    y += 38;

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 24px Inter, system-ui, sans-serif';
    const rowText = sec.pills.join('   •   ');
    ctx.fillText(rowText.slice(0, 68), 96, y);
    y += 52;
  }

  return canvas;
}

/**
 * Triggers direct on-device save:
 * 1) If running inside the installed Android APK (`window.ClashWidgetBridge.saveImageToGallery`),
 *    requests Android storage permission if needed and writes directly to `Pictures/ClashPlanner`.
 * 2) Triggers browser / PWA file download via `<a download>`.
 */
export function saveGeneratedImageToDevice(payload: GeneratedWrappedImagePayload): boolean {
  const { dataUrl, blob, fileName } = payload;

  // 1. Native Android APK Bridge (MediaStore + runtime storage permission)
  if (
    typeof window !== 'undefined' &&
    window.ClashWidgetBridge &&
    typeof window.ClashWidgetBridge.saveImageToGallery === 'function'
  ) {
    try {
      const ok = window.ClashWidgetBridge.saveImageToGallery(dataUrl, fileName);
      if (ok) return true;
    } catch {
      // Fall through to standard download
    }
  }

  // 2. Standard Browser & PWA Download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 6000);
    return true;
  } catch {
    try {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = dataUrl;
      fallbackLink.download = fileName;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
      return true;
    } catch {
      return false;
    }
  }
}

export async function triggerClashWrappedImageExport(params: {
  cardElement: HTMLElement | null;
  accountName: string;
  playerTag?: string;
  monthData: MonthUpgradeHistoryData;
}): Promise<GeneratedWrappedImagePayload | null> {
  const { cardElement, accountName, playerTag, monthData } = params;
  let canvas: HTMLCanvasElement | null = null;

  if (cardElement) {
    const html2canvasFn = await ensureHtml2CanvasLoaded();
    if (html2canvasFn) {
      try {
        await inlineAllImagesInContainer(cardElement);
        canvas = await html2canvasFn(cardElement, {
          backgroundColor: '#0B0E14',
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: cardElement.offsetWidth,
          height: cardElement.offsetHeight,
          windowWidth: cardElement.offsetWidth,
          windowHeight: cardElement.offsetHeight,
        });
      } catch {
        canvas = null;
      }
    }
  }

  if (!canvas) {
    canvas = renderOfflineFallbackWrappedCanvas(accountName, playerTag, monthData);
  }

  const safeAccount = (accountName || 'Village').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeMonth = monthData.monthLabel.replace(/\s+/g, '_');
  const fileName = `Clash_Wrapped_${safeAccount}_${safeMonth}.png`;

  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch {
    const fallbackCanvas = renderOfflineFallbackWrappedCanvas(accountName, playerTag, monthData);
    dataUrl = fallbackCanvas.toDataURL('image/png');
  }

  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], fileName, { type: 'image/png' });

  let savedViaNativeBridge = false;
  if (
    typeof window !== 'undefined' &&
    window.ClashWidgetBridge &&
    typeof window.ClashWidgetBridge.saveImageToGallery === 'function'
  ) {
    try {
      savedViaNativeBridge = Boolean(
        window.ClashWidgetBridge.saveImageToGallery(dataUrl, fileName)
      );
    } catch {
      savedViaNativeBridge = false;
    }
  } else {
    saveGeneratedImageToDevice({
      dataUrl,
      blob,
      file,
      fileName,
      savedViaNativeBridge: false,
    });
  }

  return {
    dataUrl,
    blob,
    file,
    fileName,
    savedViaNativeBridge,
  };
}

/**
 * On-Device Image Save & Share Sheet Modal:
 * Gives installed APK & PWA users a synchronous one-tap "Save to Device" button
 * (with Android storage permission handling) and a synchronous "Share / Save to Gallery" button
 * (preserving browser user-gesture activation), plus long-press image saving.
 */
export const WrappedImageSaveModal: React.FC<{
  payload: GeneratedWrappedImagePayload | null;
  onClose: () => void;
}> = ({ payload, onClose }) => {
  const [statusText, setStatusText] = useState<string>('');

  useEffect(() => {
    if (!payload) {
      setStatusText('');
      return;
    }
    if (payload.savedViaNativeBridge) {
      setStatusText('Saved to Gallery: Pictures/ClashPlanner/' + payload.fileName);
    } else {
      setStatusText('Image generated! Tap "Save to Device" or "Share" below.');
    }
  }, [payload]);

  if (!payload) return null;

  const handleDirectSaveTap = () => {
    // Request Android storage permission if running in APK and not yet granted
    if (
      typeof window !== 'undefined' &&
      window.ClashWidgetBridge &&
      typeof window.ClashWidgetBridge.hasStoragePermission === 'function' &&
      !window.ClashWidgetBridge.hasStoragePermission()
    ) {
      window.ClashWidgetBridge.requestStoragePermission?.();
    }

    const ok = saveGeneratedImageToDevice(payload);
    if (ok) {
      setStatusText(
        window.ClashWidgetBridge?.saveImageToGallery
          ? `Saved to Gallery: Pictures/ClashPlanner/${payload.fileName}`
          : `Saved ${payload.fileName} to your device downloads!`
      );
    }
  };

  const handleDirectShareTap = async () => {
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    if (
      typeof nav.share === 'function' &&
      typeof nav.canShare === 'function' &&
      nav.canShare({ files: [payload.file] })
    ) {
      try {
        await nav.share({
          files: [payload.file],
          title: payload.fileName,
        });
        setStatusText('Shared / saved successfully!');
        return;
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleDirectSaveTap();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-4 bg-[#0D121F] border border-[#F3CA65]/45 shadow-[0_0_50px_rgba(0,0,0,0.95)] space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F3CA65] block">
              ON-DEVICE IMAGE SAVE
            </span>
            <h4 className="text-sm font-extrabold text-white truncate">
              {payload.fileName}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tactile text-[#8E9AA8] hover:text-white text-xs font-bold px-2.5 py-1 rounded-xl bg-[#161B26] border border-[#2A303C] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Rendered PNG Preview (Also supports Long-Press -> Save Image on mobile) */}
        <div className="rounded-2xl bg-[#080B12] border border-white/10 p-2 max-h-[52dvh] overflow-y-auto flex justify-center">
          <img
            src={payload.dataUrl}
            alt="Clash Wrapped Preview"
            className="w-full h-auto rounded-xl object-contain"
          />
        </div>

        {statusText && (
          <p className="text-[11px] font-bold text-[#4ADE80] text-center px-1">
            ✅ {statusText}
          </p>
        )}

        {/* Synchronous User-Gesture Action Buttons for Installed APK & PWA */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDirectSaveTap}
            className="tactile w-full py-2.5 px-3 rounded-xl text-xs font-extrabold text-[#0B0E14] bg-[#F3CA65] hover:bg-[#f7d67e] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>💾 Save to Device</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDirectShareTap()}
            className="tactile w-full py-2.5 px-3 rounded-xl text-xs font-extrabold text-[#F3CA65] bg-[#F3CA65]/15 hover:bg-[#F3CA65]/25 border border-[#F3CA65]/45 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>📤 Share / Gallery</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const InlineResolvedIcon: React.FC<{
  rawId?: string | number;
  name: string;
  fromLevel?: number;
  toLevel?: number;
  category: 'builders' | 'laboratory' | 'pethouse';
}> = ({ rawId, name, fromLevel, toLevel, category }) => {
  const sources = resolveUpgradeIconSources({
    rawId,
    upgradeTitle: name,
    upgradeLevel: fromLevel,
    targetLevel: toLevel,
    category,
  });
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const sourcesKey = sources.join('|');
  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [sourcesKey]);

  if (failed || !sources[idx]) return null;

  return (
    <img
      src={sources[idx]}
      alt={name}
      className="w-5 h-5 inline object-contain shrink-0"
      onError={() => {
        if (idx + 1 < sources.length) {
          setIdx((prev) => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

/**
 * Hidden Compact Infographic Card ("CLASH WRAPPED").
 * - Fixed width `w-[420px] h-auto` off-screen (`fixed top-[-9999px] left-[-9999px]`)
 * - Header displays the village's Town Hall icon (`getTownHallIconSrc` / `art_1000001.webp`)
 * - Compact horizontal pill layout (`flex flex-wrap gap-2`) showing ONLY icon + level transition
 * - CRITICAL RULE: Shows ONLY UPGRADES. Zero mentions of Potions, Magic Snacks, or Time Saved.
 */
export const ClashWrappedInfographicCard = React.forwardRef<
  HTMLDivElement,
  {
    accountName: string;
    playerTag?: string;
    townHallLevel?: number;
    monthData: MonthUpgradeHistoryData;
  }
>(({ accountName, playerTag, townHallLevel, monthData }, ref) => {
  const totalWallUpgrades = monthData.walls.reduce((sum, w) => sum + w.upgradedCount, 0);

  // Infer Town Hall level if not explicitly passed or if upgraded this month
  const thUpgradeInMonth = monthData.buildings.find(
    (b) => String(b.rawId) === '1000001' || b.name.toLowerCase() === 'town hall'
  );
  const effectiveThLevel =
    typeof townHallLevel === 'number' && townHallLevel >= 1
      ? townHallLevel
      : thUpgradeInMonth?.toLevel;
  const initialThIconSrc = effectiveThLevel
    ? getTownHallIconSrc(effectiveThLevel)
    : '/icons/art_1000001.webp';

  const [thIconSrc, setThIconSrc] = useState<string>(initialThIconSrc);
  useEffect(() => {
    setThIconSrc(initialThIconSrc);
  }, [initialThIconSrc]);

  const categoryBlocks: Array<{
    key: HistoryCategoryKey;
    icon: string;
    title: string;
    categoryType: 'builders' | 'laboratory' | 'pethouse';
    items: StandardUpgradeHistoryItem[];
  }> = [
    {
      key: 'heroes',
      icon: '👑',
      title: 'Heroes',
      categoryType: 'builders',
      items: monthData.heroes,
    },
    {
      key: 'pethouse',
      icon: '🐾',
      title: 'Pet House',
      categoryType: 'pethouse',
      items: monthData.pethouse,
    },
    {
      key: 'laboratory',
      icon: '🧪',
      title: 'Laboratory',
      categoryType: 'laboratory',
      items: monthData.laboratory,
    },
    {
      key: 'buildings',
      icon: '🛡️',
      title: 'Defenses & Buildings',
      categoryType: 'builders',
      items: monthData.buildings,
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed top-[-9999px] left-[-9999px] pointer-events-none select-none z-[-1]"
    >
      {/* Fixed-width, auto-height compact container captured directly by html2canvas */}
      <div
        ref={ref}
        className="w-[420px] h-auto rounded-3xl p-4 bg-gradient-to-b from-[#0E1320] via-[#0B0E14] to-[#080B11] border border-[#F3CA65]/35 shadow-2xl flex flex-col gap-2.5 text-white font-sans relative overflow-hidden"
      >
        {/* 1. Compact Header with Village Town Hall Icon */}
        <div className="flex items-center justify-between gap-2.5 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#161D2E] border border-[#F3CA65]/40 p-1 flex items-center justify-center shrink-0">
              <img
                src={thIconSrc}
                alt="Town Hall"
                className="w-full h-full object-contain"
                onError={() => {
                  if (thIconSrc !== '/icons/art_1000001.webp') {
                    setThIconSrc('/icons/art_1000001.webp');
                  }
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black tracking-[0.18em] text-[#F3CA65] uppercase leading-tight">
                CLASH PLANNER · WRAPPED
              </p>
              <h2 className="text-base font-black text-white tracking-tight truncate leading-snug">
                {accountName}
              </h2>
              {playerTag ? (
                <p className="text-[10px] font-bold font-mono text-[#4ADE80] truncate leading-tight">
                  {playerTag}
                </p>
              ) : null}
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-[#181F30] border border-[#F3CA65]/40 text-right shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F3CA65] block">
              {monthData.monthLabel}
            </span>
          </div>
        </div>

        {/* 2. Highlighted Total Upgrades Completed Banner */}
        <div className="rounded-2xl px-3.5 py-2.5 bg-[#141A29]/95 border border-[#F3CA65]/40 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8E9AA8]">
              Total Upgrades Completed
            </p>
            <p className="text-[11px] font-bold text-slate-300">
              Monthly Village Progress
            </p>
          </div>
          <span className="text-2xl font-black text-[#F3CA65] tabular-nums leading-none">
            {monthData.totalUpgrades}
          </span>
        </div>

        {/* 3. Categorized Upgrades — Compact Horizontal Pill Layout (Icon + Level Transition ONLY) */}
        <div className="space-y-2">
          {categoryBlocks.map((block) => {
            if (block.items.length === 0) return null;
            return (
              <div
                key={block.key}
                className="rounded-2xl bg-[#121724]/90 border border-[#242D42] p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F3CA65] flex items-center gap-1.5">
                    <span>{block.icon}</span>
                    <span>{block.title}</span>
                  </span>
                  <span className="text-[10px] font-black text-[#4ADE80] tabular-nums">
                    {block.items.length}
                  </span>
                </div>

                {/* Dense Horizontal Flex-Wrap Pill Grid */}
                <div className="flex flex-wrap gap-1.5">
                  {block.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-lg"
                    >
                      <InlineResolvedIcon
                        rawId={item.rawId}
                        name={item.name}
                        fromLevel={item.fromLevel}
                        toLevel={item.toLevel}
                        category={block.categoryType}
                      />
                      <span className="text-xs font-bold text-white tabular-nums leading-none">
                        {item.fromLevel} ➔ {item.toLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Walls Visual Block — Compact Horizontal Pills */}
          {monthData.walls.length > 0 && (
            <div className="rounded-2xl bg-[#121724]/90 border border-[#242D42] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F3CA65] flex items-center gap-1.5">
                  <span>🧱</span>
                  <span>Walls</span>
                </span>
                <span className="text-[10px] font-black text-[#4ADE80] tabular-nums">
                  x{totalWallUpgrades}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {monthData.walls.map((wall) => (
                  <div
                    key={wall.id}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-lg"
                  >
                    <img
                      src="./icons/art_1000010.webp"
                      alt="Wall"
                      className="w-5 h-5 object-contain shrink-0"
                    />
                    <span className="text-xs font-bold text-white tabular-nums leading-none">
                      {wall.fromLevel} ➔ {wall.lvl}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#4ADE80] tabular-nums leading-none">
                      (x{wall.upgradedCount})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthData.totalUpgrades === 0 && (
            <div className="rounded-2xl bg-[#121724]/90 border border-[#242D42] p-3.5 text-center">
              <p className="text-xs font-bold text-[#8E9AA8]">
                No completed upgrades logged for {monthData.monthLabel} yet.
              </p>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-[#8E9AA8]">
          <span>CLASH PLANNER</span>
          <span className="text-[#F3CA65]">VILLAGE UPGRADE ARCHIVE</span>
        </div>
      </div>
    </div>
  );
});
ClashWrappedInfographicCard.displayName = 'ClashWrappedInfographicCard';

export const FiveMonthUpgradeHistory: React.FC<FiveMonthUpgradeHistoryProps> = ({
  accountKey,
  accountName,
  playerTag,
  townHallLevel,
  nowTick = Date.now(),
  loadAccountMonthData,
  onBackToSummary,
}) => {
  const monthsList = buildLastFiveMonthsList(nowTick);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(monthsList[0].monthKey);

  // Clickable "Time Saved / Used Potions" tab state
  const [isPotionsTabOpen, setIsPotionsTabOpen] = useState<boolean>(false);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [generatedWrappedPayload, setGeneratedWrappedPayload] =
    useState<GeneratedWrappedImagePayload | null>(null);
  const wrappedCardRef = useRef<HTMLDivElement | null>(null);

  // Collapsible Accordion State per category
  const [openAccordions, setOpenAccordions] = useState<Record<HistoryCategoryKey, boolean>>({
    heroes: true,
    pethouse: false,
    laboratory: false,
    buildings: false,
    walls: true,
  });

  const toggleAccordion = (key: HistoryCategoryKey) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedMonthMeta =
    monthsList.find((m) => m.monthKey === selectedMonthKey) || monthsList[0];

  // Unified Viewer: Reads existing localStorage monthly history for the selected month & account
  const activeMonthData = loadAccountMonthData(
    accountKey,
    selectedMonthMeta.monthKey,
    selectedMonthMeta.monthLabel
  );

  const totalPotionsUsedCount = activeMonthData.potionsBreakdown.reduce(
    (sum, p) => sum + p.usedCount,
    0
  );

  const getCategoryCountLabel = (key: HistoryCategoryKey): string => {
    if (key === 'walls') {
      const upgradedSum = activeMonthData.walls.reduce((sum, w) => sum + w.upgradedCount, 0);
      return upgradedSum > 0 ? `x${upgradedSum}` : '0';
    }
    return String(activeMonthData[key].length);
  };

  const handleSaveWrappedImage = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      const payload = await triggerClashWrappedImageExport({
        cardElement: wrappedCardRef.current,
        accountName,
        playerTag,
        monthData: activeMonthData,
      });
      if (payload) {
        setGeneratedWrappedPayload(payload);
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Compact Infographic Card in DOM for html2canvas export */}
      <ClashWrappedInfographicCard
        ref={wrappedCardRef}
        accountName={accountName}
        playerTag={playerTag}
        townHallLevel={townHallLevel}
        monthData={activeMonthData}
      />

      {/* On-Device Save & Share Modal for Installed APK / PWA */}
      <WrappedImageSaveModal
        payload={generatedWrappedPayload}
        onClose={() => setGeneratedWrappedPayload(null)}
      />

      {/* Top Bar: Back to Monthly Progress Option + Save as Image / Share Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {onBackToSummary ? (
          <button
            type="button"
            onClick={onBackToSummary}
            className="tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161B26] hover:bg-[#1E2534] border border-[#2A303C] text-xs font-extrabold text-[#F3CA65] cursor-pointer"
          >
            <span>←</span>
            <span>Back to Monthly Progress</span>
          </button>
        ) : (
          <div>
            <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#F3CA65] uppercase block">
              5-MONTH ARCHIVE
            </span>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              Upgrade History &amp; Stats
            </h3>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {activeMonthData.hasData && (
            <button
              type="button"
              onClick={() => void handleSaveWrappedImage()}
              disabled={isExportingImage}
              className="tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3CA65]/15 hover:bg-[#F3CA65]/25 border border-[#F3CA65]/45 text-xs font-extrabold text-[#F3CA65] cursor-pointer disabled:opacity-60"
            >
              <span>📸</span>
              <span>{isExportingImage ? 'Saving...' : 'Save as Image'}</span>
            </button>
          )}
          <span className="px-2.5 py-1 rounded-xl bg-[#161B26] border border-[#2A303C] text-[11px] font-extrabold text-[#CBD5E1] truncate max-w-[130px]">
            {accountName}
          </span>
        </div>
      </div>

      {/* 1. Month Selector (Row of 5 Month Chips) */}
      <div className="account-bar-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
        {monthsList.map((month) => {
          const isSelected = month.monthKey === selectedMonthMeta.monthKey;
          return (
            <button
              key={month.monthKey}
              type="button"
              onClick={() => setSelectedMonthKey(month.monthKey)}
              className={`tactile shrink-0 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#252D3D] text-[#F3CA65] border-[#F3CA65]/50 shadow-[0_0_12px_rgba(243,202,101,0.15)]'
                  : 'bg-[#121622] text-[#8E9AA8] border-[#232A38] hover:text-white hover:border-[#2E3646]'
              }`}
            >
              {month.monthLabel}
            </button>
          );
        })}
      </div>

      {!activeMonthData.hasData ? (
        <div className="rounded-2xl p-6 bg-[#121622] border border-[#242C3D] text-center space-y-1.5">
          <p className="text-sm font-extrabold text-white">No data for this month</p>
          <p className="text-xs font-medium text-[#8E9AA8]">
            No saved monthly progress found in storage for {accountName} in{' '}
            {activeMonthData.monthLabel}.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Monthly Summary Quick Stats Row + Clickable "Time Saved / Used Potions" Tab */}
          <div className="rounded-2xl bg-[#121622] border border-[#262F42] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsPotionsTabOpen((prev) => !prev)}
              aria-expanded={isPotionsTabOpen}
              className="tactile w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-[#181E2E] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8E9AA8]">Total Upgrades:</span>
                <span className="text-sm font-black text-[#F3CA65] tabular-nums">
                  {activeMonthData.totalUpgrades}
                </span>
              </div>
              <span className="text-[#2A3346] font-black select-none">|</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8E9AA8]">Time Saved:</span>
                <span className="text-sm font-black text-[#4ADE80] tabular-nums">
                  {activeMonthData.timeSavedText}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#4ADE80]/15 border border-[#4ADE80]/35 text-[10px] font-extrabold text-[#4ADE80] flex items-center gap-1">
                  <span>{totalPotionsUsedCount}x</span>
                  <span>{isPotionsTabOpen ? '▴' : '▾'}</span>
                </span>
              </div>
            </button>

            {/* Expanded Potions & Saved Time Breakdown */}
            {isPotionsTabOpen && (
              <div className="px-3.5 pb-3.5 pt-2 border-t border-white/5 space-y-2 bg-[#0D111A]/80">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#F3CA65] uppercase">
                    USED POTIONS &amp; TIME SAVED
                  </span>
                  <span className="text-[11px] font-bold text-[#8E9AA8] tabular-nums">
                    Total Used: {totalPotionsUsedCount}
                  </span>
                </div>

                {activeMonthData.potionsBreakdown.map((potion) => (
                  <div
                    key={potion.key}
                    className="rounded-xl bg-[#181E2C] border border-[#263044] px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#1E2534] border border-[#2D364A] p-1 flex items-center justify-center shrink-0">
                        <img
                          src={potion.iconSrc}
                          alt={potion.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                            {potion.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold border tabular-nums ${potion.badgeColorClass}`}
                          >
                            x{potion.usedCount}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#8E9AA8] mt-0.5">
                          Time Saved:{' '}
                          <span className={`font-bold tabular-nums ${potion.accentTextClass}`}>
                            {potion.timeSavedText}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-extrabold border tabular-nums shrink-0 ${potion.badgeColorClass}`}
                    >
                      {potion.usedCount} used
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Collapsible Accordion Categories */}
          <div className="space-y-2.5">
            {ACCORDION_CATEGORIES.map((cat) => {
              const isOpen = openAccordions[cat.key];
              const countLabel = getCategoryCountLabel(cat.key);

              return (
                <div
                  key={cat.key}
                  className="rounded-2xl bg-[#121622]/90 border border-[#242C3D] overflow-hidden transition-all"
                >
                  {/* Accordion Folder Header */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(cat.key)}
                    aria-expanded={isOpen}
                    className="tactile w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#181E2E] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0" aria-hidden="true">
                        {cat.icon}
                      </span>
                      <span className="text-sm font-extrabold text-white truncate">
                        {cat.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border tabular-nums ${cat.badgeColorClass}`}
                      >
                        {countLabel}
                      </span>
                      <span className="text-xs font-bold text-[#8E9AA8] w-4 text-center">
                        {isOpen ? '▴' : '▾'}
                      </span>
                    </div>
                  </button>

                  {/* Accordion Body: Standard Line Items or Wall Diff Line Items */}
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-white/5 space-y-2">
                      {cat.key === 'walls' ? (
                        activeMonthData.walls.length > 0 ? (
                          activeMonthData.walls.map((wall) => (
                            <div
                              key={wall.id}
                              className="rounded-xl bg-[#181E2C] border border-[#263044] px-3 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-[13px]"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <img
                                  src="./icons/art_1000010.webp"
                                  alt="Wall"
                                  className="w-4 h-4 inline object-contain shrink-0"
                                />
                                <span className="font-bold text-white">Wall:</span>
                                <span className="font-extrabold text-[#F3CA65]">
                                  Lvl {wall.fromLevel} ➔ {wall.lvl}
                                </span>
                                <span className="font-bold text-[#4ADE80]">
                                  (x{wall.upgradedCount} upgraded)
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs font-medium text-[#8E9AA8] py-1.5 px-1">
                            No wall upgrades logged this month.
                          </p>
                        )
                      ) : activeMonthData[cat.key].length > 0 ? (
                        activeMonthData[cat.key].map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-[#181E2C] border border-[#263044] px-3 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-[13px]"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <InlineResolvedIcon
                                rawId={item.rawId}
                                name={item.name}
                                fromLevel={item.fromLevel}
                                toLevel={item.toLevel}
                                category={cat.categoryType}
                              />
                              <span className="font-bold text-white truncate">
                                {item.name}:
                              </span>
                              <span className="font-extrabold text-[#F3CA65]">
                                Lvl {item.fromLevel} ➔ {item.toLevel}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-[#8E9AA8] shrink-0">
                              ({item.completedDate})
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs font-medium text-[#8E9AA8] py-1.5 px-1">
                          No {cat.title.toLowerCase()} upgrades logged this month.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FiveMonthUpgradeHistory;
