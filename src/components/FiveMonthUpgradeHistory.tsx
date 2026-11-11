import React, { useState, useEffect } from 'react';
import { resolveUpgradeIconSources } from '../cocAssets';

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
  nowTick?: number;
  loadAccountMonthData: (
    accountKey: string,
    yearMonthKey: string,
    monthLabel: string
  ) => MonthUpgradeHistoryData;
  onBackToSummary?: () => void;
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

export const FiveMonthUpgradeHistory: React.FC<FiveMonthUpgradeHistoryProps> = ({
  accountKey,
  accountName,
  nowTick = Date.now(),
  loadAccountMonthData,
  onBackToSummary,
}) => {
  const monthsList = buildLastFiveMonthsList(nowTick);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(monthsList[0].monthKey);

  // Clickable "Time Saved / Used Potions" tab state
  const [isPotionsTabOpen, setIsPotionsTabOpen] = useState<boolean>(false);

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

  return (
    <div className="space-y-4">
      {/* Top Bar: Back to Monthly Progress Option + Active Village Badge */}
      <div className="flex items-center justify-between gap-2">
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

        <span className="px-2.5 py-1 rounded-xl bg-[#161B26] border border-[#2A303C] text-[11px] font-extrabold text-[#CBD5E1] truncate max-w-[160px]">
          {accountName}
        </span>
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
