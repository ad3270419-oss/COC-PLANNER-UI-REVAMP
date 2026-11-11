/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  ITEM_NAMES_BY_ID,
  UpgradeAssetIcon,
  getTownHallIconSrc,
  resolveUpgradeIconSources,
} from './cocAssets';
import {
  FiveMonthUpgradeHistory,
  type MonthUpgradeHistoryData,
  type PotionHistoryBreakdownItem,
  type StandardUpgradeHistoryItem,
  type WallUpgradeHistoryItem,
} from './components/FiveMonthUpgradeHistory';

export const COC_NAMES: Record<string | number, string> = {
  // Town Hall & Key Buildings
  1000000: "Army Camp",
  1000001: "Town Hall",
  1000002: "Elixir Collector",
  1000003: "Elixir Storage",
  1000004: "Gold Mine",
  1000005: "Gold Storage",
  1000006: "Barracks",
  1000007: "Laboratory",
  1000008: "Cannon",
  1000009: "Archer Tower",
  1000010: "Wall",
  1000011: "Wizard Tower",
  1000012: "Air Defense",
  1000013: "Mortar",
  1000014: "Clan Castle",
  1000015: "Builder's Hut",
  1000019: "Hidden Tesla",
  1000020: "Spell Factory",
  1000021: "X-Bow",
  1000023: "Dark Elixir Drill",
  1000024: "Dark Elixir Storage",
  1000026: "Dark Barracks",
  1000027: "Inferno Tower",
  1000028: "Air Sweeper",
  1000029: "Dark Spell Factory",
  1000031: "Eagle Artillery",
  1000032: "Bomb Tower",
  1000059: "Workshop",
  1000064: "B.O.B's Hut",
  1000067: "Scattershot",
  1000068: "Pet House",
  1000070: "Blacksmith",
  1000071: "Hero Hall",
  1000072: "Spell Tower",
  1000077: "Monolith",
  1000079: "Multi-Gear Tower",
  1000084: "Multi-Archer Tower",
  1000085: "Ricochet Cannon",
  1000086: "Revenge Tower",
  1000089: "Firespitter",
  1000093: "Helper Hut",
  1000097: "Crafting Station",
  1000102: "Super Wizard Tower",

  // Traps
  12000000: "Bomb",
  12000001: "Spring Trap",
  12000002: "Giant Bomb",
  12000005: "Air Bomb",
  12000006: "Seeking Air Mine",
  12000008: "Skeleton Trap",
  12000016: "Tornado Trap",
  12000020: "Giga Bomb",

  // Heroes
  28000000: "Barbarian King",
  28000001: "Archer Queen",
  28000002: "Grand Warden",
  28000003: "Battle Machine",
  28000004: "Royal Champion",
  28000005: "Battle Copter",
  28000006: "Minion Prince",
  28000007: "Dragon Duke",

  // Helpers & Assistants
  93000000: "Builder's Apprentice",
  93000001: "Lab Apprentice",
  93000002: "Prospector"
};

// Merge Pets, Troops & Siege Machines, Spells, and item_names.json into COC_NAMES
Object.assign(COC_NAMES, ITEM_NAMES_BY_ID, {
  // --- PETS (73000000 series) ---
  73000000: "L.A.S.S.I",
  73000001: "Mighty Yak",
  73000002: "Electro Owl",
  73000003: "Unicorn",
  73000004: "Phoenix",
  73000007: "Poison Lizard",
  73000008: "Diggy",
  73000009: "Frosty",
  73000010: "Spirit Fox",
  73000011: "Angry Jelly",
  73000016: "Sneezy",
  73000017: "Greedy Raven",

  // --- TROOPS & SIEGE MACHINES (4000000 series) ---
  4000000: "Barbarian",
  4000001: "Archer",
  4000002: "Goblin",
  4000003: "Giant",
  4000004: "Wall Breaker",
  4000005: "Balloon",
  4000006: "Wizard",
  4000007: "Healer",
  4000008: "Dragon",
  4000009: "P.E.K.K.A",
  4000010: "Minion",
  4000011: "Hog Rider",
  4000012: "Valkyrie",
  4000013: "Golem",
  4000015: "Witch",
  4000017: "Lava Hound",
  4000022: "Bowler",
  4000023: "Baby Dragon",
  4000024: "Miner",
  4000051: "Wall Wrecker",
  4000052: "Battle Blimp",
  4000053: "Yeti",
  4000058: "Ice Golem",
  4000059: "Electro Dragon",
  4000062: "Stone Slammer",
  4000065: "Dragon Rider",
  4000075: "Siege Barracks",
  4000082: "Headhunter",
  4000087: "Log Launcher",
  4000091: "Flame Flinger",
  4000092: "Battle Drill",
  4000095: "Electro Titan",
  4000097: "Apprentice Warden",
  4000109: "Ruin Witch",
  4000110: "Root Rider",
  4000123: "Druid",
  4000132: "Thrower",
  4000135: "Troop Launcher",
  4000150: "Furnace",
  4000177: "Meteor Golem",
  4000188: "Sky Wagon",

  // --- SPELLS (26000000 series) ---
  26000000: "Lightning Spell",
  26000001: "Healing Spell",
  26000002: "Rage Spell",
  26000003: "Jump Spell",
  26000005: "Freeze Spell",
  26000009: "Poison Spell",
  26000010: "Earthquake Spell",
  26000011: "Haste Spell",
  26000016: "Clone Spell",
  26000017: "Skeleton Spell",
  26000028: "Bat Spell",
  26000035: "Invisibility Spell",
  26000053: "Recall Spell",
  26000070: "Overgrowth Spell",
  26000098: "Revive Spell",
  26000109: "Ice Block Spell",
  26000120: "Totem Spell",
  26000123: "Angry Spell",

  // --- HELPERS / APPRENTICES (93000000 series) ---
  93000000: "Builder's Apprentice",
  93000001: "Lab Apprentice"
});

type PlannerCategoryTab = 'builders' | 'laboratory' | 'pethouse';
type BuilderSubTabMode = 'single' | 'multi' | 'helpers';

export interface BuilderApprenticeState {
  id: 93000000;
  level: number; // 1 to 8
  assignedSlot: number | null; // 0..6 builder index, or null
  activeSessionEndTime: number | null; // timestamp (ms) when the 1-hour active session ends
  cooldownEndTime: number | null; // timestamp (ms) when daily cooldown expires
  recurrent?: boolean; // true when assigned until upgrade finishes
}

export interface LabApprenticeState {
  id: 93000001;
  level: number; // 1 to 12 (1 to 8 in UI)
  assignedSlot: 'main' | 'goblin' | null; // 'main' | 'goblin' | null
  activeSessionEndTime: number | null; // timestamp (ms) when the 1-hour active session ends
  cooldownEndTime: number | null; // timestamp (ms) when daily cooldown expires
  recurrent?: boolean; // true when assigned until upgrade finishes
}

interface BuilderTime {
  d: string;
  h: string;
  m: string;
  s?: number;
  upgradeTitle?: string;
  upgradeLevel?: number;
  rawId?: string;
}

interface LockedResultItem {
  builderIndex: number;
  slotBadge: string;
  upgradeTitle: string;
  upgradeLevel?: number;
  rawId?: string;
  isGoblin: boolean;
  targetTimestamp: number;
  formattedDate: string;
}

interface SavedState {
  mode: BuilderSubTabMode;
  numBuilders: number;
  builders: BuilderTime[];
  potions: string;
  lockedResults?: LockedResultItem[];
  lockedSavedText?: string;
  // Laboratory 24x Engine State
  researchPotions?: number;
  labTimer?: BuilderTime;
  goblinLabTimer?: BuilderTime;
  targetLabTimestamp?: number | null;
  labFormattedDate?: string;
  labSavedText?: string;
  targetGoblinLabTimestamp?: number | null;
  goblinLabFormattedDate?: string;
  // Pet House 24x Engine State
  petPotions?: number;
  petTimer?: BuilderTime;
  targetPetTimestamp?: number | null;
  petFormattedDate?: string;
  petSavedText?: string;
  // Active In-Game Potion Boost End Timestamps (ms)
  builderBoostEndTime?: number | null;
  labBoostEndTime?: number | null;
  petBoostEndTime?: number | null;
  // Active In-Game Magic Snack Boost End Timestamps (ms)
  builderBiteEndTime?: number | null;
  studySoupEndTime?: number | null;
  // Helpers / Apprentices State (93000000 & 93000001)
  builderApprentice?: BuilderApprenticeState;
  labApprentice?: LabApprenticeState;
  // Town Hall Level & Last Synced Clock String for Android Home Screen Widget
  thLevel?: number;
  lastSynced?: string;
}

declare global {
  interface Window {
    ClashWidgetBridge?: {
      syncVillages: (villagesJson: string, activeIndex: number) => void;
    };
  }
}

interface VillageProfile {
  id: string;
  name: string;
  tag?: string;
  data: SavedState;
}

interface MultiAccountStorage {
  activeAccountId: string;
  accounts: VillageProfile[];
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

interface RawCoCItem {
  data?: number | string;
  id?: number | string;
  lvl?: number;
  cnt?: number;
  timer?: number;
  extra?: boolean;
  helper_cooldown?: number;
  helper_recurrent?: boolean;
  helper_assigned?: boolean;
  helper_timer?: number;
  helper?: number | string | boolean;
}

interface RawCoCBoosts {
  builder_boost?: number;
  lab_boost?: number;
  pet_boost?: number;
  builder_consumable?: number;
  lab_consumable?: number;
  [key: string]: unknown;
}

interface RawCoCVillage {
  tag?: string;
  timestamp?: number;
  buildings?: RawCoCItem[];
  traps?: RawCoCItem[];
  heroes?: RawCoCItem[];
  units?: RawCoCItem[];
  spells?: RawCoCItem[];
  siege_machines?: RawCoCItem[];
  pets?: RawCoCItem[];
  boosts?: RawCoCBoosts;
  helpers?: RawCoCItem[];
}

const STORAGE_KEY = 'coc_builder_potion_saved_v2';
const LEGACY_STORAGE_KEY = 'coc_builder_potion_saved_v1';
const ACCOUNTS_STORAGE_KEY = 'clash_planner_accounts_v1';
const SCHEDULED_ALERTS_STORAGE_KEY = 'clashPlanner_scheduledAlerts';
const TIMERS_COLLAPSED_STORAGE_KEY = 'clash_planner_timers_collapsed';

interface MonthlySectionStats {
  builderSecondsSaved: number;
  builderPotionsCount: number;
  labSecondsSaved: number;
  researchPotionsCount: number;
  petSecondsSaved: number;
  petPotionsCount: number;
}

function getCurrentYearMonthKey(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}_${mm}`;
}

function getCurrentMonthDateRangeLabel(now = new Date()): string {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return `${monthName} 1 - ${monthName} ${lastDay}`;
}

export interface VillageHistoryPotionStat {
  used: number;
  timeSavedMinutes: number;
}

export interface VillageHistoryUpgradeEntry {
  name: string;
  startLevel: number;
  currentLevel: number;
  completedDate?: string;
}

export interface VillageWallHistoryEntry {
  fromLevel: number;
  lvl: number;
  upgradedCount: number;
}

export interface VillageMonthlyHistory {
  potions: {
    builder: VillageHistoryPotionStat;
    research: VillageHistoryPotionStat;
    pet: VillageHistoryPotionStat;
    builderBite?: VillageHistoryPotionStat;
    studySoup?: VillageHistoryPotionStat;
  };
  upgrades: Record<string, VillageHistoryUpgradeEntry>;
  walls?: Record<string, VillageWallHistoryEntry>;
}

function createEmptyVillageMonthlyHistory(): VillageMonthlyHistory {
  return {
    potions: {
      builder: { used: 0, timeSavedMinutes: 0 },
      research: { used: 0, timeSavedMinutes: 0 },
      pet: { used: 0, timeSavedMinutes: 0 },
      builderBite: { used: 0, timeSavedMinutes: 0 },
      studySoup: { used: 0, timeSavedMinutes: 0 },
    },
    upgrades: {},
    walls: {},
  };
}

function getScopedVillageHistoryStorageKey(
  playerTag: string | undefined | null,
  yearMonthKey = getCurrentYearMonthKey()
): string | null {
  const cleanedTag = playerTag?.trim().toUpperCase();
  return cleanedTag ? `village_history_${yearMonthKey}_${cleanedTag}` : null;
}

function getVillageBaselineStorageKey(
  playerTag: string | undefined | null,
  yearMonthKey = getCurrentYearMonthKey()
): string | null {
  const cleanedTag = playerTag?.trim().toUpperCase();
  return cleanedTag ? `village_baseline_${yearMonthKey}_${cleanedTag}` : null;
}

function getVillageWallBaselineStorageKey(
  playerTag: string | undefined | null,
  yearMonthKey = getCurrentYearMonthKey()
): string | null {
  const cleanedTag = playerTag?.trim().toUpperCase();
  return cleanedTag ? `village_wall_baseline_${yearMonthKey}_${cleanedTag}` : null;
}

function hasVillageBaselineInStorage(
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): boolean {
  try {
    const baselineKey = getVillageBaselineStorageKey(playerTag, yearMonthKey);
    if (!baselineKey) return false;
    const raw = localStorage.getItem(baselineKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return (
      Boolean(parsed) &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed as Record<string, unknown>).length > 0
    );
  } catch {
    return false;
  }
}

function hasVillageMonthlyDataInStorage(
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): boolean {
  const cleanedTag = playerTag?.trim().toUpperCase();
  if (!cleanedTag) return false;

  if (hasVillageBaselineInStorage(cleanedTag, yearMonthKey)) {
    return true;
  }

  const legacyStats = loadMonthlyStatsForTag(cleanedTag, yearMonthKey);
  if (
    legacyStats.builderPotionsCount > 0 ||
    legacyStats.researchPotionsCount > 0 ||
    legacyStats.petPotionsCount > 0 ||
    legacyStats.builderSecondsSaved > 0 ||
    legacyStats.labSecondsSaved > 0 ||
    legacyStats.petSecondsSaved > 0
  ) {
    return true;
  }

  try {
    const scopedKey = getScopedVillageHistoryStorageKey(cleanedTag, yearMonthKey);
    if (!scopedKey) return false;
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return false;
    const parsed = normalizeVillageMonthlyHistory(JSON.parse(raw));
    const hasPotions =
      parsed.potions.builder.used > 0 ||
      parsed.potions.research.used > 0 ||
      parsed.potions.pet.used > 0 ||
      (parsed.potions.builderBite?.used ?? 0) > 0 ||
      (parsed.potions.studySoup?.used ?? 0) > 0 ||
      parsed.potions.builder.timeSavedMinutes > 0 ||
      parsed.potions.research.timeSavedMinutes > 0 ||
      parsed.potions.pet.timeSavedMinutes > 0 ||
      (parsed.potions.builderBite?.timeSavedMinutes ?? 0) > 0 ||
      (parsed.potions.studySoup?.timeSavedMinutes ?? 0) > 0;
    const hasUpgrades = Object.keys(parsed.upgrades).length > 0;
    const hasWalls = Boolean(parsed.walls && Object.keys(parsed.walls).length > 0);
    return hasPotions || hasUpgrades || hasWalls;
  } catch {
    return false;
  }
}

function normalizeVillageMonthlyHistory(raw: unknown): VillageMonthlyHistory {
  const fallback = createEmptyVillageMonthlyHistory();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;
  const rawPotions =
    obj.potions && typeof obj.potions === 'object' && !Array.isArray(obj.potions)
      ? (obj.potions as Record<string, unknown>)
      : {};

  const parsePotionStat = (val: unknown): VillageHistoryPotionStat => {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      return { used: 0, timeSavedMinutes: 0 };
    }
    const rec = val as Record<string, unknown>;
    return {
      used:
        typeof rec.used === 'number' && Number.isFinite(rec.used) && rec.used >= 0
          ? Math.floor(rec.used)
          : 0,
      timeSavedMinutes:
        typeof rec.timeSavedMinutes === 'number' &&
        Number.isFinite(rec.timeSavedMinutes) &&
        rec.timeSavedMinutes >= 0
          ? Math.floor(rec.timeSavedMinutes)
          : 0,
    };
  };

  const rawUpgrades =
    obj.upgrades && typeof obj.upgrades === 'object' && !Array.isArray(obj.upgrades)
      ? (obj.upgrades as Record<string, unknown>)
      : {};
  const upgrades: Record<string, VillageHistoryUpgradeEntry> = {};

  for (const [id, entryVal] of Object.entries(rawUpgrades)) {
    // Home Village Walls (1000010) are tracked exclusively via the Multi-Level Wall Diff Calculator
    if (id === '1000010') continue;
    if (!entryVal || typeof entryVal !== 'object' || Array.isArray(entryVal)) continue;
    const rec = entryVal as Record<string, unknown>;
    const startLevel =
      typeof rec.startLevel === 'number' && Number.isFinite(rec.startLevel)
        ? Math.floor(rec.startLevel)
        : 0;
    const currentLevel =
      typeof rec.currentLevel === 'number' && Number.isFinite(rec.currentLevel)
        ? Math.floor(rec.currentLevel)
        : 0;
    if (startLevel > 0 && currentLevel > startLevel) {
      upgrades[id] = {
        name:
          typeof rec.name === 'string' && rec.name.trim()
            ? rec.name.trim()
            : resolveUpgradeName(id, `Item ${id}`),
        startLevel,
        currentLevel,
        completedDate:
          typeof rec.completedDate === 'string' && rec.completedDate.trim()
            ? rec.completedDate.trim()
            : undefined,
      };
    }
  }

  const rawWalls =
    obj.walls && typeof obj.walls === 'object' && !Array.isArray(obj.walls)
      ? (obj.walls as Record<string, unknown>)
      : {};
  const walls: Record<string, VillageWallHistoryEntry> = {};
  for (const [lvlKey, wallVal] of Object.entries(rawWalls)) {
    if (!wallVal || typeof wallVal !== 'object' || Array.isArray(wallVal)) continue;
    const rec = wallVal as Record<string, unknown>;
    const lvl =
      typeof rec.lvl === 'number' && Number.isFinite(rec.lvl) ? Math.floor(rec.lvl) : 0;
    const fromLevel =
      typeof rec.fromLevel === 'number' && Number.isFinite(rec.fromLevel)
        ? Math.floor(rec.fromLevel)
        : Math.max(1, lvl - 1);
    const upgradedCount =
      typeof rec.upgradedCount === 'number' && Number.isFinite(rec.upgradedCount)
        ? Math.max(0, Math.floor(rec.upgradedCount))
        : 0;
    // Save ONLY positive calculated wall differences
    if (lvl > 1 && upgradedCount > 0) {
      walls[lvlKey] = { fromLevel, lvl, upgradedCount };
    }
  }

  return {
    potions: {
      builder: parsePotionStat(rawPotions.builder),
      research: parsePotionStat(rawPotions.research),
      pet: parsePotionStat(rawPotions.pet),
      builderBite: parsePotionStat(rawPotions.builderBite),
      studySoup: parsePotionStat(rawPotions.studySoup),
    },
    upgrades,
    walls,
  };
}

function saveVillageMonthlyHistory(
  history: VillageMonthlyHistory,
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): void {
  const scopedKey = getScopedVillageHistoryStorageKey(playerTag, yearMonthKey);
  if (!scopedKey) {
    return;
  }
  const payload = JSON.stringify({
    potions: history.potions,
    upgrades: history.upgrades,
    walls: history.walls || {},
  });
  try {
    // Remove any legacy un-scoped global key so data can never bleed across accounts
    localStorage.removeItem(`village_history_${yearMonthKey}`);
    // Save strictly to `village_history_${YYYY_MM}_${activePlayerTag}`
    localStorage.setItem(scopedKey, payload);
  } catch {
    // Ignore storage quota errors
  }
}

function loadVillageMonthlyHistory(
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): VillageMonthlyHistory {
  const cleanedTag = playerTag?.trim().toUpperCase();
  const scopedKey = getScopedVillageHistoryStorageKey(cleanedTag, yearMonthKey);
  if (!cleanedTag || !scopedKey) {
    return createEmptyVillageMonthlyHistory();
  }

  let history = createEmptyVillageMonthlyHistory();
  try {
    // Read strictly from `village_history_${YYYY_MM}_${activePlayerTag}` (never fall back to a global key)
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      history = normalizeVillageMonthlyHistory(JSON.parse(raw));
    }
  } catch {
    // Ignore parse errors
  }

  // Migrate/sync from the old app's strictly tag-isolated keys:
  // `clash_stats_${TAG}_${YYYY_MM}_{builders|lab|pethouse}`
  // Because `recordConfirmedPotionUsage` always updates `clash_stats_${TAG}_${YYYY_MM}_*`
  // and those keys were never touched by the global key bug, they hold the exact true
  // potion history for both old-app and new-UI sessions per playerTag.
  const legacyTagStats = loadMonthlyStatsForTag(cleanedTag, yearMonthKey);
  const legacyBuilderMins = Math.round(legacyTagStats.builderSecondsSaved / 60);
  const legacyResearchMins = Math.round(legacyTagStats.labSecondsSaved / 60);
  const legacyPetMins = Math.round(legacyTagStats.petSecondsSaved / 60);

  let mergedBuilderUsed = Math.max(
    history.potions.builder.used,
    legacyTagStats.builderPotionsCount
  );
  let mergedBuilderMins = Math.max(
    history.potions.builder.timeSavedMinutes,
    legacyBuilderMins
  );
  const mergedResearchUsed = Math.max(
    history.potions.research.used,
    legacyTagStats.researchPotionsCount
  );
  const mergedResearchMins = Math.max(
    history.potions.research.timeSavedMinutes,
    legacyResearchMins
  );
  const mergedPetUsed = Math.max(
    history.potions.pet.used,
    legacyTagStats.petPotionsCount
  );
  const mergedPetMins = Math.max(
    history.potions.pet.timeSavedMinutes,
    legacyPetMins
  );

  // One-time recovery & duplicate-import correction for DEATH DELEAR (#9PLPQVLU8) in 2026_11
  if (cleanedTag === '#9PLPQVLU8' && yearMonthKey === '2026_11') {
    const recoveryKey = 'clash_recovered_5_builder_potions_#9PLPQVLU8_2026_11';
    const dedupeFixKey = 'clash_fixed_duplicate_4_potions_#9PLPQVLU8_2026_11';
    try {
      if (!localStorage.getItem(recoveryKey)) {
        if (mergedBuilderUsed === 18) {
          mergedBuilderUsed += 5;
          // 5 Builder Potions across 7 active builders (6/6 + Goblin) = 5 * 7 * 9h = 315h = 18,900 mins
          mergedBuilderMins += 5 * 7 * 9 * 60;
        }
        localStorage.setItem(recoveryKey, '1');
      }
      if (!localStorage.getItem(dedupeFixKey)) {
        if (mergedBuilderUsed === 27) {
          // Remove the 4 duplicate potions added when re-importing the 3h 2m remaining boost
          mergedBuilderUsed = 23;
          mergedBuilderMins = Math.max(0, mergedBuilderMins - 4 * 7 * 9 * 60);
        }
        localStorage.setItem(dedupeFixKey, '1');
      }
    } catch {
      // Ignore storage errors
    }
  }

  history = {
    ...history,
    potions: {
      builder: {
        used: mergedBuilderUsed,
        timeSavedMinutes: mergedBuilderMins,
      },
      research: {
        used: mergedResearchUsed,
        timeSavedMinutes: mergedResearchMins,
      },
      pet: {
        used: mergedPetUsed,
        timeSavedMinutes: mergedPetMins,
      },
      builderBite: history.potions.builderBite || { used: 0, timeSavedMinutes: 0 },
      studySoup: history.potions.studySoup || { used: 0, timeSavedMinutes: 0 },
    },
  };

  // Keep per-tag section stats in sync with merged history so neither overwrites the other
  const syncedSectionStats: MonthlySectionStats = {
    builderPotionsCount: mergedBuilderUsed,
    builderSecondsSaved: mergedBuilderMins * 60,
    researchPotionsCount: mergedResearchUsed,
    labSecondsSaved: mergedResearchMins * 60,
    petPotionsCount: mergedPetUsed,
    petSecondsSaved: mergedPetMins * 60,
  };
  // If no baseline snapshot exists yet for this village & month, upgrades and walls must remain empty
  if (!hasVillageBaselineInStorage(cleanedTag, yearMonthKey)) {
    history = {
      ...history,
      upgrades: {},
      walls: {},
    };
  }

  // Only persist back if this is the active current month or if the month already has real data
  if (
    yearMonthKey === getCurrentYearMonthKey() ||
    hasVillageMonthlyDataInStorage(cleanedTag, yearMonthKey)
  ) {
    saveMonthlySectionStatsForTag(cleanedTag, 'builders', syncedSectionStats, yearMonthKey);
    saveMonthlySectionStatsForTag(cleanedTag, 'lab', syncedSectionStats, yearMonthKey);
    saveMonthlySectionStatsForTag(cleanedTag, 'pethouse', syncedSectionStats, yearMonthKey);
    saveVillageMonthlyHistory(history, cleanedTag, yearMonthKey);
  }
  return history;
}

function loadVillageBaselineLevels(
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): Record<string, number> | null {
  try {
    const baselineKey = getVillageBaselineStorageKey(playerTag, yearMonthKey);
    if (!baselineKey) return null;
    const raw = localStorage.getItem(baselineKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        result[k] = Math.floor(v);
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function saveVillageBaselineLevels(
  baseline: Record<string, number>,
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): void {
  const baselineKey = getVillageBaselineStorageKey(playerTag, yearMonthKey);
  if (!baselineKey) return;
  const payload = JSON.stringify(baseline);
  try {
    localStorage.removeItem(`village_baseline_${yearMonthKey}`);
    localStorage.setItem(baselineKey, payload);
  } catch {
    // Ignore storage quota errors
  }
}

function loadVillageWallCountsMap(storageKey: string | null): Record<string, number> | null {
  try {
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        result[k] = Math.floor(v);
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function loadVillageWallBaseline(
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): Record<string, number> | null {
  return loadVillageWallCountsMap(getVillageWallBaselineStorageKey(playerTag, yearMonthKey));
}

function saveVillageWallBaseline(
  wallCounts: Record<string, number>,
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): void {
  const key = getVillageWallBaselineStorageKey(playerTag, yearMonthKey);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(wallCounts));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Step 1 & 2 of Multi-Level Wall Diff Algorithm:
 * Extracts all wall objects (`data: 1000010`) from a village JSON (or saved wall map)
 * and maps them by level (`Map<Level, Count>`).
 * Example wall objects in `buildings`:
 * `[{"data":1000010, "lvl":17, "cnt":200}, {"data":1000010, "lvl":18, "cnt":125}]`
 */
function extractWallLevelMap(
  source: RawCoCVillage | Record<string, number> | null | undefined
): Map<number, number> {
  const wallMap = new Map<number, number>();
  if (!source || typeof source !== 'object') return wallMap;

  if ('buildings' in source && Array.isArray((source as RawCoCVillage).buildings)) {
    const buildings = (source as RawCoCVillage).buildings || [];
    for (const item of buildings) {
      if (!item) continue;
      const itemId = String(item.data ?? item.id ?? '').trim();
      if (itemId !== '1000010') continue;
      const lvl =
        typeof item.lvl === 'number' && Number.isFinite(item.lvl) ? Math.floor(item.lvl) : 0;
      const cnt =
        typeof item.cnt === 'number' && Number.isFinite(item.cnt) && item.cnt > 0
          ? Math.floor(item.cnt)
          : 1;
      if (lvl > 0 && cnt > 0) {
        wallMap.set(lvl, (wallMap.get(lvl) ?? 0) + cnt);
      }
    }
    return wallMap;
  }

  for (const [lvlStr, cntVal] of Object.entries(source as Record<string, unknown>)) {
    const lvl = Number(lvlStr);
    const cnt =
      typeof cntVal === 'number' && Number.isFinite(cntVal) ? Math.floor(cntVal) : 0;
    if (Number.isFinite(lvl) && lvl > 0 && cnt > 0) {
      wallMap.set(lvl, (wallMap.get(lvl) ?? 0) + cnt);
    }
  }
  return wallMap;
}

function wallLevelMapToRecord(wallMap: Map<number, number>): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [lvl, cnt] of wallMap.entries()) {
    if (lvl > 0 && cnt > 0) {
      record[String(lvl)] = cnt;
    }
  }
  return record;
}

/**
 * Multi-Level Wall Diff Calculator:
 * 1. Extract all wall objects (`data: 1000010`) from both Old and New JSON.
 * 2. Map them by level (`Map<Level, Count>`).
 * 3. Compare the counts for each level. If the New JSON count for a specific level
 *    is HIGHER than the Old JSON count, the positive difference is the number of
 *    walls upgraded TO that level.
 * 4. Save ONLY this calculated positive difference to the current month's history log.
 */
function calculateMultiLevelWallDiffs(
  oldWallsSource: RawCoCVillage | Record<string, number>,
  newWallsSource: RawCoCVillage | Record<string, number>,
  existingMonthWallLog: Record<string, VillageWallHistoryEntry> = {}
): Record<string, VillageWallHistoryEntry> {
  const oldWallMap = extractWallLevelMap(oldWallsSource);
  const newWallMap = extractWallLevelMap(newWallsSource);
  const nextWallLog: Record<string, VillageWallHistoryEntry> = {
    ...existingMonthWallLog,
  };

  for (const [lvl, newCount] of newWallMap.entries()) {
    if (lvl <= 1) continue;
    const oldCount = oldWallMap.get(lvl) ?? 0;
    if (newCount > oldCount) {
      const positiveDiff = newCount - oldCount;
      const lvlKey = String(lvl);
      const previouslyLogged = nextWallLog[lvlKey]?.upgradedCount ?? 0;
      nextWallLog[lvlKey] = {
        fromLevel: lvl - 1,
        lvl,
        upgradedCount: previouslyLogged + positiveDiff,
      };
    }
  }

  return nextWallLog;
}

/**
 * Extracts a snapshot map `{ [dataId]: currentLevel }` for all Buildings (excluding Walls),
 * Traps, Heroes, Pets, Spells, Units, Siege Machines, and Helpers in the imported village JSON.
 */
function extractVillageLevelsFromJson(parsedData: RawCoCVillage): Record<string, number> {
  const allItems: RawCoCItem[] = [
    ...(Array.isArray(parsedData.buildings) ? parsedData.buildings : []),
    ...(Array.isArray(parsedData.traps) ? parsedData.traps : []),
    ...(Array.isArray(parsedData.heroes) ? parsedData.heroes : []),
    ...(Array.isArray(parsedData.pets) ? parsedData.pets : []),
    ...(Array.isArray(parsedData.spells) ? parsedData.spells : []),
    ...(Array.isArray(parsedData.units) ? parsedData.units : []),
    ...(Array.isArray(parsedData.siege_machines) ? parsedData.siege_machines : []),
    ...(Array.isArray(parsedData.helpers) ? parsedData.helpers : []),
  ];

  const snapshotLevels: Record<string, number> = {};
  for (const rawItem of allItems) {
    if (!rawItem) continue;
    const itemId = String(rawItem.data ?? rawItem.id ?? '').trim();
    // Skip Home Village Walls (1000010); handled by Multi-Level Wall Diff Calculator
    if (!itemId || itemId === '1000010') continue;
    const itemLvl =
      typeof rawItem.lvl === 'number' && Number.isFinite(rawItem.lvl)
        ? Math.floor(rawItem.lvl)
        : 0;
    if (itemLvl <= 0) continue;
    if (snapshotLevels[itemId] === undefined || itemLvl > snapshotLevels[itemId]) {
      snapshotLevels[itemId] = itemLvl;
    }
  }
  return snapshotLevels;
}

/**
 * Handles the Monthly Baseline & History comparison on JSON import:
 * 1. Checks if `village_baseline_${YYYY_MM}_${PLAYER_TAG}` exists in localStorage.
 * 2. IF IT DOES NOT EXIST (First import of the month):
 *    - Saves all current JSON levels directly into `village_baseline_${YYYY_MM}_${PLAYER_TAG}`.
 *    - Saves the initial Wall `Map<Level, Count>` into `village_wall_baseline_${YYYY_MM}_${PLAYER_TAG}`.
 *    - Does NOT register any items as completed upgrades in `village_history` (`upgrades: {}, walls: {}`).
 * 3. IF THE BASELINE ALREADY EXISTS (Subsequent imports):
 *    - Compares newly imported JSON levels against `village_baseline_${YYYY_MM}_${PLAYER_TAG}`.
 *    - Runs the Multi-Level Wall Diff Calculator comparing the OLD saved wall map against
 *      the NEWly imported JSON wall map, saving ONLY positive differences to `history.walls`,
 *      and then updates the saved wall map to the newly imported JSON.
 */
function syncMonthlyBaselineAndHistoryOnImport(
  parsedData: RawCoCVillage,
  playerTag?: string | null,
  yearMonthKey = getCurrentYearMonthKey()
): VillageMonthlyHistory {
  const importedLevels = extractVillageLevelsFromJson(parsedData);
  const newWallRecord = wallLevelMapToRecord(extractWallLevelMap(parsedData));
  const existingBaseline = loadVillageBaselineLevels(playerTag, yearMonthKey);
  const oldWallRecord = loadVillageWallBaseline(playerTag, yearMonthKey);
  const currentHistory = loadVillageMonthlyHistory(playerTag, yearMonthKey);

  // 1. FIRST IMPORT OF THE MONTH (NO BASELINE EXISTS YET)
  if (!existingBaseline) {
    saveVillageBaselineLevels(importedLevels, playerTag, yearMonthKey);
    if (Object.keys(newWallRecord).length > 0) {
      saveVillageWallBaseline(newWallRecord, playerTag, yearMonthKey);
    }
    const initialHistory: VillageMonthlyHistory = {
      potions: {
        builder: { ...currentHistory.potions.builder },
        research: { ...currentHistory.potions.research },
        pet: { ...currentHistory.potions.pet },
        builderBite: { ...(currentHistory.potions.builderBite || { used: 0, timeSavedMinutes: 0 }) },
        studySoup: { ...(currentHistory.potions.studySoup || { used: 0, timeSavedMinutes: 0 }) },
      },
      upgrades: {}, // Strictly empty on first baseline snapshot import
      walls: {},
    };
    saveVillageMonthlyHistory(initialHistory, playerTag, yearMonthKey);
    return initialHistory;
  }

  // 2. SUBSEQUENT IMPORTS (BASELINE ALREADY EXISTS)
  const nextUpgrades: Record<string, VillageHistoryUpgradeEntry> = {
    ...currentHistory.upgrades,
  };
  delete nextUpgrades['1000010'];

  let baselineUpdatedWithNewUnlocks = false;
  const todayShortLabel = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  for (const [itemId, newLevel] of Object.entries(importedLevels)) {
    if (itemId === '1000010') continue;
    const baselineLevel = existingBaseline[itemId];

    if (typeof baselineLevel === 'number') {
      // Strictly greater than the baseline level -> log completed upgrade in village_history
      if (newLevel > baselineLevel) {
        nextUpgrades[itemId] = {
          name: resolveUpgradeName(itemId, `Item ${itemId}`),
          startLevel: baselineLevel,
          currentLevel: newLevel,
          completedDate:
            currentHistory.upgrades[itemId]?.completedDate || todayShortLabel,
        };
      }
    } else {
      // Newly unlocked/built item not present in initial snapshot -> add to baseline without false upgrade
      existingBaseline[itemId] = newLevel;
      baselineUpdatedWithNewUnlocks = true;
    }
  }

  if (baselineUpdatedWithNewUnlocks) {
    saveVillageBaselineLevels(existingBaseline, playerTag, yearMonthKey);
  }

  // Multi-Level Wall Diff Calculator: compare OLD saved wall map vs NEW imported wall map
  let nextWalls: Record<string, VillageWallHistoryEntry> = {
    ...(currentHistory.walls || {}),
  };
  if (Object.keys(newWallRecord).length > 0) {
    if (oldWallRecord) {
      nextWalls = calculateMultiLevelWallDiffs(oldWallRecord, parsedData, nextWalls);
    }
    // Update the saved wall snapshot so the next JSON import compares against this JSON
    saveVillageWallBaseline(newWallRecord, playerTag, yearMonthKey);
  }

  const updatedHistory: VillageMonthlyHistory = {
    potions: {
      builder: { ...currentHistory.potions.builder },
      research: { ...currentHistory.potions.research },
      pet: { ...currentHistory.potions.pet },
      builderBite: { ...(currentHistory.potions.builderBite || { used: 0, timeSavedMinutes: 0 }) },
      studySoup: { ...(currentHistory.potions.studySoup || { used: 0, timeSavedMinutes: 0 }) },
    },
    upgrades: nextUpgrades,
    walls: nextWalls,
  };

  saveVillageMonthlyHistory(updatedHistory, playerTag, yearMonthKey);
  return updatedHistory;
}

function getMonthlySectionStorageKey(
  playerTag: string,
  section: 'builders' | 'lab' | 'pethouse',
  yearMonthKey = getCurrentYearMonthKey()
): string {
  const normalizedTag = playerTag.trim().toUpperCase();
  return `clash_stats_${normalizedTag}_${yearMonthKey}_${section}`;
}

function loadMonthlyStatsForTag(
  playerTag: string | undefined | null,
  yearMonthKey = getCurrentYearMonthKey()
): MonthlySectionStats {
  const cleanedTag = playerTag?.trim();
  if (!cleanedTag) {
    return {
      builderSecondsSaved: 0,
      builderPotionsCount: 0,
      labSecondsSaved: 0,
      researchPotionsCount: 0,
      petSecondsSaved: 0,
      petPotionsCount: 0,
    };
  }

  const buildersKey = getMonthlySectionStorageKey(cleanedTag, 'builders', yearMonthKey);
  const labKey = getMonthlySectionStorageKey(cleanedTag, 'lab', yearMonthKey);
  const petKey = getMonthlySectionStorageKey(cleanedTag, 'pethouse', yearMonthKey);

  let builderSecondsSaved = 0;
  let builderPotionsCount = 0;
  let labSecondsSaved = 0;
  let researchPotionsCount = 0;
  let petSecondsSaved = 0;
  let petPotionsCount = 0;

  try {
    const rawBuilders = localStorage.getItem(buildersKey);
    if (!rawBuilders) {
      localStorage.setItem(
        buildersKey,
        JSON.stringify({ builderSecondsSaved: 0, builderPotionsCount: 0 })
      );
    } else {
      const parsedB = JSON.parse(rawBuilders) as Record<string, unknown>;
      builderSecondsSaved =
        typeof parsedB.builderSecondsSaved === 'number' && parsedB.builderSecondsSaved >= 0
          ? Math.floor(parsedB.builderSecondsSaved)
          : 0;
      builderPotionsCount =
        typeof parsedB.builderPotionsCount === 'number' && parsedB.builderPotionsCount >= 0
          ? Math.floor(parsedB.builderPotionsCount)
          : 0;
    }
  } catch {
    // Ignore storage error
  }

  try {
    const rawLab = localStorage.getItem(labKey);
    if (!rawLab) {
      localStorage.setItem(
        labKey,
        JSON.stringify({ labSecondsSaved: 0, researchPotionsCount: 0 })
      );
    } else {
      const parsedL = JSON.parse(rawLab) as Record<string, unknown>;
      labSecondsSaved =
        typeof parsedL.labSecondsSaved === 'number' && parsedL.labSecondsSaved >= 0
          ? Math.floor(parsedL.labSecondsSaved)
          : 0;
      researchPotionsCount =
        typeof parsedL.researchPotionsCount === 'number' && parsedL.researchPotionsCount >= 0
          ? Math.floor(parsedL.researchPotionsCount)
          : 0;
    }
  } catch {
    // Ignore storage error
  }

  try {
    const rawPet = localStorage.getItem(petKey);
    if (!rawPet) {
      localStorage.setItem(
        petKey,
        JSON.stringify({ petSecondsSaved: 0, petPotionsCount: 0 })
      );
    } else {
      const parsedP = JSON.parse(rawPet) as Record<string, unknown>;
      petSecondsSaved =
        typeof parsedP.petSecondsSaved === 'number' && parsedP.petSecondsSaved >= 0
          ? Math.floor(parsedP.petSecondsSaved)
          : 0;
      petPotionsCount =
        typeof parsedP.petPotionsCount === 'number' && parsedP.petPotionsCount >= 0
          ? Math.floor(parsedP.petPotionsCount)
          : 0;
    }
  } catch {
    // Ignore storage error
  }

  return {
    builderSecondsSaved,
    builderPotionsCount,
    labSecondsSaved,
    researchPotionsCount,
    petSecondsSaved,
    petPotionsCount,
  };
}

function saveMonthlySectionStatsForTag(
  playerTag: string | undefined | null,
  section: 'builders' | 'lab' | 'pethouse',
  stats: MonthlySectionStats,
  yearMonthKey = getCurrentYearMonthKey()
): void {
  const cleanedTag = playerTag?.trim();
  if (!cleanedTag) return;
  const key = getMonthlySectionStorageKey(cleanedTag, section, yearMonthKey);
  try {
    if (section === 'builders') {
      localStorage.setItem(
        key,
        JSON.stringify({
          builderSecondsSaved: Math.max(0, Math.floor(stats.builderSecondsSaved)),
          builderPotionsCount: Math.max(0, Math.floor(stats.builderPotionsCount)),
        })
      );
    } else if (section === 'lab') {
      localStorage.setItem(
        key,
        JSON.stringify({
          labSecondsSaved: Math.max(0, Math.floor(stats.labSecondsSaved)),
          researchPotionsCount: Math.max(0, Math.floor(stats.researchPotionsCount)),
        })
      );
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          petSecondsSaved: Math.max(0, Math.floor(stats.petSecondsSaved)),
          petPotionsCount: Math.max(0, Math.floor(stats.petPotionsCount)),
        })
      );
    }
  } catch {
    // Ignore storage quota errors
  }
}

function formatCumulativeModalTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.round(clamped / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  return `${days}d ${hours}h ${mins}m`;
}

interface BoostImportTrackEntry {
  rawBoostSeconds: number;
  jsonTimestamp: number | null;
  startTimestamp: number;
  expiryTimestamp: number;
  creditedPotions: number;
}

interface LastImportedBoostState {
  builder?: BoostImportTrackEntry;
  lab?: BoostImportTrackEntry;
  pet?: BoostImportTrackEntry;
  builderBite?: BoostImportTrackEntry;
  studySoup?: BoostImportTrackEntry;
}

function getLastImportedBoostStorageKey(playerTag: string): string {
  const normalizedTag = playerTag.trim().toUpperCase();
  return `lastImportedBoostState_${normalizedTag}`;
}

function loadLastImportedBoostState(playerTag: string | undefined | null): LastImportedBoostState {
  const cleanedTag = playerTag?.trim();
  if (!cleanedTag) return {};
  try {
    const raw = localStorage.getItem(getLastImportedBoostStorageKey(cleanedTag));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastImportedBoostState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastImportedBoostState(
  playerTag: string | undefined | null,
  state: LastImportedBoostState
): void {
  const cleanedTag = playerTag?.trim();
  if (!cleanedTag) return;
  try {
    localStorage.setItem(getLastImportedBoostStorageKey(cleanedTag), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function updateManualBoostTrackSlot(
  playerTag: string | undefined | null,
  slot: 'builder' | 'lab' | 'pet',
  totalBoostSeconds: number,
  nextBoostEndTime: number | null,
  addedPotions: number
): void {
  const cleanedTag = playerTag?.trim();
  if (!cleanedTag) return;
  const current = loadLastImportedBoostState(cleanedTag);
  if (!nextBoostEndTime || totalBoostSeconds <= 0) {
    const nextState: LastImportedBoostState = { ...current };
    delete nextState[slot];
    saveLastImportedBoostState(cleanedTag, nextState);
    return;
  }
  const prevSlot = current[slot];
  const now = Date.now();
  const prevActivePotions =
    prevSlot && prevSlot.expiryTimestamp > now ? prevSlot.creditedPotions : 0;
  const totalPotions = Math.max(
    Math.ceil(totalBoostSeconds / 3600),
    prevActivePotions + Math.max(0, addedPotions)
  );
  saveLastImportedBoostState(cleanedTag, {
    ...current,
    [slot]: {
      rawBoostSeconds: Math.floor(totalBoostSeconds),
      jsonTimestamp: null,
      startTimestamp: prevSlot && prevSlot.expiryTimestamp > now ? prevSlot.startTimestamp : now,
      expiryTimestamp: nextBoostEndTime,
      creditedPotions: totalPotions,
    },
  });
}

function computeNewlyCreditedBoostPotions(
  boostRemainingSeconds: number,
  prevEntry: BoostImportTrackEntry | undefined,
  importNow: number,
  jsonTimestamp: number | null
): { potionsToCredit: number; nextEntry: BoostImportTrackEntry | undefined } {
  if (boostRemainingSeconds <= 0) {
    return { potionsToCredit: 0, nextEntry: undefined };
  }

  const totalPotionsInJson = Math.ceil(boostRemainingSeconds / 3600);
  const newExpiryTimestamp = importNow + boostRemainingSeconds * 1000;

  // Brand-new active boost session (no previous active session, or previous session already expired)
  if (!prevEntry || importNow >= prevEntry.expiryTimestamp) {
    return {
      potionsToCredit: totalPotionsInJson,
      nextEntry: {
        rawBoostSeconds: boostRemainingSeconds,
        jsonTimestamp,
        startTimestamp: importNow,
        expiryTimestamp: newExpiryTimestamp,
        creditedPotions: totalPotionsInJson,
      },
    };
  }

  // Previous boost session is still active.
  // Guard 1: Exact same JSON re-imported (identical remaining boost seconds or same/older JSON export timestamp)
  if (
    prevEntry.rawBoostSeconds === boostRemainingSeconds ||
    (jsonTimestamp !== null &&
      prevEntry.jsonTimestamp !== null &&
      jsonTimestamp <= prevEntry.jsonTimestamp)
  ) {
    return {
      potionsToCredit: 0,
      nextEntry: prevEntry,
    };
  }

  // Guard 2: Subsequent export from the same active boost session (remaining time ticked down or expiry unchanged)
  const wallClockRemSec = Math.max(
    0,
    Math.floor((prevEntry.expiryTimestamp - importNow) / 1000)
  );
  const jsonTsRemSec =
    jsonTimestamp !== null &&
    prevEntry.jsonTimestamp !== null &&
    jsonTimestamp >= prevEntry.jsonTimestamp
      ? Math.max(0, prevEntry.rawBoostSeconds - (jsonTimestamp - prevEntry.jsonTimestamp))
      : 0;
  const prevRemainingSecAtImport = Math.max(wallClockRemSec, jsonTsRemSec);
  const prevRemainingPotionsAtImport = Math.ceil(prevRemainingSecAtImport / 3600);

  // Each potion adds a full 3600s (1 hour). Unless remaining boost increased by >1800s (30m)
  // above the ongoing session's expected remaining time, it is the same active boost ticking down.
  if (
    boostRemainingSeconds <= prevRemainingSecAtImport + 1800 ||
    totalPotionsInJson <= prevRemainingPotionsAtImport
  ) {
    return {
      potionsToCredit: 0,
      nextEntry: {
        rawBoostSeconds: boostRemainingSeconds,
        jsonTimestamp: jsonTimestamp ?? prevEntry.jsonTimestamp,
        startTimestamp: prevEntry.startTimestamp,
        expiryTimestamp: newExpiryTimestamp,
        creditedPotions: prevEntry.creditedPotions,
      },
    };
  }

  // Newly stacked potion increments added to the ongoing active boost session
  const newlyAddedPotions = Math.max(
    0,
    Math.round((boostRemainingSeconds - prevRemainingSecAtImport) / 3600)
  );
  return {
    potionsToCredit: newlyAddedPotions,
    nextEntry: {
      rawBoostSeconds: boostRemainingSeconds,
      jsonTimestamp: jsonTimestamp ?? prevEntry.jsonTimestamp,
      startTimestamp: prevEntry.startTimestamp,
      expiryTimestamp: newExpiryTimestamp,
      creditedPotions: prevEntry.creditedPotions + newlyAddedPotions,
    },
  };
}

type ScheduledAlertsMap = Record<string, number[]>;

function loadScheduledAlertsMap(): ScheduledAlertsMap {
  try {
    const raw = localStorage.getItem(SCHEDULED_ALERTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ScheduledAlertsMap;
  } catch {
    return {};
  }
}

function saveScheduledAlertsMap(map: ScheduledAlertsMap): void {
  try {
    localStorage.setItem(SCHEDULED_ALERTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function trackVillageNotificationId(villageId: string, notificationId: number): void {
  const map = loadScheduledAlertsMap();
  const list = Array.isArray(map[villageId]) ? map[villageId] : [];
  if (!list.includes(notificationId)) {
    map[villageId] = [...list, notificationId];
    saveScheduledAlertsMap(map);
  }
}

function untrackVillageNotificationId(villageId: string, notificationId: number): void {
  const map = loadScheduledAlertsMap();
  if (!Array.isArray(map[villageId])) return;
  map[villageId] = map[villageId].filter((id) => id !== notificationId);
  saveScheduledAlertsMap(map);
}

/**
 * Generates a deterministic positive 31-bit integer notification ID from villageId and slotKey
 * to prevent notification collisions across multiple village profiles and upgrade slots.
 */
export function getSlotNotificationId(villageId: string, slotKey: string): number {
  const combined = `${villageId}::${slotKey}`;
  let hash = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2147480000) + 1000;
}

let defaultChannelCreated = false;

export async function ensureDefaultNotificationChannel(): Promise<void> {
  if (defaultChannelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'Upgrade Reminders',
      description: 'Clash of Clans builder, laboratory, pet house, and helper completion alerts',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'default',
    });
    defaultChannelCreated = true;
  } catch {
    // Ignore errors in web preview environments where native plugin is unavailable
  }
}

export async function requestNotificationPermissions(): Promise<void> {
  try {
    await LocalNotifications.requestPermissions();
  } catch {
    // Ignore errors in web preview environments where native plugin is unavailable
  }
  await ensureDefaultNotificationChannel();
}

async function cancelSlotNotification(villageId: string, slotKey: string): Promise<void> {
  const notificationId = getSlotNotificationId(villageId, slotKey);
  untrackVillageNotificationId(villageId, notificationId);
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // Ignore errors in non-native environments
  }
}

async function scheduleExactSlotNotification(params: {
  villageId: string;
  slotKey: string;
  title: string;
  body: string;
  targetTimestamp: number | null | undefined;
}): Promise<void> {
  const { villageId, slotKey, title, body, targetTimestamp } = params;
  const uniqueNumericId = Math.abs(Math.trunc(getSlotNotificationId(villageId, slotKey))) || 1001;

  // Always clear any previously scheduled notification for this specific slot first
  try {
    await LocalNotifications.cancel({ notifications: [{ id: uniqueNumericId }] });
  } catch {
    // Ignore errors in non-native environments
  }

  const finishEpochMs = typeof targetTimestamp === 'number' ? Math.trunc(targetTimestamp) : 0;
  if (!finishEpochMs || finishEpochMs <= Date.now() + 1000) {
    untrackVillageNotificationId(villageId, uniqueNumericId);
    return;
  }

  await ensureDefaultNotificationChannel();
  trackVillageNotificationId(villageId, uniqueNumericId);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: uniqueNumericId,
          title,
          body,
          schedule: {
            at: new Date(finishEpochMs),
            allowWhileIdle: true,
          },
          channelId: 'default',
          sound: 'default',
        },
      ],
    });
  } catch {
    // Ignore errors in non-native environments
  }
}

async function scheduleBuilderNotificationsForVillage(
  villageId: string,
  villageName: string,
  results: LockedResultItem[]
): Promise<void> {
  const activeIndices = new Set(results.map((r) => r.builderIndex));

  // Cancel any inactive builder slots (0..6)
  for (let idx = 0; idx < 7; idx++) {
    if (!activeIndices.has(idx)) {
      await cancelSlotNotification(villageId, `builder_${idx}`);
    }
  }

  // Schedule active builder slots using target upgraded level (currentLvl + 1)
  for (const item of results) {
    const buildingName = item.upgradeTitle || `Builder ${item.builderIndex + 1} Upgrade`;
    const currentLvl = typeof item.upgradeLevel === 'number' ? item.upgradeLevel : 0;
    const targetLvl = currentLvl + 1;
    await scheduleExactSlotNotification({
      villageId,
      slotKey: `builder_${item.builderIndex}`,
      title: `🔨 Builder Alert • ${villageName}`,
      body: `${villageName}: ${buildingName} (LVL ${targetLvl}) upgrade completed! Builder is now free.`,
      targetTimestamp: item.targetTimestamp,
    });
  }
}

async function scheduleLabNotificationsForVillage(
  villageId: string,
  villageName: string,
  mainTimer: BuilderTime,
  mainTargetTs: number | null,
  goblinTimer: BuilderTime,
  goblinTargetTs: number | null
): Promise<void> {
  if (mainTargetTs && getTimerTotalSeconds(mainTimer) > 0) {
    const troopSpellName = resolveUpgradeName(
      mainTimer.rawId,
      mainTimer.upgradeTitle || 'Troop / Spell Upgrade'
    );
    const targetLvl =
      typeof mainTimer.upgradeLevel === 'number' ? mainTimer.upgradeLevel + 1 : 1;
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'lab_main',
      title: `⚗️ Laboratory Alert • ${villageName}`,
      body: `${villageName}: ${troopSpellName} (LVL ${targetLvl}) research finished!`,
      targetTimestamp: mainTargetTs,
    });
  } else {
    await cancelSlotNotification(villageId, 'lab_main');
  }

  if (goblinTargetTs && getTimerTotalSeconds(goblinTimer) > 0) {
    const goblinTroopSpellName = resolveUpgradeName(
      goblinTimer.rawId,
      goblinTimer.upgradeTitle || 'Goblin Researcher'
    );
    const goblinTargetLvl =
      typeof goblinTimer.upgradeLevel === 'number' ? goblinTimer.upgradeLevel + 1 : 1;
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'lab_goblin',
      title: `⚗️ Laboratory Alert • ${villageName}`,
      body: `${villageName}: ${goblinTroopSpellName} (LVL ${goblinTargetLvl}) research finished!`,
      targetTimestamp: goblinTargetTs,
    });
  } else {
    await cancelSlotNotification(villageId, 'lab_goblin');
  }
}

async function schedulePetNotificationForVillage(
  villageId: string,
  villageName: string,
  petTimerVal: BuilderTime,
  targetPetFinishTimestamp: number | null
): Promise<void> {
  if (targetPetFinishTimestamp && getTimerTotalSeconds(petTimerVal) > 0) {
    const petName = resolveUpgradeName(
      petTimerVal.rawId,
      petTimerVal.upgradeTitle || 'Active Pet Upgrade'
    );
    const targetPetLvl =
      typeof petTimerVal.upgradeLevel === 'number' ? petTimerVal.upgradeLevel + 1 : 1;
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'pet_main',
      title: `🐾 Pet House Alert • ${villageName}`,
      body: `${villageName}: ${petName} (LVL ${targetPetLvl}) upgrade is complete! Pet is ready for battle.`,
      targetTimestamp: targetPetFinishTimestamp,
    });
  } else {
    await cancelSlotNotification(villageId, 'pet_main');
  }
}

async function scheduleBoostExpiryNotificationsForVillage(
  villageId: string,
  villageName: string,
  builderBoostEndTime: number | null | undefined,
  labBoostEndTime: number | null | undefined,
  petBoostEndTime: number | null | undefined
): Promise<void> {
  if (builderBoostEndTime && builderBoostEndTime > Date.now() + 1000) {
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'boost_builder',
      title: `⚡ Builder Boost Expired • ${villageName}`,
      body: `${villageName}: Builder Potion boost has ended! Upgrades are back to normal speed.`,
      targetTimestamp: builderBoostEndTime,
    });
  } else {
    await cancelSlotNotification(villageId, 'boost_builder');
  }

  if (labBoostEndTime && labBoostEndTime > Date.now() + 1000) {
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'boost_lab',
      title: `⚡ Lab Boost Expired • ${villageName}`,
      body: `${villageName}: Research Potion boost has ended!`,
      targetTimestamp: labBoostEndTime,
    });
  } else {
    await cancelSlotNotification(villageId, 'boost_lab');
  }

  if (petBoostEndTime && petBoostEndTime > Date.now() + 1000) {
    await scheduleExactSlotNotification({
      villageId,
      slotKey: 'boost_pet',
      title: `⚡ Pet Boost Expired • ${villageName}`,
      body: `${villageName}: Pet Potion boost has ended!`,
      targetTimestamp: petBoostEndTime,
    });
  } else {
    await cancelSlotNotification(villageId, 'boost_pet');
  }
}

async function cancelAllNotificationsForVillage(villageId: string): Promise<void> {
  const map = loadScheduledAlertsMap();
  const storedIds = Array.isArray(map[villageId]) ? map[villageId] : [];
  const deterministicSlotIds = [
    getSlotNotificationId(villageId, 'builder_0'),
    getSlotNotificationId(villageId, 'builder_1'),
    getSlotNotificationId(villageId, 'builder_2'),
    getSlotNotificationId(villageId, 'builder_3'),
    getSlotNotificationId(villageId, 'builder_4'),
    getSlotNotificationId(villageId, 'builder_5'),
    getSlotNotificationId(villageId, 'builder_6'),
    getSlotNotificationId(villageId, 'lab_main'),
    getSlotNotificationId(villageId, 'lab_goblin'),
    getSlotNotificationId(villageId, 'pet_main'),
    getSlotNotificationId(villageId, 'boost_builder'),
    getSlotNotificationId(villageId, 'boost_lab'),
    getSlotNotificationId(villageId, 'boost_pet'),
    getSlotNotificationId(villageId, 'helper_builder'),
    getSlotNotificationId(villageId, 'helper_lab'),
  ];

  const uniqueIds = Array.from(new Set([...storedIds, ...deterministicSlotIds]));
  delete map[villageId];
  saveScheduledAlertsMap(map);

  if (uniqueIds.length > 0) {
    try {
      await LocalNotifications.cancel({
        notifications: uniqueIds.map((id) => ({ id })),
      });
    } catch {
      // Ignore errors in non-native environments
    }
  }
}

export function getHelperAvailableNotificationTimestamp(params: {
  helper:
    | {
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null
    | undefined;
  assignedUpgradeFinishTimestamp: number | null | undefined;
  now?: number;
}): number | null {
  const { helper, assignedUpgradeFinishTimestamp, now = Date.now() } = params;
  if (!helper || !helper.cooldownEndTime || helper.cooldownEndTime <= now + 1000) {
    return null;
  }

  // If the helper is assigned until the upgrade finishes (recurrent !== false)
  // and the assigned upgrade is still running when cooldown ends, do NOT send a daily notification.
  const isAssignedRecurrent =
    helper.assignedSlot !== null &&
    helper.assignedSlot !== undefined &&
    helper.recurrent !== false;

  if (
    isAssignedRecurrent &&
    typeof assignedUpgradeFinishTimestamp === 'number' &&
    assignedUpgradeFinishTimestamp > now
  ) {
    if (helper.cooldownEndTime > assignedUpgradeFinishTimestamp) {
      return helper.cooldownEndTime;
    }
    return null;
  }

  // Helper is not assigned to an active upgrade (or not recurrent) -> notify when cooldown ends
  return helper.cooldownEndTime;
}

async function scheduleAllVillageNotificationsSinglePass(params: {
  villageId: string;
  villageName: string;
  builderResults: LockedResultItem[];
  labMainTimer: BuilderTime;
  labMainTargetTs: number | null;
  labGoblinTimer: BuilderTime;
  labGoblinTargetTs: number | null;
  petTimerVal: BuilderTime;
  petTargetTs: number | null;
  builderBoostEndTime: number | null;
  labBoostEndTime: number | null;
  petBoostEndTime: number | null;
  builderHelperCooldownEndTime?: number | null;
  labHelperCooldownEndTime?: number | null;
}): Promise<void> {
  const {
    villageId,
    villageName,
    builderResults,
    labMainTimer,
    labMainTargetTs,
    labGoblinTimer,
    labGoblinTargetTs,
    petTimerVal,
    petTargetTs,
    builderBoostEndTime,
    labBoostEndTime,
    petBoostEndTime,
    builderHelperCooldownEndTime,
    labHelperCooldownEndTime,
  } = params;

  // 1. Cancel pending alarms once when a new JSON file is imported
  await cancelAllNotificationsForVillage(villageId);
  await ensureDefaultNotificationChannel();

  const now = Date.now();
  const notificationsToSchedule: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: boolean };
    channelId: string;
    sound: string;
  }> = [];

  const addExactAlarm = (slotKey: string, title: string, body: string, finishEpochMs: number | null | undefined) => {
    const epochMs = typeof finishEpochMs === 'number' ? Math.trunc(finishEpochMs) : 0;
    if (!epochMs || epochMs <= now + 1000) return;
    const uniqueNumericId = Math.abs(Math.trunc(getSlotNotificationId(villageId, slotKey))) || 1001;
    trackVillageNotificationId(villageId, uniqueNumericId);
    notificationsToSchedule.push({
      id: uniqueNumericId,
      title,
      body,
      schedule: {
        at: new Date(epochMs),
        allowWhileIdle: true,
      },
      channelId: 'default',
      sound: 'default',
    });
  };

  for (const item of builderResults) {
    const buildingName = item.upgradeTitle || `Builder ${item.builderIndex + 1} Upgrade`;
    const currentLvl = typeof item.upgradeLevel === 'number' ? item.upgradeLevel : 0;
    const targetLvl = currentLvl + 1;
    addExactAlarm(
      `builder_${item.builderIndex}`,
      `🔨 Builder Alert • ${villageName}`,
      `${villageName}: ${buildingName} (LVL ${targetLvl}) upgrade completed! Builder is now free.`,
      item.targetTimestamp
    );
  }

  if (labMainTargetTs && getTimerTotalSeconds(labMainTimer) > 0) {
    const troopSpellName = resolveUpgradeName(
      labMainTimer.rawId,
      labMainTimer.upgradeTitle || 'Troop / Spell Upgrade'
    );
    const targetLvl =
      typeof labMainTimer.upgradeLevel === 'number' ? labMainTimer.upgradeLevel + 1 : 1;
    addExactAlarm(
      'lab_main',
      `⚗️ Laboratory Alert • ${villageName}`,
      `${villageName}: ${troopSpellName} (LVL ${targetLvl}) research finished!`,
      labMainTargetTs
    );
  }

  if (labGoblinTargetTs && getTimerTotalSeconds(labGoblinTimer) > 0) {
    const goblinTroopSpellName = resolveUpgradeName(
      labGoblinTimer.rawId,
      labGoblinTimer.upgradeTitle || 'Goblin Researcher'
    );
    const goblinTargetLvl =
      typeof goblinTimerLvlSafe(labGoblinTimer) === 'number'
        ? (goblinTimerLvlSafe(labGoblinTimer) as number) + 1
        : 1;
    addExactAlarm(
      'lab_goblin',
      `⚗️ Laboratory Alert • ${villageName}`,
      `${villageName}: ${goblinTroopSpellName} (LVL ${goblinTargetLvl}) research finished!`,
      labGoblinTargetTs
    );
  }

  if (petTargetTs && getTimerTotalSeconds(petTimerVal) > 0) {
    const petName = resolveUpgradeName(
      petTimerVal.rawId,
      petTimerVal.upgradeTitle || 'Active Pet Upgrade'
    );
    const targetPetLvl =
      typeof petTimerVal.upgradeLevel === 'number' ? petTimerVal.upgradeLevel + 1 : 1;
    addExactAlarm(
      'pet_main',
      `🐾 Pet House Alert • ${villageName}`,
      `${villageName}: ${petName} (LVL ${targetPetLvl}) upgrade is complete! Pet is ready for battle.`,
      petTargetTs
    );
  }

  if (builderBoostEndTime && builderBoostEndTime > now + 1000) {
    addExactAlarm(
      'boost_builder',
      `⚡ Builder Boost Expired • ${villageName}`,
      `${villageName}: Builder Potion boost has ended! Upgrades are back to normal speed.`,
      builderBoostEndTime
    );
  }

  if (labBoostEndTime && labBoostEndTime > now + 1000) {
    addExactAlarm(
      'boost_lab',
      `⚡ Lab Boost Expired • ${villageName}`,
      `${villageName}: Research Potion boost has ended!`,
      labBoostEndTime
    );
  }

  if (petBoostEndTime && petBoostEndTime > now + 1000) {
    addExactAlarm(
      'boost_pet',
      `⚡ Pet Boost Expired • ${villageName}`,
      `${villageName}: Pet Potion boost has ended!`,
      petBoostEndTime
    );
  }

  if (builderHelperCooldownEndTime && builderHelperCooldownEndTime > now + 1000) {
    addExactAlarm(
      'helper_builder',
      `👷 Builder Helper Available • ${villageName}`,
      `${villageName}: Builder's Apprentice cooldown has ended and is ready to assign!`,
      builderHelperCooldownEndTime
    );
  }

  if (labHelperCooldownEndTime && labHelperCooldownEndTime > now + 1000) {
    addExactAlarm(
      'helper_lab',
      `🔬 Lab Helper Available • ${villageName}`,
      `${villageName}: Lab Apprentice cooldown has ended and is ready to assign!`,
      labHelperCooldownEndTime
    );
  }

  if (notificationsToSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    } catch {
      // Ignore errors in non-native environments
    }
  }
}

function goblinTimerLvlSafe(t: BuilderTime): number | undefined {
  return typeof t.upgradeLevel === 'number' ? t.upgradeLevel : undefined;
}

function createEmptyTimer(): BuilderTime {
  return {
    d: '',
    h: '',
    m: '',
    s: 0,
    upgradeTitle: undefined,
    upgradeLevel: undefined,
    rawId: undefined,
  };
}

function createEmptyBuilders(): BuilderTime[] {
  return Array.from({ length: 7 }, () => createEmptyTimer());
}

function createDefaultBuilderApprentice(): BuilderApprenticeState {
  return {
    id: 93000000,
    level: 8,
    assignedSlot: null,
    activeSessionEndTime: null,
    cooldownEndTime: null,
    recurrent: false,
  };
}

function createDefaultLabApprentice(): LabApprenticeState {
  return {
    id: 93000001,
    level: 8,
    assignedSlot: null,
    activeSessionEndTime: null,
    cooldownEndTime: null,
    recurrent: false,
  };
}

function createDefaultSavedState(): SavedState {
  return {
    mode: 'single',
    numBuilders: 2,
    builders: createEmptyBuilders(),
    potions: '0',
    lockedResults: [],
    lockedSavedText: '',
    researchPotions: 0,
    labTimer: createEmptyTimer(),
    goblinLabTimer: createEmptyTimer(),
    targetLabTimestamp: null,
    labFormattedDate: '',
    labSavedText: '',
    targetGoblinLabTimestamp: null,
    goblinLabFormattedDate: '',
    petPotions: 0,
    petTimer: createEmptyTimer(),
    targetPetTimestamp: null,
    petFormattedDate: '',
    petSavedText: '',
    builderBoostEndTime: null,
    labBoostEndTime: null,
    petBoostEndTime: null,
    builderBiteEndTime: null,
    studySoupEndTime: null,
    builderApprentice: createDefaultBuilderApprentice(),
    labApprentice: createDefaultLabApprentice(),
  };
}

export function triggerHaptic(pattern: number | number[] = 15) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore vibration errors on unsupported devices
  }
}

export function resolveUpgradeName(
  rawData: number | string | undefined,
  fallback = 'Defense Upgrade'
): string {
  if (rawData === undefined || rawData === null) {
    return fallback;
  }
  const strKey = String(rawData).trim();
  const numKey = Number(strKey);
  const upgradeName =
    COC_NAMES[rawData] ||
    COC_NAMES[numKey] ||
    COC_NAMES[strKey] ||
    fallback;
  return upgradeName;
}

function normalizeSingleTimer(
  savedB: Partial<BuilderTime> | undefined,
  fallbackLabel?: string
): BuilderTime {
  if (!savedB || typeof savedB !== 'object') return createEmptyTimer();
  const rawId =
    savedB.rawId !== undefined && savedB.rawId !== null ? String(savedB.rawId) : undefined;
  const resolved = rawId ? resolveUpgradeName(rawId, fallbackLabel || '') : undefined;
  return {
    d: savedB.d ?? '',
    h: savedB.h ?? '',
    m: savedB.m ?? '',
    s: savedB.s ?? 0,
    upgradeTitle: resolved || savedB.upgradeTitle,
    upgradeLevel: typeof savedB.upgradeLevel === 'number' ? savedB.upgradeLevel : undefined,
    rawId,
  };
}

function normalizeSavedState(
  parsed: (Partial<SavedState> & {
    builders?: Array<BuilderTime & { customLabel?: string }>;
    lockedResults?: Array<LockedResultItem & { builderLabel?: string }>;
    builderApprentice?: Partial<BuilderApprenticeState> & { activeBoostEndTime?: number | null };
    labApprentice?: Partial<LabApprenticeState> & { activeBoostEndTime?: number | null };
  }) | null | undefined
): SavedState {
  if (!parsed || typeof parsed !== 'object') {
    return createDefaultSavedState();
  }

  const builders = Array.from({ length: 7 }, (_, idx) => {
    const savedB = parsed.builders?.[idx];
    const rawId =
      savedB?.rawId !== undefined && savedB?.rawId !== null
        ? String(savedB.rawId)
        : undefined;
    const reResolvedTitle = rawId ? resolveUpgradeName(rawId) : undefined;
    return {
      d: savedB?.d ?? '',
      h: savedB?.h ?? '',
      m: savedB?.m ?? '',
      s: savedB?.s ?? 0,
      upgradeTitle:
        reResolvedTitle && reResolvedTitle !== 'Defense Upgrade'
          ? reResolvedTitle
          : savedB?.upgradeTitle ?? savedB?.customLabel,
      upgradeLevel: typeof savedB?.upgradeLevel === 'number' ? savedB.upgradeLevel : undefined,
      rawId,
    };
  });

  const normalizedResults: LockedResultItem[] = Array.isArray(parsed.lockedResults)
    ? parsed.lockedResults.map((item, idx) => {
        const bIdx = typeof item.builderIndex === 'number' ? item.builderIndex : idx;
        const isGoblin = !!item.isGoblin || bIdx === 6;
        const rawId =
          item.rawId !== undefined && item.rawId !== null
            ? String(item.rawId)
            : builders[bIdx]?.rawId;
        const reResolvedTitle = rawId ? resolveUpgradeName(rawId) : undefined;
        return {
          builderIndex: bIdx,
          slotBadge: item.slotBadge || (isGoblin ? '[GOBLIN]' : `[B${bIdx + 1}]`),
          upgradeTitle:
            reResolvedTitle && reResolvedTitle !== 'Defense Upgrade'
              ? reResolvedTitle
              : item.upgradeTitle ||
                (item as LockedResultItem & { builderLabel?: string }).builderLabel ||
                (isGoblin ? 'Goblin Builder' : `Builder ${bIdx + 1}`),
          upgradeLevel: typeof item.upgradeLevel === 'number' ? item.upgradeLevel : undefined,
          rawId,
          isGoblin,
          targetTimestamp: item.targetTimestamp,
          formattedDate: item.formattedDate,
        };
      })
    : [];

  return {
    mode:
      parsed.mode === 'multi'
        ? 'multi'
        : parsed.mode === 'helpers'
        ? 'helpers'
        : 'single',
    numBuilders:
      typeof parsed.numBuilders === 'number' && parsed.numBuilders >= 1 && parsed.numBuilders <= 7
        ? parsed.numBuilders
        : 2,
    builders,
    potions: '0',
    lockedResults: normalizedResults,
    lockedSavedText: typeof parsed.lockedSavedText === 'string' ? parsed.lockedSavedText : '',
    researchPotions: 0,
    labTimer: normalizeSingleTimer(parsed.labTimer, 'Troop / Spell Upgrade'),
    goblinLabTimer: normalizeSingleTimer(parsed.goblinLabTimer, 'Goblin Researcher'),
    targetLabTimestamp:
      typeof parsed.targetLabTimestamp === 'number' ? parsed.targetLabTimestamp : null,
    labFormattedDate:
      typeof parsed.labFormattedDate === 'string' ? parsed.labFormattedDate : '',
    labSavedText: typeof parsed.labSavedText === 'string' ? parsed.labSavedText : '',
    targetGoblinLabTimestamp:
      typeof parsed.targetGoblinLabTimestamp === 'number'
        ? parsed.targetGoblinLabTimestamp
        : null,
    goblinLabFormattedDate:
      typeof parsed.goblinLabFormattedDate === 'string' ? parsed.goblinLabFormattedDate : '',
    petPotions: 0,
    petTimer: normalizeSingleTimer(parsed.petTimer, 'Active Pet Upgrade'),
    targetPetTimestamp:
      typeof parsed.targetPetTimestamp === 'number' ? parsed.targetPetTimestamp : null,
    petFormattedDate:
      typeof parsed.petFormattedDate === 'string' ? parsed.petFormattedDate : '',
    petSavedText: typeof parsed.petSavedText === 'string' ? parsed.petSavedText : '',
    builderBoostEndTime:
      typeof parsed.builderBoostEndTime === 'number' && parsed.builderBoostEndTime > 0
        ? parsed.builderBoostEndTime
        : null,
    labBoostEndTime:
      typeof parsed.labBoostEndTime === 'number' && parsed.labBoostEndTime > 0
        ? parsed.labBoostEndTime
        : null,
    petBoostEndTime:
      typeof parsed.petBoostEndTime === 'number' && parsed.petBoostEndTime > 0
        ? parsed.petBoostEndTime
        : null,
    builderBiteEndTime:
      typeof parsed.builderBiteEndTime === 'number' && parsed.builderBiteEndTime > 0
        ? parsed.builderBiteEndTime
        : null,
    studySoupEndTime:
      typeof parsed.studySoupEndTime === 'number' && parsed.studySoupEndTime > 0
        ? parsed.studySoupEndTime
        : null,
    builderApprentice: {
      id: 93000000,
      level:
        typeof parsed.builderApprentice?.level === 'number' &&
        parsed.builderApprentice.level >= 1 &&
        parsed.builderApprentice.level <= 8
          ? Math.floor(parsed.builderApprentice.level)
          : 8,
      assignedSlot:
        typeof parsed.builderApprentice?.assignedSlot === 'number' &&
        parsed.builderApprentice.assignedSlot >= 0 &&
        parsed.builderApprentice.assignedSlot <= 6
          ? parsed.builderApprentice.assignedSlot
          : null,
      activeSessionEndTime:
        typeof parsed.builderApprentice?.activeSessionEndTime === 'number' &&
        parsed.builderApprentice.activeSessionEndTime > 0
          ? parsed.builderApprentice.activeSessionEndTime
          : null,
      cooldownEndTime:
        typeof parsed.builderApprentice?.cooldownEndTime === 'number' &&
        parsed.builderApprentice.cooldownEndTime > 0
          ? parsed.builderApprentice.cooldownEndTime
          : null,
      recurrent:
        typeof parsed.builderApprentice?.recurrent === 'boolean'
          ? parsed.builderApprentice.recurrent
          : typeof parsed.builderApprentice?.assignedSlot === 'number',
    },
    labApprentice: {
      id: 93000001,
      level:
        typeof parsed.labApprentice?.level === 'number' &&
        parsed.labApprentice.level >= 1 &&
        parsed.labApprentice.level <= 12
          ? Math.floor(parsed.labApprentice.level)
          : 8,
      assignedSlot:
        parsed.labApprentice?.assignedSlot === 'main' ||
        parsed.labApprentice?.assignedSlot === 'goblin'
          ? parsed.labApprentice.assignedSlot
          : null,
      activeSessionEndTime:
        typeof parsed.labApprentice?.activeSessionEndTime === 'number' &&
        parsed.labApprentice.activeSessionEndTime > 0
          ? parsed.labApprentice.activeSessionEndTime
          : null,
      cooldownEndTime:
        typeof parsed.labApprentice?.cooldownEndTime === 'number' &&
        parsed.labApprentice.cooldownEndTime > 0
          ? parsed.labApprentice.cooldownEndTime
          : null,
      recurrent:
        typeof parsed.labApprentice?.recurrent === 'boolean'
          ? parsed.labApprentice.recurrent
          : parsed.labApprentice?.assignedSlot === 'main' ||
            parsed.labApprentice?.assignedSlot === 'goblin',
    },
    thLevel:
      typeof parsed.thLevel === 'number' && parsed.thLevel >= 1 && parsed.thLevel <= 25
        ? Math.floor(parsed.thLevel)
        : undefined,
    lastSynced: typeof parsed.lastSynced === 'string' ? parsed.lastSynced : undefined,
  };
}

function loadLegacySingleAccountState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createDefaultSavedState();
    return normalizeSavedState(JSON.parse(raw));
  } catch {
    return createDefaultSavedState();
  }
}

function loadMultiAccountStorage(): MultiAccountStorage {
  const fallbackMainState = loadLegacySingleAccountState();
  try {
    const rawAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!rawAccounts) {
      return {
        activeAccountId: 'main',
        accounts: [
          {
            id: 'main',
            name: 'Main Account',
            data: fallbackMainState,
          },
        ],
      };
    }

    const parsed = JSON.parse(rawAccounts) as Partial<MultiAccountStorage>;
    if (!Array.isArray(parsed.accounts) || parsed.accounts.length === 0) {
      return {
        activeAccountId: 'main',
        accounts: [
          {
            id: 'main',
            name: 'Main Account',
            data: fallbackMainState,
          },
        ],
      };
    }

    const normalizedAccounts: VillageProfile[] = parsed.accounts.map((acc, index) => ({
      id: acc.id || (index === 0 ? 'main' : `village_${index + 1}`),
      name: acc.name || (index === 0 ? 'Main Account' : `Village ${index + 1}`),
      tag: acc.tag,
      data: normalizeSavedState(acc.data),
    }));

    const hasActive = normalizedAccounts.some((a) => a.id === parsed.activeAccountId);
    return {
      activeAccountId: hasActive
        ? (parsed.activeAccountId as string)
        : normalizedAccounts[0].id,
      accounts: normalizedAccounts,
    };
  } catch {
    return {
      activeAccountId: 'main',
      accounts: [
        {
          id: 'main',
          name: 'Main Account',
          data: fallbackMainState,
        },
      ],
    };
  }
}

/**
 * 10x Builder Potion Math (Dual-Phase Speed Formula):
 * - Multiplier M = 10 (1 real hour compresses 10 hours of upgrade work)
 * - If W <= (boostRemainingRealSeconds * 10): realSeconds = W / 10
 * - If W > (boostRemainingRealSeconds * 10): realSeconds = boostRemainingRealSeconds + (W - boostRemainingRealSeconds * 10)
 */
export function calc10xRealTimeSeconds(
  remainingSeconds: number,
  potions: number,
  activeBoostSeconds = 0
): number {
  if (remainingSeconds <= 0) return 0;
  const boostRemainingRealSeconds = Math.max(0, activeBoostSeconds) + Math.max(0, potions) * 3600;
  const maxBoostCoverageSeconds = boostRemainingRealSeconds * 10;
  if (remainingSeconds <= maxBoostCoverageSeconds) {
    return remainingSeconds / 10;
  } else {
    return boostRemainingRealSeconds + (remainingSeconds - maxBoostCoverageSeconds);
  }
}

/**
 * 24x Research & Pet Potion Calculation Engine (Dual-Phase Speed Formula):
 * - Multiplier M = 24 (1 real hour compresses 24 hours of upgrade work)
 * - If W <= (boostRemainingRealSeconds * 24): realSeconds = W / 24
 * - If W > (boostRemainingRealSeconds * 24): realSeconds = boostRemainingRealSeconds + (W - boostRemainingRealSeconds * 24)
 */
export function calc24xRealTimeSeconds(
  remainingSeconds: number,
  potionCount: number,
  activeBoostSeconds = 0
): number {
  if (remainingSeconds <= 0) return 0;
  const boostRemainingRealSeconds = Math.max(0, activeBoostSeconds) + Math.max(0, potionCount) * 3600;
  const totalBoostCapacity = boostRemainingRealSeconds * 24;
  if (remainingSeconds <= totalBoostCapacity) {
    return remainingSeconds / 24;
  } else {
    return boostRemainingRealSeconds + (remainingSeconds - totalBoostCapacity);
  }
}

function getRemainingBoostSeconds(boostEndTime: number | null | undefined, now = Date.now()): number {
  if (!boostEndTime || boostEndTime <= now) return 0;
  return Math.max(0, Math.ceil((boostEndTime - now) / 1000));
}

export function getHelperSpeedMultiplier(level: number): number {
  return Math.min(12, Math.max(1, Math.floor(level || 1)));
}

export interface HelperCycleSnapshot {
  isWorkingNow: boolean;
  activeRemSec: number;
  cooldownRemSec: number;
  isRecurrentlyAssigned: boolean;
}

export function getHelperCycleStateAt(
  helper:
    | {
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null
    | undefined,
  now = Date.now()
): HelperCycleSnapshot {
  if (!helper) {
    return {
      isWorkingNow: false,
      activeRemSec: 0,
      cooldownRemSec: 0,
      isRecurrentlyAssigned: false,
    };
  }

  const hasTarget = helper.assignedSlot !== null && helper.assignedSlot !== undefined;
  const isRecurrent = hasTarget && helper.recurrent !== false;

  // 1. Currently inside the initial 1-hour active work session
  if (helper.activeSessionEndTime && now < helper.activeSessionEndTime) {
    const activeRemSec = Math.max(0, Math.ceil((helper.activeSessionEndTime - now) / 1000));
    const effectiveCoolEndMs =
      helper.cooldownEndTime && helper.cooldownEndTime > helper.activeSessionEndTime
        ? helper.cooldownEndTime
        : helper.activeSessionEndTime + 82800 * 1000;
    const cooldownRemSec = Math.max(0, Math.ceil((effectiveCoolEndMs - now) / 1000));
    return {
      isWorkingNow: hasTarget && activeRemSec > 0,
      activeRemSec: hasTarget ? activeRemSec : 0,
      cooldownRemSec,
      isRecurrentlyAssigned: isRecurrent,
    };
  }

  // 2. Currently inside the initial 23-hour cooldown before cooldownEndTime
  if (helper.cooldownEndTime && now < helper.cooldownEndTime) {
    const cooldownRemSec = Math.max(0, Math.ceil((helper.cooldownEndTime - now) / 1000));
    return {
      isWorkingNow: false,
      activeRemSec: 0,
      cooldownRemSec,
      isRecurrentlyAssigned: isRecurrent,
    };
  }

  // 3. Past cooldownEndTime: if recurrently assigned to an ongoing upgrade, cycles repeat every 24h (86400s)
  const anchorCycleEndMs =
    helper.cooldownEndTime ||
    (helper.activeSessionEndTime ? helper.activeSessionEndTime + 82800 * 1000 : null);

  if (isRecurrent && anchorCycleEndMs && now >= anchorCycleEndMs) {
    const elapsedSec = (now - anchorCycleEndMs) / 1000;
    const phaseSec = ((elapsedSec % 86400) + 86400) % 86400;
    if (phaseSec < 3600) {
      return {
        isWorkingNow: true,
        activeRemSec: Math.max(1, Math.ceil(3600 - phaseSec)),
        cooldownRemSec: Math.max(1, Math.ceil(86400 - phaseSec)),
        isRecurrentlyAssigned: true,
      };
    }
    return {
      isWorkingNow: false,
      activeRemSec: 0,
      cooldownRemSec: Math.max(1, Math.ceil(86400 - phaseSec)),
      isRecurrentlyAssigned: true,
    };
  }

  return {
    isWorkingNow: false,
    activeRemSec: 0,
    cooldownRemSec: 0,
    isRecurrentlyAssigned: isRecurrent,
  };
}

export function getHelperBoostIntervalsFromNow(
  helper:
    | {
        level: number;
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null
    | undefined,
  isAssignedToSlot: boolean,
  now = Date.now(),
  horizonSec = 45 * 86400
): Array<{ startSec: number; endSec: number }> {
  if (!helper || !isAssignedToSlot || helper.assignedSlot === null) {
    return [];
  }

  const intervals: Array<{ startSec: number; endSec: number }> = [];
  const isRecurrent = helper.recurrent !== false;

  const activeEndMs = helper.activeSessionEndTime ?? null;
  const coolEndMs =
    helper.cooldownEndTime && (!activeEndMs || helper.cooldownEndTime > activeEndMs)
      ? helper.cooldownEndTime
      : activeEndMs
      ? activeEndMs + 82800 * 1000
      : null;

  if (activeEndMs && activeEndMs > now) {
    const firstEndSec = Math.min(horizonSec, (activeEndMs - now) / 1000);
    if (firstEndSec > 0) {
      intervals.push({ startSec: 0, endSec: firstEndSec });
    }
    if (isRecurrent && coolEndMs) {
      const firstNextCycleSec = Math.max(firstEndSec, (coolEndMs - now) / 1000);
      for (let start = firstNextCycleSec; start < horizonSec; start += 86400) {
        const end = Math.min(horizonSec, start + 3600);
        if (end > start) {
          intervals.push({ startSec: start, endSec: end });
        }
      }
    }
    return intervals;
  }

  if (coolEndMs && coolEndMs > now) {
    if (isRecurrent) {
      const firstNextCycleSec = (coolEndMs - now) / 1000;
      for (let start = firstNextCycleSec; start < horizonSec; start += 86400) {
        const end = Math.min(horizonSec, start + 3600);
        if (end > start) {
          intervals.push({ startSec: start, endSec: end });
        }
      }
    }
    return intervals;
  }

  if (coolEndMs && now >= coolEndMs && isRecurrent) {
    const elapsedSec = (now - coolEndMs) / 1000;
    const phaseSec = ((elapsedSec % 86400) + 86400) % 86400;
    if (phaseSec < 3600) {
      const remActiveSec = Math.min(horizonSec, 3600 - phaseSec);
      if (remActiveSec > 0) {
        intervals.push({ startSec: 0, endSec: remActiveSec });
      }
    }
    const nextCycleStartSec = 86400 - phaseSec;
    for (let start = nextCycleStartSec; start < horizonSec; start += 86400) {
      const end = Math.min(horizonSec, start + 3600);
      if (end > start) {
        intervals.push({ startSec: start, endSec: end });
      }
    }
    return intervals;
  }

  // Fallback: helper is recurrently assigned with 0 cooldown remaining (ready immediately)
  if (isRecurrent && !activeEndMs && !coolEndMs) {
    for (let start = 0; start < horizonSec; start += 86400) {
      const end = Math.min(horizonSec, start + 3600);
      if (end > start) {
        intervals.push({ startSec: start, endSec: end });
      }
    }
  }

  return intervals;
}

/**
 * Resolves the combined base + potion + snack rate at a given time slice, strictly enforcing
 * Clash of Clans Magic Snack stacking rules:
 * - BUILDER BITE (2x): Does NOT stack with Builder Potion (10x).
 *   * If Builder Potion (10x) is active, Builder Potion overrides Bite -> 10x.
 *   * If NO Builder Potion is active and Bite is active -> 2x.
 * - STUDY SOUP (4x for Lab/Pets): DOES stack additively with Research/Pet Potion (24x).
 *   * If Research/Pet Potion (24x) is active alongside Study Soup (4x) -> 27x (Base 1x + 23x + 3x).
 *   * If NO Research/Pet Potion is active and Study Soup is active -> 4x.
 */
export function resolveBasePotionSnackRate(params: {
  potionActive: boolean;
  potionRate: number;
  snackActive: boolean;
  snackType?: 'builder_bite' | 'study_soup';
}): number {
  const { potionActive, potionRate, snackActive, snackType } = params;
  const isBuilder = snackType === 'builder_bite' || (snackType !== 'study_soup' && potionRate === 10);

  if (isBuilder) {
    if (potionActive && potionRate > 1) return potionRate; // 10x overrides 2x Bite
    if (snackActive) return 2; // 2x Builder Bite when no Builder Potion is active
    return 1;
  }

  // Lab & Pets: Study Soup (4x = +3x bonus) stacks additively with Research/Pet Potion (24x = +23x bonus) -> 27x
  if (potionActive && potionRate > 1 && snackActive) {
    return potionRate + 3; // 24 + 3 = 27x
  }
  if (potionActive && potionRate > 1) {
    return potionRate; // 24x
  }
  if (snackActive) {
    return 4; // 4x Study Soup
  }
  return 1;
}

/**
 * Builds combined real-time segments where:
 * - Primary Builder / Lab always works at 1x base speed.
 * - Potion & Magic Snack apply according to `resolveBasePotionSnackRate` (Builder Bite 2x non-stacking; Study Soup 4x additive -> 27x).
 * - A Level `L` Helper works at `Lx` bonus speed for 1 hour (saving `L` hours in 1 real hour),
 *   so total progress rate during the 1-hour helper window is `basePotionSnackRate + L`.
 */
function buildCombinedBoostSegments(
  potionBoostSecs: number,
  potionRate: number,
  helperIntervals: Array<{ startSec: number; endSec: number }>,
  helperBonusMultiplier: number,
  maxTimeSec: number,
  snackBoostSecs = 0,
  snackType?: 'builder_bite' | 'study_soup'
): Array<{ startSec: number; endSec: number; rate: number }> {
  if (maxTimeSec <= 0) return [];
  const pSec = potionBoostSecs > 0 && potionRate > 1 ? Math.min(maxTimeSec, potionBoostSecs) : 0;
  const sSec = snackBoostSecs > 0 ? Math.min(maxTimeSec, snackBoostSecs) : 0;
  const validHelper =
    helperBonusMultiplier >= 1
      ? helperIntervals
          .filter((iv) => iv.endSec > 0 && iv.startSec < maxTimeSec && iv.endSec > iv.startSec)
          .map((iv) => ({
            startSec: Math.max(0, iv.startSec),
            endSec: Math.min(maxTimeSec, iv.endSec),
          }))
      : [];

  const pointSet = new Set<number>([0, maxTimeSec]);
  if (pSec > 0) pointSet.add(pSec);
  if (sSec > 0) pointSet.add(sSec);
  for (const iv of validHelper) {
    pointSet.add(iv.startSec);
    pointSet.add(iv.endSec);
  }
  const points = Array.from(pointSet).sort((a, b) => a - b);
  const segments: Array<{ startSec: number; endSec: number; rate: number }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const startSec = points[i];
    const endSec = points[i + 1];
    if (endSec <= startSec) continue;
    const mid = (startSec + endSec) / 2;
    const pActive = mid < pSec;
    const sActive = mid < sSec;
    const hActive = validHelper.some((iv) => mid >= iv.startSec && mid <= iv.endSec);
    const baseRate = resolveBasePotionSnackRate({
      potionActive: pActive,
      potionRate,
      snackActive: sActive,
      snackType,
    });
    const rate = baseRate + (hActive ? helperBonusMultiplier : 0);
    segments.push({ startSec, endSec, rate });
  }
  return segments;
}

export function calcHelperSessionRealTimeSeconds(params: {
  remainingUpgradeSeconds: number;
  helperLevel: number;
  activeSessionSeconds?: number;
  helper?:
    | {
        level: number;
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null;
  isAssignedToSlot?: boolean;
  potionCount?: number;
  activePotionBoostSeconds?: number;
  potionRate?: 10 | 24;
  activeSnackBoostSeconds?: number;
  snackType?: 'builder_bite' | 'study_soup';
  now?: number;
}): number {
  const {
    remainingUpgradeSeconds,
    helperLevel,
    activeSessionSeconds = 0,
    helper = null,
    isAssignedToSlot = false,
    potionCount = 0,
    activePotionBoostSeconds = 0,
    potionRate = 10,
    activeSnackBoostSeconds = 0,
    snackType,
    now = Date.now(),
  } = params;

  if (remainingUpgradeSeconds <= 0) return 0;

  const totalPotionRealSecs =
    Math.max(0, activePotionBoostSeconds) + Math.max(0, potionCount) * 3600;
  const totalSnackRealSecs = Math.max(0, activeSnackBoostSeconds);
  const H = getHelperSpeedMultiplier(helper?.level ?? helperLevel);

  const horizonSec = Math.max(remainingUpgradeSeconds + 86400, 45 * 86400);
  const helperIntervals =
    helper && isAssignedToSlot
      ? getHelperBoostIntervalsFromNow(helper, true, now, horizonSec)
      : activeSessionSeconds > 0
      ? [{ startSec: 0, endSec: Math.max(0, activeSessionSeconds) }]
      : [];

  // Pure potion boost (or unboosted) when no helper intervals and no snack boost apply to this slot
  if ((helperIntervals.length === 0 || H < 1) && totalSnackRealSecs <= 0) {
    return potionRate === 24
      ? calc24xRealTimeSeconds(remainingUpgradeSeconds, potionCount, activePotionBoostSeconds)
      : calc10xRealTimeSeconds(remainingUpgradeSeconds, potionCount, activePotionBoostSeconds);
  }

  const segments = buildCombinedBoostSegments(
    totalPotionRealSecs,
    potionRate,
    helperIntervals,
    H,
    horizonSec,
    totalSnackRealSecs,
    snackType || (potionRate === 24 ? 'study_soup' : 'builder_bite')
  );

  let remWork = remainingUpgradeSeconds;
  let totalRealSec = 0;

  for (const seg of segments) {
    const segDuration = seg.endSec - seg.startSec;
    const segCapacity = segDuration * seg.rate;
    if (remWork <= segCapacity) {
      return totalRealSec + remWork / seg.rate;
    }
    remWork -= segCapacity;
    totalRealSec += segDuration;
  }

  return totalRealSec + remWork;
}

function formatMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function formatBoostHHMM(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  if (clamped <= 0) return '00:00';
  if (clamped < 60) return '00:01';
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatCooldownHMS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  const ss = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function formatRemainingDurationShort(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(clamped / 86400);
  const h = Math.floor((clamped % 86400) / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (d === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function formatCompletionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatWidgetClockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatWidgetCompactDay(timestamp: number, now = Date.now()): string {
  const targetDate = new Date(timestamp);
  const nowDate = new Date(now);
  const startOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  ).getTime();
  const startOfTargetDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();
  const dayDiff = Math.round((startOfTargetDay - startOfToday) / 86400000);

  if (dayDiff === 0) {
    return 'Today';
  }
  if (dayDiff === 1) {
    return 'Tomorrow';
  }
  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function resolveWidgetThNumber(d: SavedState, profileName: string): number {
  if (typeof d.thLevel === 'number' && d.thLevel >= 1 && d.thLevel <= 18) {
    return Math.floor(d.thLevel);
  }
  const nameMatch = profileName.match(/TH\s*(\d{1,2})/i);
  if (nameMatch && nameMatch[1]) {
    const parsed = parseInt(nameMatch[1], 10);
    if (parsed >= 1 && parsed <= 18) return parsed;
  }
  return 17;
}

function resolveWidgetThLabel(d: SavedState, profileName: string): string {
  return `[TH ${resolveWidgetThNumber(d, profileName)}]`;
}

function syncAllVillagesToNativeWidget(
  allAccounts: VillageProfile[],
  currentActiveAccountId: string
): void {
  try {
    const now = Date.now();
    const activeIdx = Math.max(
      0,
      allAccounts.findIndex((a) => a.id === currentActiveAccountId)
    );

    const widgetVillagesPayload = allAccounts.map((profile) => {
      const d = profile.data || createDefaultSavedState();
      const thNumber = resolveWidgetThNumber(d, profile.name);
      const thLevel = resolveWidgetThLabel(d, profile.name);
      const thIcon = getTownHallIconSrc(thNumber);
      const tag = profile.tag?.trim() || '#VILLAGE';

      const activeResults = (d.lockedResults || [])
        .filter((r) => r && typeof r.targetTimestamp === 'number' && r.targetTimestamp > now)
        .sort((a, b) => a.targetTimestamp - b.targetTimestamp);

      const regularCap = Math.min(6, Math.max(1, d.numBuilders || 6));
      const busyRegularCount = activeResults.filter((r) => !r.isGoblin).length;
      const isGoblinBusy = activeResults.some((r) => r.isGoblin);

      const headerSubtitle = `TH ${thNumber} · ${busyRegularCount}/${regularCap} BUILDERS${
        isGoblinBusy ? ' + G' : ''
      }`;
      const buildersSectionHeader = `BUILDERS  ${busyRegularCount}/${regularCap}${
        isGoblinBusy ? ' + Goblin' : ''
      }`;
      const buildersStatus = `${busyRegularCount}/${regularCap} BUILDERS${
        isGoblinBusy ? ' + G' : ''
      }`;

      const activeBoostParts: string[] = [];
      if (d.builderBoostEndTime && d.builderBoostEndTime > now) {
        activeBoostParts.push('Builder 10x Active');
      }
      if (d.labBoostEndTime && d.labBoostEndTime > now) {
        activeBoostParts.push('Lab 24x Active');
      }
      if (d.petBoostEndTime && d.petBoostEndTime > now) {
        activeBoostParts.push('Pet 24x Active');
      }
      if (d.builderBiteEndTime && d.builderBiteEndTime > now) {
        activeBoostParts.push('Bite 2x');
      }
      if (d.studySoupEndTime && d.studySoupEndTime > now) {
        activeBoostParts.push('Soup 4x');
      }
      const bHelperCycle = getHelperCycleStateAt(d.builderApprentice, now);
      const lHelperCycle = getHelperCycleStateAt(d.labApprentice, now);
      if (activeBoostParts.length === 0 && (bHelperCycle.isWorkingNow || lHelperCycle.isWorkingNow)) {
        const mult = bHelperCycle.isWorkingNow
          ? getHelperSpeedMultiplier(d.builderApprentice?.level || 8)
          : getHelperSpeedMultiplier(d.labApprentice?.level || 8);
        activeBoostParts.push(`Helper Boost Active (${mult}x)`);
      }

      const boostStatus =
        activeBoostParts.length > 0 ? activeBoostParts.join(' · ') : 'No active boosts';

      let labStatus = 'Idle';
      if (d.targetLabTimestamp && d.targetLabTimestamp > now) {
        const labName = d.labTimer?.upgradeTitle || 'Research';
        labStatus = `${labName} (${formatWidgetCompactDay(d.targetLabTimestamp, now)})`;
      } else if (d.targetGoblinLabTimestamp && d.targetGoblinLabTimestamp > now) {
        const gobLabName = d.goblinLabTimer?.upgradeTitle || 'Goblin Lab';
        labStatus = `${gobLabName} (${formatWidgetCompactDay(
          d.targetGoblinLabTimestamp,
          now
        )})`;
      }

      let petStatus = 'Idle';
      if (d.targetPetTimestamp && d.targetPetTimestamp > now) {
        const petName = d.petTimer?.upgradeTitle || 'Pet';
        petStatus = `${petName} (${formatWidgetCompactDay(d.targetPetTimestamp, now)})`;
      }

      // 1. All active Builder upgrades (up to 7: 6 regular + Goblin)
      const builderUpgrades = activeResults.map((item) => {
        const isHero = Boolean(item.rawId && String(item.rawId).startsWith('28'));
        const badgeType = item.isGoblin ? 'green' : isHero ? 'purple' : 'gold';
        const slotBadge =
          item.slotBadge ||
          (item.isGoblin
            ? '[GOBLIN]'
            : isHero
            ? '[HERO]'
            : `[B${(item.builderIndex ?? 0) + 1}]`);
        const baseName = item.upgradeTitle || (item.isGoblin ? 'Goblin Builder' : 'Upgrade');
        const displayTitle = item.isGoblin ? `${baseName} · G` : baseName;
        const targetLvl =
          typeof item.upgradeLevel === 'number' ? `→ ${item.upgradeLevel + 1}` : '';
        const iconCandidates = resolveUpgradeIconSources({
          rawId: item.rawId,
          upgradeTitle: baseName,
          upgradeLevel: item.upgradeLevel,
          category: 'builders',
        });

        return {
          category: 'builders',
          slotBadge,
          badgeType,
          name: displayTitle,
          rawId: item.rawId,
          upgradeLevel: item.upgradeLevel,
          targetLvl,
          targetTimestamp: item.targetTimestamp,
          finishFormatted: formatCompletionDate(item.targetTimestamp),
          iconFile: iconCandidates[0] || '/icons/art_1000015.webp',
          iconCandidates,
        };
      });

      // 2. Active Laboratory upgrades (Main Lab + Goblin Researcher)
      const labAndPetUpgrades: Array<{
        category: string;
        slotBadge: string;
        badgeType: string;
        name: string;
        rawId?: number | string;
        upgradeLevel?: number;
        targetLvl: string;
        targetTimestamp: number;
        finishFormatted: string;
        iconFile: string;
        iconCandidates: string[];
      }> = [];

      if (d.targetLabTimestamp && d.targetLabTimestamp > now) {
        const baseLabTitle =
          d.labTimer?.upgradeTitle && d.labTimer.upgradeTitle !== 'Troop / Spell Upgrade'
            ? d.labTimer.upgradeTitle
            : d.labTimer?.rawId
            ? resolveUpgradeName(d.labTimer.rawId, 'Lab Research')
            : 'Lab Research';
        const labTargetLvl =
          typeof d.labTimer?.upgradeLevel === 'number'
            ? `→ ${d.labTimer.upgradeLevel + 1}`
            : '';
        const labIcons = resolveUpgradeIconSources({
          rawId: d.labTimer?.rawId,
          upgradeTitle: baseLabTitle,
          upgradeLevel: d.labTimer?.upgradeLevel,
          category: 'laboratory',
        });
        labAndPetUpgrades.push({
          category: 'laboratory',
          slotBadge: '[LAB]',
          badgeType: 'purple',
          name: `${baseLabTitle} · LAB`,
          rawId: d.labTimer?.rawId,
          upgradeLevel: d.labTimer?.upgradeLevel,
          targetLvl: labTargetLvl,
          targetTimestamp: d.targetLabTimestamp,
          finishFormatted: formatCompletionDate(d.targetLabTimestamp),
          iconFile: labIcons[0] || '/icons/art_1000007.webp',
          iconCandidates: labIcons,
        });
      }

      if (d.targetGoblinLabTimestamp && d.targetGoblinLabTimestamp > now) {
        const baseGobLabTitle =
          d.goblinLabTimer?.upgradeTitle &&
          d.goblinLabTimer.upgradeTitle !== 'Goblin Researcher'
            ? d.goblinLabTimer.upgradeTitle
            : d.goblinLabTimer?.rawId
            ? resolveUpgradeName(d.goblinLabTimer.rawId, 'Goblin Lab')
            : 'Goblin Lab';
        const gobLabTargetLvl =
          typeof d.goblinLabTimer?.upgradeLevel === 'number'
            ? `→ ${d.goblinLabTimer.upgradeLevel + 1}`
            : '';
        const gobLabIcons = resolveUpgradeIconSources({
          rawId: d.goblinLabTimer?.rawId,
          upgradeTitle: baseGobLabTitle,
          upgradeLevel: d.goblinLabTimer?.upgradeLevel,
          category: 'laboratory',
        });
        labAndPetUpgrades.push({
          category: 'laboratory',
          slotBadge: '[G-LAB]',
          badgeType: 'green',
          name: `${baseGobLabTitle} · G-LAB`,
          rawId: d.goblinLabTimer?.rawId,
          upgradeLevel: d.goblinLabTimer?.upgradeLevel,
          targetLvl: gobLabTargetLvl,
          targetTimestamp: d.targetGoblinLabTimestamp,
          finishFormatted: formatCompletionDate(d.targetGoblinLabTimestamp),
          iconFile: gobLabIcons[0] || '/icons/art_1000007.webp',
          iconCandidates: gobLabIcons,
        });
      }

      // 3. Active Pet House upgrade
      if (d.targetPetTimestamp && d.targetPetTimestamp > now) {
        const basePetTitle =
          d.petTimer?.upgradeTitle && d.petTimer.upgradeTitle !== 'Active Pet Upgrade'
            ? d.petTimer.upgradeTitle
            : d.petTimer?.rawId
            ? resolveUpgradeName(d.petTimer.rawId, 'Pet Upgrade')
            : 'Pet Upgrade';
        const petTargetLvl =
          typeof d.petTimer?.upgradeLevel === 'number'
            ? `→ ${d.petTimer.upgradeLevel + 1}`
            : '';
        const petIcons = resolveUpgradeIconSources({
          rawId: d.petTimer?.rawId,
          upgradeTitle: basePetTitle,
          upgradeLevel: d.petTimer?.upgradeLevel,
          category: 'pethouse',
        });
        labAndPetUpgrades.push({
          category: 'pethouse',
          slotBadge: '[PET]',
          badgeType: 'green',
          name: `${basePetTitle} · PET`,
          rawId: d.petTimer?.rawId,
          upgradeLevel: d.petTimer?.upgradeLevel,
          targetLvl: petTargetLvl,
          targetTimestamp: d.targetPetTimestamp,
          finishFormatted: formatCompletionDate(d.targetPetTimestamp),
          iconFile: petIcons[0] || '/icons/art_1000068.webp',
          iconCandidates: petIcons,
        });
      }

      const upgrades = [...builderUpgrades, ...labAndPetUpgrades];

      return {
        name: profile.name,
        tag,
        thNumber,
        thLevel,
        thIcon,
        headerSubtitle,
        buildersSectionHeader,
        buildersStatus,
        boostStatus,
        builderBoostEndTime: d.builderBoostEndTime || 0,
        labBoostEndTime: d.labBoostEndTime || 0,
        petBoostEndTime: d.petBoostEndTime || 0,
        labStatus,
        petStatus,
        upgrades,
        lastSynced: d.lastSynced || formatWidgetClockTime(now),
      };
    });

    const serialized = JSON.stringify(widgetVillagesPayload);
    localStorage.setItem('widget_villages_data', serialized);
    localStorage.setItem('widget_active_index', String(activeIdx));

    if (typeof window !== 'undefined' && window.ClashWidgetBridge?.syncVillages) {
      window.ClashWidgetBridge.syncVillages(serialized, activeIdx);
    }
  } catch {
    // Ignore widget sync error in web browser
  }
}

function formatSavedSeconds(savedSeconds: number): string {
  if (savedSeconds <= 0) return '0h';
  const totalMinutes = Math.round(savedSeconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  let out = '';
  if (days > 0) out += `${days}d `;
  if (hours > 0) out += `${hours}h `;
  if (days === 0 && mins > 0) out += `${mins}m`;
  if (!out.trim()) out = '0h';
  return out.trim();
}

function getTimerTotalSeconds(timer: BuilderTime): number {
  const d = Math.max(0, parseInt(timer.d, 10) || 0);
  const h = Math.min(24, Math.max(0, parseInt(timer.h, 10) || 0));
  const m = Math.min(60, Math.max(0, parseInt(timer.m, 10) || 0));
  const s = Math.max(0, timer.s || 0);
  return d * 86400 + h * 3600 + m * 60 + s;
}

function convertRawItemToTimer(item: RawCoCItem, fallbackTitle: string): BuilderTime {
  const timer = Math.max(0, Math.floor(item.timer || 0));
  const days = Math.floor(timer / 86400);
  const hours = Math.floor((timer % 86400) / 3600);
  const mins = Math.floor((timer % 3600) / 60);
  const secs = timer % 60;
  const itemData = item.data ?? item.id;
  const rawIdStr = itemData !== undefined && itemData !== null ? String(itemData) : undefined;
  const upgradeName = resolveUpgradeName(itemData, fallbackTitle);

  return {
    d: String(days),
    h: String(hours),
    m: String(mins),
    s: secs,
    upgradeTitle: upgradeName,
    upgradeLevel: typeof item.lvl === 'number' ? item.lvl : undefined,
    rawId: rawIdStr,
  };
}

function formatTotalSecondsToParts(totalSecondsInput: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalSecondsInput));
  if (totalSeconds <= 0) {
    return { isFinished: true, d: 0, h: 0, m: 0, s: 0, totalUpgradeSeconds: 0 };
  }
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { isFinished: false, d, h, m, s, totalUpgradeSeconds: totalSeconds };
}

/**
 * Computes displayed upgrade time parts by integrating the active speed schedule from `now` to `targetTimestamp`:
 * - Accounts for both active Potion Boosts (10x for Builders, 24x for Lab/Pets) AND recurring daily Helper Boosts (Nx for 1h every 24h).
 * - Guarantees zero instant time chop on activation and exact 1x ticking during cooldowns / Nx ticking during active 1h sessions.
 */
function computeTimeParts(
  targetTimestamp: number,
  helperBoostEndTime?: number | null,
  helperSpeedMultiplier = 1,
  potionBoostEndTime?: number | null,
  potionSpeedMultiplier = 1,
  now = Date.now(),
  helper?:
    | {
        level: number;
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null,
  isHelperAssignedToSlot = false,
  snackBoostEndTime?: number | null,
  snackType?: 'builder_bite' | 'study_soup'
) {
  const remMs = targetTimestamp - now;
  if (remMs <= 0) {
    return { isFinished: true, d: 0, h: 0, m: 0, s: 0, totalUpgradeSeconds: 0 };
  }

  const totalRealRemSec = remMs / 1000;
  const pRemSec =
    potionBoostEndTime && potionBoostEndTime > now && potionSpeedMultiplier > 1
      ? (potionBoostEndTime - now) / 1000
      : 0;
  const sRemSec =
    snackBoostEndTime && snackBoostEndTime > now
      ? (snackBoostEndTime - now) / 1000
      : 0;

  const H = helper ? getHelperSpeedMultiplier(helper.level) : helperSpeedMultiplier;
  const helperIntervals =
    helper && isHelperAssignedToSlot
      ? getHelperBoostIntervalsFromNow(helper, true, now, totalRealRemSec + 60)
      : helperBoostEndTime && helperBoostEndTime > now && H >= 1
      ? [{ startSec: 0, endSec: (helperBoostEndTime - now) / 1000 }]
      : [];

  if (pRemSec <= 0 && sRemSec <= 0 && helperIntervals.length === 0) {
    return formatTotalSecondsToParts(totalRealRemSec);
  }

  const segments = buildCombinedBoostSegments(
    pRemSec,
    potionSpeedMultiplier,
    helperIntervals,
    H,
    totalRealRemSec,
    sRemSec,
    snackType || (potionSpeedMultiplier === 24 ? 'study_soup' : 'builder_bite')
  );

  let totalUpgradeSeconds = 0;
  for (const seg of segments) {
    totalUpgradeSeconds += (seg.endSec - seg.startSec) * seg.rate;
  }

  return formatTotalSecondsToParts(totalUpgradeSeconds);
}

function retriggerClass(el: HTMLElement | null, className: string) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

/**
 * Centralized Master Tick Pub/Sub Bus:
 * Driven by a single 1000ms master interval in `App` that automatically pauses when `document.hidden === true`
 * and immediately re-syncs against `Date.now()` when `document.hidden === false`.
 */
type MasterTickSubscriber = (now: number) => void;
const masterTickSubscribers = new Set<MasterTickSubscriber>();

function subscribeMasterTick(subscriber: MasterTickSubscriber): () => void {
  masterTickSubscribers.add(subscriber);
  return () => {
    masterTickSubscribers.delete(subscriber);
  };
}

function dispatchMasterTick(now: number): void {
  masterTickSubscribers.forEach((subscriber) => {
    subscriber(now);
  });
}

function formatActiveBoostRemainingText(remSeconds: number): string {
  const hours = Math.floor(remSeconds / 3600);
  const mins = Math.floor((remSeconds % 3600) / 60);
  const secs = remSeconds % 60;
  return hours > 0
    ? `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s remaining`
    : `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s remaining`;
}

/**
 * Isolated 4-Unit HUD Live Countdown Ticker:
 * [ DD d ] : [ HH h ] : [ MM m ] : [ SS s ]
 * Subscribes to the centralized Master Tick Loop (`targetTimestamp - now`) with batched DOM updates.
 */
const LiveHudTicker: React.FC<{
  targetTimestamp: number;
  helperBoostEndTime?: number | null;
  helperSpeedMultiplier?: number;
  helper?:
    | {
        level: number;
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null;
  isHelperAssignedToSlot?: boolean;
  helperIcon?: string;
  potionBoostEndTime?: number | null;
  potionSpeedMultiplier?: number;
  snackBoostEndTime?: number | null;
  snackType?: 'builder_bite' | 'study_soup';
  label?: string;
  finishBadgeText?: string;
  accentColorClass?: string;
  onFinish?: () => void;
}> = React.memo(
  ({
    targetTimestamp,
    helperBoostEndTime = null,
    helperSpeedMultiplier = 1,
    helper = null,
    isHelperAssignedToSlot = false,
    helperIcon = '🔬',
    potionBoostEndTime = null,
    potionSpeedMultiplier = 1,
    snackBoostEndTime = null,
    snackType,
    label = 'Live Countdown',
    finishBadgeText = '⚡ UPGRADE FINISHED! BUILDER FREE',
    accentColorClass = 'text-[#fbbf24]',
    onFinish,
  }) => {
    const computeBadgeAt = (now: number): { text: string | null; isHelperResting: boolean } => {
      const pActive =
        !!potionBoostEndTime && potionBoostEndTime > now && potionSpeedMultiplier > 1;
      const sActive = !!snackBoostEndTime && snackBoostEndTime > now;
      const basePotionSnackRate = resolveBasePotionSnackRate({
        potionActive: pActive,
        potionRate: potionSpeedMultiplier,
        snackActive: sActive,
        snackType,
      });
      const hasBaseBoost = basePotionSnackRate > 1;
      const hRate = helper ? getHelperSpeedMultiplier(helper.level) : helperSpeedMultiplier;
      const cycle =
        helper && isHelperAssignedToSlot ? getHelperCycleStateAt(helper, now) : null;
      const hWorking =
        cycle !== null
          ? cycle.isWorkingNow && hRate >= 1
          : !!helperBoostEndTime && helperBoostEndTime > now && hRate >= 1;

      if (hasBaseBoost && hWorking) {
        const combined = basePotionSnackRate + hRate;
        return {
          text: `⚡ ${combined}x Boost Running (${basePotionSnackRate}x + ${hRate}x)`,
          isHelperResting: false,
        };
      }
      if (hasBaseBoost) {
        return {
          text: `⚡ ${basePotionSnackRate}x Boost Running`,
          isHelperResting: false,
        };
      }
      if (hWorking) {
        return {
          text: `⚡ ${hRate}x Boost Running (${formatMMSS(
            cycle ? cycle.activeRemSec : Math.ceil(((helperBoostEndTime || now) - now) / 1000)
          )})`,
          isHelperResting: false,
        };
      }
      if (cycle && cycle.isRecurrentlyAssigned && cycle.cooldownRemSec > 0 && hRate >= 1) {
        return {
          text: `${helperIcon} ${hRate}x Helper Assigned (Next 1h in ${formatBoostHHMM(
            cycle.cooldownRemSec
          )})`,
          isHelperResting: true,
        };
      }
      return { text: null, isHelperResting: false };
    };

    const initialParts = computeTimeParts(
      targetTimestamp,
      helperBoostEndTime,
      helperSpeedMultiplier,
      potionBoostEndTime,
      potionSpeedMultiplier,
      Date.now(),
      helper,
      isHelperAssignedToSlot,
      snackBoostEndTime,
      snackType
    );
    const [isFinished, setIsFinished] = useState<boolean>(initialParts.isFinished);
    const [badgeState, setBadgeState] = useState<{
      text: string | null;
      isHelperResting: boolean;
    }>(() => computeBadgeAt(Date.now()));

    const prevPartsRef = useRef(initialParts);
    const wasRunningRef = useRef<boolean>(!initialParts.isFinished);
    const onFinishRef = useRef(onFinish);
    onFinishRef.current = onFinish;

    const dayBoxRef = useRef<HTMLDivElement>(null);
    const hourBoxRef = useRef<HTMLDivElement>(null);
    const minBoxRef = useRef<HTMLDivElement>(null);

    const dayValRef = useRef<HTMLSpanElement>(null);
    const hourValRef = useRef<HTMLSpanElement>(null);
    const minValRef = useRef<HTMLSpanElement>(null);
    const secValRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const syncFromNow = (now: number, isInitialMount: boolean) => {
        const next = computeTimeParts(
          targetTimestamp,
          helperBoostEndTime,
          helperSpeedMultiplier,
          potionBoostEndTime,
          potionSpeedMultiplier,
          now,
          helper,
          isHelperAssignedToSlot,
          snackBoostEndTime,
          snackType
        );

        const nextBadge = computeBadgeAt(now);
        setBadgeState((prev) =>
          prev.text === nextBadge.text && prev.isHelperResting === nextBadge.isHelperResting
            ? prev
            : nextBadge
        );

        if (now >= targetTimestamp || next.isFinished || next.totalUpgradeSeconds <= 0) {
          if (wasRunningRef.current && !isInitialMount) {
            wasRunningRef.current = false;
            triggerHaptic([30, 50, 30]);
            onFinishRef.current?.();
          } else if (isInitialMount) {
            wasRunningRef.current = false;
            onFinishRef.current?.();
          }
          setIsFinished((prev) => (prev ? prev : true));
          return;
        }

        wasRunningRef.current = true;
        setIsFinished((prev) => (prev ? false : prev));

        if (isInitialMount) {
          if (dayValRef.current) dayValRef.current.textContent = String(next.d).padStart(2, '0');
          if (hourValRef.current) hourValRef.current.textContent = String(next.h).padStart(2, '0');
          if (minValRef.current) minValRef.current.textContent = String(next.m).padStart(2, '0');
          if (secValRef.current) secValRef.current.textContent = String(next.s).padStart(2, '0');
          prevPartsRef.current = next;
          return;
        }

        const prev = prevPartsRef.current;

        // Seconds: Smooth vertical slide-down flip animation
        if (next.s !== prev.s && secValRef.current) {
          secValRef.current.textContent = String(next.s).padStart(2, '0');
          retriggerClass(secValRef.current, 'anim-sec-flip');
        }

        // Minutes: Neon pink/elixir pulse glow + gentle bounce
        if (next.m !== prev.m && minValRef.current) {
          minValRef.current.textContent = String(next.m).padStart(2, '0');
          retriggerClass(minBoxRef.current, 'anim-min-pulse');
        }

        // Hours: Prominent gold glow flash + scale pop
        if (next.h !== prev.h && hourValRef.current) {
          hourValRef.current.textContent = String(next.h).padStart(2, '0');
          retriggerClass(hourBoxRef.current, 'anim-milestone-gold');
        }

        // Days: Prominent gold glow flash + scale pop
        if (next.d !== prev.d && dayValRef.current) {
          dayValRef.current.textContent = String(next.d).padStart(2, '0');
          retriggerClass(dayBoxRef.current, 'anim-milestone-gold');
        }

        prevPartsRef.current = next;
      };

      syncFromNow(Date.now(), true);
      return subscribeMasterTick((now) => {
        syncFromNow(now, false);
      });
    }, [
      targetTimestamp,
      helperBoostEndTime,
      helperSpeedMultiplier,
      helper,
      isHelperAssignedToSlot,
      helperIcon,
      potionBoostEndTime,
      potionSpeedMultiplier,
      snackBoostEndTime,
      snackType,
    ]);

    if (isFinished) {
      return (
        <div className="badge-finished-glow w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-center">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-[#22c55e] uppercase">
            {finishBadgeText}
          </span>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
            {label}
          </p>
          {badgeState.text && (
            <span
              className={
                badgeState.isHelperResting
                  ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-[#fbbf24] border border-amber-400/40'
                  : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-[#22c55e] border border-emerald-400/40 shadow-[0_0_10px_rgba(34,197,94,0.2)] animate-pulse'
              }
            >
              {badgeState.text}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5">
          {/* Days Unit */}
          <div
            ref={dayBoxRef}
            className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5"
          >
            <span
              ref={dayValRef}
              className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight"
            >
              {String(initialParts.d).padStart(2, '0')}
            </span>
            <span className={`text-[10px] font-bold ${accentColorClass}`}>d</span>
          </div>

          <span className="text-gray-400 font-extrabold text-xs select-none">:</span>

          {/* Hours Unit */}
          <div
            ref={hourBoxRef}
            className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5"
          >
            <span
              ref={hourValRef}
              className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight"
            >
              {String(initialParts.h).padStart(2, '0')}
            </span>
            <span className={`text-[10px] font-bold ${accentColorClass}`}>h</span>
          </div>

          <span className="text-gray-400 font-extrabold text-xs select-none">:</span>

          {/* Minutes Unit */}
          <div
            ref={minBoxRef}
            className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5"
          >
            <span
              ref={minValRef}
              className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight"
            >
              {String(initialParts.m).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-elixir">m</span>
          </div>

          <span className="text-gray-400 font-extrabold text-xs select-none">:</span>

          {/* Seconds Unit */}
          <div className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5 overflow-hidden">
            <span
              ref={secValRef}
              className={`inline-block text-base sm:text-lg font-extrabold ${accentColorClass} tracking-tight`}
            >
              {String(initialParts.s).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-gray-300">s</span>
          </div>
        </div>
      </div>
    );
  }
);

/**
 * Static 00:00:00:00 4-Unit HUD Ticker when no timer is locked yet
 */
const HudTickerIdle: React.FC<{
  label: string;
  accentUnitColorClass?: string;
  statusNote: string;
}> = ({ label, accentUnitColorClass = 'text-[#fbbf24]', statusNote }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{label}</p>
        <span className="text-[10px] font-extrabold text-gray-400">{statusNote}</span>
      </div>
      <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5">
        <div className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5">
          <span className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight">
            00
          </span>
          <span className={`text-[10px] font-bold ${accentUnitColorClass}`}>d</span>
        </div>
        <span className="text-gray-400 font-extrabold text-xs select-none">:</span>
        <div className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5">
          <span className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight">
            00
          </span>
          <span className={`text-[10px] font-bold ${accentUnitColorClass}`}>h</span>
        </div>
        <span className="text-gray-400 font-extrabold text-xs select-none">:</span>
        <div className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5">
          <span className="text-base sm:text-lg font-extrabold text-[#f8fafc] tracking-tight">
            00
          </span>
          <span className="text-[10px] font-bold text-elixir">m</span>
        </div>
        <span className="text-gray-400 font-extrabold text-xs select-none">:</span>
        <div className="hud-unit flex-1 sm:flex-initial sm:min-w-[58px] rounded-xl px-2 py-1.5 flex items-baseline justify-center gap-0.5">
          <span className={`text-base sm:text-lg font-extrabold ${accentUnitColorClass} tracking-tight`}>
            00
          </span>
          <span className="text-[10px] font-bold text-gray-300">s</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Active Boost Live Countdown Badge inside Potion HUD:
 * Renders "⚡ Active Boost: [MMm SSs remaining]" and ticks down every second in real-time.
 * Smoothly hides and resets when the timer reaches 0.
 */
const ActiveBoostHudBadge: React.FC<{
  boostEndTime: number | null | undefined;
  variant: 'builders' | 'laboratory' | 'pethouse';
  onExpire: () => void;
}> = React.memo(({ boostEndTime, variant, onExpire }) => {
  const [isActive, setIsActive] = useState<boolean>(() =>
    getRemainingBoostSeconds(boostEndTime) > 0
  );
  const textSpanRef = useRef<HTMLSpanElement>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const initialRem = getRemainingBoostSeconds(boostEndTime);
    if (initialRem <= 0) {
      setIsActive(false);
      if (boostEndTime) {
        onExpireRef.current();
      }
      return;
    }

    setIsActive(true);
    if (textSpanRef.current) {
      textSpanRef.current.textContent = `⚡ Active Boost: ${formatActiveBoostRemainingText(
        initialRem
      )}`;
    }

    return subscribeMasterTick((now) => {
      const nextRem = getRemainingBoostSeconds(boostEndTime, now);
      if (nextRem <= 0) {
        setIsActive(false);
        triggerHaptic([20, 40, 20]);
        onExpireRef.current();
      } else if (textSpanRef.current) {
        textSpanRef.current.textContent = `⚡ Active Boost: ${formatActiveBoostRemainingText(
          nextRem
        )}`;
      }
    });
  }, [boostEndTime]);

  if (!boostEndTime || !isActive) {
    return null;
  }

  const initialRem = getRemainingBoostSeconds(boostEndTime);
  if (initialRem <= 0) {
    return null;
  }

  const themeClasses =
    variant === 'builders'
      ? 'bg-amber-500/20 text-[#fbbf24] border-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.3)]'
      : variant === 'laboratory'
      ? 'bg-fuchsia-500/20 text-[#f0abfc] border-fuchsia-400/50 shadow-[0_0_16px_rgba(217,70,239,0.3)]'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.3)]';

  const dotColor =
    variant === 'builders'
      ? 'bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]'
      : variant === 'laboratory'
      ? 'bg-[#f0abfc] shadow-[0_0_8px_#f0abfc]'
      : 'bg-emerald-400 shadow-[0_0_8px_#34d399]';

  return (
    <div
      className={`mt-2.5 w-full rounded-xl px-3 py-2 border flex items-center justify-center gap-2 transition-all duration-300 ${themeClasses}`}
    >
      <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${dotColor}`} />
      <span ref={textSpanRef} className="text-xs font-extrabold tracking-wide">
        ⚡ Active Boost: {formatActiveBoostRemainingText(initialRem)}
      </span>
    </div>
  );
});

/**
 * Dedicated Obsidian Card for Helpers Sub-Tab:
 * - Card 1: 👷 Builder's Apprentice
 * - Card 2: 🔬 Lab Apprentice
 * Displays Level 1-8 selector, live 1-hour active work countdown (`⚡ Active Work Remaining: [MM:SS]`),
 * target name (`Boosting: [Building/Troop Name] at [N]x speed`), daily cooldown (`⏳ Next Available In: [HH:MM:SS]`),
 * ready badge (`✅ Ready to Assign`), and "Assign to Upgrade" action button.
 */
const HelperObsidianCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  accentVariant: 'gold' | 'lab';
  level: number;
  targetName: string | null;
  activeSessionEndTime: number | null;
  cooldownEndTime: number | null;
  recurrent?: boolean;
  onChangeLevel: (nextLevel: number) => void;
  onOpenAssignModal: () => void;
  onSessionExpire: () => void;
  onCooldownExpire: () => void;
}> = React.memo(
  ({
    icon,
    title,
    subtitle,
    accentVariant,
    level,
    targetName,
    activeSessionEndTime,
    cooldownEndTime,
    recurrent = false,
    onChangeLevel,
    onOpenAssignModal,
    onSessionExpire,
    onCooldownExpire,
  }) => {
    const computeCardCycle = (now: number) =>
      getHelperCycleStateAt(
        {
          assignedSlot: targetName ? 0 : null,
          activeSessionEndTime,
          cooldownEndTime,
          recurrent,
        },
        now
      );

    const [cycleState, setCycleState] = useState<HelperCycleSnapshot>(() =>
      computeCardCycle(Date.now())
    );

    useEffect(() => {
      const syncTimers = (now: number) => {
        const nextCycle = getHelperCycleStateAt(
          {
            assignedSlot: targetName ? 0 : null,
            activeSessionEndTime,
            cooldownEndTime,
            recurrent,
          },
          now
        );
        setCycleState((prev) =>
          prev.isWorkingNow === nextCycle.isWorkingNow &&
          prev.activeRemSec === nextCycle.activeRemSec &&
          prev.cooldownRemSec === nextCycle.cooldownRemSec &&
          prev.isRecurrentlyAssigned === nextCycle.isRecurrentlyAssigned
            ? prev
            : nextCycle
        );

        if (activeSessionEndTime && now >= activeSessionEndTime) {
          onSessionExpire();
        }
        if (
          cooldownEndTime &&
          now >= cooldownEndTime &&
          (!activeSessionEndTime || now >= activeSessionEndTime)
        ) {
          onCooldownExpire();
        }
      };

      syncTimers(Date.now());
      return subscribeMasterTick(syncTimers);
    }, [
      activeSessionEndTime,
      cooldownEndTime,
      targetName,
      recurrent,
      onSessionExpire,
      onCooldownExpire,
    ]);

  const activeRemSec = cycleState.activeRemSec;
  const cooldownRemSec = cycleState.cooldownRemSec;
  const speedMultiplier = getHelperSpeedMultiplier(level);
  const netSavedHours = speedMultiplier;
  const isWorking = cycleState.isWorkingNow && !!targetName;
  const isOnCooldown = !isWorking && cooldownRemSec > 0;

  const cardAccentClass =
    accentVariant === 'gold' ? 'builder-card accent-gold' : 'builder-card accent-hero';

  return (
    <div className={`rounded-2xl p-4 space-y-3.5 ${cardAccentClass}`}>
      {/* Card Header */}
      <div className="builder-header-sep flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="upgrade-title">{title}</span>
              {isWorking && (
                <span className="helper-pulse-dot" title="Apprentice Active" />
              )}
            </div>
            <p className="text-[11px] font-semibold text-gray-300">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="lvl-chip">
            {speedMultiplier}x ({netSavedHours}h saved)
          </span>
        </div>
      </div>

      {/* Level Selector (Lvl 1 to 8, auto-filled from JSON item.lvl) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-300">
            Helper Level (Lvl 1 – 8)
          </span>
          <span
            className={`text-xs font-extrabold ${
              accentVariant === 'gold' ? 'text-[#fbbf24]' : 'text-[#f0abfc]'
            }`}
          >
            Lvl {level} • {speedMultiplier}x Speed
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((lvlNum) => {
            const isSelected = level === lvlNum;
            return (
              <button
                key={lvlNum}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onChangeLevel(lvlNum);
                }}
                className={`tactile py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                  isSelected
                    ? accentVariant === 'gold'
                      ? 'bg-amber-500/25 text-[#fbbf24] border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                      : 'bg-fuchsia-500/25 text-[#f0abfc] border-fuchsia-400/60 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
                    : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {lvlNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Status Box: Active Work Session OR Daily Cooldown OR Ready to Assign */}
      {isWorking ? (
        <div className="rounded-xl p-3 bg-emerald-950/50 border border-emerald-400/40 shadow-[0_0_16px_rgba(16,185,129,0.18)] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
              <span className="helper-pulse-dot" title="Apprentice Active" />
              <span>⚡ Active Work Remaining:</span>
            </span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-[#22c55e]">
              {formatMMSS(activeRemSec)}
            </span>
          </div>
          <p className="text-xs font-bold text-[#f8fafc]">
            Boosting:{' '}
            <span className="text-[#fbbf24] font-extrabold">{targetName}</span> at{' '}
            <span className="text-[#22c55e] font-extrabold">{speedMultiplier}x speed</span>
          </p>
          {cooldownRemSec > 0 && (
            <p className="text-[11px] font-semibold text-gray-300 pt-1 border-t border-white/10 flex items-center justify-between">
              <span>{recurrent ? '🔄 Next Daily Auto-Boost In:' : '⏳ Next Available In:'}</span>
              <span className="font-mono font-bold text-amber-300">
                {formatCooldownHMS(cooldownRemSec)}
              </span>
            </p>
          )}
        </div>
      ) : isOnCooldown ? (
        <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-400/35 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold text-amber-200 block">
              {targetName && recurrent ? '🔄 Next Daily Auto-Boost In:' : '⏳ Next Available In:'}
            </span>
            {targetName && (
              <span className="text-[11px] font-semibold text-emerald-300">
                Assigned (Until Finished): {targetName} ({speedMultiplier}x)
              </span>
            )}
          </div>
          <span className="text-sm sm:text-base font-extrabold font-mono text-[#fbbf24]">
            {formatCooldownHMS(cooldownRemSec)}
          </span>
        </div>
      ) : (
        <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-400/35 flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#22c55e]">
            ✅ Ready to Assign
          </span>
          <span className="text-[11px] font-bold text-emerald-200/90">
            1h Session • {speedMultiplier}x Speed
          </span>
        </div>
      )}

      {/* Manual Action: Assign to Upgrade */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(15);
          onOpenAssignModal();
        }}
        className="btn-calculate tactile w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-lg cursor-pointer flex items-center justify-center gap-2"
      >
        <span>{icon}</span>
        <span>Assign to Upgrade</span>
      </button>
    </div>
  );
  }
);

function formatLedgerCompactDuration(parts: {
  isFinished: boolean;
  d: number;
  h: number;
  m: number;
  s: number;
}): string {
  if (parts.isFinished) return 'Finished';
  const tokens: string[] = [];
  if (parts.d > 0) tokens.push(`${parts.d}d`);
  if (parts.h > 0) tokens.push(`${parts.h}h`);
  if (parts.m > 0 || (parts.d === 0 && parts.h === 0)) tokens.push(`${parts.m}m`);
  if (parts.d === 0 && parts.h === 0) tokens.push(`${parts.s}s`);
  return tokens.join(' ');
}

function formatQuickStatDuration(parts: {
  isFinished: boolean;
  d: number;
  h: number;
  m: number;
  s: number;
}): string {
  if (parts.isFinished) return 'Free';
  if (parts.d > 0) {
    return parts.h > 0 ? `${parts.d}d ${parts.h}h` : `${parts.d}d ${parts.m}m`;
  }
  if (parts.h > 0) {
    return `${parts.h}h ${parts.m}m`;
  }
  return `${parts.m}m ${parts.s}s`;
}

const LedgerQuickStatsRow: React.FC<{
  regularCap: number;
  builderItems: LockedResultItem[];
  builderBoostEndTime: number | null;
  builderApprentice: BuilderApprenticeState;
  targetLabTimestamp: number | null;
  targetGoblinLabTimestamp: number | null;
  labBoostEndTime: number | null;
  labApprentice: LabApprenticeState;
}> = React.memo(
  ({
    regularCap,
    builderItems,
    builderBoostEndTime,
    builderApprentice,
    targetLabTimestamp,
    targetGoblinLabTimestamp,
    labBoostEndTime,
    labApprentice,
  }) => {
    const computeSnapshot = (now: number) => {
      // Dynamically filter unfinished builder upgrades against `now` every second
      // so when an upgrade completes, `NEXT FREE` immediately advances to the next active upgrade.
      const activeBuilders = builderItems
        .filter((r) => r.targetTimestamp > now)
        .sort((a, b) => a.targetTimestamp - b.targetTimestamp);

      const busyRegularCount = activeBuilders.filter((r) => !r.isGoblin).length;
      const isGoblinBusy = activeBuilders.some((r) => r.isGoblin);
      const soonestActiveBuilder = activeBuilders[0] || null;

      let nextFreeText = 'All Free';
      if (soonestActiveBuilder) {
        const realRemSec = Math.max(
          0,
          Math.ceil((soonestActiveBuilder.targetTimestamp - now) / 1000)
        );
        const parts = formatTotalSecondsToParts(realRemSec);
        nextFreeText = parts.isFinished ? 'Free' : formatQuickStatDuration(parts);
      }

      let nextLabText = 'Idle';
      const candidates: Array<{ ts: number; slot: 'main' | 'goblin' }> = [];
      if (targetLabTimestamp && targetLabTimestamp > now) {
        candidates.push({ ts: targetLabTimestamp, slot: 'main' });
      }
      if (targetGoblinLabTimestamp && targetGoblinLabTimestamp > now) {
        candidates.push({ ts: targetGoblinLabTimestamp, slot: 'goblin' });
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.ts - b.ts);
        const soonestLab = candidates[0];
        const labRealRemSec = Math.max(0, Math.ceil((soonestLab.ts - now) / 1000));
        const labParts = formatTotalSecondsToParts(labRealRemSec);
        nextLabText = labParts.isFinished ? 'Idle' : formatQuickStatDuration(labParts);
      }

      return {
        busyRegularCount,
        isGoblinBusy,
        nextFreeText,
        nextLabText,
      };
    };

    const [stats, setStats] = useState(() => computeSnapshot(Date.now()));

    useEffect(() => {
      const update = (now: number) => {
        const next = computeSnapshot(now);
        setStats((prev) =>
          prev.busyRegularCount === next.busyRegularCount &&
          prev.isGoblinBusy === next.isGoblinBusy &&
          prev.nextFreeText === next.nextFreeText &&
          prev.nextLabText === next.nextLabText
            ? prev
            : next
        );
      };
      update(Date.now());
      return subscribeMasterTick(update);
    }, [
      builderItems,
      builderBoostEndTime,
      builderApprentice,
      targetLabTimestamp,
      targetGoblinLabTimestamp,
      labBoostEndTime,
      labApprentice,
    ]);

    return (
      <div className="grid grid-cols-3 gap-2.5">
        {/* Card 1: BUILDERS */}
        <div className="ledger-stat-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8E9AA8]">
            <span className="text-[#F3CA65]" aria-hidden="true">🔨</span>
            <span>BUILDERS</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#F3CA65] tracking-tight tabular-nums mt-1.5">
            {stats.busyRegularCount} / {regularCap}
            {stats.isGoblinBusy ? ' + G' : ''}
          </div>
        </div>

        {/* Card 2: NEXT FREE */}
        <div className="ledger-stat-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8E9AA8]">
            <span className="text-[#4ADE80]" aria-hidden="true">🕒</span>
            <span>NEXT FREE</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#4ADE80] tracking-tight tabular-nums mt-1.5 truncate">
            {stats.nextFreeText}
          </div>
        </div>

        {/* Card 3: NEXT LAB */}
        <div className="ledger-stat-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8E9AA8]">
            <span className="text-[#93C5FD]" aria-hidden="true">🕒</span>
            <span>NEXT LAB</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#93C5FD] tracking-tight tabular-nums mt-1.5 truncate">
            {stats.nextLabText}
          </div>
        </div>
      </div>
    );
  }
);

const LedgerUpgradeQueueCard: React.FC<{
  rawId?: string;
  upgradeTitle: string;
  upgradeLevel?: number;
  slotBadge: string;
  isGoblin?: boolean;
  isFinishingNext?: boolean;
  category: 'builders' | 'laboratory' | 'pethouse';
  targetTimestamp: number;
  displayDate: string;
  helper?:
    | {
        level: number;
        assignedSlot: number | 'main' | 'goblin' | null;
        activeSessionEndTime: number | null;
        cooldownEndTime: number | null;
        recurrent?: boolean;
      }
    | null;
  isHelperAssignedToSlot?: boolean;
  helperIcon?: string;
  helperBoostEndTime?: number | null;
  helperSpeedMultiplier?: number;
  potionBoostEndTime?: number | null;
  potionSpeedMultiplier?: number;
  snackBoostEndTime?: number | null;
  snackType?: 'builder_bite' | 'study_soup';
  onActionClick?: () => void;
  onFinish?: () => void;
}> = React.memo(
  ({
    rawId,
    upgradeTitle,
    upgradeLevel,
    slotBadge,
    isGoblin = false,
    isFinishingNext = false,
    category,
    targetTimestamp,
    displayDate,
    helper = null,
    isHelperAssignedToSlot = false,
    helperIcon = '👷',
    helperBoostEndTime = null,
    helperSpeedMultiplier = 1,
    potionBoostEndTime = null,
    potionSpeedMultiplier = 1,
    snackBoostEndTime = null,
    snackType,
    onActionClick,
    onFinish,
  }) => {
    const [showDetailedTicker, setShowDetailedTicker] = useState(false);

    const computeCardState = (now: number) => {
      // `targetTimestamp` already incorporates all active & previewed Potion, Snack, and Helper boost deductions
      const realRemSec = Math.max(0, Math.ceil((targetTimestamp - now) / 1000));
      const parts = formatTotalSecondsToParts(realRemSec);

      const pActive =
        !!potionBoostEndTime && potionBoostEndTime > now && potionSpeedMultiplier > 1;
      const sActive = !!snackBoostEndTime && snackBoostEndTime > now;
      const basePotionSnackRate = resolveBasePotionSnackRate({
        potionActive: pActive,
        potionRate: potionSpeedMultiplier,
        snackActive: sActive,
        snackType,
      });
      const hasBaseBoost = basePotionSnackRate > 1;
      const hRate = helper ? getHelperSpeedMultiplier(helper.level) : helperSpeedMultiplier;
      const cycle =
        helper && isHelperAssignedToSlot ? getHelperCycleStateAt(helper, now) : null;
      const hWorking =
        cycle !== null
          ? cycle.isWorkingNow && hRate >= 1
          : !!helperBoostEndTime && helperBoostEndTime > now && hRate >= 1;

      let boostBadge: string | null = null;
      if (hasBaseBoost && hWorking) {
        boostBadge = `⚡ ${basePotionSnackRate + hRate}x`;
      } else if (hasBaseBoost) {
        boostBadge = `⚡ ${basePotionSnackRate}x`;
      } else if (hWorking) {
        boostBadge = `${helperIcon} ${hRate}x Active`;
      }

      // Compute subtle progress percentage based on remaining seconds relative to typical tier window
      const remSec = parts.totalUpgradeSeconds;
      const windowSec = Math.max(remSec, 14 * 86400);
      const progressPct = parts.isFinished
        ? 100
        : Math.min(96, Math.max(8, Math.round((1 - remSec / (windowSec * 1.15)) * 100)));

      return {
        isFinished: parts.isFinished,
        compactTime: formatLedgerCompactDuration(parts),
        boostBadge,
        progressPct,
      };
    };

    const [liveState, setLiveState] = useState(() => computeCardState(Date.now()));
    const wasRunningRef = useRef<boolean>(!liveState.isFinished);
    const onFinishRef = useRef(onFinish);
    onFinishRef.current = onFinish;

    useEffect(() => {
      const sync = (now: number, isInitial: boolean) => {
        const next = computeCardState(now);
        if (now >= targetTimestamp || next.isFinished) {
          if (wasRunningRef.current && !isInitial) {
            wasRunningRef.current = false;
            triggerHaptic([30, 50, 30]);
            onFinishRef.current?.();
          } else if (isInitial && next.isFinished) {
            wasRunningRef.current = false;
            onFinishRef.current?.();
          }
        } else {
          wasRunningRef.current = true;
        }
        setLiveState((prev) =>
          prev.isFinished === next.isFinished &&
          prev.compactTime === next.compactTime &&
          prev.boostBadge === next.boostBadge &&
          prev.progressPct === next.progressPct
            ? prev
            : next
        );
      };

      sync(Date.now(), true);
      return subscribeMasterTick((now) => sync(now, false));
    }, [
      targetTimestamp,
      helperBoostEndTime,
      helperSpeedMultiplier,
      helper,
      isHelperAssignedToSlot,
      potionBoostEndTime,
      potionSpeedMultiplier,
      snackBoostEndTime,
      snackType,
    ]);

    const barColorClass = isGoblin
      ? 'bg-[#4ADE80]'
      : category === 'laboratory'
      ? 'bg-[#818CF8]'
      : category === 'pethouse'
      ? 'bg-[#38BDF8]'
      : 'bg-[#F3CA65]';

    const helperFooterNote =
      helper && isHelperAssignedToSlot
        ? ` · Apprentice · ${helper.recurrent !== false ? 'repeat forecast on' : 'repeat forecast off'}`
        : '';

    return (
      <div
        className={`ledger-queue-card p-4 transition-all ${
          isGoblin ? 'border-[#4ADE80]/30' : 'border-[#2A303C]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {/* Left: Dark rounded-square .webp icon container */}
          <UpgradeAssetIcon
            rawId={rawId}
            upgradeTitle={upgradeTitle}
            upgradeLevel={upgradeLevel}
            category={category}
          />

          {/* Middle & Right: Name, Level Transition, Builder Pill, and Large Time Remaining */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base sm:text-[17px] font-bold text-white truncate leading-snug">
                {upgradeTitle}
              </h4>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  if (onActionClick) {
                    onActionClick();
                  } else {
                    setShowDetailedTicker((prev) => !prev);
                  }
                }}
                title="Inspect or assign helper boost"
                className="tactile text-[#F3CA65] hover:text-amber-300 text-sm font-bold px-1.5 py-0.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
              >
                →
              </button>
            </div>

            {/* Level Transition + Builder/Goblin Pill Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {typeof upgradeLevel === 'number' && (
                <span
                  className={`text-[11px] font-bold tracking-wider uppercase ${
                    isGoblin ? 'text-[#4ADE80]' : 'text-[#8E9AA8]'
                  }`}
                >
                  LEVEL {upgradeLevel} → {upgradeLevel + 1}
                </span>
              )}

              {isGoblin ? (
                <span className="slot-badge-goblin">
                  {slotBadge === '[GOBLIN]' ? '• GOBLIN' : slotBadge}
                </span>
              ) : (
                <span
                  className={
                    category === 'laboratory'
                      ? 'slot-badge-hero'
                      : category === 'pethouse'
                      ? 'slot-badge-goblin'
                      : 'slot-badge-regular'
                  }
                >
                  {slotBadge}
                </span>
              )}

              {isFinishingNext && (
                <span className="slot-badge-goblin">NEXT FREE</span>
              )}

              {liveState.boostBadge && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/35">
                  {liveState.boostBadge}
                </span>
              )}
            </div>

            {/* Middle-Bottom (Large Text): Exact Real-World Finish Date */}
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              {liveState.isFinished ? (
                <span className="text-sm sm:text-base font-extrabold text-[#4ADE80] uppercase tracking-wide">
                  ⚡ Upgrade Completed!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setShowDetailedTicker((prev) => !prev);
                  }}
                  className="text-left text-lg sm:text-xl font-extrabold text-white tracking-tight tabular-nums cursor-pointer hover:text-[#F3CA65] transition-colors leading-snug"
                  title="Tap to toggle second-by-second HUD ticker"
                >
                  {displayDate}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Optional Expandable 4-Unit Second-by-Second HUD Ticker */}
        {showDetailedTicker && !liveState.isFinished && (
          <div className="mt-3 pt-3 border-t border-[#242B38]">
            <LiveHudTicker
              targetTimestamp={targetTimestamp}
              helper={helper}
              isHelperAssignedToSlot={isHelperAssignedToSlot}
              helperIcon={helperIcon}
              helperBoostEndTime={helperBoostEndTime}
              helperSpeedMultiplier={helperSpeedMultiplier}
              potionBoostEndTime={potionBoostEndTime}
              potionSpeedMultiplier={potionSpeedMultiplier}
              snackBoostEndTime={snackBoostEndTime}
              snackType={snackType}
              accentColorClass={
                isGoblin
                  ? 'text-[#4ADE80]'
                  : category === 'laboratory'
                  ? 'text-[#A78BFA]'
                  : 'text-[#F3CA65]'
              }
            />
          </div>
        )}

        {/* Thin Horizontal Progress Bar */}
        <div className="w-full h-1.5 bg-[#232A39] rounded-full overflow-hidden mt-3.5 mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
            style={{ width: `${liveState.progressPct}%` }}
          />
        </div>

        {/* Bottom Progress Line (Small Text): Remaining Countdown Time */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#8E9AA8]">
          <span className="truncate tabular-nums">
            ↗ {liveState.isFinished ? 'Completed' : liveState.compactTime}
            {helperFooterNote}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setShowDetailedTicker((prev) => !prev);
            }}
            className="text-[10px] font-bold text-[#8E9AA8] hover:text-white shrink-0 cursor-pointer"
          >
            {showDetailedTicker ? 'Hide seconds' : 'Live seconds'}
          </button>
        </div>
      </div>
    );
  }
);

export default function App() {
  const initialMulti = loadMultiAccountStorage();
  const initialActiveProfile =
    initialMulti.accounts.find((a) => a.id === initialMulti.activeAccountId) ||
    initialMulti.accounts[0];
  const initial = initialActiveProfile.data;

  // Multi-Account State (isolated per village in localStorage)
  const [accounts, setAccounts] = useState<VillageProfile[]>(initialMulti.accounts);
  const [activeAccountId, setActiveAccountId] = useState<string>(initialActiveProfile.id);

  // Rename & Delete Village Profile Modal State
  const [renamingAccountId, setRenamingAccountId] = useState<string | null>(null);
  const [renameVillageInput, setRenameVillageInput] = useState<string>('');
  const [confirmDeleteVillage, setConfirmDeleteVillage] = useState<boolean>(false);

  // Segmented Category Navigation Tab ('builders' | 'laboratory' | 'pethouse')
  const [activeTab, setActiveTab] = useState<PlannerCategoryTab>('builders');

  // Active Account Builder Calculator State
  const [currentMode, setCurrentMode] = useState<BuilderSubTabMode>(initial.mode);
  const [numBuilders, setNumBuilders] = useState<number>(initial.numBuilders);
  const [builders, setBuilders] = useState<BuilderTime[]>(initial.builders);
  const [potionsInput, setPotionsInput] = useState<string>(initial.potions || '0');

  const [lockedResults, setLockedResults] = useState<LockedResultItem[]>(
    initial.lockedResults || []
  );
  const [savedText, setSavedText] = useState<string>(initial.lockedSavedText || '');
  const [showResult, setShowResult] = useState<boolean>(
    () => (initial.lockedResults?.length ?? 0) > 0
  );
  const [animKey, setAnimKey] = useState<number>(0);

  // Collapsible Upgrade Timers Accordion State (defaults to collapsed on launch & reopen, persisted in localStorage)
  const [isTimersCollapsed, setIsTimersCollapsed] = useState<boolean>(() => {
    try {
      localStorage.setItem(TIMERS_COLLAPSED_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    return true;
  });
  const [isLabMainEditCollapsed, setIsLabMainEditCollapsed] = useState<boolean>(true);
  const [isLabGoblinEditCollapsed, setIsLabGoblinEditCollapsed] = useState<boolean>(true);
  const [isPetEditCollapsed, setIsPetEditCollapsed] = useState<boolean>(true);

  const setTimersCollapsedState = useCallback((collapsed: boolean) => {
    setIsTimersCollapsed(collapsed);
    if (collapsed) {
      setIsLabMainEditCollapsed(true);
      setIsLabGoblinEditCollapsed(true);
      setIsPetEditCollapsed(true);
    }
    try {
      localStorage.setItem(TIMERS_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTimersCollapsed = useCallback(() => {
    triggerHaptic(12);
    setIsTimersCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TIMERS_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Laboratory 24x Engine State (per account)
  const [researchPotions, setResearchPotions] = useState<number>(initial.researchPotions ?? 0);
  const [labTimer, setLabTimer] = useState<BuilderTime>(
    initial.labTimer || createEmptyTimer()
  );
  const [goblinLabTimer, setGoblinLabTimer] = useState<BuilderTime>(
    initial.goblinLabTimer || createEmptyTimer()
  );
  const [targetLabTimestamp, setTargetLabTimestamp] = useState<number | null>(
    initial.targetLabTimestamp ?? null
  );
  const [labFormattedDate, setLabFormattedDate] = useState<string>(
    initial.labFormattedDate || ''
  );
  const [labSavedText, setLabSavedText] = useState<string>(initial.labSavedText || '');
  const [targetGoblinLabTimestamp, setTargetGoblinLabTimestamp] = useState<number | null>(
    initial.targetGoblinLabTimestamp ?? null
  );
  const [goblinLabFormattedDate, setGoblinLabFormattedDate] = useState<string>(
    initial.goblinLabFormattedDate || ''
  );

  // Pet House 24x Engine State (per account)
  const [petPotions, setPetPotions] = useState<number>(initial.petPotions ?? 0);
  const [petTimer, setPetTimer] = useState<BuilderTime>(
    initial.petTimer || createEmptyTimer()
  );
  const [targetPetTimestamp, setTargetPetTimestamp] = useState<number | null>(
    initial.targetPetTimestamp ?? null
  );
  const [petFormattedDate, setPetFormattedDate] = useState<string>(
    initial.petFormattedDate || ''
  );
  const [petSavedText, setPetSavedText] = useState<string>(initial.petSavedText || '');

  // Active In-Game Potion & Magic Snack Boost End Timestamps (per account)
  const [builderBoostEndTime, setBuilderBoostEndTime] = useState<number | null>(
    initial.builderBoostEndTime && initial.builderBoostEndTime > Date.now()
      ? initial.builderBoostEndTime
      : null
  );
  const [labBoostEndTime, setLabBoostEndTime] = useState<number | null>(
    initial.labBoostEndTime && initial.labBoostEndTime > Date.now()
      ? initial.labBoostEndTime
      : null
  );
  const [petBoostEndTime, setPetBoostEndTime] = useState<number | null>(
    initial.petBoostEndTime && initial.petBoostEndTime > Date.now()
      ? initial.petBoostEndTime
      : null
  );
  const [builderBiteEndTime, setBuilderBiteEndTime] = useState<number | null>(
    initial.builderBiteEndTime && initial.builderBiteEndTime > Date.now()
      ? initial.builderBiteEndTime
      : null
  );
  const [studySoupEndTime, setStudySoupEndTime] = useState<number | null>(
    initial.studySoupEndTime && initial.studySoupEndTime > Date.now()
      ? initial.studySoupEndTime
      : null
  );

  // Builder's Apprentice (93000000) & Lab Apprentice (93000001) State (per account)
  const [builderApprentice, setBuilderApprentice] = useState<BuilderApprenticeState>(
    () => initial.builderApprentice || createDefaultBuilderApprentice()
  );
  const [labApprentice, setLabApprentice] = useState<LabApprenticeState>(
    () => initial.labApprentice || createDefaultLabApprentice()
  );
  const [thLevel, setThLevel] = useState<number | undefined>(() => initial.thLevel);
  const [lastSynced, setLastSynced] = useState<string | undefined>(() => initial.lastSynced);

  // Live 1-second clock tick for active boost button labels & helper lifecycle
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Assign Apprentice to Upgrade Modal State ('builder' | 'lab' | null)
  const [assignModalType, setAssignModalType] = useState<'builder' | 'lab' | null>(null);

  // CoC Village JSON Import Modal, Add Account & Full Backup/Restore state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAddingNewAccount, setIsAddingNewAccount] = useState<boolean>(false);
  const [newVillageNameInput, setNewVillageNameInput] = useState<string>('');
  const [jsonInputText, setJsonInputText] = useState<string>('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupRestoreInput, setBackupRestoreInput] = useState<string>('');
  const [isWidgetPreviewOpen, setIsWidgetPreviewOpen] = useState<boolean>(false);
  const [widgetPreviewIdx, setWidgetPreviewIdx] = useState<number>(0);
  const [widgetRefreshTime, setWidgetRefreshTime] = useState<number>(() => Date.now());
  const jsonImportTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backupRestoreTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagMismatchAlert, setTagMismatchAlert] = useState<{
    incomingTag: string;
    currentTag: string;
  } | null>(null);

  // Safe Two-Step Confirmation & Reversible Timer Editing State
  const [confirmDialogType, setConfirmDialogType] = useState<
    'reset_all' | 'start_edit' | 'apply_edit' | null
  >(null);
  const [pendingClearSlot, setPendingClearSlot] = useState<
    'lab_main' | 'lab_goblin' | 'pet' | null
  >(null);
  const [isEditingTimers, setIsEditingTimers] = useState<boolean>(false);
  const editSnapshotRef = useRef<{
    mode: BuilderSubTabMode;
    numBuilders: number;
    builders: BuilderTime[];
    lockedResults: LockedResultItem[];
    savedText: string;
    showResult: boolean;
    builderApprentice: BuilderApprenticeState;
  } | null>(null);

  // Account-Isolated & Section-Isolated Monthly Cumulative Stats (Keyed by locked in-game player tag + YYYY_MM + section)
  const [monthlyStats, setMonthlyStats] = useState<MonthlySectionStats>(() =>
    loadMonthlyStatsForTag(initialActiveProfile.tag)
  );
  const [monthlyHistory, setMonthlyHistory] = useState<VillageMonthlyHistory>(() =>
    loadVillageMonthlyHistory(initialActiveProfile.tag)
  );
  const [summaryModalSection, setSummaryModalSection] = useState<
    'builders' | 'lab' | 'pethouse' | null
  >(null);
  const [isFiveMonthArchiveOpen, setIsFiveMonthArchiveOpen] = useState<boolean>(false);

  useEffect(() => {
    if (summaryModalSection === null) {
      setIsFiveMonthArchiveOpen(false);
    }
  }, [summaryModalSection]);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToast({ id, type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  };

  const getActiveVillageName = (targetId: string = activeAccountId): string => {
    const found = accounts.find((a) => a.id === targetId);
    return found?.name || 'Main Account';
  };

  const activeAccountProfile =
    accounts.find((a) => a.id === activeAccountId) || accounts[0];
  const activePlayerTag = activeAccountProfile?.tag?.trim() || '';
  const activeYearMonthKey = getCurrentYearMonthKey(new Date(nowTick));

  // Automatically load isolated monthly stats & village_history_${YYYY_MM}_${activePlayerTag}
  // when switching accounts, locking a tag, opening the modal, or rolling into a new calendar month
  useEffect(() => {
    const currentAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];
    const currentTag = (currentAccount?.tag || '').trim().toUpperCase();
    const loadedHistory = loadVillageMonthlyHistory(currentTag, activeYearMonthKey);
    setMonthlyHistory(loadedHistory);
    setMonthlyStats({
      builderPotionsCount: loadedHistory.potions.builder.used,
      builderSecondsSaved: loadedHistory.potions.builder.timeSavedMinutes * 60,
      researchPotionsCount: loadedHistory.potions.research.used,
      labSecondsSaved: loadedHistory.potions.research.timeSavedMinutes * 60,
      petPotionsCount: loadedHistory.potions.pet.used,
      petSecondsSaved: loadedHistory.potions.pet.timeSavedMinutes * 60,
    });
  }, [accounts, activeAccountId, activePlayerTag, activeYearMonthKey, summaryModalSection]);

  const recordConfirmedPotionUsage = (
    section: 'builders' | 'lab' | 'pethouse',
    addedSecondsSaved: number,
    addedPotionsCount: number
  ) => {
    if (addedPotionsCount <= 0 || addedSecondsSaved <= 0) {
      return;
    }

    // Dynamically grab the player_tag of the currently active village on screen
    const currentActiveVillage =
      accounts.find((a) => a.id === activeAccountId) || accounts[0];
    const currentActiveTag = (currentActiveVillage?.tag || activePlayerTag || '')
      .trim()
      .toUpperCase();

    if (!currentActiveTag) {
      return;
    }

    const currentMonthKey = getCurrentYearMonthKey(new Date());
    const addedMinutes = Math.max(1, Math.round(addedSecondsSaved / 60));

    // Fetch the history object strictly for THAT specific tag: `village_history_${YYYY_MM}_${activePlayerTag}`
    const currentHistory = loadVillageMonthlyHistory(currentActiveTag, currentMonthKey);
    const updatedHistory: VillageMonthlyHistory = {
      ...currentHistory,
      potions: {
        builder: { ...currentHistory.potions.builder },
        research: { ...currentHistory.potions.research },
        pet: { ...currentHistory.potions.pet },
      },
      upgrades: { ...currentHistory.upgrades },
    };

    if (section === 'builders') {
      updatedHistory.potions.builder.used += Math.round(addedPotionsCount);
      updatedHistory.potions.builder.timeSavedMinutes += addedMinutes;
    } else if (section === 'lab') {
      updatedHistory.potions.research.used += Math.round(addedPotionsCount);
      updatedHistory.potions.research.timeSavedMinutes += addedMinutes;
    } else {
      updatedHistory.potions.pet.used += Math.round(addedPotionsCount);
      updatedHistory.potions.pet.timeSavedMinutes += addedMinutes;
    }

    // Save strictly back to `village_history_${YYYY_MM}_${activePlayerTag}`
    saveVillageMonthlyHistory(updatedHistory, currentActiveTag, currentMonthKey);
    setMonthlyHistory(updatedHistory);

    const updatedStats: MonthlySectionStats = {
      builderPotionsCount: updatedHistory.potions.builder.used,
      builderSecondsSaved: updatedHistory.potions.builder.timeSavedMinutes * 60,
      researchPotionsCount: updatedHistory.potions.research.used,
      labSecondsSaved: updatedHistory.potions.research.timeSavedMinutes * 60,
      petPotionsCount: updatedHistory.potions.pet.used,
      petSecondsSaved: updatedHistory.potions.pet.timeSavedMinutes * 60,
    };

    saveMonthlySectionStatsForTag(currentActiveTag, section, updatedStats, currentMonthKey);
    setMonthlyStats(updatedStats);
  };

  const discardUnconfirmedTimerEdits = useCallback(() => {
    const snap = editSnapshotRef.current;
    if (!snap) {
      setIsEditingTimers(false);
      return;
    }
    setCurrentMode(snap.mode);
    setNumBuilders(snap.numBuilders);
    setBuilders(snap.builders.map((b) => ({ ...b })));
    setLockedResults(snap.lockedResults.map((r) => ({ ...r })));
    setSavedText(snap.savedText);
    setShowResult(snap.showResult);
    setBuilderApprentice({ ...snap.builderApprentice });
    editSnapshotRef.current = null;
    setIsEditingTimers(false);
    setConfirmDialogType(null);
  }, []);

  const clearJsonImportInputState = useCallback(() => {
    setJsonInputText('');
    if (jsonImportTextareaRef.current) {
      jsonImportTextareaRef.current.value = '';
    }
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = '';
    }
  }, []);

  const applyTextToTextareaAndState = useCallback(
    (
      textareaEl: HTMLTextAreaElement | null,
      text: string,
      setStateValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
      setStateValue(text);
      if (textareaEl) {
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (nativeTextareaValueSetter) {
          nativeTextareaValueSetter.call(textareaEl, text);
        } else {
          textareaEl.value = text;
        }
        textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
        textareaEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    []
  );

  const handlePasteJsonClipboard = useCallback(
    async (
      textareaEl: HTMLTextAreaElement | null,
      setStateValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
      triggerHaptic(15);
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          const clipText = await navigator.clipboard.readText();
          if (typeof clipText === 'string' && clipText.length > 0) {
            applyTextToTextareaAndState(textareaEl, clipText, setStateValue);
            return;
          }
        }
      } catch {
        // Clipboard access restricted by WebView or permissions; fall through to focus fallback
      }

      if (textareaEl) {
        textareaEl.focus();
        try {
          if (typeof document.execCommand === 'function') {
            const pasted = document.execCommand('paste');
            if (pasted && textareaEl.value) {
              setStateValue(textareaEl.value);
              return;
            }
          }
        } catch {
          // Ignore execCommand error
        }
      }
    },
    [applyTextToTextareaAndState]
  );

  // Track whether pending potion previews are active so the Master Tick Loop only triggers top-level
  // `nowTick` state updates when necessary (or on month rollover / foreground resume).
  const hasPendingPotionPreviewRef = useRef<boolean>(false);
  hasPendingPotionPreviewRef.current =
    (parseInt(potionsInput, 10) || 0) > 0 || researchPotions > 0 || petPotions > 0;
  const lastSyncedMonthKeyRef = useRef<string>(activeYearMonthKey);
  lastSyncedMonthKeyRef.current = activeYearMonthKey;

  // SINGLE CENTRALIZED MASTER INTERVAL (1000ms) + PAGE VISIBILITY API PAUSE/RESUME:
  // - Drives all countdown cards, active boost pills, and helper cards in one synchronized tick.
  // - Immediately clears/pauses when `document.hidden === true` (zero background CPU/battery drain).
  // - Immediately re-syncs against `Date.now()` and restarts when `document.hidden === false`.
  useEffect(() => {
    void requestNotificationPermissions();
    setTimersCollapsedState(true);

    let masterIntervalId: number | null = null;

    const runMasterTick = (forceStateSync = false) => {
      const now = Date.now();

      // 1. Batch-notify all subscribed live HUD tickers, boost pills, and helper cards in one pass
      dispatchMasterTick(now);

      // 2. Sync top-level `nowTick` only when needed (foreground resume, active potion preview, or month rollover)
      if (
        forceStateSync ||
        hasPendingPotionPreviewRef.current ||
        getCurrentYearMonthKey(new Date(now)) !== lastSyncedMonthKeyRef.current
      ) {
        setNowTick(now);
      }

      // 3. Transition expired potion & snack boosts only when an expiration actually occurs
      setBuilderBoostEndTime((prev) => (prev && prev <= now ? null : prev));
      setLabBoostEndTime((prev) => (prev && prev <= now ? null : prev));
      setPetBoostEndTime((prev) => (prev && prev <= now ? null : prev));
      setBuilderBiteEndTime((prev) => (prev && prev <= now ? null : prev));
      setStudySoupEndTime((prev) => (prev && prev <= now ? null : prev));
    };

    const stopMasterInterval = () => {
      if (masterIntervalId !== null) {
        window.clearInterval(masterIntervalId);
        masterIntervalId = null;
      }
    };

    const startMasterInterval = () => {
      stopMasterInterval();
      if (!document.hidden) {
        masterIntervalId = window.setInterval(() => {
          if (document.hidden) {
            stopMasterInterval();
            return;
          }
          runMasterTick(false);
        }, 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App minimized, switched away, or screen off: pause Master JS Interval immediately
        stopMasterInterval();
      } else {
        // App reopened or brought back to foreground: discard unconfirmed edits, collapse timers,
        // immediately re-sync all live values against Date.now(), and restart Master Interval
        if (editSnapshotRef.current) {
          discardUnconfirmedTimerEdits();
        }
        setTimersCollapsedState(true);
        runMasterTick(true);
        startMasterInterval();
      }
    };

    startMasterInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopMasterInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setTimersCollapsedState, discardUnconfirmedTimerEdits]);

  const applySavedStateToActiveView = (d: SavedState) => {
    const now = Date.now();
    setCurrentMode(d.mode);
    setNumBuilders(d.numBuilders);
    setBuilders(d.builders);
    setPotionsInput(d.potions || '0');
    setLockedResults(d.lockedResults || []);
    setSavedText(d.lockedSavedText || '');
    setShowResult((d.lockedResults?.length ?? 0) > 0);
    setResearchPotions(d.researchPotions ?? 0);
    setLabTimer(d.labTimer || createEmptyTimer());
    setGoblinLabTimer(d.goblinLabTimer || createEmptyTimer());
    setTargetLabTimestamp(d.targetLabTimestamp ?? null);
    setLabFormattedDate(d.labFormattedDate || '');
    setLabSavedText(d.labSavedText || '');
    setTargetGoblinLabTimestamp(d.targetGoblinLabTimestamp ?? null);
    setGoblinLabFormattedDate(d.goblinLabFormattedDate || '');
    setPetPotions(d.petPotions ?? 0);
    setPetTimer(d.petTimer || createEmptyTimer());
    setTargetPetTimestamp(d.targetPetTimestamp ?? null);
    setPetFormattedDate(d.petFormattedDate || '');
    setPetSavedText(d.petSavedText || '');
    setBuilderBoostEndTime(
      d.builderBoostEndTime && d.builderBoostEndTime > now ? d.builderBoostEndTime : null
    );
    setLabBoostEndTime(
      d.labBoostEndTime && d.labBoostEndTime > now ? d.labBoostEndTime : null
    );
    setPetBoostEndTime(
      d.petBoostEndTime && d.petBoostEndTime > now ? d.petBoostEndTime : null
    );
    setBuilderBiteEndTime(
      d.builderBiteEndTime && d.builderBiteEndTime > now ? d.builderBiteEndTime : null
    );
    setStudySoupEndTime(
      d.studySoupEndTime && d.studySoupEndTime > now ? d.studySoupEndTime : null
    );
    setBuilderApprentice(d.builderApprentice || createDefaultBuilderApprentice());
    setLabApprentice(d.labApprentice || createDefaultLabApprentice());
    setThLevel(d.thLevel);
    setLastSynced(d.lastSynced);
    setAnimKey((prev) => prev + 1);
  };

  // Sync current active account state into the accounts list and persist to localStorage
  // (Skip persisting while unconfirmed timer edits are in progress so cancel/navigation reverts cleanly)
  useEffect(() => {
    if (isEditingTimers) return;
    try {
      const currentStateToSave: SavedState = {
        mode: currentMode,
        numBuilders,
        builders,
        potions: potionsInput,
        lockedResults,
        lockedSavedText: savedText,
        researchPotions,
        labTimer,
        goblinLabTimer,
        targetLabTimestamp,
        labFormattedDate,
        labSavedText,
        targetGoblinLabTimestamp,
        goblinLabFormattedDate,
        petPotions,
        petTimer,
        targetPetTimestamp,
        petFormattedDate,
        petSavedText,
        builderBoostEndTime,
        labBoostEndTime,
        petBoostEndTime,
        builderBiteEndTime,
        studySoupEndTime,
        builderApprentice,
        labApprentice,
        thLevel,
        lastSynced,
      };

      // Keep legacy STORAGE_KEY synced with the active village profile
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStateToSave));

      setAccounts((prevAccounts) => {
        const updatedAccounts = prevAccounts.map((acc) =>
          acc.id === activeAccountId ? { ...acc, data: currentStateToSave } : acc
        );
        const multiPayload: MultiAccountStorage = {
          activeAccountId,
          accounts: updatedAccounts,
        };
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(multiPayload));
        syncAllVillagesToNativeWidget(updatedAccounts, activeAccountId);
        return updatedAccounts;
      });
    } catch {
      // Ignore storage quota errors
    }
  }, [
    isEditingTimers,
    activeAccountId,
    currentMode,
    numBuilders,
    builders,
    potionsInput,
    lockedResults,
    savedText,
    researchPotions,
    labTimer,
    goblinLabTimer,
    targetLabTimestamp,
    labFormattedDate,
    labSavedText,
    targetGoblinLabTimestamp,
    goblinLabFormattedDate,
    petPotions,
    petTimer,
    targetPetTimestamp,
    petFormattedDate,
    petSavedText,
    builderBoostEndTime,
    labBoostEndTime,
    petBoostEndTime,
    builderBiteEndTime,
    studySoupEndTime,
    builderApprentice,
    labApprentice,
    thLevel,
    lastSynced,
  ]);

  // Switch between village profiles when tapping an account pill (pencil icon is isolated)
  const handleAccountChipClick = (account: VillageProfile) => {
    triggerHaptic(15);
    if (account.id === activeAccountId) {
      return;
    }

    if (isEditingTimers) {
      discardUnconfirmedTimerEdits();
    }

    setActiveAccountId(account.id);
    applySavedStateToActiveView(account.data);
  };

  const handleOpenRenameModal = (account: VillageProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(15);
    setRenamingAccountId(account.id);
    setRenameVillageInput(account.name);
    setConfirmDeleteVillage(false);
  };

  const handleSaveRenamedVillage = () => {
    triggerHaptic(15);
    if (!renamingAccountId) return;
    const trimmed = renameVillageInput.trim();
    if (!trimmed) {
      showToast('error', 'Village name cannot be empty');
      return;
    }

    const targetAccount = accounts.find((acc) => acc.id === renamingAccountId);
    if (targetAccount) {
      const accData =
        renamingAccountId === activeAccountId
          ? {
              ...targetAccount.data,
              lockedResults,
              labTimer,
              goblinLabTimer,
              targetLabTimestamp,
              targetGoblinLabTimestamp,
              petTimer,
              targetPetTimestamp,
            }
          : targetAccount.data;

      void scheduleBuilderNotificationsForVillage(
        renamingAccountId,
        trimmed,
        accData.lockedResults || []
      );
      void scheduleLabNotificationsForVillage(
        renamingAccountId,
        trimmed,
        accData.labTimer || createEmptyTimer(),
        accData.targetLabTimestamp ?? null,
        accData.goblinLabTimer || createEmptyTimer(),
        accData.targetGoblinLabTimestamp ?? null
      );
      void schedulePetNotificationForVillage(
        renamingAccountId,
        trimmed,
        accData.petTimer || createEmptyTimer(),
        accData.targetPetTimestamp ?? null
      );
      void scheduleBoostExpiryNotificationsForVillage(
        renamingAccountId,
        trimmed,
        renamingAccountId === activeAccountId ? builderBoostEndTime : accData.builderBoostEndTime,
        renamingAccountId === activeAccountId ? labBoostEndTime : accData.labBoostEndTime,
        renamingAccountId === activeAccountId ? petBoostEndTime : accData.petBoostEndTime
      );
    }

    setAccounts((prev) => {
      const updated = prev.map((acc) =>
        acc.id === renamingAccountId ? { ...acc, name: trimmed } : acc
      );
      try {
        const multiPayload: MultiAccountStorage = {
          activeAccountId,
          accounts: updated,
        };
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(multiPayload));
      } catch {
        // Ignore storage error
      }
      return updated;
    });

    setRenamingAccountId(null);
    setRenameVillageInput('');
    setConfirmDeleteVillage(false);
    showToast('success', `Renamed village to "${trimmed}"`);
  };

  // Delete village profile & isolated timer data from localStorage + cancel its scheduled notifications
  const handleConfirmDeleteVillage = () => {
    triggerHaptic([20, 40, 20]);
    if (!renamingAccountId) return;

    const villageIdToDelete = renamingAccountId;
    void cancelAllNotificationsForVillage(villageIdToDelete);

    const targetIndex = accounts.findIndex((a) => a.id === villageIdToDelete);
    const deletedName =
      targetIndex >= 0 ? accounts[targetIndex].name : 'Village';
    const remainingAccounts = accounts.filter((a) => a.id !== villageIdToDelete);

    let nextAccountsList: VillageProfile[];
    let nextActiveProfile: VillageProfile;

    if (remainingAccounts.length === 0) {
      // Create a clean default village if none are left
      const freshDefaultState = createDefaultSavedState();
      nextActiveProfile = {
        id: 'main',
        name: 'Main Account',
        data: freshDefaultState,
      };
      nextAccountsList = [nextActiveProfile];
    } else {
      nextAccountsList = remainingAccounts;
      if (villageIdToDelete === activeAccountId) {
        const nearestIdx = Math.min(
          Math.max(0, targetIndex - 1),
          remainingAccounts.length - 1
        );
        nextActiveProfile = remainingAccounts[nearestIdx];
      } else {
        nextActiveProfile =
          remainingAccounts.find((a) => a.id === activeAccountId) ||
          remainingAccounts[0];
      }
    }

    setAccounts(nextAccountsList);
    setActiveAccountId(nextActiveProfile.id);
    applySavedStateToActiveView(nextActiveProfile.data);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextActiveProfile.data));
      const multiPayload: MultiAccountStorage = {
        activeAccountId: nextActiveProfile.id,
        accounts: nextAccountsList,
      };
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(multiPayload));
    } catch {
      // Ignore storage error
    }

    setRenamingAccountId(null);
    setRenameVillageInput('');
    setConfirmDeleteVillage(false);
    showToast('success', `Deleted "${deletedName}"`);
  };

  const handleOpenAddVillageModal = () => {
    triggerHaptic(15);
    setIsAddingNewAccount(true);
    setNewVillageNameInput(`Village ${accounts.length + 1}`);
    setJsonInputText('');
    setIsImportModalOpen(true);
  };

  const handleCreateEmptyVillage = () => {
    triggerHaptic(15);
    const trimmedName = newVillageNameInput.trim() || `Village ${accounts.length + 1}`;
    const newId = `village_${Date.now()}`;
    const emptyState = createDefaultSavedState();
    const newProfile: VillageProfile = {
      id: newId,
      name: trimmedName,
      data: emptyState,
    };

    const nextAccounts = [...accounts, newProfile];
    setAccounts(nextAccounts);
    setActiveAccountId(newId);
    applySavedStateToActiveView(emptyState);

    setIsImportModalOpen(false);
    setIsAddingNewAccount(false);
    setNewVillageNameInput('');
    setJsonInputText('');
    showToast('success', `Added ${trimmedName}!`);
  };

  const ensureEditSessionStarted = (): boolean => {
    if (isEditingTimers) return true;
    // If there are already locked timers or active builder inputs, require "Do you want to edit current timers?" confirmation first
    const hasExistingBuilderData =
      lockedResults.length > 0 ||
      builders.some((b) => getTimerTotalSeconds(b) > 0);
    if (hasExistingBuilderData) {
      setConfirmDialogType('start_edit');
      return false;
    }
    // Otherwise start an edit session with a snapshot of the clean state
    editSnapshotRef.current = {
      mode: currentMode,
      numBuilders,
      builders: builders.map((b) => ({ ...b })),
      lockedResults: lockedResults.map((r) => ({ ...r })),
      savedText,
      showResult,
      builderApprentice: { ...builderApprentice },
    };
    setIsEditingTimers(true);
    return true;
  };

  const handleToggleTimersAccordion = () => {
    triggerHaptic(12);
    if (!isTimersCollapsed && isEditingTimers) {
      // Collapsing without confirming "Apply Changes?" reverts all unconfirmed edits
      discardUnconfirmedTimerEdits();
      showToast('error', 'Discarded unconfirmed timer changes');
    }
    setTimersCollapsedState(!isTimersCollapsed);
  };

  const handleCategoryTabChange = (tab: PlannerCategoryTab) => {
    triggerHaptic(15);
    if (tab !== activeTab && isEditingTimers) {
      discardUnconfirmedTimerEdits();
      showToast('error', 'Discarded unconfirmed timer changes');
    }
    setActiveTab(tab);
  };

  const setMode = (mode: BuilderSubTabMode) => {
    triggerHaptic(15);
    if (mode === 'helpers' && isEditingTimers) {
      discardUnconfirmedTimerEdits();
    }
    setCurrentMode(mode);
  };

  const handleBuilderCountChange = (nextCount: number) => {
    if (!ensureEditSessionStarted()) return;
    const clamped = Math.min(7, Math.max(1, nextCount));
    if (clamped !== numBuilders) {
      triggerHaptic(12);
      setNumBuilders(clamped);
    }
  };

  const clampTimeFieldValue = (field: 'd' | 'h' | 'm', rawVal: string): string => {
    const digits = rawVal.replace(/\D/g, '');
    if (digits === '') return '';
    let num = parseInt(digits, 10);
    if (field === 'h' && num > 24) num = 24;
    else if (field === 'm' && num > 60) num = 60;
    else if (field === 'd' && num > 999) num = 999;
    return String(num);
  };

  const handleBuilderTimeChange = (
    index: number,
    field: 'd' | 'h' | 'm',
    value: string
  ) => {
    if (!ensureEditSessionStarted()) return;
    const clamped = clampTimeFieldValue(field, value);
    setBuilders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: clamped, s: 0 };
      return next;
    });
  };

  const applyPresetToBuilder = (
    index: number,
    deltaDays: number,
    deltaHours: number
  ) => {
    if (!ensureEditSessionStarted()) return;
    triggerHaptic(15);
    setBuilders((prev) => {
      const next = [...prev];
      const current = next[index] || { d: '', h: '', m: '' };
      const curD = Math.max(0, parseInt(current.d, 10) || 0);
      const curH = Math.max(0, parseInt(current.h, 10) || 0);
      const curM = Math.max(0, parseInt(current.m, 10) || 0);

      const totalHours = curH + deltaHours;
      const extraDaysFromHours = Math.floor(totalHours / 24);
      const newH = totalHours % 24;
      const newD = Math.min(999, curD + deltaDays + extraDaysFromHours);

      next[index] = {
        ...current,
        d: newD > 0 ? String(newD) : current.d !== '' ? '0' : '',
        h: newH > 0 ? String(newH) : deltaHours > 0 || current.h !== '' ? String(newH) : '',
        m: curM > 0 ? String(curM) : current.m,
        s: 0,
      };
      return next;
    });
  };

  const handlePotionsChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
      setPotionsInput('0');
      return;
    }
    let num = parseInt(digits, 10);
    if (num > 999) num = 999;
    setPotionsInput(String(num));
  };

  const adjustPotions = (delta: number) => {
    triggerHaptic(15);
    const cur = Math.max(0, parseInt(potionsInput, 10) || 0);
    const next = Math.min(999, Math.max(0, cur + delta));
    setPotionsInput(String(next));
  };

  // ============================================================================
  // CURRENT REMAINING WORK HELPERS (ACCOUNTS FOR ACTIVE 10x / 24x, SNACK & HELPER BOOSTS)
  // ============================================================================
  const getBuilderSlotCurrentRemainingSeconds = (
    slotIdx: number,
    overrideBuilderBoostEndTime: number | null = builderBoostEndTime,
    overrideBuilderHelper: BuilderApprenticeState = builderApprentice,
    overrideBuilderBiteEndTime: number | null = builderBiteEndTime
  ): number => {
    const now = Date.now();
    const lockedItem = lockedResults.find((r) => r.builderIndex === slotIdx);
    if (lockedItem && lockedItem.targetTimestamp > now) {
      const isAssignedHere = overrideBuilderHelper.assignedSlot === slotIdx;
      const parts = computeTimeParts(
        lockedItem.targetTimestamp,
        isAssignedHere ? overrideBuilderHelper.activeSessionEndTime : null,
        getHelperSpeedMultiplier(overrideBuilderHelper.level),
        overrideBuilderBoostEndTime,
        10,
        now,
        overrideBuilderHelper,
        isAssignedHere,
        overrideBuilderBiteEndTime,
        'builder_bite'
      );
      return parts.totalUpgradeSeconds;
    }
    return getTimerTotalSeconds(builders[slotIdx] || createEmptyTimer());
  };

  const getLabSlotCurrentRemainingSeconds = (
    slot: 'main' | 'goblin',
    overrideLabBoostEndTime: number | null = labBoostEndTime,
    overrideLabHelper: LabApprenticeState = labApprentice,
    overrideStudySoupEndTime: number | null = studySoupEndTime
  ): number => {
    const now = Date.now();
    const targetTs = slot === 'main' ? targetLabTimestamp : targetGoblinLabTimestamp;
    if (targetTs && targetTs > now) {
      const isAssignedHere = overrideLabHelper.assignedSlot === slot;
      const parts = computeTimeParts(
        targetTs,
        isAssignedHere ? overrideLabHelper.activeSessionEndTime : null,
        getHelperSpeedMultiplier(overrideLabHelper.level),
        overrideLabBoostEndTime,
        24,
        now,
        overrideLabHelper,
        isAssignedHere,
        overrideStudySoupEndTime,
        'study_soup'
      );
      return parts.totalUpgradeSeconds;
    }
    return getTimerTotalSeconds(slot === 'main' ? labTimer : goblinLabTimer);
  };

  const getPetSlotCurrentRemainingSeconds = (
    overridePetBoostEndTime: number | null = petBoostEndTime,
    overrideStudySoupEndTime: number | null = studySoupEndTime
  ): number => {
    const now = Date.now();
    if (targetPetTimestamp && targetPetTimestamp > now) {
      const parts = computeTimeParts(
        targetPetTimestamp,
        null,
        1,
        overridePetBoostEndTime,
        24,
        now,
        null,
        false,
        overrideStudySoupEndTime,
        'study_soup'
      );
      return parts.totalUpgradeSeconds;
    }
    return getTimerTotalSeconds(petTimer);
  };

  const syncTimerFromRemainingSeconds = (
    baseTimer: BuilderTime,
    remSec: number
  ): BuilderTime => {
    if (remSec <= 0) return baseTimer;
    const parts = formatTotalSecondsToParts(remSec);
    return {
      ...baseTimer,
      d: String(parts.d),
      h: String(parts.h),
      m: String(parts.m),
      s: parts.s,
    };
  };

  // ============================================================================
  // 24x LABORATORY & PET HOUSE CALCULATION ENGINE + 2-STEP BOOST WORKFLOW
  // ============================================================================
  const computeLabScheduleValues = (
    mainTimerVal: BuilderTime,
    goblinTimerVal: BuilderTime,
    potionCount: number,
    activeLabBoostSecs = getRemainingBoostSeconds(labBoostEndTime),
    labHelper: LabApprenticeState = labApprentice,
    overrideMainRemSec?: number,
    overrideGoblinRemSec?: number,
    activeStudySoupSecs = getRemainingBoostSeconds(studySoupEndTime)
  ) => {
    const now = Date.now();
    const mainRemSec =
      typeof overrideMainRemSec === 'number'
        ? overrideMainRemSec
        : getTimerTotalSeconds(mainTimerVal);
    const goblinRemSec =
      typeof overrideGoblinRemSec === 'number'
        ? overrideGoblinRemSec
        : getTimerTotalSeconds(goblinTimerVal);

    let nextMainTs: number | null = null;
    let nextMainDate = '';
    let mainSavedSec = 0;

    if (mainRemSec > 0) {
      const isHelperOnMain = labHelper.assignedSlot === 'main';
      const realElapsedSec = calcHelperSessionRealTimeSeconds({
        remainingUpgradeSeconds: mainRemSec,
        helperLevel: labHelper.level,
        helper: labHelper,
        isAssignedToSlot: isHelperOnMain,
        potionCount,
        activePotionBoostSeconds: activeLabBoostSecs,
        potionRate: 24,
        activeSnackBoostSeconds: activeStudySoupSecs,
        snackType: 'study_soup',
        now,
      });
      nextMainTs = now + Math.round(realElapsedSec * 1000);
      nextMainDate = formatCompletionDate(nextMainTs);
      mainSavedSec = Math.max(0, mainRemSec - realElapsedSec);
    }

    let nextGoblinTs: number | null = null;
    let nextGoblinDate = '';
    let goblinSavedSec = 0;

    if (goblinRemSec > 0) {
      const isHelperOnGoblin = labHelper.assignedSlot === 'goblin';
      const realElapsedSec = calcHelperSessionRealTimeSeconds({
        remainingUpgradeSeconds: goblinRemSec,
        helperLevel: labHelper.level,
        helper: labHelper,
        isAssignedToSlot: isHelperOnGoblin,
        potionCount,
        activePotionBoostSeconds: activeLabBoostSecs,
        potionRate: 24,
        activeSnackBoostSeconds: activeStudySoupSecs,
        snackType: 'study_soup',
        now,
      });
      nextGoblinTs = now + Math.round(realElapsedSec * 1000);
      nextGoblinDate = formatCompletionDate(nextGoblinTs);
      goblinSavedSec = Math.max(0, goblinRemSec - realElapsedSec);
    }

    const totalSavedSec = mainSavedSec + goblinSavedSec;
    return {
      nextMainTs,
      nextMainDate,
      nextGoblinTs,
      nextGoblinDate,
      nextLabSavedText: formatSavedSeconds(totalSavedSec),
    };
  };

  const computeLabSchedule = (
    mainTimerVal: BuilderTime,
    goblinTimerVal: BuilderTime,
    potionCount: number,
    targetVillageId: string = activeAccountId,
    targetVillageName: string = getActiveVillageName(activeAccountId),
    overrideLabBoostSeconds?: number,
    overrideLabHelper?: LabApprenticeState,
    skipNotifications = false,
    overrideStudySoupSeconds?: number
  ) => {
    const activeLabBoostSecs =
      typeof overrideLabBoostSeconds === 'number'
        ? overrideLabBoostSeconds
        : getRemainingBoostSeconds(labBoostEndTime);
    const activeStudySoupSecs =
      typeof overrideStudySoupSeconds === 'number'
        ? overrideStudySoupSeconds
        : getRemainingBoostSeconds(studySoupEndTime);
    const res = computeLabScheduleValues(
      mainTimerVal,
      goblinTimerVal,
      potionCount,
      activeLabBoostSecs,
      overrideLabHelper || labApprentice,
      undefined,
      undefined,
      activeStudySoupSecs
    );
    setTargetLabTimestamp(res.nextMainTs);
    setLabFormattedDate(res.nextMainDate);
    setTargetGoblinLabTimestamp(res.nextGoblinTs);
    setGoblinLabFormattedDate(res.nextGoblinDate);
    setLabSavedText(res.nextLabSavedText);

    if (!skipNotifications) {
      void scheduleLabNotificationsForVillage(
        targetVillageId,
        targetVillageName,
        mainTimerVal,
        res.nextMainTs,
        goblinTimerVal,
        res.nextGoblinTs
      );
    }

    return res;
  };

  // Dynamic 2-Step Laboratory Action Button:
  // State A (researchPotions > 0): Confirm & Activate Boost -> lock 24x real-time boost
  // State B (researchPotions === 0 && labBoostActive): Reset active boost to 1x speed
  // State A default (researchPotions === 0 && !labBoostActive): Lock 1x finish schedule
  const handleLabPrimaryAction = () => {
    triggerHaptic(18);
    const now = Date.now();
    const curBoostRemSec = getRemainingBoostSeconds(labBoostEndTime, now);
    const mainRemSec = getLabSlotCurrentRemainingSeconds('main');
    const goblinRemSec = getLabSlotCurrentRemainingSeconds('goblin');
    const syncedMain = syncTimerFromRemainingSeconds(labTimer, mainRemSec);
    const syncedGoblin = syncTimerFromRemainingSeconds(goblinLabTimer, goblinRemSec);

    if (researchPotions > 0) {
      const potionsUsed = researchPotions;
      const addedBoostSec = potionsUsed * 3600;
      const totalBoostSec = curBoostRemSec + addedBoostSec;
      const nextBoostEnd = now + totalBoostSec * 1000;

      // Research Potion: ONLY increment Laboratory stats (labSecondsSaved, researchPotionsCount)
      recordConfirmedPotionUsage('lab', 23 * 3600 * potionsUsed, potionsUsed);
      updateManualBoostTrackSlot(
        activePlayerTag,
        'lab',
        totalBoostSec,
        nextBoostEnd,
        potionsUsed
      );

      setLabTimer(syncedMain);
      setGoblinLabTimer(syncedGoblin);
      setLabBoostEndTime(nextBoostEnd);
      setResearchPotions(0);

      computeLabSchedule(
        syncedMain,
        syncedGoblin,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        totalBoostSec,
        labApprentice
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        builderBoostEndTime,
        nextBoostEnd,
        petBoostEndTime
      );
      showToast(
        'success',
        `⚡ Activated ${potionsUsed} Research Potion${potionsUsed > 1 ? 's' : ''} (24x Speed)!`
      );
      return;
    }

    if (curBoostRemSec > 0) {
      // Reset active boost back to 1x speed from current remaining upgrade seconds
      updateManualBoostTrackSlot(activePlayerTag, 'lab', 0, null, 0);
      setLabTimer(syncedMain);
      setGoblinLabTimer(syncedGoblin);
      setLabBoostEndTime(null);
      computeLabSchedule(
        syncedMain,
        syncedGoblin,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        0,
        labApprentice
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        builderBoostEndTime,
        null,
        petBoostEndTime
      );
      showToast('success', 'Reset Research Boost to 1x normal speed');
      return;
    }

    computeLabSchedule(labTimer, goblinLabTimer, 0);
  };

  const adjustResearchPotions = (delta: number) => {
    triggerHaptic(15);
    const nextCount = Math.min(99, Math.max(0, researchPotions + delta));
    setResearchPotions(nextCount);
    // Ensure base 1x/active-boost ticker is initialized if user has entered lab time
    if (
      !targetLabTimestamp &&
      !targetGoblinLabTimestamp &&
      (getTimerTotalSeconds(labTimer) > 0 || getTimerTotalSeconds(goblinLabTimer) > 0)
    ) {
      computeLabSchedule(labTimer, goblinLabTimer, 0);
    }
  };

  const handleLabTimeChange = (
    slot: 'main' | 'goblin',
    field: 'd' | 'h' | 'm',
    value: string
  ) => {
    const clamped = clampTimeFieldValue(field, value);
    if (slot === 'main') {
      const nextMain = { ...labTimer, [field]: clamped, s: 0 };
      setLabTimer(nextMain);
      computeLabSchedule(nextMain, goblinLabTimer, 0);
    } else {
      const nextGoblin = { ...goblinLabTimer, [field]: clamped, s: 0 };
      setGoblinLabTimer(nextGoblin);
      computeLabSchedule(labTimer, nextGoblin, 0);
    }
  };

  const applyPresetToLab = (slot: 'main' | 'goblin', deltaDays: number, deltaHours: number) => {
    triggerHaptic(15);
    const current = slot === 'main' ? labTimer : goblinLabTimer;
    const curD = Math.max(0, parseInt(current.d, 10) || 0);
    const curH = Math.max(0, parseInt(current.h, 10) || 0);
    const curM = Math.max(0, parseInt(current.m, 10) || 0);

    const totalHours = curH + deltaHours;
    const extraDaysFromHours = Math.floor(totalHours / 24);
    const newH = totalHours % 24;
    const newD = Math.min(999, curD + deltaDays + extraDaysFromHours);

    const updated: BuilderTime = {
      ...current,
      d: newD > 0 ? String(newD) : current.d !== '' ? '0' : '',
      h: newH > 0 ? String(newH) : deltaHours > 0 || current.h !== '' ? String(newH) : '',
      m: curM > 0 ? String(curM) : current.m,
      s: 0,
    };

    if (slot === 'main') {
      setLabTimer(updated);
      computeLabSchedule(updated, goblinLabTimer, 0);
    } else {
      setGoblinLabTimer(updated);
      computeLabSchedule(labTimer, updated, 0);
    }
  };

  const clearLabSlot = (slot: 'main' | 'goblin') => {
    triggerHaptic(15);
    const empty = createEmptyTimer();
    const nextHelper: LabApprenticeState =
      labApprentice.assignedSlot === slot
        ? {
            ...labApprentice,
            assignedSlot: null,
            activeSessionEndTime: null,
            recurrent: false,
          }
        : labApprentice;
    if (labApprentice.assignedSlot === slot) {
      setLabApprentice(nextHelper);
    }
    if (slot === 'main') {
      setLabTimer(empty);
      computeLabSchedule(
        empty,
        goblinLabTimer,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        undefined,
        nextHelper
      );
    } else {
      setGoblinLabTimer(empty);
      computeLabSchedule(
        labTimer,
        empty,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        undefined,
        nextHelper
      );
    }
  };

  const computePetScheduleValues = (
    petTimerVal: BuilderTime,
    potionCount: number,
    activePetBoostSecs = getRemainingBoostSeconds(petBoostEndTime),
    overridePetRemSec?: number,
    activeStudySoupSecs = getRemainingBoostSeconds(studySoupEndTime)
  ) => {
    const now = Date.now();
    const petRemSec =
      typeof overridePetRemSec === 'number'
        ? overridePetRemSec
        : getTimerTotalSeconds(petTimerVal);

    if (petRemSec <= 0) {
      return {
        nextPetTs: null as number | null,
        nextPetDate: '',
        nextPetSavedText: '',
      };
    }

    const realElapsedSec = calcHelperSessionRealTimeSeconds({
      remainingUpgradeSeconds: petRemSec,
      helperLevel: 0,
      helper: null,
      isAssignedToSlot: false,
      potionCount,
      activePotionBoostSeconds: activePetBoostSecs,
      potionRate: 24,
      activeSnackBoostSeconds: activeStudySoupSecs,
      snackType: 'study_soup',
      now,
    });
    const nextPetTs = now + Math.round(realElapsedSec * 1000);
    const savedSec = Math.max(0, petRemSec - realElapsedSec);

    return {
      nextPetTs,
      nextPetDate: formatCompletionDate(nextPetTs),
      nextPetSavedText: formatSavedSeconds(savedSec),
    };
  };

  const computePetSchedule = (
    petTimerVal: BuilderTime,
    potionCount: number,
    targetVillageId: string = activeAccountId,
    targetVillageName: string = getActiveVillageName(activeAccountId),
    overridePetBoostSeconds?: number,
    skipNotifications = false,
    overrideStudySoupSeconds?: number
  ) => {
    const activePetBoostSecs =
      typeof overridePetBoostSeconds === 'number'
        ? overridePetBoostSeconds
        : getRemainingBoostSeconds(petBoostEndTime);
    const activeStudySoupSecs =
      typeof overrideStudySoupSeconds === 'number'
        ? overrideStudySoupSeconds
        : getRemainingBoostSeconds(studySoupEndTime);
    const res = computePetScheduleValues(
      petTimerVal,
      potionCount,
      activePetBoostSecs,
      undefined,
      activeStudySoupSecs
    );
    setTargetPetTimestamp(res.nextPetTs);
    setPetFormattedDate(res.nextPetDate);
    setPetSavedText(res.nextPetSavedText);

    if (!skipNotifications) {
      void schedulePetNotificationForVillage(
        targetVillageId,
        targetVillageName,
        petTimerVal,
        res.nextPetTs
      );
    }

    return res;
  };

  // Dynamic 2-Step Pet House Action Button
  const handlePetPrimaryAction = () => {
    triggerHaptic(18);
    const now = Date.now();
    const curBoostRemSec = getRemainingBoostSeconds(petBoostEndTime, now);
    const petRemSec = getPetSlotCurrentRemainingSeconds();
    const syncedPet = syncTimerFromRemainingSeconds(petTimer, petRemSec);

    if (petPotions > 0) {
      const potionsUsed = petPotions;
      const addedBoostSec = potionsUsed * 3600;
      const totalBoostSec = curBoostRemSec + addedBoostSec;
      const nextBoostEnd = now + totalBoostSec * 1000;

      // Pet Potion: ONLY increment Pet House stats (petSecondsSaved, petPotionsCount)
      recordConfirmedPotionUsage('pethouse', 23 * 3600 * potionsUsed, potionsUsed);
      updateManualBoostTrackSlot(
        activePlayerTag,
        'pet',
        totalBoostSec,
        nextBoostEnd,
        potionsUsed
      );

      setPetTimer(syncedPet);
      setPetBoostEndTime(nextBoostEnd);
      setPetPotions(0);

      computePetSchedule(
        syncedPet,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        totalBoostSec
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        builderBoostEndTime,
        labBoostEndTime,
        nextBoostEnd
      );
      showToast(
        'success',
        `⚡ Activated ${potionsUsed} Pet Potion${potionsUsed > 1 ? 's' : ''} (24x Speed)!`
      );
      return;
    }

    if (curBoostRemSec > 0) {
      updateManualBoostTrackSlot(activePlayerTag, 'pet', 0, null, 0);
      setPetTimer(syncedPet);
      setPetBoostEndTime(null);
      computePetSchedule(
        syncedPet,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        0
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        builderBoostEndTime,
        labBoostEndTime,
        null
      );
      showToast('success', 'Reset Pet Boost to 1x normal speed');
      return;
    }

    computePetSchedule(petTimer, 0);
  };

  const adjustPetPotions = (delta: number) => {
    triggerHaptic(15);
    const nextCount = Math.min(99, Math.max(0, petPotions + delta));
    setPetPotions(nextCount);
    if (!targetPetTimestamp && getTimerTotalSeconds(petTimer) > 0) {
      computePetSchedule(petTimer, 0);
    }
  };

  const handlePetTimeChange = (field: 'd' | 'h' | 'm', value: string) => {
    const clamped = clampTimeFieldValue(field, value);
    const nextPet = { ...petTimer, [field]: clamped, s: 0 };
    setPetTimer(nextPet);
    computePetSchedule(nextPet, 0);
  };

  const applyPresetToPet = (deltaDays: number, deltaHours: number) => {
    triggerHaptic(15);
    const curD = Math.max(0, parseInt(petTimer.d, 10) || 0);
    const curH = Math.max(0, parseInt(petTimer.h, 10) || 0);
    const curM = Math.max(0, parseInt(petTimer.m, 10) || 0);

    const totalHours = curH + deltaHours;
    const extraDaysFromHours = Math.floor(totalHours / 24);
    const newH = totalHours % 24;
    const newD = Math.min(999, curD + deltaDays + extraDaysFromHours);

    const updated: BuilderTime = {
      ...petTimer,
      d: newD > 0 ? String(newD) : petTimer.d !== '' ? '0' : '',
      h: newH > 0 ? String(newH) : deltaHours > 0 || petTimer.h !== '' ? String(newH) : '',
      m: curM > 0 ? String(curM) : petTimer.m,
      s: 0,
    };

    setPetTimer(updated);
    computePetSchedule(updated, 0);
  };

  const clearPetSlot = () => {
    triggerHaptic(15);
    const empty = createEmptyTimer();
    setPetTimer(empty);
    setTargetPetTimestamp(null);
    setPetFormattedDate('');
    setPetSavedText('');
    void cancelSlotNotification(activeAccountId, 'pet_main');
  };

  const handleConfirmClearUpgradeSlot = () => {
    if (!pendingClearSlot) return;
    triggerHaptic([20, 40, 20]);
    if (pendingClearSlot === 'lab_main') {
      clearLabSlot('main');
      setIsLabMainEditCollapsed(true);
      showToast('success', 'Cleared Primary Laboratory upgrade timer');
    } else if (pendingClearSlot === 'lab_goblin') {
      clearLabSlot('goblin');
      setIsLabGoblinEditCollapsed(true);
      showToast('success', 'Cleared Goblin Lab upgrade timer');
    } else if (pendingClearSlot === 'pet') {
      clearPetSlot();
      setIsPetEditCollapsed(true);
      showToast('success', 'Cleared Pet House upgrade timer');
    }
    setPendingClearSlot(null);
  };

  // ============================================================================
  // BUILDERS RESET & TWO-STEP SAFE EDIT / CONFIRMATION ENGINE
  // ============================================================================
  const resetAllTimes = () => {
    triggerHaptic([20, 40, 20]);
    editSnapshotRef.current = null;
    setIsEditingTimers(false);
    setConfirmDialogType(null);
    setBuilders(createEmptyBuilders());
    setLockedResults([]);
    setSavedText('');
    setShowResult(false);
    setBuilderApprentice((prev) => ({
      ...prev,
      assignedSlot: null,
      activeSessionEndTime: null,
      recurrent: false,
    }));
    void scheduleBuilderNotificationsForVillage(
      activeAccountId,
      getActiveVillageName(activeAccountId),
      []
    );
    showToast('success', 'All active timers and schedules reset');
  };

  const resetBuilderTime = (index: number) => {
    if (!ensureEditSessionStarted()) return;
    triggerHaptic(15);
    if (builderApprentice.assignedSlot === index) {
      setBuilderApprentice((prev) => ({
        ...prev,
        assignedSlot: null,
        activeSessionEndTime: null,
        recurrent: false,
      }));
    }
    setBuilders((prev) => {
      const next = [...prev];
      next[index] = createEmptyTimer();
      return next;
    });
  };

  // Step 1 of Edit Flow: User confirms "Do you want to edit current timers?"
  const handleConfirmStartEditTimers = () => {
    triggerHaptic(15);
    const syncedBuilders = builders.map((b, idx) => {
      const remSec = getBuilderSlotCurrentRemainingSeconds(idx);
      return remSec > 0 ? syncTimerFromRemainingSeconds(b, remSec) : { ...b };
    });

    editSnapshotRef.current = {
      mode: currentMode,
      numBuilders,
      builders: builders.map((b) => ({ ...b })),
      lockedResults: lockedResults.map((r) => ({ ...r })),
      savedText,
      showResult,
      builderApprentice: { ...builderApprentice },
    };

    setBuilders(syncedBuilders);
    setIsEditingTimers(true);
    setConfirmDialogType(null);
    setTimersCollapsedState(false);
  };

  // Step 2 of Edit Flow: User confirms "Apply Changes?"
  const handleConfirmApplyTimerChanges = () => {
    triggerHaptic([15, 30, 15]);
    editSnapshotRef.current = null;
    setIsEditingTimers(false);
    setConfirmDialogType(null);
    setTimersCollapsedState(true);
    const calcMode = currentMode === 'helpers' ? 'multi' : currentMode;
    runCalculationWithData(calcMode, numBuilders, builders, '0');
    showToast('success', 'Applied timer changes & updated schedule!');
  };

  const computeBuilderScheduleValues = (
    targetMode: BuilderSubTabMode,
    targetNumBuilders: number,
    targetBuilders: BuilderTime[],
    potionCount: number,
    activeBuilderBoostSecs = getRemainingBoostSeconds(builderBoostEndTime),
    bHelper: BuilderApprenticeState = builderApprentice,
    useLiveRemainingWork = false,
    activeBuilderBiteSecs = getRemainingBoostSeconds(builderBiteEndTime)
  ): { computedResults: LockedResultItem[]; computedSavedText: string } => {
    const calcTimestamp = Date.now();
    const activeBuildersCount = targetMode === 'single' ? 1 : targetNumBuilders;
    const computedResults: LockedResultItem[] = [];
    let totalSavedSecondsAllBuilders = 0;

    for (let i = 1; i <= activeBuildersCount; i++) {
      const slotIdx = i - 1;
      const b = targetBuilders[slotIdx];
      if (!b) continue;
      const totalBuilderSeconds = useLiveRemainingWork
        ? getBuilderSlotCurrentRemainingSeconds(slotIdx)
        : getTimerTotalSeconds(b);
      if (totalBuilderSeconds <= 0) continue;

      const isHelperOnThisSlot = bHelper.assignedSlot === slotIdx;
      const realTimeSeconds = calcHelperSessionRealTimeSeconds({
        remainingUpgradeSeconds: totalBuilderSeconds,
        helperLevel: bHelper.level,
        helper: bHelper,
        isAssignedToSlot: isHelperOnThisSlot,
        potionCount,
        activePotionBoostSeconds: activeBuilderBoostSecs,
        potionRate: 10,
        activeSnackBoostSeconds: activeBuilderBiteSecs,
        snackType: 'builder_bite',
        now: calcTimestamp,
      });

      const realDurationMs = Math.round(realTimeSeconds * 1000);
      const targetTimestamp = calcTimestamp + realDurationMs;
      const formattedDate = formatCompletionDate(targetTimestamp);
      totalSavedSecondsAllBuilders += Math.max(0, totalBuilderSeconds - realTimeSeconds);

      const isGoblin = targetMode !== 'single' && i === 7;
      const slotBadge = isGoblin ? '[GOBLIN]' : `[B${i}]`;
      const defaultTitle =
        targetMode === 'single'
          ? 'Defense Upgrade'
          : isGoblin
          ? 'Goblin Builder'
          : `Builder ${i} Upgrade`;

      const resolvedFromId = b.rawId ? resolveUpgradeName(b.rawId) : undefined;
      const finalTitle =
        resolvedFromId && resolvedFromId !== 'Defense Upgrade'
          ? resolvedFromId
          : b.upgradeTitle && b.upgradeTitle !== 'Defense / Building Upgrade'
          ? b.upgradeTitle
          : resolvedFromId || defaultTitle;

      computedResults.push({
        builderIndex: slotIdx,
        slotBadge,
        upgradeTitle: finalTitle,
        upgradeLevel: b.upgradeLevel,
        rawId: b.rawId,
        isGoblin,
        targetTimestamp,
        formattedDate,
      });
    }

    return {
      computedResults,
      computedSavedText: formatSavedSeconds(totalSavedSecondsAllBuilders),
    };
  };

  const runCalculationWithData = (
    targetMode: BuilderSubTabMode,
    targetNumBuilders: number,
    targetBuilders: BuilderTime[],
    targetPotionsStr: string,
    targetVillageId: string = activeAccountId,
    targetVillageName: string = getActiveVillageName(activeAccountId),
    overrideBuilderBoostSeconds?: number,
    overrideBuilderHelper?: BuilderApprenticeState,
    skipNotifications = false,
    overrideBuilderBiteSeconds?: number
  ): { computedResults: LockedResultItem[]; computedSavedText: string } => {
    const potions = Math.max(0, parseInt(targetPotionsStr, 10) || 0);
    const activeBuilderBoostSecs =
      typeof overrideBuilderBoostSeconds === 'number'
        ? overrideBuilderBoostSeconds
        : getRemainingBoostSeconds(builderBoostEndTime);
    const activeBuilderBiteSecs =
      typeof overrideBuilderBiteSeconds === 'number'
        ? overrideBuilderBiteSeconds
        : getRemainingBoostSeconds(builderBiteEndTime);
    const bHelper = overrideBuilderHelper || builderApprentice;

    const { computedResults, computedSavedText } = computeBuilderScheduleValues(
      targetMode,
      targetNumBuilders,
      targetBuilders,
      potions,
      activeBuilderBoostSecs,
      bHelper,
      false,
      activeBuilderBiteSecs
    );

    if (!skipNotifications) {
      void scheduleBuilderNotificationsForVillage(
        targetVillageId,
        targetVillageName,
        computedResults
      );
    }

    if (computedResults.length === 0) {
      setLockedResults([]);
      setSavedText('');
      setShowResult(false);
      return { computedResults: [], computedSavedText: '' };
    }

    setShowResult(false);
    setLockedResults(computedResults);
    setSavedText(computedSavedText);
    setAnimKey((prev) => prev + 1);
    requestAnimationFrame(() => {
      setShowResult(true);
    });

    return { computedResults, computedSavedText };
  };

  // Dynamic 2-Step Builder Primary Button:
  // State A (pendingPotions > 0): Confirm & Activate Boost -> lock 10x real-time boost
  // State B (pendingPotions === 0 && builderBoostActive): Reset active boost to 1x speed
  // State A default (pendingPotions === 0 && !builderBoostActive): Lock 1x finish schedule
  const handleBuilderPrimaryAction = () => {
    triggerHaptic(18);
    const now = Date.now();
    const pendingPotions = Math.max(0, parseInt(potionsInput, 10) || 0);
    const curBoostRemSec = getRemainingBoostSeconds(builderBoostEndTime, now);

    const syncedBuilders = builders.map((b, idx) => {
      const remSec = getBuilderSlotCurrentRemainingSeconds(idx);
      return remSec > 0 ? syncTimerFromRemainingSeconds(b, remSec) : b;
    });

    if (pendingPotions > 0) {
      const addedBoostSec = pendingPotions * 3600;
      const totalBoostSec = curBoostRemSec + addedBoostSec;
      const nextBoostEnd = now + totalBoostSec * 1000;

      // Builder Potion: Add (activeBuilders * 9 * 3600 * potionAmount) seconds and increment potionsCount
      const activeBuilderSlotsLimit = currentMode === 'single' ? 1 : numBuilders;
      const workingBuildersCount = syncedBuilders
        .slice(0, activeBuilderSlotsLimit)
        .filter((b) => getTimerTotalSeconds(b) > 0).length;
      const activeBuildersForStats =
        currentMode === 'single'
          ? 1
          : workingBuildersCount > 0
          ? workingBuildersCount
          : numBuilders;
      recordConfirmedPotionUsage(
        'builders',
        activeBuildersForStats * 9 * 3600 * pendingPotions,
        pendingPotions
      );
      updateManualBoostTrackSlot(
        activePlayerTag,
        'builder',
        totalBoostSec,
        nextBoostEnd,
        pendingPotions
      );

      setBuilders(syncedBuilders);
      setBuilderBoostEndTime(nextBoostEnd);
      setPotionsInput('0');
      setTimersCollapsedState(true);

      runCalculationWithData(
        currentMode,
        numBuilders,
        syncedBuilders,
        '0',
        activeAccountId,
        getActiveVillageName(activeAccountId),
        totalBoostSec,
        builderApprentice
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        nextBoostEnd,
        labBoostEndTime,
        petBoostEndTime
      );
      showToast(
        'success',
        `⚡ Activated ${pendingPotions} Builder Potion${pendingPotions > 1 ? 's' : ''} (10x Speed)!`
      );
      return;
    }

    if (curBoostRemSec > 0) {
      updateManualBoostTrackSlot(activePlayerTag, 'builder', 0, null, 0);
      setBuilders(syncedBuilders);
      setBuilderBoostEndTime(null);
      setTimersCollapsedState(true);
      runCalculationWithData(
        currentMode,
        numBuilders,
        syncedBuilders,
        '0',
        activeAccountId,
        getActiveVillageName(activeAccountId),
        0,
        builderApprentice
      );
      void scheduleBoostExpiryNotificationsForVillage(
        activeAccountId,
        getActiveVillageName(activeAccountId),
        null,
        labBoostEndTime,
        petBoostEndTime
      );
      showToast('success', 'Reset Builder Boost to 1x normal speed');
      return;
    }

    setTimersCollapsedState(true);
    runCalculationWithData(currentMode, numBuilders, builders, '0');
  };

  // Helper Level Updates & Manual 1-Hour Session Activation from Helpers Sub-Tab
  const handleChangeBuilderApprenticeLevel = (nextLevel: number) => {
    const clamped = Math.min(8, Math.max(1, nextLevel));
    const syncedBuilders = builders.map((b, idx) => {
      const remSec = getBuilderSlotCurrentRemainingSeconds(idx);
      return remSec > 0 ? syncTimerFromRemainingSeconds(b, remSec) : b;
    });
    const nextHelper: BuilderApprenticeState = {
      ...builderApprentice,
      level: clamped,
    };
    setBuilderApprentice(nextHelper);
    if (nextHelper.assignedSlot !== null) {
      setBuilders(syncedBuilders);
      const calcMode = currentMode === 'helpers' ? 'multi' : currentMode;
      runCalculationWithData(
        calcMode,
        numBuilders,
        syncedBuilders,
        '0',
        activeAccountId,
        getActiveVillageName(activeAccountId),
        undefined,
        nextHelper
      );
    }
  };

  const handleChangeLabApprenticeLevel = (nextLevel: number) => {
    const clamped = Math.min(8, Math.max(1, nextLevel));
    const mainRemSec = getLabSlotCurrentRemainingSeconds('main');
    const goblinRemSec = getLabSlotCurrentRemainingSeconds('goblin');
    const syncedMain = syncTimerFromRemainingSeconds(labTimer, mainRemSec);
    const syncedGoblin = syncTimerFromRemainingSeconds(goblinLabTimer, goblinRemSec);
    const nextHelper: LabApprenticeState = {
      ...labApprentice,
      level: clamped,
    };
    setLabApprentice(nextHelper);
    if (nextHelper.assignedSlot !== null) {
      setLabTimer(syncedMain);
      setGoblinLabTimer(syncedGoblin);
      computeLabSchedule(
        syncedMain,
        syncedGoblin,
        0,
        activeAccountId,
        getActiveVillageName(activeAccountId),
        undefined,
        nextHelper
      );
    }
  };

  const handleStartBuilderApprenticeSession = (slotIdx: number) => {
    triggerHaptic([15, 30, 15]);
    const now = Date.now();
    const syncedBuilders = builders.map((b, idx) => {
      const remSec = getBuilderSlotCurrentRemainingSeconds(idx);
      return remSec > 0 ? syncTimerFromRemainingSeconds(b, remSec) : b;
    });

    const isRestingOnCooldown =
      builderApprentice.cooldownEndTime !== null &&
      builderApprentice.cooldownEndTime > now &&
      (!builderApprentice.activeSessionEndTime || builderApprentice.activeSessionEndTime <= now);

    const nextActiveEnd = isRestingOnCooldown
      ? null
      : builderApprentice.activeSessionEndTime && builderApprentice.activeSessionEndTime > now
      ? builderApprentice.activeSessionEndTime
      : now + 3600 * 1000;
    const nextCooldownEnd =
      builderApprentice.cooldownEndTime && builderApprentice.cooldownEndTime > now
        ? builderApprentice.cooldownEndTime
        : now + 86400 * 1000;

    const nextHelper: BuilderApprenticeState = {
      ...builderApprentice,
      assignedSlot: slotIdx,
      activeSessionEndTime: nextActiveEnd,
      cooldownEndTime: nextCooldownEnd,
      recurrent: true,
    };
    setBuilders(syncedBuilders);
    setBuilderApprentice(nextHelper);

    const villageName = getActiveVillageName(activeAccountId);
    const calcMode = currentMode === 'helpers' ? 'multi' : currentMode;
    const { computedResults } = runCalculationWithData(
      calcMode,
      numBuilders,
      syncedBuilders,
      '0',
      activeAccountId,
      villageName,
      undefined,
      nextHelper
    );

    const assignedUpgradeFinishTs =
      computedResults.find((r) => r.builderIndex === slotIdx)?.targetTimestamp ?? null;
    const notifyCooldownTs = getHelperAvailableNotificationTimestamp({
      helper: nextHelper,
      assignedUpgradeFinishTimestamp: assignedUpgradeFinishTs,
      now,
    });
    void scheduleExactSlotNotification({
      villageId: activeAccountId,
      slotKey: 'helper_builder',
      title: `👷 Builder Helper Available • ${villageName}`,
      body: `${villageName}: Builder's Apprentice cooldown has ended and is ready to assign!`,
      targetTimestamp: notifyCooldownTs,
    });

    const targetB = syncedBuilders[slotIdx];
    const targetLabel =
      targetB?.upgradeTitle ||
      (slotIdx === 6 ? 'Goblin Builder' : `Builder ${slotIdx + 1}`);
    const speedN = getHelperSpeedMultiplier(nextHelper.level);
    setAssignModalType(null);
    showToast(
      'success',
      `👷 Builder's Apprentice assigned to ${targetLabel} (${speedN}x daily until finished)!`
    );
  };

  const handleStartLabApprenticeSession = (slot: 'main' | 'goblin') => {
    triggerHaptic([15, 30, 15]);
    const now = Date.now();
    const mainRemSec = getLabSlotCurrentRemainingSeconds('main');
    const goblinRemSec = getLabSlotCurrentRemainingSeconds('goblin');
    const syncedMain = syncTimerFromRemainingSeconds(labTimer, mainRemSec);
    const syncedGoblin = syncTimerFromRemainingSeconds(goblinLabTimer, goblinRemSec);

    const isRestingOnCooldown =
      labApprentice.cooldownEndTime !== null &&
      labApprentice.cooldownEndTime > now &&
      (!labApprentice.activeSessionEndTime || labApprentice.activeSessionEndTime <= now);

    const nextActiveEnd = isRestingOnCooldown
      ? null
      : labApprentice.activeSessionEndTime && labApprentice.activeSessionEndTime > now
      ? labApprentice.activeSessionEndTime
      : now + 3600 * 1000;
    const nextCooldownEnd =
      labApprentice.cooldownEndTime && labApprentice.cooldownEndTime > now
        ? labApprentice.cooldownEndTime
        : now + 86400 * 1000;

    const nextHelper: LabApprenticeState = {
      ...labApprentice,
      assignedSlot: slot,
      activeSessionEndTime: nextActiveEnd,
      cooldownEndTime: nextCooldownEnd,
      recurrent: true,
    };
    setLabTimer(syncedMain);
    setGoblinLabTimer(syncedGoblin);
    setLabApprentice(nextHelper);

    const villageName = getActiveVillageName(activeAccountId);
    const labSched = computeLabSchedule(
      syncedMain,
      syncedGoblin,
      0,
      activeAccountId,
      villageName,
      undefined,
      nextHelper
    );

    const assignedLabFinishTs =
      slot === 'main' ? labSched.nextMainTs : labSched.nextGoblinTs;
    const notifyCooldownTs = getHelperAvailableNotificationTimestamp({
      helper: nextHelper,
      assignedUpgradeFinishTimestamp: assignedLabFinishTs,
      now,
    });
    void scheduleExactSlotNotification({
      villageId: activeAccountId,
      slotKey: 'helper_lab',
      title: `🔬 Lab Helper Available • ${villageName}`,
      body: `${villageName}: Lab Apprentice cooldown has ended and is ready to assign!`,
      targetTimestamp: notifyCooldownTs,
    });

    const targetTimer = slot === 'main' ? syncedMain : syncedGoblin;
    const targetLabel =
      targetTimer.upgradeTitle ||
      (slot === 'main' ? 'Troop / Spell Upgrade' : 'Goblin Researcher');
    const speedN = getHelperSpeedMultiplier(nextHelper.level);
    setAssignModalType(null);
    showToast(
      'success',
      `🔬 Lab Apprentice assigned to ${targetLabel} (${speedN}x daily until finished)!`
    );
  };

  // Lifecycle & Upgrade Completion Reset:
  // When a specific upgrade finishes (timer reaches 0), immediately detach the helper
  // from that slot without jumping to any other building or troop.
  const handleBuilderUpgradeFinished = useCallback((slotIdx: number) => {
    setNowTick(Date.now());
    setBuilderApprentice((prev) => {
      if (prev.assignedSlot !== slotIdx) return prev;
      return {
        ...prev,
        assignedSlot: null,
        activeSessionEndTime: null,
        recurrent: false,
      };
    });
  }, []);

  const handleLabUpgradeFinished = useCallback((slot: 'main' | 'goblin') => {
    setNowTick(Date.now());
    setLabApprentice((prev) => {
      if (prev.assignedSlot !== slot) return prev;
      return {
        ...prev,
        assignedSlot: null,
        activeSessionEndTime: null,
        recurrent: false,
      };
    });
  }, []);

  const handleBuilderSessionExpire = useCallback(() => {
    setBuilderApprentice((prev) => {
      if (!prev.activeSessionEndTime) return prev;
      const now = Date.now();
      const nextCooldown =
        prev.cooldownEndTime && prev.cooldownEndTime > now
          ? prev.cooldownEndTime
          : prev.activeSessionEndTime + 23 * 3600 * 1000;
      const keepAssigned = prev.assignedSlot !== null && prev.recurrent !== false;
      return {
        ...prev,
        assignedSlot: keepAssigned ? prev.assignedSlot : null,
        activeSessionEndTime: null,
        cooldownEndTime: nextCooldown,
        recurrent: keepAssigned,
      };
    });
  }, []);

  const handleBuilderCooldownExpire = useCallback(() => {
    setBuilderApprentice((prev) => {
      if (!prev.cooldownEndTime) return prev;
      const now = Date.now();
      if (prev.assignedSlot !== null && prev.recurrent !== false) {
        const elapsedMs = Math.max(0, now - prev.cooldownEndTime);
        const cycles = Math.floor(elapsedMs / (86400 * 1000));
        const cycleStartMs = prev.cooldownEndTime + cycles * 86400 * 1000;
        const nextActiveEndMs = cycleStartMs + 3600 * 1000;
        const nextCooldownEndMs = cycleStartMs + 86400 * 1000;
        return {
          ...prev,
          activeSessionEndTime: now < nextActiveEndMs ? nextActiveEndMs : null,
          cooldownEndTime: nextCooldownEndMs,
          recurrent: true,
        };
      }
      return {
        ...prev,
        assignedSlot: null,
        activeSessionEndTime: null,
        cooldownEndTime: null,
        recurrent: false,
      };
    });
  }, []);

  const handleLabSessionExpire = useCallback(() => {
    setLabApprentice((prev) => {
      if (!prev.activeSessionEndTime) return prev;
      const now = Date.now();
      const nextCooldown =
        prev.cooldownEndTime && prev.cooldownEndTime > now
          ? prev.cooldownEndTime
          : prev.activeSessionEndTime + 23 * 3600 * 1000;
      const keepAssigned = prev.assignedSlot !== null && prev.recurrent !== false;
      return {
        ...prev,
        assignedSlot: keepAssigned ? prev.assignedSlot : null,
        activeSessionEndTime: null,
        cooldownEndTime: nextCooldown,
        recurrent: keepAssigned,
      };
    });
  }, []);

  const handleLabCooldownExpire = useCallback(() => {
    setLabApprentice((prev) => {
      if (!prev.cooldownEndTime) return prev;
      const now = Date.now();
      if (prev.assignedSlot !== null && prev.recurrent !== false) {
        const elapsedMs = Math.max(0, now - prev.cooldownEndTime);
        const cycles = Math.floor(elapsedMs / (86400 * 1000));
        const cycleStartMs = prev.cooldownEndTime + cycles * 86400 * 1000;
        const nextActiveEndMs = cycleStartMs + 3600 * 1000;
        const nextCooldownEndMs = cycleStartMs + 86400 * 1000;
        return {
          ...prev,
          activeSessionEndTime: now < nextActiveEndMs ? nextActiveEndMs : null,
          cooldownEndTime: nextCooldownEndMs,
          recurrent: true,
        };
      }
      return {
        ...prev,
        assignedSlot: null,
        activeSessionEndTime: null,
        cooldownEndTime: null,
        recurrent: false,
      };
    });
  }, []);

  const handleBuilderBoostExpire = useCallback(() => {
    setBuilderBoostEndTime(null);
  }, []);

  const handleLabBoostExpire = useCallback(() => {
    setLabBoostEndTime(null);
  }, []);

  const handlePetBoostExpire = useCallback(() => {
    setPetBoostEndTime(null);
  }, []);

  // ============================================================================
  // FULL MULTI-ACCOUNT BACKUP & RESTORE (1-TAP EXPORT / IMPORT ALL VILLAGES)
  // ============================================================================
  const buildFullBackupPayload = (): string => {
    const currentActiveState: SavedState = {
      mode: currentMode,
      numBuilders,
      builders,
      potions: potionsInput,
      lockedResults,
      lockedSavedText: savedText,
      researchPotions,
      labTimer,
      goblinLabTimer,
      targetLabTimestamp,
      labFormattedDate,
      labSavedText,
      targetGoblinLabTimestamp,
      goblinLabFormattedDate,
      petPotions,
      petTimer,
      targetPetTimestamp,
      petFormattedDate,
      petSavedText,
      builderBoostEndTime,
      labBoostEndTime,
      petBoostEndTime,
      builderBiteEndTime,
      studySoupEndTime,
      builderApprentice,
      labApprentice,
    };

    const syncedAccounts = accounts.map((acc) =>
      acc.id === activeAccountId ? { ...acc, data: currentActiveState } : acc
    );

    return JSON.stringify(
      {
        clashPlannerBackupVersion: 1,
        exportedAt: Date.now(),
        activeAccountId,
        accounts: syncedAccounts,
      },
      null,
      2
    );
  };

  const handleCopyFullBackup = async () => {
    triggerHaptic(15);
    const payload = buildFullBackupPayload();
    try {
      await navigator.clipboard.writeText(payload);
      showToast('success', `Copied backup for ${accounts.length} village${accounts.length > 1 ? 's' : ''}!`);
    } catch {
      setBackupRestoreInput(payload);
      showToast('success', 'Backup generated below — long-press to copy');
    }
  };

  const handleDownloadFullBackup = () => {
    triggerHaptic(15);
    const payload = buildFullBackupPayload();
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `clash-planner-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Downloaded Clash Planner backup file!');
    } catch {
      showToast('error', 'Could not download file — use Copy Backup instead');
    }
  };

  const restoreAccountsFromBackupObject = (rawObj: Record<string, unknown>): boolean => {
    if (!Array.isArray(rawObj.accounts) || rawObj.accounts.length === 0) {
      return false;
    }

    const restoredAccounts: VillageProfile[] = [];
    for (let i = 0; i < rawObj.accounts.length; i++) {
      const item = rawObj.accounts[i] as Partial<VillageProfile> | undefined;
      if (!item || typeof item !== 'object' || !item.data) continue;
      const mergedState: SavedState = {
        ...createDefaultSavedState(),
        ...item.data,
      };
      restoredAccounts.push({
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `village_${Date.now()}_${i}`,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Village ${i + 1}`,
        tag: typeof item.tag === 'string' ? item.tag : undefined,
        data: mergedState,
      });
    }

    if (restoredAccounts.length === 0) return false;

    const requestedActiveId =
      typeof rawObj.activeAccountId === 'string' ? rawObj.activeAccountId : restoredAccounts[0].id;
    const activeProfile =
      restoredAccounts.find((a) => a.id === requestedActiveId) || restoredAccounts[0];

    setAccounts(restoredAccounts);
    setActiveAccountId(activeProfile.id);
    applySavedStateToActiveView(activeProfile.data);
    setTimersCollapsedState(true);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProfile.data));
      const multiPayload: MultiAccountStorage = {
        activeAccountId: activeProfile.id,
        accounts: restoredAccounts,
      };
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(multiPayload));
    } catch {
      // Ignore storage error
    }

    // Reschedule notifications for all restored villages
    restoredAccounts.forEach((profile) => {
      const d = profile.data;
      void scheduleBuilderNotificationsForVillage(profile.id, profile.name, d.lockedResults || []);
      void scheduleLabNotificationsForVillage(
        profile.id,
        profile.name,
        d.labTimer || createEmptyTimer(),
        d.targetLabTimestamp ?? null,
        d.goblinLabTimer || createEmptyTimer(),
        d.targetGoblinLabTimestamp ?? null
      );
      void schedulePetNotificationForVillage(
        profile.id,
        profile.name,
        d.petTimer || createEmptyTimer(),
        d.targetPetTimestamp ?? null
      );
      void scheduleBoostExpiryNotificationsForVillage(
        profile.id,
        profile.name,
        d.builderBoostEndTime,
        d.labBoostEndTime,
        d.petBoostEndTime
      );
    });

    showToast(
      'success',
      `Restored ${restoredAccounts.length} village profile${restoredAccounts.length > 1 ? 's' : ''}!`
    );
    return true;
  };

  const handleRestoreFromBackupText = (rawText: string = backupRestoreInput) => {
    triggerHaptic(15);
    const trimmed = rawText.trim();
    if (!trimmed) {
      showToast('error', 'Paste your Clash Planner backup JSON first');
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && restoreAccountsFromBackupObject(parsed)) {
        setIsBackupModalOpen(false);
        setBackupRestoreInput('');
        return;
      }
      showToast('error', 'Invalid Clash Planner backup JSON');
    } catch {
      showToast('error', 'Invalid JSON format');
    }
  };

  // ============================================================================
  // 2. JSON PARSING & STATE EXTRACTION (BUILDERS + LAB + PET HOUSE + BOOSTS + HELPERS)
  // ============================================================================
  const handleImportVillageJson = () => {
    triggerHaptic(15);
    void requestNotificationPermissions();

    const trimmed = jsonInputText.trim();
    if (!trimmed) {
      showToast('error', 'Invalid JSON format');
      return;
    }

    let parsedData: RawCoCVillage & Record<string, unknown>;
    try {
      parsedData = JSON.parse(trimmed) as RawCoCVillage & Record<string, unknown>;
      if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        showToast('error', 'Invalid JSON format');
        return;
      }
    } catch {
      showToast('error', 'Invalid JSON format');
      return;
    }

    // Auto-detect if the user pasted a full Clash Planner Multi-Account Backup JSON
    if (Array.isArray(parsedData.accounts) && restoreAccountsFromBackupObject(parsedData)) {
      setIsImportModalOpen(false);
      setIsAddingNewAccount(false);
      setNewVillageNameInput('');
      setJsonInputText('');
      return;
    }

    const data = parsedData;

    // 1. ACCOUNT TAG BINDING & ACCIDENTAL OVERWRITE PROTECTION (ROOT "tag" KEY)
    const extractedTag =
      typeof data.tag === 'string' && data.tag.trim()
        ? data.tag.trim()
        : undefined;

    if (!isAddingNewAccount) {
      const currentActiveProfile = accounts.find((a) => a.id === activeAccountId);
      const currentBoundTag = currentActiveProfile?.tag?.trim();
      if (
        currentBoundTag &&
        extractedTag &&
        currentBoundTag.toUpperCase() !== extractedTag.toUpperCase()
      ) {
        triggerHaptic([30, 50, 30]);
        clearJsonImportInputState();
        setTagMismatchAlert({
          incomingTag: extractedTag,
          currentTag: currentBoundTag,
        });
        return;
      }
    }

    // Extract active potion & Magic Snack boost seconds directly from the `boosts` object (or root boost keys)
    const builderBoostSeconds = Math.max(
      0,
      Math.floor(
        Number(
          data.boosts?.builder_boost ??
            data.boosts?.builders_boost ??
            (data as Record<string, unknown>).builder_boost
        ) || 0
      )
    );
    const labBoostSeconds = Math.max(
      0,
      Math.floor(
        Number(
          data.boosts?.lab_boost ??
            data.boosts?.research_boost ??
            (data as Record<string, unknown>).lab_boost
        ) || 0
      )
    );
    const petBoostSeconds = Math.max(
      0,
      Math.floor(
        Number(
          data.boosts?.pet_boost ??
            data.boosts?.pethouse_boost ??
            (data as Record<string, unknown>).pet_boost
        ) || 0
      )
    );
    // Magic Snacks Auto-Detection:
    // - Builder Bite (2x speed, overridden by Builder Potion 10x): `data.boosts.builder_consumable`
    // - Study Soup (4x speed, stacks additively with Research/Pet Potion 24x -> 27x): `data.boosts.lab_consumable`
    const builderBiteSeconds = Math.max(
      0,
      Math.floor(
        Number(
          data.boosts?.builder_consumable ??
            (data as Record<string, unknown>).builder_consumable
        ) || 0
      )
    );
    const studySoupSeconds = Math.max(
      0,
      Math.floor(
        Number(
          data.boosts?.lab_consumable ??
            (data as Record<string, unknown>).lab_consumable
        ) || 0
      )
    );
    const jsonExportTimestamp =
      typeof data.timestamp === 'number' && data.timestamp > 0
        ? Math.floor(data.timestamp)
        : null;

    // Extract Helpers / Apprentices (93000000: Builder's Apprentice, 93000001: Lab Apprentice)
    const rawHelpers: RawCoCItem[] = Array.isArray(data.helpers) ? data.helpers : [];
    const rawBuilderApprentice = rawHelpers.find(
      (item) => Number(item?.data ?? item?.id) === 93000000
    );
    const rawLabApprentice = rawHelpers.find(
      (item) => Number(item?.data ?? item?.id) === 93000001
    );

    const parsedBuilderHelperLvl =
      typeof rawBuilderApprentice?.lvl === 'number' && rawBuilderApprentice.lvl >= 1
        ? Math.min(8, Math.max(1, Math.floor(rawBuilderApprentice.lvl)))
        : builderApprentice.level;
    const parsedBuilderCooldownSec = Math.max(
      0,
      Math.floor(Number(rawBuilderApprentice?.helper_cooldown) || 0)
    );
    const explicitBuilderSessionSec = Math.max(
      0,
      Math.floor(Number(rawBuilderApprentice?.helper_timer ?? rawBuilderApprentice?.timer) || 0)
    );

    const parsedLabHelperLvl =
      typeof rawLabApprentice?.lvl === 'number' && rawLabApprentice.lvl >= 1
        ? Math.min(12, Math.max(1, Math.floor(rawLabApprentice.lvl)))
        : labApprentice.level;
    const parsedLabCooldownSec = Math.max(
      0,
      Math.floor(Number(rawLabApprentice?.helper_cooldown) || 0)
    );
    const explicitLabSessionSec = Math.max(
      0,
      Math.floor(Number(rawLabApprentice?.helper_timer ?? rawLabApprentice?.timer) || 0)
    );

    const hasHelperAssignedOnItem = (item: RawCoCItem | undefined): boolean => {
      if (!item) return false;
      return (
        item.helper_recurrent === true ||
        item.helper_assigned === true ||
        item.helper === true ||
        Number(item.helper) === 93000000 ||
        Number(item.helper) === 93000001 ||
        (typeof item.helper_timer === 'number' && item.helper_timer > 0) ||
        (typeof item.helper_cooldown === 'number' && item.helper_cooldown > 0)
      );
    };

    // 1. Scan Home Village Builder arrays: buildings, traps, heroes
    const homeItems: RawCoCItem[] = [
      ...(Array.isArray(parsedData.buildings) ? parsedData.buildings : []),
      ...(Array.isArray(parsedData.traps) ? parsedData.traps : []),
      ...(Array.isArray(parsedData.heroes) ? parsedData.heroes : []),
    ];

    const activeBuilderUpgrades = homeItems.filter(
      (item) => item && typeof item.timer === 'number' && item.timer > 0
    );

    // 2. Scan Laboratory arrays: units, spells, siege_machines
    const labItems: RawCoCItem[] = [
      ...(Array.isArray(parsedData.units) ? parsedData.units : []),
      ...(Array.isArray(parsedData.spells) ? parsedData.spells : []),
      ...(Array.isArray(parsedData.siege_machines) ? parsedData.siege_machines : []),
    ];

    const activeLabUpgrades = labItems.filter(
      (item) => item && typeof item.timer === 'number' && item.timer > 0
    );

    // 3. Scan Pet House array: pets
    const petItems: RawCoCItem[] = Array.isArray(parsedData.pets) ? parsedData.pets : [];
    const activePetUpgrades = petItems.filter(
      (item) => item && typeof item.timer === 'number' && item.timer > 0
    );

    if (
      activeBuilderUpgrades.length === 0 &&
      activeLabUpgrades.length === 0 &&
      activePetUpgrades.length === 0 &&
      builderBoostSeconds === 0 &&
      labBoostSeconds === 0 &&
      petBoostSeconds === 0 &&
      builderBiteSeconds === 0 &&
      studySoupSeconds === 0 &&
      rawHelpers.length === 0
    ) {
      showToast('error', 'No active Home Village upgrades found');
      return;
    }

    const importNow = Date.now();
    const nextBuilderBoostEndTime =
      builderBoostSeconds > 0 ? importNow + builderBoostSeconds * 1000 : null;
    const nextLabBoostEndTime =
      labBoostSeconds > 0 ? importNow + labBoostSeconds * 1000 : null;
    const nextPetBoostEndTime =
      petBoostSeconds > 0 ? importNow + petBoostSeconds * 1000 : null;
    const nextBuilderBiteEndTime =
      builderBiteSeconds > 0 ? importNow + builderBiteSeconds * 1000 : null;
    const nextStudySoupEndTime =
      studySoupSeconds > 0 ? importNow + studySoupSeconds * 1000 : null;

    // Map Builders (1..6 regular + slot 7 Goblin Builder) and detect Builder's Apprentice assignment
    const goblinBuilderItem = activeBuilderUpgrades.find((item) => item.extra === true);
    const regularBuilderItems = activeBuilderUpgrades
      .filter((item) => item.extra !== true)
      .slice(0, 6);

    const nextBuilders: BuilderTime[] = createEmptyBuilders();
    let detectedBuilderHelperSlot: number | null = null;
    let detectedBuilderHelperItem: RawCoCItem | undefined;
    let detectedBuilderItemHelperTimer = 0;

    regularBuilderItems.forEach((item, idx) => {
      nextBuilders[idx] = convertRawItemToTimer(item, 'Defense Upgrade');
      if (detectedBuilderHelperSlot === null && hasHelperAssignedOnItem(item)) {
        detectedBuilderHelperSlot = idx;
        detectedBuilderHelperItem = item;
        detectedBuilderItemHelperTimer = Math.max(0, Math.floor(Number(item.helper_timer) || 0));
      }
    });

    if (goblinBuilderItem) {
      nextBuilders[6] = convertRawItemToTimer(goblinBuilderItem, 'Defense Upgrade');
      if (detectedBuilderHelperSlot === null && hasHelperAssignedOnItem(goblinBuilderItem)) {
        detectedBuilderHelperSlot = 6;
        detectedBuilderHelperItem = goblinBuilderItem;
        detectedBuilderItemHelperTimer = Math.max(
          0,
          Math.floor(Number(goblinBuilderItem.helper_timer) || 0)
        );
      }
    }

    // If Builder's Apprentice is actively running a 1h session (cooldown > 82800 or helper_timer > 0)
    // and only one regular builder upgrade is active, bind to slot 0
    if (
      detectedBuilderHelperSlot === null &&
      regularBuilderItems.length === 1 &&
      (parsedBuilderCooldownSec > 82800 || explicitBuilderSessionSec > 0)
    ) {
      detectedBuilderHelperSlot = 0;
      detectedBuilderHelperItem = regularBuilderItems[0];
    }

    let builderActiveSessionSec = 0;
    if (detectedBuilderHelperSlot !== null) {
      if (explicitBuilderSessionSec > 0) {
        builderActiveSessionSec = Math.min(3600, explicitBuilderSessionSec);
      } else if (detectedBuilderItemHelperTimer > 0) {
        builderActiveSessionSec = Math.min(3600, detectedBuilderItemHelperTimer);
      } else if (parsedBuilderCooldownSec > 82800) {
        builderActiveSessionSec = Math.min(3600, parsedBuilderCooldownSec - 82800);
      }
    }

    const isBuilderHelperRecurrent =
      detectedBuilderHelperSlot !== null &&
      Boolean(
        detectedBuilderHelperItem?.helper_recurrent === true ||
          rawBuilderApprentice?.helper_recurrent === true
      );

    const shouldKeepBuilderHelperSlot =
      detectedBuilderHelperSlot !== null &&
      (builderActiveSessionSec > 0 || isBuilderHelperRecurrent);

    const nextBuilderApprentice: BuilderApprenticeState = {
      id: 93000000,
      level: parsedBuilderHelperLvl,
      assignedSlot: shouldKeepBuilderHelperSlot ? detectedBuilderHelperSlot : null,
      activeSessionEndTime:
        shouldKeepBuilderHelperSlot && builderActiveSessionSec > 0
          ? importNow + builderActiveSessionSec * 1000
          : null,
      cooldownEndTime:
        parsedBuilderCooldownSec > 0
          ? importNow + parsedBuilderCooldownSec * 1000
          : builderActiveSessionSec > 0
          ? importNow + 86400 * 1000
          : null,
      recurrent: shouldKeepBuilderHelperSlot ? isBuilderHelperRecurrent : false,
    };

    const totalLoadedBuilders =
      regularBuilderItems.length + (goblinBuilderItem ? 1 : 0);
    const nextBuilderSliderCount = goblinBuilderItem
      ? 7
      : Math.max(1, Math.min(6, regularBuilderItems.length || 2));

    // Map Laboratory (standard extra !== true -> labTimer, extra === true -> goblinLabTimer) & detect Lab Apprentice assignment
    const standardLabItem = activeLabUpgrades.find((item) => item.extra !== true);
    const goblinLabItem = activeLabUpgrades.find((item) => item.extra === true);
    const labBuildingItem = Array.isArray(parsedData.buildings)
      ? parsedData.buildings.find((b) => Number(b?.data ?? b?.id) === 1000007)
      : undefined;

    const nextLabTimer = standardLabItem
      ? convertRawItemToTimer(standardLabItem, 'Troop / Spell Upgrade')
      : createEmptyTimer();
    const nextGoblinLabTimer = goblinLabItem
      ? convertRawItemToTimer(goblinLabItem, 'Goblin Researcher')
      : createEmptyTimer();

    let detectedLabHelperSlot: 'main' | 'goblin' | null = null;
    let detectedLabItemHelperTimer = 0;
    if (hasHelperAssignedOnItem(standardLabItem)) {
      detectedLabHelperSlot = 'main';
      detectedLabItemHelperTimer = Math.max(
        0,
        Math.floor(Number(standardLabItem?.helper_timer) || 0)
      );
    } else if (hasHelperAssignedOnItem(goblinLabItem)) {
      detectedLabHelperSlot = 'goblin';
      detectedLabItemHelperTimer = Math.max(
        0,
        Math.floor(Number(goblinLabItem?.helper_timer) || 0)
      );
    } else if (
      standardLabItem &&
      (hasHelperAssignedOnItem(labBuildingItem) ||
        rawLabApprentice?.helper_recurrent === true ||
        rawLabApprentice?.helper_assigned === true ||
        parsedLabCooldownSec > 82800 ||
        explicitLabSessionSec > 0)
    ) {
      detectedLabHelperSlot = 'main';
      detectedLabItemHelperTimer = Math.max(
        0,
        Math.floor(Number(labBuildingItem?.helper_timer) || 0)
      );
    } else if (
      goblinLabItem &&
      (hasHelperAssignedOnItem(labBuildingItem) ||
        rawLabApprentice?.helper_recurrent === true ||
        rawLabApprentice?.helper_assigned === true ||
        parsedLabCooldownSec > 82800 ||
        explicitLabSessionSec > 0)
    ) {
      detectedLabHelperSlot = 'goblin';
      detectedLabItemHelperTimer = Math.max(
        0,
        Math.floor(Number(labBuildingItem?.helper_timer) || 0)
      );
    }

    let labActiveSessionSec = 0;
    if (detectedLabHelperSlot !== null) {
      if (explicitLabSessionSec > 0) {
        labActiveSessionSec = Math.min(3600, explicitLabSessionSec);
      } else if (detectedLabItemHelperTimer > 0) {
        labActiveSessionSec = Math.min(3600, detectedLabItemHelperTimer);
      } else if (parsedLabCooldownSec > 82800) {
        labActiveSessionSec = Math.min(3600, parsedLabCooldownSec - 82800);
      }
    }

    const isLabHelperRecurrent =
      detectedLabHelperSlot !== null &&
      Boolean(
        standardLabItem?.helper_recurrent === true ||
          goblinLabItem?.helper_recurrent === true ||
          labBuildingItem?.helper_recurrent === true ||
          rawLabApprentice?.helper_recurrent === true
      );

    const shouldKeepLabHelperSlot =
      detectedLabHelperSlot !== null &&
      (labActiveSessionSec > 0 || isLabHelperRecurrent);

    const nextLabApprentice: LabApprenticeState = {
      id: 93000001,
      level: parsedLabHelperLvl,
      assignedSlot: shouldKeepLabHelperSlot ? detectedLabHelperSlot : null,
      activeSessionEndTime:
        shouldKeepLabHelperSlot && labActiveSessionSec > 0
          ? importNow + labActiveSessionSec * 1000
          : null,
      cooldownEndTime:
        parsedLabCooldownSec > 0
          ? importNow + parsedLabCooldownSec * 1000
          : labActiveSessionSec > 0
          ? importNow + 86400 * 1000
          : null,
      recurrent: shouldKeepLabHelperSlot ? isLabHelperRecurrent : false,
    };

    // Map Pet House (activePetUpgrades[0] -> petTimer)
    const activePetItem = activePetUpgrades[0];
    const nextPetTimer = activePetItem
      ? convertRawItemToTimer(activePetItem, 'Active Pet Upgrade')
      : createEmptyTimer();

    const targetPotions = '0';
    const targetResPotions = 0;
    const targetPetPotionsCount = 0;

    const newAccountName =
      newVillageNameInput.trim() ||
      (extractedTag ? `Village ${extractedTag}` : `Village ${accounts.length + 1}`);
    const newAccountId = `village_${Date.now()}`;

    const targetVillageId = isAddingNewAccount ? newAccountId : activeAccountId;
    const targetVillageName = isAddingNewAccount
      ? newAccountName
      : getActiveVillageName(activeAccountId);

    const { computedResults, computedSavedText } = runCalculationWithData(
      'multi',
      nextBuilderSliderCount,
      nextBuilders,
      targetPotions,
      targetVillageId,
      targetVillageName,
      builderBoostSeconds,
      nextBuilderApprentice,
      true,
      builderBiteSeconds
    );

    const labSched = computeLabSchedule(
      nextLabTimer,
      nextGoblinLabTimer,
      targetResPotions,
      targetVillageId,
      targetVillageName,
      labBoostSeconds,
      nextLabApprentice,
      true,
      studySoupSeconds
    );
    const petSched = computePetSchedule(
      nextPetTimer,
      targetPetPotionsCount,
      targetVillageId,
      targetVillageName,
      petBoostSeconds,
      true,
      studySoupSeconds
    );

    const assignedBuilderUpgradeFinishTs =
      nextBuilderApprentice.assignedSlot !== null
        ? computedResults.find((r) => r.builderIndex === nextBuilderApprentice.assignedSlot)
            ?.targetTimestamp ?? null
        : null;
    const assignedLabUpgradeFinishTs =
      nextLabApprentice.assignedSlot === 'main'
        ? labSched.nextMainTs
        : nextLabApprentice.assignedSlot === 'goblin'
        ? labSched.nextGoblinTs
        : null;

    // Clear all previous pending notifications once and schedule all active upgrade & boost alarms in a single pass
    void scheduleAllVillageNotificationsSinglePass({
      villageId: targetVillageId,
      villageName: targetVillageName,
      builderResults: computedResults,
      labMainTimer: nextLabTimer,
      labMainTargetTs: labSched.nextMainTs,
      labGoblinTimer: nextGoblinLabTimer,
      labGoblinTargetTs: labSched.nextGoblinTs,
      petTimerVal: nextPetTimer,
      petTargetTs: petSched.nextPetTs,
      builderBoostEndTime: nextBuilderBoostEndTime,
      labBoostEndTime: nextLabBoostEndTime,
      petBoostEndTime: nextPetBoostEndTime,
      builderHelperCooldownEndTime: getHelperAvailableNotificationTimestamp({
        helper: nextBuilderApprentice,
        assignedUpgradeFinishTimestamp: assignedBuilderUpgradeFinishTs,
        now: importNow,
      }),
      labHelperCooldownEndTime: getHelperAvailableNotificationTimestamp({
        helper: nextLabApprentice,
        assignedUpgradeFinishTimestamp: assignedLabUpgradeFinishTs,
        now: importNow,
      }),
    });

    const townHallBuildingItem = Array.isArray(parsedData.buildings)
      ? parsedData.buildings.find((b) => Number(b?.data ?? b?.id) === 1000001)
      : undefined;
    const parsedThLevel =
      typeof townHallBuildingItem?.lvl === 'number' && townHallBuildingItem.lvl >= 1
        ? Math.floor(townHallBuildingItem.lvl)
        : thLevel;
    const syncedTimeLabel = formatWidgetClockTime(importNow);

    // Capture the village's existing active boost timestamps BEFORE overwriting state
    // so an already-active boost session in the app is never double-counted as a new boost
    const existingActiveProfileBeforeImport = !isAddingNewAccount
      ? accounts.find((a) => a.id === activeAccountId)
      : undefined;
    const prevActiveBuilderBoostEndTime = !isAddingNewAccount
      ? existingActiveProfileBeforeImport?.data?.builderBoostEndTime ?? builderBoostEndTime
      : null;
    const prevActiveLabBoostEndTime = !isAddingNewAccount
      ? existingActiveProfileBeforeImport?.data?.labBoostEndTime ?? labBoostEndTime
      : null;
    const prevActivePetBoostEndTime = !isAddingNewAccount
      ? existingActiveProfileBeforeImport?.data?.petBoostEndTime ?? petBoostEndTime
      : null;

    setLabTimer(nextLabTimer);
    setGoblinLabTimer(nextGoblinLabTimer);
    setPetTimer(nextPetTimer);
    setBuilderBoostEndTime(nextBuilderBoostEndTime);
    setLabBoostEndTime(nextLabBoostEndTime);
    setPetBoostEndTime(nextPetBoostEndTime);
    setBuilderBiteEndTime(nextBuilderBiteEndTime);
    setStudySoupEndTime(nextStudySoupEndTime);
    setBuilderApprentice(nextBuilderApprentice);
    setLabApprentice(nextLabApprentice);
    setThLevel(parsedThLevel);
    setLastSynced(syncedTimeLabel);
    setPotionsInput(targetPotions);
    setResearchPotions(targetResPotions);
    setPetPotions(targetPetPotionsCount);

    const importedProfileState: SavedState = {
      ...createDefaultSavedState(),
      mode: 'multi',
      numBuilders: nextBuilderSliderCount,
      builders: nextBuilders,
      potions: targetPotions,
      lockedResults: computedResults,
      lockedSavedText: computedSavedText,
      researchPotions: targetResPotions,
      labTimer: nextLabTimer,
      goblinLabTimer: nextGoblinLabTimer,
      targetLabTimestamp: labSched.nextMainTs,
      labFormattedDate: labSched.nextMainDate,
      labSavedText: labSched.nextLabSavedText,
      targetGoblinLabTimestamp: labSched.nextGoblinTs,
      goblinLabFormattedDate: labSched.nextGoblinDate,
      petPotions: targetPetPotionsCount,
      petTimer: nextPetTimer,
      targetPetTimestamp: petSched.nextPetTs,
      petFormattedDate: petSched.nextPetDate,
      petSavedText: petSched.nextPetSavedText,
      builderBoostEndTime: nextBuilderBoostEndTime,
      labBoostEndTime: nextLabBoostEndTime,
      petBoostEndTime: nextPetBoostEndTime,
      builderBiteEndTime: nextBuilderBiteEndTime,
      studySoupEndTime: nextStudySoupEndTime,
      builderApprentice: nextBuilderApprentice,
      labApprentice: nextLabApprentice,
      thLevel: parsedThLevel,
      lastSynced: syncedTimeLabel,
    };

    if (isAddingNewAccount) {
      const newProfile: VillageProfile = {
        id: newAccountId,
        name: newAccountName,
        tag: extractedTag,
        data: importedProfileState,
      };
      setAccounts((prev) => {
        const nextList = [...prev, newProfile];
        syncAllVillagesToNativeWidget(nextList, newAccountId);
        return nextList;
      });
      setActiveAccountId(newAccountId);
    } else {
      // Immediately persist imported state (including dynamic thLevel & tag) into the active account and sync widget
      setAccounts((prev) => {
        const updated = prev.map((acc) =>
          acc.id === activeAccountId
            ? {
                ...acc,
                tag: acc.tag || extractedTag,
                data: {
                  ...acc.data,
                  ...importedProfileState,
                },
              }
            : acc
        );
        try {
          const multiPayload: MultiAccountStorage = {
            activeAccountId,
            accounts: updated,
          };
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(multiPayload));
          syncAllVillagesToNativeWidget(updated, activeAccountId);
        } catch {
          // Ignore storage error
        }
        return updated;
      });
    }

    // Sync Monthly Baseline (`village_baseline_${YYYY_MM}_${PLAYER_TAG}`),
    // Active JSON Boost Potions (`data.boosts`), and
    // Monthly History (`village_history_${YYYY_MM}_${PLAYER_TAG}`) on JSON import
    const existingBoundTag = !isAddingNewAccount
      ? accounts.find((a) => a.id === activeAccountId)?.tag?.trim()
      : undefined;
    const resolvedImportPlayerTag = (extractedTag || existingBoundTag || '').trim().toUpperCase();
    const currentMonthKey = getCurrentYearMonthKey(new Date(importNow));

    if (resolvedImportPlayerTag) {
      const prevBoostTrack = loadLastImportedBoostState(resolvedImportPlayerTag);

      // If `lastImportedBoostState_${TAG}` didn't have an entry yet for an already-running
      // boost in the app, seed the previous entry from the village's existing active boost timer
      const resolveEffectivePrevBoostEntry = (
        trackedEntry: BoostImportTrackEntry | undefined,
        existingBoostEndTs: number | null | undefined
      ): BoostImportTrackEntry | undefined => {
        if (trackedEntry && importNow < trackedEntry.expiryTimestamp) {
          if (existingBoostEndTs && existingBoostEndTs > trackedEntry.expiryTimestamp) {
            return {
              ...trackedEntry,
              expiryTimestamp: existingBoostEndTs,
            };
          }
          return trackedEntry;
        }
        if (existingBoostEndTs && existingBoostEndTs > importNow) {
          const remSec = Math.max(1, Math.ceil((existingBoostEndTs - importNow) / 1000));
          return {
            rawBoostSeconds: remSec,
            jsonTimestamp: null,
            startTimestamp: importNow,
            expiryTimestamp: existingBoostEndTs,
            creditedPotions: Math.ceil(remSec / 3600),
          };
        }
        return trackedEntry;
      };

      const prevActiveBuilderBiteEndTime = !isAddingNewAccount
        ? existingActiveProfileBeforeImport?.data?.builderBiteEndTime ?? builderBiteEndTime
        : null;
      const prevActiveStudySoupEndTime = !isAddingNewAccount
        ? existingActiveProfileBeforeImport?.data?.studySoupEndTime ?? studySoupEndTime
        : null;

      const effectivePrevBuilderEntry = resolveEffectivePrevBoostEntry(
        prevBoostTrack.builder,
        prevActiveBuilderBoostEndTime
      );
      const effectivePrevLabEntry = resolveEffectivePrevBoostEntry(
        prevBoostTrack.lab,
        prevActiveLabBoostEndTime
      );
      const effectivePrevPetEntry = resolveEffectivePrevBoostEntry(
        prevBoostTrack.pet,
        prevActivePetBoostEndTime
      );
      const effectivePrevBuilderBiteEntry = resolveEffectivePrevBoostEntry(
        prevBoostTrack.builderBite,
        prevActiveBuilderBiteEndTime
      );
      const effectivePrevStudySoupEntry = resolveEffectivePrevBoostEntry(
        prevBoostTrack.studySoup,
        prevActiveStudySoupEndTime
      );

      const builderBoostTrack = computeNewlyCreditedBoostPotions(
        builderBoostSeconds,
        effectivePrevBuilderEntry,
        importNow,
        jsonExportTimestamp
      );
      const labBoostTrack = computeNewlyCreditedBoostPotions(
        labBoostSeconds,
        effectivePrevLabEntry,
        importNow,
        jsonExportTimestamp
      );
      const petBoostTrack = computeNewlyCreditedBoostPotions(
        petBoostSeconds,
        effectivePrevPetEntry,
        importNow,
        jsonExportTimestamp
      );
      const builderBiteTrack = computeNewlyCreditedBoostPotions(
        builderBiteSeconds,
        effectivePrevBuilderBiteEntry,
        importNow,
        jsonExportTimestamp
      );
      const studySoupTrack = computeNewlyCreditedBoostPotions(
        studySoupSeconds,
        effectivePrevStudySoupEntry,
        importNow,
        jsonExportTimestamp
      );

      const nextBoostTrackState: LastImportedBoostState = {};
      if (builderBoostTrack.nextEntry) {
        nextBoostTrackState.builder = builderBoostTrack.nextEntry;
      }
      if (labBoostTrack.nextEntry) {
        nextBoostTrackState.lab = labBoostTrack.nextEntry;
      }
      if (petBoostTrack.nextEntry) {
        nextBoostTrackState.pet = petBoostTrack.nextEntry;
      }
      if (builderBiteTrack.nextEntry) {
        nextBoostTrackState.builderBite = builderBiteTrack.nextEntry;
      }
      if (studySoupTrack.nextEntry) {
        nextBoostTrackState.studySoup = studySoupTrack.nextEntry;
      }
      saveLastImportedBoostState(resolvedImportPlayerTag, nextBoostTrackState);

      const preImportHistory = loadVillageMonthlyHistory(
        resolvedImportPlayerTag,
        currentMonthKey
      );
      let didCreditBoostPotions = false;

      if (builderBoostTrack.potionsToCredit > 0) {
        const activeBuildersForBoost =
          totalLoadedBuilders > 0 ? totalLoadedBuilders : nextBuilderSliderCount;
        const addedBuilderMins =
          activeBuildersForBoost * 9 * 60 * builderBoostTrack.potionsToCredit;
        preImportHistory.potions.builder.used += builderBoostTrack.potionsToCredit;
        preImportHistory.potions.builder.timeSavedMinutes += addedBuilderMins;
        didCreditBoostPotions = true;
      }

      if (labBoostTrack.potionsToCredit > 0) {
        const activeLabSlotsForBoost = Math.max(
          1,
          (standardLabItem ? 1 : 0) + (goblinLabItem ? 1 : 0)
        );
        const addedLabMins = activeLabSlotsForBoost * 23 * 60 * labBoostTrack.potionsToCredit;
        preImportHistory.potions.research.used += labBoostTrack.potionsToCredit;
        preImportHistory.potions.research.timeSavedMinutes += addedLabMins;
        didCreditBoostPotions = true;
      }

      if (petBoostTrack.potionsToCredit > 0) {
        const addedPetMins = 23 * 60 * petBoostTrack.potionsToCredit;
        preImportHistory.potions.pet.used += petBoostTrack.potionsToCredit;
        preImportHistory.potions.pet.timeSavedMinutes += addedPetMins;
        didCreditBoostPotions = true;
      }

      if (builderBiteTrack.potionsToCredit > 0) {
        const activeBuildersForBite =
          totalLoadedBuilders > 0 ? totalLoadedBuilders : nextBuilderSliderCount;
        // Builder Bite is 2x speed (+1h saved per builder per 1h snack when not overridden by Builder Potion)
        const addedBiteMins =
          builderBoostSeconds > 0
            ? 0
            : activeBuildersForBite * 1 * 60 * builderBiteTrack.potionsToCredit;
        const curBite = preImportHistory.potions.builderBite || {
          used: 0,
          timeSavedMinutes: 0,
        };
        preImportHistory.potions.builderBite = {
          used: curBite.used + builderBiteTrack.potionsToCredit,
          timeSavedMinutes: curBite.timeSavedMinutes + addedBiteMins,
        };
        didCreditBoostPotions = true;
      }

      if (studySoupTrack.potionsToCredit > 0) {
        const activeLabPetSlotsForSoup = Math.max(
          1,
          (standardLabItem ? 1 : 0) + (goblinLabItem ? 1 : 0) + (activePetItem ? 1 : 0)
        );
        // Study Soup is 4x speed (+3h saved per active lab/pet slot per 1h snack)
        const addedSoupMins =
          activeLabPetSlotsForSoup * 3 * 60 * studySoupTrack.potionsToCredit;
        const curSoup = preImportHistory.potions.studySoup || {
          used: 0,
          timeSavedMinutes: 0,
        };
        preImportHistory.potions.studySoup = {
          used: curSoup.used + studySoupTrack.potionsToCredit,
          timeSavedMinutes: curSoup.timeSavedMinutes + addedSoupMins,
        };
        didCreditBoostPotions = true;
      }

      if (didCreditBoostPotions) {
        saveVillageMonthlyHistory(preImportHistory, resolvedImportPlayerTag, currentMonthKey);
        const updatedBoostSectionStats: MonthlySectionStats = {
          builderPotionsCount: preImportHistory.potions.builder.used,
          builderSecondsSaved: preImportHistory.potions.builder.timeSavedMinutes * 60,
          researchPotionsCount: preImportHistory.potions.research.used,
          labSecondsSaved: preImportHistory.potions.research.timeSavedMinutes * 60,
          petPotionsCount: preImportHistory.potions.pet.used,
          petSecondsSaved: preImportHistory.potions.pet.timeSavedMinutes * 60,
        };
        saveMonthlySectionStatsForTag(
          resolvedImportPlayerTag,
          'builders',
          updatedBoostSectionStats,
          currentMonthKey
        );
        saveMonthlySectionStatsForTag(
          resolvedImportPlayerTag,
          'lab',
          updatedBoostSectionStats,
          currentMonthKey
        );
        saveMonthlySectionStatsForTag(
          resolvedImportPlayerTag,
          'pethouse',
          updatedBoostSectionStats,
          currentMonthKey
        );
      }
    }

    const updatedHistoryObj = syncMonthlyBaselineAndHistoryOnImport(
      parsedData,
      resolvedImportPlayerTag,
      currentMonthKey
    );
    setMonthlyHistory(updatedHistoryObj);
    setMonthlyStats({
      builderPotionsCount: updatedHistoryObj.potions.builder.used,
      builderSecondsSaved: updatedHistoryObj.potions.builder.timeSavedMinutes * 60,
      researchPotionsCount: updatedHistoryObj.potions.research.used,
      labSecondsSaved: updatedHistoryObj.potions.research.timeSavedMinutes * 60,
      petPotionsCount: updatedHistoryObj.potions.pet.used,
      petSecondsSaved: updatedHistoryObj.potions.pet.timeSavedMinutes * 60,
    });

    setCurrentMode('multi');
    setNumBuilders(nextBuilderSliderCount);
    setBuilders(nextBuilders);
    setTimersCollapsedState(true);

    // Switch to most relevant tab if builders are empty
    if (totalLoadedBuilders > 0 || builderBoostSeconds > 0 || builderBiteSeconds > 0) {
      setActiveTab('builders');
    } else if (activeLabUpgrades.length > 0 || labBoostSeconds > 0 || studySoupSeconds > 0) {
      setActiveTab('laboratory');
    } else if (activePetUpgrades.length > 0 || petBoostSeconds > 0) {
      setActiveTab('pethouse');
    }

    setIsImportModalOpen(false);
    setIsAddingNewAccount(false);
    setNewVillageNameInput('');
    setJsonInputText('');

    const summaryParts: string[] = [];
    if (totalLoadedBuilders > 0) summaryParts.push(`${totalLoadedBuilders} builders`);
    if (activeLabUpgrades.length > 0) summaryParts.push(`${activeLabUpgrades.length} lab`);
    if (activePetUpgrades.length > 0) summaryParts.push(`${activePetUpgrades.length} pet`);
    const activeBoostCount =
      (builderBoostSeconds > 0 ? 1 : 0) +
      (labBoostSeconds > 0 ? 1 : 0) +
      (petBoostSeconds > 0 ? 1 : 0) +
      (builderBiteSeconds > 0 ? 1 : 0) +
      (studySoupSeconds > 0 ? 1 : 0);
    if (activeBoostCount > 0) {
      summaryParts.push(`${activeBoostCount} active boost${activeBoostCount > 1 ? 's' : ''}`);
    }
    if (detectedBuilderHelperSlot !== null || detectedLabHelperSlot !== null) {
      summaryParts.push('helpers synced');
    }

    showToast('success', `Loaded ${summaryParts.join(', ')}!`);
  };

  const activeBuildersToRender = currentMode === 'single' ? 1 : numBuilders;
  const activeBuilderTimersCount = builders
    .slice(0, activeBuildersToRender)
    .filter((b) => getTimerTotalSeconds(b) > 0).length;

  const pendingBuilderPotions = Math.max(0, parseInt(potionsInput, 10) || 0);
  const builderBoostRemSec = getRemainingBoostSeconds(builderBoostEndTime, nowTick);
  const labBoostRemSec = getRemainingBoostSeconds(labBoostEndTime, nowTick);
  const petBoostRemSec = getRemainingBoostSeconds(petBoostEndTime, nowTick);
  const builderBiteRemSec = getRemainingBoostSeconds(builderBiteEndTime, nowTick);
  const studySoupRemSec = getRemainingBoostSeconds(studySoupEndTime, nowTick);

  const builderPreview =
    pendingBuilderPotions > 0
      ? computeBuilderScheduleValues(
          currentMode,
          numBuilders,
          builders,
          pendingBuilderPotions,
          builderBoostRemSec,
          builderApprentice,
          lockedResults.length > 0,
          builderBiteRemSec
        )
      : null;

  const unconfirmedBuilderBaseline =
    lockedResults.length === 0 && pendingBuilderPotions > 0
      ? computeBuilderScheduleValues(
          currentMode,
          numBuilders,
          builders,
          0,
          builderBoostRemSec,
          builderApprentice,
          false,
          builderBiteRemSec
        )
      : null;

  const displayedBuilderResults =
    lockedResults.length > 0
      ? lockedResults
      : unconfirmedBuilderBaseline?.computedResults || [];

  const displayedBuilderSavedText =
    pendingBuilderPotions > 0 && builderPreview
      ? builderPreview.computedSavedText
      : savedText;

  const shouldShowBuilderResults =
    (showResult && lockedResults.length > 0) ||
    (pendingBuilderPotions > 0 && displayedBuilderResults.length > 0);

  // Find the upgrade finishing soonest among active (unfinished) displayed results
  const activeUnfinishedBuilderResults = (
    pendingBuilderPotions > 0 && builderPreview
      ? builderPreview.computedResults
      : displayedBuilderResults
  ).filter((r) => r.targetTimestamp > nowTick);

  const soonestTargetTimestamp =
    activeUnfinishedBuilderResults.length > 0
      ? Math.min(...activeUnfinishedBuilderResults.map((r) => r.targetTimestamp))
      : null;

  const labPreview =
    researchPotions > 0
      ? computeLabScheduleValues(
          labTimer,
          goblinLabTimer,
          researchPotions,
          labBoostRemSec,
          labApprentice,
          getLabSlotCurrentRemainingSeconds('main'),
          getLabSlotCurrentRemainingSeconds('goblin'),
          studySoupRemSec
        )
      : null;

  const displayedLabDate =
    researchPotions > 0 && labPreview?.nextMainDate
      ? labPreview.nextMainDate
      : labFormattedDate;
  const displayedGoblinLabDate =
    researchPotions > 0 && labPreview?.nextGoblinDate
      ? labPreview.nextGoblinDate
      : goblinLabFormattedDate;
  const displayedLabSavedText =
    researchPotions > 0 && labPreview ? labPreview.nextLabSavedText : labSavedText;

  const hasPetTimerInput = getTimerTotalSeconds(petTimer) > 0;

  const petPreview =
    petPotions > 0
      ? computePetScheduleValues(
          petTimer,
          petPotions,
          petBoostRemSec,
          getPetSlotCurrentRemainingSeconds(),
          studySoupRemSec
        )
      : null;

  const displayedPetDate =
    petPotions > 0 && petPreview?.nextPetDate ? petPreview.nextPetDate : petFormattedDate;
  const displayedPetSavedText =
    petPotions > 0 && petPreview ? petPreview.nextPetSavedText : petSavedText;

  // Resolve target names for the Helpers Sub-Tab cards
  const builderHelperTargetName = (() => {
    if (builderApprentice.assignedSlot === null) return null;
    const slotIdx = builderApprentice.assignedSlot;
    const lockedMatch = lockedResults.find((r) => r.builderIndex === slotIdx);
    if (lockedMatch?.upgradeTitle) return lockedMatch.upgradeTitle;
    const b = builders[slotIdx];
    if (b && getTimerTotalSeconds(b) > 0) {
      return b.upgradeTitle || (slotIdx === 6 ? 'Goblin Builder' : `Builder ${slotIdx + 1}`);
    }
    return null;
  })();

  const labHelperTargetName = (() => {
    if (labApprentice.assignedSlot === null) return null;
    if (labApprentice.assignedSlot === 'main') {
      if (getTimerTotalSeconds(labTimer) > 0 || (targetLabTimestamp && targetLabTimestamp > Date.now())) {
        return labTimer.upgradeTitle || 'Troop / Spell Upgrade';
      }
    } else if (labApprentice.assignedSlot === 'goblin') {
      if (
        getTimerTotalSeconds(goblinLabTimer) > 0 ||
        (targetGoblinLabTimestamp && targetGoblinLabTimestamp > Date.now())
      ) {
        return goblinLabTimer.upgradeTitle || 'Goblin Researcher';
      }
    }
    return null;
  })();

  const builderHelperCycleNow = getHelperCycleStateAt(builderApprentice, nowTick);
  const labHelperCycleNow = getHelperCycleStateAt(labApprentice, nowTick);

  const isBuilderHelperWorking =
    builderApprentice.assignedSlot !== null &&
    builderHelperTargetName !== null &&
    builderHelperCycleNow.isWorkingNow;

  const isLabHelperWorking =
    labApprentice.assignedSlot !== null &&
    labHelperTargetName !== null &&
    labHelperCycleNow.isWorkingNow;

  // Build active upgrade lists for the "Assign to Upgrade" modal
  const activeBuilderTargetsForModal = Array.from({ length: 7 }, (_, idx) => {
    const remSec = getBuilderSlotCurrentRemainingSeconds(idx);
    if (remSec <= 0) return null;
    const b = builders[idx];
    const lockedItem = lockedResults.find((r) => r.builderIndex === idx);
    const isGoblin = idx === 6;
    const slotBadge = isGoblin ? '[GOBLIN]' : `[B${idx + 1}]`;
    const name =
      lockedItem?.upgradeTitle ||
      b?.upgradeTitle ||
      (isGoblin ? 'Goblin Builder' : `Builder ${idx + 1} Upgrade`);
    const level = lockedItem?.upgradeLevel ?? b?.upgradeLevel;
    return {
      slotIdx: idx,
      slotBadge,
      name,
      level,
      remainingSeconds: remSec,
      isGoblin,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const activeLabTargetsForModal = (['main', 'goblin'] as const)
    .map((slot) => {
      const remSec = getLabSlotCurrentRemainingSeconds(slot);
      if (remSec <= 0) return null;
      const t = slot === 'main' ? labTimer : goblinLabTimer;
      const slotBadge = slot === 'main' ? '[LAB]' : '[GOBLIN LAB]';
      const name =
        t.upgradeTitle ||
        (slot === 'main' ? 'Troop / Spell Upgrade' : 'Goblin Researcher');
      return {
        slot,
        slotBadge,
        name,
        level: t.upgradeLevel,
        remainingSeconds: remSec,
        isGoblin: slot === 'goblin',
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Pure UI-layer expansion states for the Clash Ledger cards
  const [isVillageSwitcherOpen, setIsVillageSwitcherOpen] = useState<boolean>(false);
  const [isBoostDrawerOpen, setIsBoostDrawerOpen] = useState<boolean>(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'builders' | 'lab_pets'>('all');

  // Resolve Town Hall level for the Hero Header Card 3D render
  const resolvedThLevel = (() => {
    if (typeof thLevel === 'number' && thLevel >= 1 && thLevel <= 18) {
      return thLevel;
    }
    const thUpgradeInResults = displayedBuilderResults.find(
      (r) => r.rawId === '1000001' || r.upgradeTitle?.toLowerCase() === 'town hall'
    );
    if (thUpgradeInResults?.upgradeLevel) {
      return Math.min(18, Math.max(1, thUpgradeInResults.upgradeLevel));
    }
    const nameMatch = activeAccountProfile?.name?.match(/TH\s*(\d{1,2})/i);
    if (nameMatch) {
      const parsed = parseInt(nameMatch[1], 10);
      if (parsed >= 1 && parsed <= 18) return parsed;
    }
    return 17;
  })();

  const busyRegularBuildersCount = displayedBuilderResults.filter(
    (r) => !r.isGoblin && r.targetTimestamp > nowTick
  ).length;
  const regularBuildersCap =
    currentMode === 'single' ? 1 : Math.min(6, Math.max(1, numBuilders));
  const isGoblinBuilderBusy = displayedBuilderResults.some(
    (r) => r.isGoblin && r.targetTimestamp > nowTick
  );
  const effectiveBuilderResultsForQuickStats =
    pendingBuilderPotions > 0 && builderPreview
      ? builderPreview.computedResults
      : displayedBuilderResults;

  const soonestBuilderItem =
    effectiveBuilderResultsForQuickStats
      .filter((r) => r.targetTimestamp > nowTick)
      .sort((a, b) => a.targetTimestamp - b.targetTimestamp)[0] ||
    effectiveBuilderResultsForQuickStats[0] ||
    null;

  const effectiveLabMainTimestamp =
    researchPotions > 0 && labPreview?.nextMainTs
      ? labPreview.nextMainTs
      : targetLabTimestamp;
  const effectiveLabGoblinTimestamp =
    researchPotions > 0 && labPreview?.nextGoblinTs
      ? labPreview.nextGoblinTs
      : targetGoblinLabTimestamp;
  const effectivePetTimestamp =
    petPotions > 0 && petPreview?.nextPetTs ? petPreview.nextPetTs : targetPetTimestamp;

  const activeLabQueueCount =
    (targetLabTimestamp ? 1 : 0) + (targetGoblinLabTimestamp ? 1 : 0);
  const activePetQueueCount = targetPetTimestamp ? 1 : 0;

  const activeBoostNodes: React.ReactNode[] = [];
  if (builderBoostRemSec > 0) {
    activeBoostNodes.push(
      <span key="builder_potion" className="inline-flex items-center gap-1">
        <img
          src="./icons/art_builder_potion.webp"
          alt="Builder Potion"
          className="w-4 h-4 inline object-contain"
        />
        <span>Builder 10x</span>
      </span>
    );
  }
  if (labBoostRemSec > 0) {
    activeBoostNodes.push(
      <span key="research_potion" className="inline-flex items-center gap-1">
        <img
          src="./icons/art_research_potion.webp"
          alt="Research Potion"
          className="w-4 h-4 inline object-contain"
        />
        <span>Research 24x</span>
      </span>
    );
  }
  if (petBoostRemSec > 0) {
    activeBoostNodes.push(
      <span key="pet_potion" className="inline-flex items-center gap-1">
        <img
          src="./icons/art_pet_potion.webp"
          alt="Pet Potion"
          className="w-4 h-4 inline object-contain"
        />
        <span>Pet 24x</span>
      </span>
    );
  }
  if (builderBiteRemSec > 0) {
    activeBoostNodes.push(
      <span key="bite" className="inline-flex items-center gap-1">
        <img
          src="./icons/art_builder_bite.webp"
          alt="Builder Bite"
          className="w-4 h-4 inline object-contain"
        />
        <span>Bite 2x</span>
      </span>
    );
  }
  if (studySoupRemSec > 0) {
    activeBoostNodes.push(
      <span key="soup" className="inline-flex items-center gap-1">
        <img
          src="./icons/art_study_soup.webp"
          alt="Study Soup"
          className="w-4 h-4 inline object-contain"
        />
        <span>Soup 4x</span>
      </span>
    );
  }
  if (isBuilderHelperWorking) {
    activeBoostNodes.push(
      `Builder Apprentice ${getHelperSpeedMultiplier(builderApprentice.level)}x`
    );
  }
  if (isLabHelperWorking) {
    activeBoostNodes.push(
      `Lab Apprentice ${getHelperSpeedMultiplier(labApprentice.level)}x`
    );
  }

  const boostSublineStatus = (() => {
    if (builderHelperTargetName) {
      return `${builderHelperTargetName} · Apprentice · ${
        builderApprentice.recurrent !== false ? 'repeat forecast on' : 'repeat forecast off'
      }`;
    }
    if (labHelperTargetName) {
      return `${labHelperTargetName} · Lab Apprentice · ${
        labApprentice.recurrent !== false ? 'repeat forecast on' : 'repeat forecast off'
      }`;
    }
    return 'Builder & Lab Apprentices · tap + to configure';
  })();

  return (
    <div className="app-safe-area-shell min-h-dvh w-full bg-[#0B0E14] text-white flex flex-col items-center justify-start sm:px-5 overflow-y-auto overflow-x-hidden select-none">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-2xl border flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-[#4ADE80] border-emerald-400/50 shadow-emerald-500/20'
              : 'bg-rose-950/95 text-rose-300 border-rose-400/50 shadow-rose-500/20'
          }`}
        >
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="w-full max-w-md space-y-4">
        {/* =============================================================== */}
        {/* TOP NATIVE APP BAR (AVATAR + TITLE + STATS & BACKUP ACTIONS)    */}
        {/* =============================================================== */}
        <header className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#161B26] border border-[#2A303C] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
              <img
                src="/icons/art_28000001.webp"
                alt="Clash Companion"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icons/art_1000001.webp';
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase leading-none truncate">
                CLASH PLANNER
              </h1>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#8E9AA8] uppercase mt-1 truncate">
                YOUR VILLAGE COMPANION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Home Screen Widget Live Preview & Sync Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                const curIdx = Math.max(
                  0,
                  accounts.findIndex((a) => a.id === activeAccountId)
                );
                setWidgetPreviewIdx(curIdx);
                setWidgetRefreshTime(Date.now());
                syncAllVillagesToNativeWidget(accounts, activeAccountId);
                setIsWidgetPreviewOpen(true);
              }}
              title="Home Screen Widget Preview & Sync"
              className="tactile w-11 h-11 rounded-2xl bg-[#161B26] hover:bg-[#1E2534] border border-[#2A303C] flex items-center justify-center text-[#F3CA65] cursor-pointer shadow-sm"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>

            {/* Full Backup / Restore Modal Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setBackupRestoreInput('');
                setIsBackupModalOpen(true);
              }}
              title="Backup or Restore all village accounts and timers"
              className="tactile w-11 h-11 rounded-2xl bg-[#161B26] hover:bg-[#1E2534] border border-[#2A303C] flex items-center justify-center text-[#F3CA65] cursor-pointer shadow-sm"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Subheader Status Row: VILLAGE OVERVIEW + ON DEVICE */}
        <div className="flex items-center justify-between px-0.5 pt-1">
          <span className="text-[11px] font-bold tracking-[0.16em] text-[#8E9AA8] uppercase">
            VILLAGE OVERVIEW
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]" />
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#4ADE80] uppercase">
              ON DEVICE
            </span>
          </div>
        </div>

        {/* =============================================================== */}
        {/* A. HERO HEADER CARD (TOWN HALL 3D RENDER + IMPORT + SWITCHER)   */}
        {/* =============================================================== */}
        <section className="ledger-hero-card rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            {/* Left Column: Town Hall Level, Player Tag & Village Name, Last Synced */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-[0.15em] text-[#F3CA65] uppercase">
                  HOME VILLAGE
                </span>
                {activeAccountProfile && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenRenameModal(activeAccountProfile, e)}
                    title={`Rename or manage ${activeAccountProfile.name}`}
                    className="tactile inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#2A303C] hover:bg-[#343C4B] border border-white/20 text-[11px] font-bold text-white hover:text-[#F3CA65] shadow-sm cursor-pointer transition-colors"
                  >
                    <span className="truncate max-w-[120px]">{activeAccountProfile.name}</span>
                    <span className="text-[10px]">✏️</span>
                  </button>
                )}
              </div>

              <h2 className="text-2xl sm:text-[30px] font-black text-white tracking-tight leading-tight mt-1">
                Town Hall {resolvedThLevel}
              </h2>

              <p className="text-xs sm:text-[13px] font-bold text-[#CBD5E1] tracking-wide mt-0.5 truncate">
                {activePlayerTag || '#VILLAGE-LOCAL'}
              </p>

              <p className="text-[11px] sm:text-xs font-medium text-[#8E9AA8] mt-2 truncate">
                Export · {lastSynced || 'Synced on device'}
              </p>
            </div>

            {/* Right Column: Large 3D Render of Town Hall */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center relative">
              <img
                src={getTownHallIconSrc(resolvedThLevel)}
                alt={`Town Hall ${resolvedThLevel}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icons/art_1000001.webp';
                }}
                className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)]"
              />
            </div>
          </div>

          {/* Footer of Hero Card: Vibrant Full-Width Import JSON Button + Switch Account */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setIsAddingNewAccount(false);
                setIsImportModalOpen(true);
              }}
              className="tactile w-full py-3.5 px-4 rounded-2xl bg-[#E5BA53] hover:bg-[#F3CA65] text-[#0B0E14] font-extrabold text-sm flex items-center justify-between shadow-[0_6px_20px_rgba(243,202,101,0.22)] cursor-pointer transition-all"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="flex-1 text-center">Import village JSON</span>
              <span className="w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                setIsVillageSwitcherOpen((prev) => !prev);
              }}
              className="tactile w-full py-3 px-4 rounded-2xl bg-[#1A2130]/90 hover:bg-[#222B3E] border border-[#2A3346] text-[#F3CA65] font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>
                Switch village · {accounts.length} saved
              </span>
              <span className="text-[11px] opacity-80">
                {isVillageSwitcherOpen ? '▴' : '▾'}
              </span>
            </button>

            {/* Expandable Multi-Account Switcher Drawer (Preserves all village switching, renaming & + Add Village) */}
            {isVillageSwitcherOpen && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="account-bar-scroll flex items-center gap-2 overflow-x-auto pb-1">
                  {accounts.map((account) => {
                    const isActive = account.id === activeAccountId;
                    return (
                      <div
                        key={account.id}
                        onClick={() => handleAccountChipClick(account)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAccountChipClick(account);
                          }
                        }}
                        title={
                          isActive ? `${account.name} (Active)` : `Switch to ${account.name}`
                        }
                        className={`tactile shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                          isActive ? 'account-chip-active' : 'account-chip-inactive'
                        }`}
                      >
                        {isActive && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80] inline-block shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex flex-col text-left">
                          <span className="leading-tight">{account.name}</span>
                          {account.tag && (
                            <span className="text-[10px] font-semibold text-[#8E9AA8] leading-tight">
                              {account.tag}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameModal(account, e);
                          }}
                          aria-label={`Edit ${account.name}`}
                          title={`Edit ${account.name}`}
                          className={`ml-1 p-1 rounded-md hover:bg-white/15 active:bg-white/25 transition text-[11px] leading-none flex items-center justify-center cursor-pointer ${
                            isActive ? 'text-[#F3CA65] opacity-95' : 'text-slate-400 opacity-75'
                          }`}
                        >
                          ✏️
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleOpenAddVillageModal}
                    className="tactile account-chip-add shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>+ Add Village</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =============================================================== */}
        {/* B. 3-STAT METRIC ROW (BUILDERS | NEXT FREE | NEXT LAB)          */}
        {/* =============================================================== */}
        <LedgerQuickStatsRow
          regularCap={regularBuildersCap}
          builderItems={effectiveBuilderResultsForQuickStats}
          builderBoostEndTime={builderBoostEndTime}
          builderApprentice={builderApprentice}
          targetLabTimestamp={effectiveLabMainTimestamp}
          targetGoblinLabTimestamp={effectiveLabGoblinTimestamp}
          labBoostEndTime={labBoostEndTime}
          labApprentice={labApprentice}
        />

        {/* =============================================================== */}
        {/* POTIONS & HELPERS BOOST HUB ("Your village, boosted")           */}
        {/* =============================================================== */}
        <section className="ledger-boost-card rounded-3xl p-4 sm:p-5 transition-all">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              triggerHaptic(12);
              setIsBoostDrawerOpen((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerHaptic(12);
                setIsBoostDrawerOpen((prev) => !prev);
              }
            }}
            className="flex items-center justify-between gap-3.5 cursor-pointer"
          >
            {/* Left Gold Clock Icon */}
            <div className="w-12 h-12 rounded-full border-[3px] border-[#F3CA65] flex items-center justify-center shrink-0 text-[#F3CA65] shadow-[0_0_15px_rgba(243,202,101,0.18)]">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            {/* Middle Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#CBD5E1] uppercase">
                POTIONS & HELPERS
              </p>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                Your village, boosted
              </h3>
              <p
                className={`text-xs font-bold mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${
                  activeBoostNodes.length > 0 ? 'text-[#4ADE80]' : 'text-[#CBD5E1]'
                }`}
              >
                {activeBoostNodes.length > 0 ? (
                  activeBoostNodes.map((node, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="opacity-70">•</span>}
                      <span>{node}</span>
                    </React.Fragment>
                  ))
                ) : (
                  'No active boosts'
                )}
              </p>
              <p className="text-[11px] font-medium text-[#8E9AA8] truncate">
                {boostSublineStatus}
              </p>
            </div>

            {/* Right + Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(12);
                setIsBoostDrawerOpen((prev) => !prev);
              }}
              aria-label="Toggle Potions and Helpers drawer"
              className="tactile w-11 h-11 rounded-2xl bg-[#121622] hover:bg-[#1A2030] border border-[#2E3646] flex items-center justify-center text-[#F3CA65] text-xl font-bold shrink-0 cursor-pointer"
            >
              {isBoostDrawerOpen ? '−' : '+'}
            </button>
          </div>

          {/* Expandable Potions & Helpers Controls (Also auto-visible if user has pending potion previews) */}
          {(isBoostDrawerOpen ||
            pendingBuilderPotions > 0 ||
            researchPotions > 0 ||
            petPotions > 0) && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {/* Category Selector inside Boost Hub */}
              <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    handleCategoryTabChange('builders');
                    if (currentMode === 'helpers') setMode('multi');
                  }}
                  className={`tactile py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                    activeTab === 'builders' && currentMode !== 'helpers'
                      ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E]'
                      : 'border-transparent text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  🔨 Builder 10x
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryTabChange('laboratory')}
                  className={`tactile py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                    activeTab === 'laboratory'
                      ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E]'
                      : 'border-transparent text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  ⚗️ Lab 24x
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryTabChange('pethouse')}
                  className={`tactile py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                    activeTab === 'pethouse'
                      ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E]'
                      : 'border-transparent text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  🐾 Pet 24x
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCategoryTabChange('builders');
                    setMode('helpers');
                  }}
                  className={`tactile py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                    activeTab === 'builders' && currentMode === 'helpers'
                      ? 'bg-[#252D3D] text-[#4ADE80] border-[#3B465E]'
                      : 'border-transparent text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  {(isBuilderHelperWorking || isLabHelperWorking) && (
                    <span className="helper-pulse-dot" />
                  )}
                  <span>👷 Helpers</span>
                </button>
              </div>

              {/* 1. BUILDER POTIONS 10x PANEL */}
              {activeTab === 'builders' && currentMode !== 'helpers' && (
                <div className="space-y-3">
                  <div className="builder-card accent-gold rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#F3CA65]">
                        🧪 Builder Potions Used
                      </span>
                      <div className="flex items-center gap-1.5">
                        {pendingBuilderPotions > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setPotionsInput('0');
                            }}
                            className="tactile text-[11px] font-bold text-gray-300 hover:text-white transition cursor-pointer bg-white/10 px-2 py-0.5 rounded-md"
                          >
                            Clear
                          </button>
                        )}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-[#F3CA65] border border-amber-400/40">
                          10x Speed Boost
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-black/40 rounded-xl p-1.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => adjustPotions(-1)}
                        className="tactile w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-extrabold text-lg flex items-center justify-center border border-white/15 cursor-pointer shrink-0"
                        aria-label="Decrease potions"
                      >
                        −
                      </button>
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#f8fafc] leading-tight">
                          {pendingBuilderPotions}{' '}
                          {pendingBuilderPotions === 1 ? 'Builder Potion' : 'Builder Potions'}
                        </div>
                        <div className="text-[10px] font-bold text-amber-300/90 leading-tight mt-0.5">
                          10x Speed Boost (Saves 9h per potion)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustPotions(1)}
                        className="tactile w-9 h-9 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[#F3CA65] font-extrabold text-lg flex items-center justify-center border border-amber-400/40 cursor-pointer shrink-0"
                        aria-label="Increase potions"
                      >
                        +
                      </button>
                    </div>

                    {pendingBuilderPotions > 0 && (
                      <button
                        type="button"
                        onClick={handleBuilderPrimaryAction}
                        className="tactile mt-2.5 w-full font-extrabold text-xs sm:text-sm rounded-xl py-2.5 px-3 tracking-wide cursor-pointer transition-all bg-[#E5BA53] hover:bg-[#F3CA65] text-[#0B0E14] shadow-md flex items-center justify-center gap-1.5"
                      >
                        <span>
                          ⚡ Confirm & Activate Boost ({pendingBuilderPotions}{' '}
                          {pendingBuilderPotions === 1 ? 'Potion' : 'Potions'})
                        </span>
                      </button>
                    )}

                    {pendingBuilderPotions > 0 && displayedBuilderSavedText && (
                      <div className="bg-amber-500/10 rounded-xl px-3 py-2 mt-2.5 border border-amber-400/35 flex justify-between items-center">
                        <p className="text-[11px] font-extrabold text-[#F3CA65] uppercase tracking-wider">
                          Preview Boost Time Saved
                        </p>
                        <div className="text-xs font-extrabold text-[#F3CA65]">
                          {displayedBuilderSavedText}
                        </div>
                      </div>
                    )}

                    <ActiveBoostHudBadge
                      boostEndTime={builderBoostEndTime}
                      variant="builders"
                      onExpire={handleBuilderBoostExpire}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSummaryModalSection('builders');
                    }}
                    className="tactile w-full bg-black/40 hover:bg-black/55 rounded-2xl p-3.5 border border-white/10 hover:border-amber-400/40 flex justify-between items-center transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                        Builder Time Saved (Month)
                      </p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-[#F3CA65]">
                        Summary ▸
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-[#F3CA65]">
                      {formatSavedSeconds(monthlyStats.builderSecondsSaved)}
                    </div>
                  </button>
                </div>
              )}

              {/* 2. RESEARCH POTIONS 24x PANEL */}
              {activeTab === 'laboratory' && (
                <div className="space-y-3">
                  <div className="builder-card accent-hero rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#f0abfc]">
                        ⚗️ Research Boost HUD
                      </span>
                      <div className="flex items-center gap-1.5">
                        {researchPotions > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setResearchPotions(0);
                            }}
                            className="tactile text-[11px] font-bold text-gray-300 hover:text-white transition cursor-pointer bg-white/10 px-2 py-0.5 rounded-md"
                          >
                            Clear
                          </button>
                        )}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-fuchsia-500/20 text-[#f0abfc] border border-fuchsia-400/40">
                          24x Speed Boost
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-black/40 rounded-xl p-1.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => adjustResearchPotions(-1)}
                        className="tactile w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-extrabold text-lg flex items-center justify-center border border-white/15 cursor-pointer shrink-0"
                        aria-label="Decrease Research Potion"
                      >
                        −
                      </button>
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#f8fafc] leading-tight">
                          {researchPotions}{' '}
                          {researchPotions === 1 ? 'Research Potion' : 'Research Potions'}
                        </div>
                        <div className="text-[10px] font-bold text-fuchsia-300/90 leading-tight mt-0.5">
                          24x Speed Boost (Saves 23h per potion)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustResearchPotions(1)}
                        className="tactile w-9 h-9 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-[#f0abfc] font-extrabold text-lg flex items-center justify-center border border-fuchsia-400/40 cursor-pointer shrink-0"
                        aria-label="Increase Research Potion"
                      >
                        +
                      </button>
                    </div>

                    {researchPotions > 0 && (
                      <button
                        type="button"
                        onClick={handleLabPrimaryAction}
                        className="tactile mt-2.5 w-full font-extrabold text-xs sm:text-sm rounded-xl py-2.5 px-3 tracking-wide cursor-pointer transition-all bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-500 text-white border border-fuchsia-300/60 shadow-md flex items-center justify-center gap-1.5"
                      >
                        <span>
                          ⚡ Confirm & Activate Boost ({researchPotions}{' '}
                          {researchPotions === 1 ? 'Potion' : 'Potions'})
                        </span>
                      </button>
                    )}

                    {researchPotions > 0 && displayedLabSavedText && (
                      <div className="bg-fuchsia-500/10 rounded-xl px-3 py-2 mt-2.5 border border-fuchsia-400/35 flex justify-between items-center">
                        <p className="text-[11px] font-extrabold text-[#f0abfc] uppercase tracking-wider">
                          Preview Research Time Saved
                        </p>
                        <div className="text-xs font-extrabold text-[#f0abfc]">
                          {displayedLabSavedText}
                        </div>
                      </div>
                    )}

                    <ActiveBoostHudBadge
                      boostEndTime={labBoostEndTime}
                      variant="laboratory"
                      onExpire={handleLabBoostExpire}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSummaryModalSection('lab');
                    }}
                    className="tactile w-full bg-black/40 hover:bg-black/55 rounded-2xl p-3.5 border border-white/10 hover:border-fuchsia-400/40 flex justify-between items-center transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                        Lab Time Saved (Month)
                      </p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-[#f0abfc]">
                        Summary ▸
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-[#f0abfc]">
                      {formatSavedSeconds(monthlyStats.labSecondsSaved)}
                    </div>
                  </button>
                </div>
              )}

              {/* 3. PET POTIONS 24x PANEL */}
              {activeTab === 'pethouse' && (
                <div className="space-y-3">
                  <div className="builder-card accent-pet rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#4ADE80]">
                        🐾 Pet Potion Boost HUD
                      </span>
                      <div className="flex items-center gap-1.5">
                        {petPotions > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setPetPotions(0);
                            }}
                            className="tactile text-[11px] font-bold text-gray-300 hover:text-white transition cursor-pointer bg-white/10 px-2 py-0.5 rounded-md"
                          >
                            Clear
                          </button>
                        )}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-[#4ADE80] border border-emerald-400/40">
                          24x Speed Boost
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-black/40 rounded-xl p-1.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => adjustPetPotions(-1)}
                        className="tactile w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-extrabold text-lg flex items-center justify-center border border-white/15 cursor-pointer shrink-0"
                        aria-label="Decrease Pet Potion"
                      >
                        −
                      </button>
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#f8fafc] leading-tight">
                          {petPotions} {petPotions === 1 ? 'Pet Potion' : 'Pet Potions'}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-300/90 leading-tight mt-0.5">
                          24x Speed Boost (Saves 23h per potion)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustPetPotions(1)}
                        className="tactile w-9 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[#4ADE80] font-extrabold text-lg flex items-center justify-center border border-emerald-400/40 cursor-pointer shrink-0"
                        aria-label="Increase Pet Potion"
                      >
                        +
                      </button>
                    </div>

                    {petPotions > 0 && (
                      <button
                        type="button"
                        onClick={handlePetPrimaryAction}
                        className="tactile mt-2.5 w-full font-extrabold text-xs sm:text-sm rounded-xl py-2.5 px-3 tracking-wide cursor-pointer transition-all bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-white border border-emerald-300/60 shadow-md flex items-center justify-center gap-1.5"
                      >
                        <span>
                          ⚡ Confirm & Activate Boost ({petPotions}{' '}
                          {petPotions === 1 ? 'Potion' : 'Potions'})
                        </span>
                      </button>
                    )}

                    {petPotions > 0 && displayedPetSavedText && (
                      <div className="bg-emerald-500/10 rounded-xl px-3 py-2 mt-2.5 border border-emerald-400/35 flex justify-between items-center">
                        <p className="text-[11px] font-extrabold text-[#4ADE80] uppercase tracking-wider">
                          Preview Pet Time Saved
                        </p>
                        <div className="text-xs font-extrabold text-[#4ADE80]">
                          {displayedPetSavedText}
                        </div>
                      </div>
                    )}

                    <ActiveBoostHudBadge
                      boostEndTime={petBoostEndTime}
                      variant="pethouse"
                      onExpire={handlePetBoostExpire}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSummaryModalSection('pethouse');
                    }}
                    className="tactile w-full bg-black/40 hover:bg-black/55 rounded-2xl p-3.5 border border-white/10 hover:border-emerald-400/40 flex justify-between items-center transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                        Pet Time Saved (Month)
                      </p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-[#4ADE80]">
                        Summary ▸
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-[#4ADE80]">
                      {formatSavedSeconds(monthlyStats.petSecondsSaved)}
                    </div>
                  </button>
                </div>
              )}

              {/* 4. BUILDER & LAB APPRENTICES (HELPERS) PANEL */}
              {activeTab === 'builders' && currentMode === 'helpers' && (
                <div className="space-y-3">
                  <HelperObsidianCard
                    icon="👷"
                    title="Builder's Apprentice"
                    subtitle="Works on Home Village Buildings, Defenses & Heroes (1h Active Session)"
                    accentVariant="gold"
                    level={builderApprentice.level}
                    targetName={builderHelperTargetName}
                    activeSessionEndTime={builderApprentice.activeSessionEndTime}
                    cooldownEndTime={builderApprentice.cooldownEndTime}
                    recurrent={builderApprentice.recurrent}
                    onChangeLevel={handleChangeBuilderApprenticeLevel}
                    onOpenAssignModal={() => {
                      triggerHaptic(15);
                      setAssignModalType('builder');
                    }}
                    onSessionExpire={handleBuilderSessionExpire}
                    onCooldownExpire={handleBuilderCooldownExpire}
                  />

                  <HelperObsidianCard
                    icon="🔬"
                    title="Lab Apprentice"
                    subtitle="Works on Laboratory Troops, Spells & Siege Machines (1h Active Session)"
                    accentVariant="lab"
                    level={labApprentice.level}
                    targetName={labHelperTargetName}
                    activeSessionEndTime={labApprentice.activeSessionEndTime}
                    cooldownEndTime={labApprentice.cooldownEndTime}
                    recurrent={labApprentice.recurrent}
                    onChangeLevel={handleChangeLabApprenticeLevel}
                    onOpenAssignModal={() => {
                      triggerHaptic(15);
                      setAssignModalType('lab');
                    }}
                    onSessionExpire={handleLabSessionExpire}
                    onCooldownExpire={handleLabCooldownExpire}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* =============================================================== */}
        {/* SEGMENTED FILTER BAR (CLASH LEDGER PILL STYLE)                  */}
        {/* =============================================================== */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#131722] p-1.5 rounded-2xl border border-[#232A38]">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setQueueFilter('all');
            }}
            className={`tactile py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              queueFilter === 'all'
                ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E] shadow-sm'
                : 'border-transparent text-[#8E9AA8] hover:text-white'
            }`}
          >
            Home Village
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setQueueFilter('builders');
            }}
            className={`tactile py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              queueFilter === 'builders'
                ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E] shadow-sm'
                : 'border-transparent text-[#8E9AA8] hover:text-white'
            }`}
          >
            Builders ({displayedBuilderResults.length})
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setQueueFilter('lab_pets');
            }}
            className={`tactile py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              queueFilter === 'lab_pets'
                ? 'bg-[#252D3D] text-[#F3CA65] border-[#3B465E] shadow-sm'
                : 'border-transparent text-[#8E9AA8] hover:text-white'
            }`}
          >
            Lab & Pets ({activeLabQueueCount + activePetQueueCount})
          </button>
        </div>

        {/* =============================================================== */}
        {/* C. UPGRADE QUEUE HEADER & COLLAPSIBLE MANUAL TIMER EDITOR       */}
        {/* =============================================================== */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Upgrade queue
            </h2>
            {isEditingTimers && !isTimersCollapsed && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-[#F3CA65] border border-amber-400/40 animate-pulse">
                Editing
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleTimersAccordion}
            className="tactile px-4 py-2.5 rounded-2xl bg-[#161B26] hover:bg-[#1E2534] border border-[#2A303C] text-[#F3CA65] font-extrabold text-xs sm:text-[13px] flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>{isTimersCollapsed ? '+ Add / Edit' : '▾ Hide Editor'}</span>
          </button>
        </div>

        {/* Collapsible Manual Timer Editor (Builders, Laboratory, Pet House) */}
        {!isTimersCollapsed && (
          <section className="rounded-3xl bg-[#161B26] border border-[#2A303C] p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#F3CA65]">
                Manual Timer Editor
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCategoryTabChange('builders')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                    activeTab === 'builders'
                      ? 'bg-[#F3CA65] text-[#0B0E14]'
                      : 'bg-white/5 text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  Builders
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryTabChange('laboratory')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                    activeTab === 'laboratory'
                      ? 'bg-[#F3CA65] text-[#0B0E14]'
                      : 'bg-white/5 text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  Lab
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryTabChange('pethouse')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                    activeTab === 'pethouse'
                      ? 'bg-[#F3CA65] text-[#0B0E14]'
                      : 'bg-white/5 text-[#8E9AA8] hover:text-white'
                  }`}
                >
                  Pet House
                </button>
              </div>
            </div>

            {activeTab === 'builders' && (
              <div className="space-y-4">
                {/* Mode Toggle: Single vs All Builders */}
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1">
                  <button
                    type="button"
                    onClick={() => setMode('single')}
                    className={`tactile flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      currentMode === 'single'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Single Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('multi')}
                    className={`tactile flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      currentMode !== 'single'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    All Builders
                  </button>
                </div>

                {/* Safe Edit & Reset Action Bar */}
                {!isEditingTimers ? (
                  <div className="flex items-center justify-between gap-2 bg-black/35 p-2.5 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setConfirmDialogType('start_edit');
                      }}
                      className="tactile flex-1 py-2 px-3 rounded-lg text-xs font-extrabold text-[#F3CA65] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>✏️ Unlock & Edit Timers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setConfirmDialogType('reset_all');
                      }}
                      className="tactile py-2 px-3 rounded-lg text-xs font-extrabold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🗑️ Reset All</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-400/45 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-[#F3CA65] uppercase tracking-wider">
                        ✏️ Editing Timers (Unconfirmed)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setConfirmDialogType('reset_all');
                        }}
                        className="tactile text-[11px] font-bold text-rose-300 hover:text-rose-200 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          discardUnconfirmedTimerEdits();
                          showToast('success', 'Reverted to previous locked timers');
                        }}
                        className="tactile flex-1 py-2 px-3 rounded-lg text-xs font-bold text-gray-200 bg-white/10 hover:bg-white/15 border border-white/15 cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setConfirmDialogType('apply_edit');
                        }}
                        className="btn-calculate tactile flex-1 py-2 px-3 rounded-lg text-xs font-extrabold text-white shadow-md cursor-pointer"
                      >
                        ✓ Apply Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Builders Count Slider */}
                {currentMode !== 'single' && (
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-2.5">
                      <label className="text-sm text-[#f8fafc] font-bold">
                        Active Builders
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBuilderCountChange(numBuilders - 1)}
                          className="tactile w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                        >
                          −
                        </button>
                        <div
                          className={`font-extrabold bg-black/50 px-3 py-1 rounded-lg border text-xs ${
                            numBuilders === 7
                              ? 'text-[#4ADE80] border-emerald-500/40'
                              : 'text-[#F3CA65] border-amber-400/20'
                          }`}
                        >
                          <span>{numBuilders}</span> {numBuilders === 7 ? '👺' : '👷'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBuilderCountChange(numBuilders + 1)}
                          className="tactile w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={numBuilders}
                      onChange={(e) => handleBuilderCountChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#F3CA65]"
                    />
                  </div>
                )}

                {/* Individual Builder Time Input Cards */}
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {Array.from({ length: activeBuildersToRender }, (_, idx) => {
                    const i = idx + 1;
                    const isGoblin = currentMode !== 'single' && i === 7;
                    const builderVal = builders[idx] || { d: '', h: '', m: '' };
                    const slotBadgeText = isGoblin ? '[GOBLIN]' : `[B${i}]`;
                    const defaultTitle =
                      currentMode === 'single'
                        ? 'Remaining Time'
                        : isGoblin
                        ? 'Goblin Builder'
                        : `Builder ${i}`;
                    const displayTitle = builderVal.upgradeTitle || defaultTitle;

                    return (
                      <div
                        key={i}
                        className="rounded-2xl p-3.5 bg-[#0F131D] border border-[#2A303C]"
                      >
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                isGoblin ? 'slot-badge-goblin' : 'slot-badge-regular'
                              }
                            >
                              {slotBadgeText}
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {displayTitle}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => resetBuilderTime(idx)}
                            className="tactile text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="flex flex-col">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={builderVal.d}
                              onChange={(e) =>
                                handleBuilderTimeChange(idx, 'd', e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              max="999"
                              className="glass-input w-full rounded-xl py-2 px-2 text-center text-base font-bold placeholder-gray-500"
                            />
                            <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                              Days
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={builderVal.h}
                              onChange={(e) =>
                                handleBuilderTimeChange(idx, 'h', e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              max="24"
                              className="glass-input w-full rounded-xl py-2 px-2 text-center text-base font-bold placeholder-gray-500"
                            />
                            <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                              Hours
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={builderVal.m}
                              onChange={(e) =>
                                handleBuilderTimeChange(idx, 'm', e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              max="60"
                              className="glass-input w-full rounded-xl py-2 px-2 text-center text-base font-bold placeholder-gray-500"
                            />
                            <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                              Mins
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10">
                          {[
                            { label: '+6h', d: 0, h: 6 },
                            { label: '+12h', d: 0, h: 12 },
                            { label: '+1d', d: 1, h: 0 },
                            { label: '+3d', d: 3, h: 0 },
                            { label: '+5d', d: 5, h: 0 },
                            { label: '+7d', d: 7, h: 0 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyPresetToBuilder(idx, preset.d, preset.h)}
                              className="tactile text-[11px] font-bold px-2 py-1 rounded-lg border bg-white/5 hover:bg-white/15 text-white border-white/10 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'laboratory' && (
              <div className="space-y-4">
                {/* Primary Lab Manual Editor */}
                <div className="rounded-2xl p-3.5 bg-[#0F131D] border border-[#2A303C] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#f0abfc] uppercase">
                      [LAB] {labTimer.upgradeTitle || 'Primary Research'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setPendingClearSlot('lab_main');
                      }}
                      className="tactile text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 cursor-pointer"
                    >
                      🗑️ Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={labTimer.d}
                        onChange={(e) => handleLabTimeChange('main', 'd', e.target.value)}
                        placeholder="0"
                        className="glass-input lab-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Days
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={labTimer.h}
                        onChange={(e) => handleLabTimeChange('main', 'h', e.target.value)}
                        placeholder="0"
                        className="glass-input lab-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Hours
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={labTimer.m}
                        onChange={(e) => handleLabTimeChange('main', 'm', e.target.value)}
                        placeholder="0"
                        className="glass-input lab-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Mins
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '+6h', d: 0, h: 6 },
                      { label: '+12h', d: 0, h: 12 },
                      { label: '+1d', d: 1, h: 0 },
                      { label: '+3d', d: 3, h: 0 },
                      { label: '+5d', d: 5, h: 0 },
                      { label: '+7d', d: 7, h: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPresetToLab('main', preset.d, preset.h)}
                        className="tactile text-[11px] font-bold px-2 py-1 rounded-lg border bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goblin Lab Manual Editor */}
                <div className="rounded-2xl p-3.5 bg-[#0F131D] border border-[#2A303C] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#4ADE80] uppercase">
                      [GOBLIN LAB] {goblinLabTimer.upgradeTitle || 'Goblin Researcher'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setPendingClearSlot('lab_goblin');
                      }}
                      className="tactile text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 cursor-pointer"
                    >
                      🗑️ Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={goblinLabTimer.d}
                        onChange={(e) => handleLabTimeChange('goblin', 'd', e.target.value)}
                        placeholder="0"
                        className="glass-input goblin-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Days
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={goblinLabTimer.h}
                        onChange={(e) => handleLabTimeChange('goblin', 'h', e.target.value)}
                        placeholder="0"
                        className="glass-input goblin-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Hours
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={goblinLabTimer.m}
                        onChange={(e) => handleLabTimeChange('goblin', 'm', e.target.value)}
                        placeholder="0"
                        className="glass-input goblin-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                      />
                      <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                        Mins
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '+6h', d: 0, h: 6 },
                      { label: '+12h', d: 0, h: 12 },
                      { label: '+1d', d: 1, h: 0 },
                      { label: '+3d', d: 3, h: 0 },
                      { label: '+5d', d: 5, h: 0 },
                      { label: '+7d', d: 7, h: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPresetToLab('goblin', preset.d, preset.h)}
                        className="tactile text-[11px] font-bold px-2 py-1 rounded-lg border bg-emerald-500/15 text-emerald-200 border-emerald-500/30 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pethouse' && (
              <div className="rounded-2xl p-3.5 bg-[#0F131D] border border-[#2A303C] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#4ADE80] uppercase">
                    [PET] {petTimer.upgradeTitle || 'Active Pet Upgrade'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setPendingClearSlot('pet');
                    }}
                    className="tactile text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 cursor-pointer"
                  >
                    🗑️ Clear
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={petTimer.d}
                      onChange={(e) => handlePetTimeChange('d', e.target.value)}
                      placeholder="0"
                      className="glass-input pet-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                    />
                    <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                      Days
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={petTimer.h}
                      onChange={(e) => handlePetTimeChange('h', e.target.value)}
                      placeholder="0"
                      className="glass-input pet-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                    />
                    <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                      Hours
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={petTimer.m}
                      onChange={(e) => handlePetTimeChange('m', e.target.value)}
                      placeholder="0"
                      className="glass-input pet-input w-full rounded-xl py-2 px-2 text-center text-base font-bold"
                    />
                    <span className="text-[10px] font-semibold text-[#8E9AA8] text-center mt-1">
                      Mins
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+6h', d: 0, h: 6 },
                    { label: '+12h', d: 0, h: 12 },
                    { label: '+1d', d: 1, h: 0 },
                    { label: '+3d', d: 3, h: 0 },
                    { label: '+5d', d: 5, h: 0 },
                    { label: '+7d', d: 7, h: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPresetToPet(preset.d, preset.h)}
                      className="tactile text-[11px] font-bold px-2 py-1 rounded-lg border bg-emerald-500/15 text-emerald-200 border-emerald-500/30 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* =============================================================== */}
        {/* UNIFIED UPGRADE QUEUE LIST (BUILDERS | LABORATORY | PETS)       */}
        {/* =============================================================== */}
        <div key={animKey} className="space-y-6">
          {/* 1. BUILDERS QUEUE SECTION */}
          {(queueFilter === 'all' || queueFilter === 'builders') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-extrabold tracking-[0.16em] text-[#F3CA65] uppercase">
                  BUILDERS
                </span>
                <span className="text-xs font-bold text-[#8E9AA8] tabular-nums">
                  {String(displayedBuilderResults.length).padStart(2, '0')}
                </span>
              </div>

              {displayedBuilderResults.length > 0 ? (
                <div className="space-y-3">
                  {[...displayedBuilderResults]
                    .sort((a, b) => {
                      const aPreview = builderPreview?.computedResults.find(
                        (p) => p.builderIndex === a.builderIndex
                      );
                      const bPreview = builderPreview?.computedResults.find(
                        (p) => p.builderIndex === b.builderIndex
                      );
                      const aTs =
                        pendingBuilderPotions > 0 && aPreview
                          ? aPreview.targetTimestamp
                          : a.targetTimestamp;
                      const bTs =
                        pendingBuilderPotions > 0 && bPreview
                          ? bPreview.targetTimestamp
                          : b.targetTimestamp;
                      const aFinished = aTs <= nowTick;
                      const bFinished = bTs <= nowTick;
                      // Always place active (unfinished) upgrades at the top, sorted by soonest finishing first
                      if (aFinished !== bFinished) {
                        return aFinished ? 1 : -1;
                      }
                      return aTs - bTs;
                    })
                    .map((item, idx) => {
                      const previewMatch = builderPreview?.computedResults.find(
                        (p) => p.builderIndex === item.builderIndex
                      );
                      const effectiveItemTargetTs =
                        pendingBuilderPotions > 0 && previewMatch
                          ? previewMatch.targetTimestamp
                          : item.targetTimestamp;
                      const displayDate =
                        pendingBuilderPotions > 0 && previewMatch
                          ? previewMatch.formattedDate
                          : item.formattedDate;
                      const isFinishingNext =
                        effectiveItemTargetTs > nowTick &&
                        soonestTargetTimestamp !== null &&
                        effectiveItemTargetTs === soonestTargetTimestamp;
                      const isHelperAssignedHere =
                        builderApprentice.assignedSlot === item.builderIndex;
                      const isApprenticeActiveHere =
                        isBuilderHelperWorking && isHelperAssignedHere;

                      return (
                        <LedgerUpgradeQueueCard
                          key={`${item.builderIndex}-${item.targetTimestamp}-${idx}`}
                          rawId={item.rawId}
                          upgradeTitle={item.upgradeTitle}
                          upgradeLevel={item.upgradeLevel}
                          slotBadge={item.slotBadge}
                          isGoblin={item.isGoblin}
                          isFinishingNext={isFinishingNext}
                          category="builders"
                          targetTimestamp={effectiveItemTargetTs}
                          displayDate={displayDate}
                          helper={builderApprentice}
                          isHelperAssignedToSlot={isHelperAssignedHere}
                          helperIcon="👷"
                          helperBoostEndTime={
                            isApprenticeActiveHere
                              ? builderHelperCycleNow.activeRemSec > 0
                                ? nowTick + builderHelperCycleNow.activeRemSec * 1000
                                : builderApprentice.activeSessionEndTime
                              : null
                          }
                          helperSpeedMultiplier={getHelperSpeedMultiplier(
                            builderApprentice.level
                          )}
                          potionBoostEndTime={builderBoostEndTime}
                          potionSpeedMultiplier={10}
                          snackBoostEndTime={builderBiteEndTime}
                          snackType="builder_bite"
                          onActionClick={() => setAssignModalType('builder')}
                          onFinish={() => handleBuilderUpgradeFinished(item.builderIndex)}
                        />
                      );
                    })}
                </div>
              ) : (
                <div className="ledger-queue-card p-5 text-center space-y-2">
                  <p className="text-sm font-bold text-white">No active builder upgrades</p>
                  <p className="text-xs text-[#8E9AA8]">
                    Import your village JSON or tap <span className="text-[#F3CA65] font-bold">+ Add / Edit</span> to set builder timers.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. LABORATORY QUEUE SECTION */}
          {(queueFilter === 'all' || queueFilter === 'lab_pets') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-extrabold tracking-[0.16em] text-[#A5B4FC] uppercase">
                  LABORATORY
                </span>
                <span className="text-xs font-bold text-[#8E9AA8] tabular-nums">
                  {String(activeLabQueueCount).padStart(2, '0')}
                </span>
              </div>

              {activeLabQueueCount > 0 ? (
                <div className="space-y-3">
                  {targetLabTimestamp && (
                    <LedgerUpgradeQueueCard
                      rawId={labTimer.rawId}
                      upgradeTitle={labTimer.upgradeTitle || 'Troop / Spell Upgrade'}
                      upgradeLevel={labTimer.upgradeLevel}
                      slotBadge="[LAB]"
                      isGoblin={false}
                      category="laboratory"
                      targetTimestamp={effectiveLabMainTimestamp || targetLabTimestamp}
                      displayDate={displayedLabDate}
                      helper={labApprentice}
                      isHelperAssignedToSlot={labApprentice.assignedSlot === 'main'}
                      helperIcon="🔬"
                      helperBoostEndTime={
                        isLabHelperWorking && labApprentice.assignedSlot === 'main'
                          ? labHelperCycleNow.activeRemSec > 0
                            ? nowTick + labHelperCycleNow.activeRemSec * 1000
                            : labApprentice.activeSessionEndTime
                          : null
                      }
                      helperSpeedMultiplier={getHelperSpeedMultiplier(labApprentice.level)}
                      potionBoostEndTime={labBoostEndTime}
                      potionSpeedMultiplier={24}
                      snackBoostEndTime={studySoupEndTime}
                      snackType="study_soup"
                      onActionClick={() => setAssignModalType('lab')}
                      onFinish={() => handleLabUpgradeFinished('main')}
                    />
                  )}

                  {targetGoblinLabTimestamp && (
                    <LedgerUpgradeQueueCard
                      rawId={goblinLabTimer.rawId}
                      upgradeTitle={goblinLabTimer.upgradeTitle || 'Goblin Researcher'}
                      upgradeLevel={goblinLabTimer.upgradeLevel}
                      slotBadge="• GOBLIN"
                      isGoblin={true}
                      category="laboratory"
                      targetTimestamp={effectiveLabGoblinTimestamp || targetGoblinLabTimestamp}
                      displayDate={displayedGoblinLabDate}
                      helper={labApprentice}
                      isHelperAssignedToSlot={labApprentice.assignedSlot === 'goblin'}
                      helperIcon="🔬"
                      helperBoostEndTime={
                        isLabHelperWorking && labApprentice.assignedSlot === 'goblin'
                          ? labHelperCycleNow.activeRemSec > 0
                            ? nowTick + labHelperCycleNow.activeRemSec * 1000
                            : labApprentice.activeSessionEndTime
                          : null
                      }
                      helperSpeedMultiplier={getHelperSpeedMultiplier(labApprentice.level)}
                      potionBoostEndTime={labBoostEndTime}
                      potionSpeedMultiplier={24}
                      snackBoostEndTime={studySoupEndTime}
                      snackType="study_soup"
                      onActionClick={() => setAssignModalType('lab')}
                      onFinish={() => handleLabUpgradeFinished('goblin')}
                    />
                  )}
                </div>
              ) : (
                <div className="ledger-queue-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UpgradeAssetIcon
                      rawId="1000007"
                      upgradeTitle="Laboratory"
                      category="laboratory"
                      className="!w-12 !h-12"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">Laboratory Idle</p>
                      <p className="text-xs text-[#8E9AA8]">No active troop or spell research</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryTabChange('laboratory');
                      setTimersCollapsedState(false);
                    }}
                    className="tactile text-xs font-bold text-[#F3CA65] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    + Set
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. PETS QUEUE SECTION */}
          {(queueFilter === 'all' || queueFilter === 'lab_pets') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-extrabold tracking-[0.16em] text-[#67E8F9] uppercase">
                  PETS
                </span>
                <span className="text-xs font-bold text-[#8E9AA8] tabular-nums">
                  {String(activePetQueueCount).padStart(2, '0')}
                </span>
              </div>

              {targetPetTimestamp ? (
                <LedgerUpgradeQueueCard
                  rawId={petTimer.rawId}
                  upgradeTitle={petTimer.upgradeTitle || 'Active Pet Upgrade'}
                  upgradeLevel={petTimer.upgradeLevel}
                  slotBadge="[PET]"
                  isGoblin={false}
                  category="pethouse"
                  targetTimestamp={effectivePetTimestamp || targetPetTimestamp}
                  displayDate={displayedPetDate}
                  potionBoostEndTime={petBoostEndTime}
                  potionSpeedMultiplier={24}
                  snackBoostEndTime={studySoupEndTime}
                  snackType="study_soup"
                  onActionClick={() => {
                    setIsBoostDrawerOpen(true);
                    handleCategoryTabChange('pethouse');
                  }}
                />
              ) : (
                <div className="ledger-queue-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UpgradeAssetIcon
                      rawId="1000068"
                      upgradeTitle="Pet House"
                      category="pethouse"
                      className="!w-12 !h-12"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">Pet House Idle</p>
                      <p className="text-xs text-[#8E9AA8]">No active hero pet upgrade</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryTabChange('pethouse');
                      setTimersCollapsedState(false);
                    }}
                    className="tactile text-xs font-bold text-[#F3CA65] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    + Set
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* BOTTOM ACTION CARD ("Village Monthly Progress")                 */}
        {/* =============================================================== */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setSummaryModalSection('builders');
          }}
          className="tactile w-full ledger-queue-card p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-[#F3CA65]/40 transition-all"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E2534] border border-[#2D364A] flex items-center justify-center text-[#F3CA65] shrink-0">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-black text-white leading-snug truncate">
                Village Monthly Progress
              </h4>
              <p className="text-xs font-medium text-[#8E9AA8] truncate">
                View upgrades completed and time saved this month
              </p>
            </div>
          </div>
          <span className="text-[#F3CA65] font-extrabold text-base shrink-0">→</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* OBSIDIAN "ASSIGN TO UPGRADE" MODAL (ACTIVE UPGRADES ONLY)           */}
      {/* =================================================================== */}
      {assignModalType !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setAssignModalType(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 bg-[#090d16] border border-emerald-400/40 shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {assignModalType === 'builder' ? '👷' : '🔬'}
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#f8fafc]">
                    {assignModalType === 'builder'
                      ? "Assign Builder's Apprentice"
                      : 'Assign Lab Apprentice'}
                  </h2>
                  <p className="text-[11px] font-bold text-emerald-400">
                    Starts 1-Hour Active Session (
                    {getHelperSpeedMultiplier(
                      assignModalType === 'builder'
                        ? builderApprentice.level
                        : labApprentice.level
                    )}
                    x Speed)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setAssignModalType(null);
                }}
                className="tactile text-gray-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {assignModalType === 'builder' ? (
              activeBuilderTargetsForModal.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeBuilderTargetsForModal.map((target) => {
                    const d = Math.floor(target.remainingSeconds / 86400);
                    const h = Math.floor((target.remainingSeconds % 86400) / 3600);
                    const m = Math.floor((target.remainingSeconds % 3600) / 60);
                    const s = Math.floor(target.remainingSeconds % 60);
                    const timeParts: string[] = [];
                    if (d > 0) timeParts.push(`${d}d`);
                    if (h > 0 || d > 0) timeParts.push(`${h}h`);
                    if (m > 0 || h > 0 || d > 0) timeParts.push(`${m}m`);
                    if (d === 0 && h === 0) timeParts.push(`${s}s`);

                    return (
                      <button
                        key={target.slotIdx}
                        type="button"
                        onClick={() => handleStartBuilderApprenticeSession(target.slotIdx)}
                        className="tactile w-full text-left rounded-2xl p-3.5 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-400/50 transition-all flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={
                                target.isGoblin ? 'slot-badge-goblin' : 'slot-badge-regular'
                              }
                            >
                              {target.slotBadge}
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                              {target.name}
                            </span>
                            {typeof target.level === 'number' && (
                              <span
                                className={target.isGoblin ? 'lvl-chip-goblin' : 'lvl-chip'}
                              >
                                LVL {target.level} → LVL {target.level + 1}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-gray-300 mt-1">
                            Remaining:{' '}
                            <span className="text-[#fbbf24] font-extrabold">
                              {timeParts.join(' ')}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                          Start 1h ⚡
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl p-4 bg-black/50 border border-white/10 text-center space-y-1.5">
                  <p className="text-xs font-extrabold text-gray-200">
                    No Active Builder Upgrades Found
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Import your village JSON or enter an active upgrade timer in the Builders tab first.
                  </p>
                </div>
              )
            ) : activeLabTargetsForModal.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeLabTargetsForModal.map((target) => {
                  const d = Math.floor(target.remainingSeconds / 86400);
                  const h = Math.floor((target.remainingSeconds % 86400) / 3600);
                  const m = Math.floor((target.remainingSeconds % 3600) / 60);
                  const s = Math.floor(target.remainingSeconds % 60);
                  const timeParts: string[] = [];
                  if (d > 0) timeParts.push(`${d}d`);
                  if (h > 0 || d > 0) timeParts.push(`${h}h`);
                  if (m > 0 || h > 0 || d > 0) timeParts.push(`${m}m`);
                  if (d === 0 && h === 0) timeParts.push(`${s}s`);

                  return (
                    <button
                      key={target.slot}
                      type="button"
                      onClick={() => handleStartLabApprenticeSession(target.slot)}
                      className="tactile w-full text-left rounded-2xl p-3.5 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-400/50 transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={
                              target.isGoblin ? 'slot-badge-goblin' : 'slot-badge-hero'
                            }
                          >
                            {target.slotBadge}
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                            {target.name}
                          </span>
                          {typeof target.level === 'number' && (
                            <span className="lvl-chip">
                              LVL {target.level} → LVL {target.level + 1}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-gray-300 mt-1">
                          Remaining:{' '}
                          <span className="text-[#f0abfc] font-extrabold">
                            {timeParts.join(' ')}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        Start 1h ⚡
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl p-4 bg-black/50 border border-white/10 text-center space-y-1.5">
                <p className="text-xs font-extrabold text-gray-200">
                  No Active Laboratory Upgrades Found
                </p>
                <p className="text-[11px] text-gray-400">
                  Import your village JSON or enter an active research timer in the Laboratory tab first.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setAssignModalType(null);
              }}
              className="tactile w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. OBSIDIAN DARK EDIT & DELETE VILLAGE PROFILE MODAL                */}
      {/* =================================================================== */}
      {renamingAccountId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => {
            setRenamingAccountId(null);
            setConfirmDeleteVillage(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 bg-[#090d16] border border-amber-400/35 shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">✏️</span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#f8fafc]">
                  Village Profile Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setRenamingAccountId(null);
                  setConfirmDeleteVillage(false);
                }}
                className="tactile text-gray-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fbbf24] mb-1.5">
                Custom Village Name
              </label>
              <input
                type="text"
                value={renameVillageInput}
                onChange={(e) => setRenameVillageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveRenamedVillage();
                  }
                }}
                placeholder="e.g. TH17 Main, Donation Base, War Account"
                maxLength={28}
                autoFocus
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-gray-500"
              />
              {/* Quick Preset Village Labels */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {['TH17 Main', 'War Account', 'Donation Base', 'Mini Base'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      setRenameVillageInput(suggestion);
                    }}
                    className="tactile text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Read-Only Bound Player Tag Display */}
            {(() => {
              const renamingProfile = accounts.find((a) => a.id === renamingAccountId);
              const boundTag = renamingProfile?.tag?.trim();
              return (
                <div className="rounded-xl px-3.5 py-2.5 bg-black/60 border border-white/10 flex items-center justify-between gap-2 select-none">
                  <span className="text-xs font-extrabold text-gray-200 font-mono">
                    {boundTag
                      ? `Player Tag: ${boundTag} [Locked]`
                      : 'Player Tag: Unbound (Auto-binds on JSON import)'}
                  </span>
                  {boundTag && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-[#fbbf24] border border-amber-400/35 shrink-0">
                      🔒 Locked
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Delete Village Action + Confirmation */}
            <div className="pt-2 border-t border-white/10">
              {!confirmDeleteVillage ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setConfirmDeleteVillage(true);
                  }}
                  className="tactile w-full py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🗑️ Delete Village</span>
                </button>
              ) : (
                <div className="rounded-2xl p-3 bg-rose-950/60 border border-rose-500/40 space-y-2.5">
                  <p className="text-xs font-bold text-rose-200 text-center">
                    Delete this village and all its saved timers?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        setConfirmDeleteVillage(false);
                      }}
                      className="tactile flex-1 py-2 rounded-xl text-xs font-bold text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
                    >
                      Keep Village
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteVillage}
                      className="tactile flex-1 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/50 shadow-lg cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setRenamingAccountId(null);
                  setConfirmDeleteVillage(false);
                }}
                className="tactile flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRenamedVillage}
                className="btn-calculate tactile flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dark Obsidian JSON Import / Add Village Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => {
            setIsImportModalOpen(false);
            setIsAddingNewAccount(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 bg-[#090d16] border border-white/15 shadow-[0_0_40px_rgba(0,0,0,0.85)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isAddingNewAccount ? '🏰' : '📥'}</span>
                <h2 className="text-lg font-extrabold text-[#f8fafc]">
                  {isAddingNewAccount ? 'Add New Village Profile' : 'Import CoC Village JSON'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setIsImportModalOpen(false);
                  setIsAddingNewAccount(false);
                }}
                className="tactile text-gray-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isAddingNewAccount && (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fbbf24] mb-1.5">
                  Village Profile Name
                </label>
                <input
                  type="text"
                  value={newVillageNameInput}
                  onChange={(e) => setNewVillageNameInput(e.target.value)}
                  placeholder="e.g. TH17 Main / Donation Base"
                  maxLength={28}
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-gray-500"
                />
              </div>
            )}

            <p className="text-xs text-gray-300 leading-relaxed">
              In Clash of Clans, go to{' '}
              <span className="text-[#fbbf24] font-bold">
                Settings → More Settings → Data Export → Copy
              </span>{' '}
              and paste your village JSON below.
            </p>

            <div className="relative">
              <textarea
                ref={jsonImportTextareaRef}
                value={jsonInputText}
                onChange={(e) => setJsonInputText(e.target.value)}
                placeholder="Paste your raw Clash of Clans village export JSON here..."
                rows={5}
                className="glass-input w-full rounded-2xl p-3.5 text-xs font-mono text-gray-100 placeholder-gray-500 resize-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  void handlePasteJsonClipboard(jsonImportTextareaRef.current, setJsonInputText)
                }
                className="tactile absolute bottom-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#fbbf24] border border-white/15 cursor-pointer"
              >
                📋 Paste
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setIsImportModalOpen(false);
                  setIsAddingNewAccount(false);
                }}
                className="tactile py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
              >
                Cancel
              </button>

              {isAddingNewAccount && !jsonInputText.trim() && (
                <button
                  type="button"
                  onClick={handleCreateEmptyVillage}
                  className="tactile flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-[#fbbf24] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 cursor-pointer"
                >
                  Create Empty Village
                </button>
              )}

              <button
                type="button"
                onClick={handleImportVillageJson}
                className="btn-calculate tactile flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg cursor-pointer"
              >
                {isAddingNewAccount ? 'Import & Add Village' : 'Import Timers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dark Obsidian Full Backup & Restore Modal */}
      {isBackupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setIsBackupModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 bg-[#090d16] border border-emerald-400/35 shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💾</span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#f8fafc]">
                  Backup & Restore All Villages
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setIsBackupModalOpen(false);
                }}
                className="tactile text-gray-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Export Section */}
            <div className="rounded-2xl p-3.5 bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#fbbf24]">
                  1. Export All Data ({accounts.length} Village{accounts.length > 1 ? 's' : ''})
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Save all your village profiles, names, active upgrade timers, boosts, and helpers in one tap.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyFullBackup}
                  className="tactile flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-[#fbbf24] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📋 Copy All Villages</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  className="tactile flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⬇️ Download File</span>
                </button>
              </div>
            </div>

            {/* Restore Section */}
            <div className="rounded-2xl p-3.5 bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  2. Restore From Backup
                </span>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const content = typeof reader.result === 'string' ? reader.result : '';
                      if (content) {
                        setBackupRestoreInput(content);
                        handleRestoreFromBackupText(content);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    backupFileInputRef.current?.click();
                  }}
                  className="tactile text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 cursor-pointer"
                >
                  📂 Upload .json
                </button>
              </div>

              <div className="relative">
                <textarea
                  ref={backupRestoreTextareaRef}
                  value={backupRestoreInput}
                  onChange={(e) => setBackupRestoreInput(e.target.value)}
                  placeholder="Paste your Clash Planner backup JSON here to restore all villages..."
                  rows={4}
                  className="glass-input w-full rounded-xl p-3 text-xs font-mono text-gray-100 placeholder-gray-500 resize-none focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    void handlePasteJsonClipboard(
                      backupRestoreTextareaRef.current,
                      setBackupRestoreInput
                    )
                  }
                  className="tactile absolute bottom-2.5 right-2.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#fbbf24] border border-white/15 cursor-pointer"
                >
                  📋 Paste
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleRestoreFromBackupText()}
                className="btn-calculate tactile w-full py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg cursor-pointer"
              >
                Restore All Villages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Account Tag Mismatch Alert Dialog */}
      {tagMismatchAlert && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => {
            clearJsonImportInputState();
            setTagMismatchAlert(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl p-6 bg-[#090d16] border border-rose-500/50 shadow-[0_0_45px_rgba(244,63,94,0.3)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base sm:text-lg font-extrabold text-rose-300">
                Account Mismatch!
              </h2>
            </div>

            <p className="text-xs sm:text-sm font-bold text-gray-200 leading-relaxed">
              Account Mismatch! This JSON belongs to{' '}
              <span className="text-[#fbbf24] font-extrabold font-mono">
                {tagMismatchAlert.incomingTag}
              </span>
              , but active account is bound to{' '}
              <span className="text-emerald-300 font-extrabold font-mono">
                {tagMismatchAlert.currentTag}
              </span>
              . Please switch to the correct account tab before importing.
            </p>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                clearJsonImportInputState();
                setTagMismatchAlert(null);
              }}
              className="tactile w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/50 shadow-lg cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Safe Two-Step Confirmation Popups (Reset All / Start Edit / Apply Changes) */}
      {confirmDialogType !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setConfirmDialogType(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl p-6 bg-[#090d16] border border-amber-400/40 shadow-[0_0_45px_rgba(0,0,0,0.95)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDialogType === 'reset_all' && (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🗑️</span>
                  <h2 className="text-base sm:text-lg font-extrabold text-rose-300">
                    Confirm Reset All
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-200 leading-relaxed">
                  Are you sure you want to reset all active timers and schedules?
                </p>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      setConfirmDialogType(null);
                    }}
                    className="tactile flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={resetAllTimes}
                    className="tactile flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/50 shadow-lg cursor-pointer"
                  >
                    Yes, Reset All
                  </button>
                </div>
              </>
            )}

            {confirmDialogType === 'start_edit' && (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✏️</span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#fbbf24]">
                    Edit Current Timers
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-200 leading-relaxed">
                  Do you want to edit current timers?
                </p>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      setConfirmDialogType(null);
                    }}
                    className="tactile flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStartEditTimers}
                    className="btn-calculate tactile flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg cursor-pointer"
                  >
                    Yes, Edit Timers
                  </button>
                </div>
              </>
            )}

            {confirmDialogType === 'apply_edit' && (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✅</span>
                  <h2 className="text-base sm:text-lg font-extrabold text-emerald-300">
                    Apply Changes?
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-200 leading-relaxed">
                  Apply your edited timer values and update the locked finish schedule? Canceling will revert all values back to their previous locked state.
                </p>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      discardUnconfirmedTimerEdits();
                      showToast('success', 'Reverted to previous locked timers');
                    }}
                    className="tactile flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 cursor-pointer"
                  >
                    Cancel & Revert
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApplyTimerChanges}
                    className="btn-calculate tactile flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Comprehensive Monthly Progress Modal ("VILLAGE STATS - [MONTH NAME]") */}
      {summaryModalSection !== null && (() => {
        // Strictly fetch monthly history using the currently active village's player_tag (or account id)
        const activeModalPlayerTag = (activeAccountProfile?.tag || activePlayerTag || '')
          .trim()
          .toUpperCase();
        const activeModalAccountKey = activeModalPlayerTag || activeAccountProfile.id;
        const activeModalHistory = activeModalPlayerTag
          ? loadVillageMonthlyHistory(activeModalPlayerTag, activeYearMonthKey)
          : createEmptyVillageMonthlyHistory();
        const completedUpgradesEntries = Object.entries(activeModalHistory.upgrades).filter(
          ([, u]) => u.currentLevel > u.startLevel
        );

        /**
         * Pure Viewer for the 5-Month Upgrade History & Stats tab:
         * Reads the exact same `village_history_${YYYY_MM}_${TAG}` localStorage data
         * saved by Village Monthly Progress. If a month has no data in localStorage,
         * returns `hasData: false` so the UI displays "No data for this month".
         */
        const buildAccountMonthArchiveData = (
          accountKey: string,
          yearMonthKey: string,
          monthLabel: string
        ): MonthUpgradeHistoryData => {
          const cleanKey = accountKey.trim().toUpperCase();
          const hasData = hasVillageMonthlyDataInStorage(cleanKey, yearMonthKey);
          if (!cleanKey || !hasData) {
            return {
              monthKey: yearMonthKey,
              monthLabel,
              hasData: false,
              totalUpgrades: 0,
              timeSavedText: '0m',
              potionsBreakdown: [],
              heroes: [],
              pethouse: [],
              laboratory: [],
              buildings: [],
              walls: [],
            };
          }

          const history = loadVillageMonthlyHistory(cleanKey, yearMonthKey);

          const builderBiteStat = history.potions.builderBite || {
            used: 0,
            timeSavedMinutes: 0,
          };
          const studySoupStat = history.potions.studySoup || {
            used: 0,
            timeSavedMinutes: 0,
          };

          const totalMinutesSaved =
            history.potions.builder.timeSavedMinutes +
            history.potions.research.timeSavedMinutes +
            history.potions.pet.timeSavedMinutes +
            builderBiteStat.timeSavedMinutes +
            studySoupStat.timeSavedMinutes;
          const timeSavedText = formatCumulativeModalTime(totalMinutesSaved * 60);

          const potionsBreakdown: PotionHistoryBreakdownItem[] = [
            {
              key: 'builder',
              name: 'Builder Potion',
              iconSrc: './icons/art_builder_potion.webp',
              usedCount: history.potions.builder.used,
              timeSavedText: formatCumulativeModalTime(
                history.potions.builder.timeSavedMinutes * 60
              ),
              accentTextClass: 'text-[#4ADE80]',
              badgeColorClass: 'bg-amber-500/15 text-[#F3CA65] border-amber-400/35',
            },
            {
              key: 'research',
              name: 'Research Potion',
              iconSrc: './icons/art_research_potion.webp',
              usedCount: history.potions.research.used,
              timeSavedText: formatCumulativeModalTime(
                history.potions.research.timeSavedMinutes * 60
              ),
              accentTextClass: 'text-[#93C5FD]',
              badgeColorClass: 'bg-indigo-500/15 text-[#A5B4FC] border-indigo-400/35',
            },
            {
              key: 'pet',
              name: 'Pet Potion',
              iconSrc: './icons/art_pet_potion.webp',
              usedCount: history.potions.pet.used,
              timeSavedText: formatCumulativeModalTime(
                history.potions.pet.timeSavedMinutes * 60
              ),
              accentTextClass: 'text-[#4ADE80]',
              badgeColorClass: 'bg-emerald-500/15 text-[#4ADE80] border-emerald-400/35',
            },
            {
              key: 'builderBite',
              name: 'Builder Bite',
              iconSrc: './icons/art_builder_bite.webp',
              usedCount: builderBiteStat.used,
              timeSavedText: formatCumulativeModalTime(
                builderBiteStat.timeSavedMinutes * 60
              ),
              accentTextClass: 'text-[#F3CA65]',
              badgeColorClass: 'bg-amber-500/15 text-[#F3CA65] border-amber-400/35',
            },
            {
              key: 'studySoup',
              name: 'Study Soup',
              iconSrc: './icons/art_study_soup.webp',
              usedCount: studySoupStat.used,
              timeSavedText: formatCumulativeModalTime(
                studySoupStat.timeSavedMinutes * 60
              ),
              accentTextClass: 'text-[#93C5FD]',
              badgeColorClass: 'bg-sky-500/15 text-[#93C5FD] border-sky-400/35',
            },
          ];

          const heroes: StandardUpgradeHistoryItem[] = [];
          const pethouse: StandardUpgradeHistoryItem[] = [];
          const laboratory: StandardUpgradeHistoryItem[] = [];
          const buildings: StandardUpgradeHistoryItem[] = [];
          const defaultDateLabel = monthLabel.split(' ')[0] || monthLabel;

          for (const [itemId, entry] of Object.entries(history.upgrades)) {
            if (entry.currentLevel <= entry.startLevel) continue;
            if (itemId === '1000010') continue;

            const stdItem: StandardUpgradeHistoryItem = {
              id: `${cleanKey}_${yearMonthKey}_${itemId}`,
              rawId: itemId,
              name: entry.name || resolveUpgradeName(itemId, `Item ${itemId}`),
              fromLevel: entry.startLevel,
              toLevel: entry.currentLevel,
              completedDate: entry.completedDate || defaultDateLabel,
            };

            if (itemId.startsWith('28')) {
              heroes.push(stdItem);
            } else if (itemId.startsWith('73')) {
              pethouse.push(stdItem);
            } else if (itemId.startsWith('400') || itemId.startsWith('260')) {
              laboratory.push(stdItem);
            } else {
              buildings.push(stdItem);
            }
          }

          // Read ONLY the positive calculated wall differences from the month's history log
          const walls: WallUpgradeHistoryItem[] = Object.values(history.walls || {})
            .filter((w) => w.lvl > 1 && w.upgradedCount > 0)
            .sort((a, b) => a.lvl - b.lvl)
            .map((w) => ({
              id: `wall_diff_${cleanKey}_${yearMonthKey}_${w.lvl}`,
              data: 1000010 as const,
              fromLevel: w.fromLevel,
              lvl: w.lvl,
              upgradedCount: w.upgradedCount,
            }));

          const totalUpgrades =
            heroes.length +
            pethouse.length +
            laboratory.length +
            buildings.length +
            walls.reduce((sum, w) => sum + w.upgradedCount, 0);

          return {
            monthKey: yearMonthKey,
            monthLabel,
            hasData: true,
            totalUpgrades,
            timeSavedText,
            potionsBreakdown,
            heroes,
            pethouse,
            laboratory,
            buildings,
            walls,
          };
        };

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setSummaryModalSection(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="monthly-summary-title"
              className="w-full max-w-md rounded-3xl p-5 sm:p-6 bg-[#0F131D] border border-[#2A303C] shadow-[0_0_50px_rgba(0,0,0,0.95)] space-y-4 relative overflow-hidden max-h-[88dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: VILLAGE STATS - [MONTH NAME] */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div>
                  <h2
                    id="monthly-summary-title"
                    className="text-base sm:text-lg font-black tracking-wide text-white uppercase"
                  >
                    VILLAGE STATS -{' '}
                    <span className="text-[#F3CA65]">
                      {new Date(nowTick)
                        .toLocaleString('en-US', { month: 'long' })
                        .toUpperCase()}
                    </span>
                  </h2>
                  <p className="text-[11px] font-bold text-[#8E9AA8] mt-0.5">
                    {activeAccountProfile.name}{' '}
                    {activeModalPlayerTag ? (
                      <span className="font-mono text-[#4ADE80]">({activeModalPlayerTag})</span>
                    ) : null}{' '}
                    · {getCurrentMonthDateRangeLabel(new Date(nowTick))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    setSummaryModalSection(null);
                  }}
                  className="tactile text-[#8E9AA8] hover:text-white text-sm font-bold px-2.5 py-1.5 rounded-xl bg-[#161B26] border border-[#2A303C] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto space-y-4 pr-0.5 flex-1">
                {isFiveMonthArchiveOpen ? (
                  <FiveMonthUpgradeHistory
                    accountKey={activeModalAccountKey}
                    accountName={activeAccountProfile.name}
                    nowTick={nowTick}
                    loadAccountMonthData={buildAccountMonthArchiveData}
                    onBackToSummary={() => {
                      triggerHaptic(12);
                      setIsFiveMonthArchiveOpen(false);
                    }}
                  />
                ) : (
                  <>
                    {/* Option to open 5-Month Upgrade History & Stats tab */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setIsFiveMonthArchiveOpen(true);
                      }}
                      className="tactile w-full rounded-2xl p-3 bg-[#161B26] hover:bg-[#1E2534] border border-[#F3CA65]/35 flex items-center justify-between gap-3 text-left cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#1E2534] border border-[#2D364A] flex items-center justify-center text-[#F3CA65] shrink-0 text-sm">
                          📅
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-[13px] font-extrabold text-white truncate">
                            5-Month Upgrade History &amp; Stats
                          </p>
                          <p className="text-[11px] font-medium text-[#8E9AA8] truncate">
                            Open 5-month archive by category &amp; walls
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-[#F3CA65]/15 border border-[#F3CA65]/35 text-[11px] font-extrabold text-[#F3CA65] shrink-0">
                        Open ▸
                      </span>
                    </button>

                    {/* Top Section: Potion Analytics (3-Row Categorized List) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#F3CA65] uppercase px-0.5 block">
                        POTION ANALYTICS
                      </span>

                      <div className="space-y-2">
                        {/* Row 1: Builder Potions */}
                        <div className="rounded-2xl p-3 bg-[#161B26] border border-[#2A303C] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#1E2534] border border-[#2D364A] p-1 flex items-center justify-center shrink-0">
                              <img
                                src="/icons/art_builder_potion.webp"
                                alt="Builder Potion"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[13px] font-bold text-white truncate">
                                Builder Potions Used:{' '}
                                <span className="text-[#F3CA65] font-extrabold">
                                  {activeModalHistory.potions.builder.used}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#8E9AA8]">
                                Time Saved:{' '}
                                <span className="text-[#4ADE80] font-bold">
                                  {formatCumulativeModalTime(
                                    activeModalHistory.potions.builder.timeSavedMinutes * 60
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Research Potions */}
                        <div className="rounded-2xl p-3 bg-[#161B26] border border-[#2A303C] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#1E2534] border border-[#2D364A] p-1 flex items-center justify-center shrink-0">
                              <img
                                src="/icons/art_research_potion.webp"
                                alt="Research Potion"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[13px] font-bold text-white truncate">
                                Research Potions Used:{' '}
                                <span className="text-[#F3CA65] font-extrabold">
                                  {activeModalHistory.potions.research.used}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#8E9AA8]">
                                Time Saved:{' '}
                                <span className="text-[#93C5FD] font-bold">
                                  {formatCumulativeModalTime(
                                    activeModalHistory.potions.research.timeSavedMinutes * 60
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Pet Potions */}
                        <div className="rounded-2xl p-3 bg-[#161B26] border border-[#2A303C] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#1E2534] border border-[#2D364A] p-1 flex items-center justify-center shrink-0">
                              <img
                                src="/icons/art_pet_potion.webp"
                                alt="Pet Potion"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[13px] font-bold text-white truncate">
                                Pet Potions Used:{' '}
                                <span className="text-[#F3CA65] font-extrabold">
                                  {activeModalHistory.potions.pet.used}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#8E9AA8]">
                                Time Saved:{' '}
                                <span className="text-[#4ADE80] font-bold">
                                  {formatCumulativeModalTime(
                                    activeModalHistory.potions.pet.timeSavedMinutes * 60
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: The Upgrades List */}
                    {(() => {
                      const completedWallEntries = Object.values(activeModalHistory.walls || {})
                        .filter((w) => w.lvl > 1 && w.upgradedCount > 0)
                        .sort((a, b) => a.lvl - b.lvl);
                      const totalCompletedCount =
                        completedUpgradesEntries.length +
                        completedWallEntries.reduce((sum, w) => sum + w.upgradedCount, 0);

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-0.5">
                            <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#F3CA65] uppercase">
                              UPGRADES COMPLETED THIS MONTH
                            </span>
                            <span className="text-[11px] font-bold text-[#8E9AA8] tabular-nums">
                              {totalCompletedCount}
                            </span>
                          </div>

                          {completedUpgradesEntries.length > 0 ||
                          completedWallEntries.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                              {completedUpgradesEntries.map(([itemId, entry]) => (
                                <div
                                  key={itemId}
                                  className="rounded-2xl p-3 bg-[#161B26] border border-[#2A303C] flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <UpgradeAssetIcon
                                      rawId={itemId}
                                      upgradeTitle={entry.name}
                                      upgradeLevel={entry.startLevel}
                                      targetLevel={entry.currentLevel}
                                      className="!w-12 !h-12"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-white truncate">
                                        {entry.name}
                                      </p>
                                      <p className="text-xs font-bold text-[#F3CA65]/90 mt-0.5">
                                        Lvl {entry.startLevel} →{' '}
                                        <span className="text-[#4ADE80]">
                                          {entry.currentLevel}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 shrink-0">
                                    +{entry.currentLevel - entry.startLevel}
                                  </span>
                                </div>
                              ))}

                              {completedWallEntries.map((wall) => (
                                <div
                                  key={`wall_${wall.lvl}`}
                                  className="rounded-2xl p-3 bg-[#161B26] border border-[#2A303C] flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-[#1E2534] border border-[#2D364A] p-1.5 flex items-center justify-center shrink-0">
                                      <img
                                        src="./icons/art_1000010.webp"
                                        alt="Wall"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-white truncate">
                                        Wall
                                      </p>
                                      <p className="text-xs font-bold text-[#F3CA65]/90 mt-0.5">
                                        Lvl {wall.fromLevel} ➔ {wall.lvl}{' '}
                                        <span className="text-[#4ADE80]">
                                          (x{wall.upgradedCount} upgraded)
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 shrink-0">
                                    x{wall.upgradedCount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl p-4 bg-[#161B26] border border-[#2A303C] text-center space-y-1">
                              <p className="text-xs font-bold text-white">
                                No level increases logged yet this month
                              </p>
                              <p className="text-[11px] text-[#8E9AA8] leading-relaxed">
                                Import your village JSON periodically to automatically compare and track buildings, heroes, troops, spells, pets, and walls upgraded this month.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Bottom: Gold Close Button (#F3CA65) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setSummaryModalSection(null);
                }}
                className="tactile w-full py-3 rounded-2xl font-extrabold text-sm bg-[#F3CA65] hover:bg-[#E5BA53] text-[#0B0E14] shadow-[0_6px_20px_rgba(243,202,101,0.22)] cursor-pointer shrink-0 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Two-Step Confirmation Modal for Clearing Active Lab / Pet Upgrade Timer */}
      {pendingClearSlot !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setPendingClearSlot(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl p-6 bg-[#090d16] border border-rose-500/45 shadow-[0_0_45px_rgba(0,0,0,0.95)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🗑️</span>
              <h2 className="text-base sm:text-lg font-extrabold text-rose-300">
                Clear Active Upgrade Timer
              </h2>
            </div>

            <p className="text-xs sm:text-sm font-bold text-gray-200 leading-relaxed">
              Are you sure you want to clear this active upgrade timer?
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  setPendingClearSlot(null);
                }}
                className="tactile flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearUpgradeSlot}
                className="tactile flex-1 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/50 shadow-lg cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Home Screen Widget Preview & Sync Modal */}
      {isWidgetPreviewOpen && (() => {
        const totalVillages = accounts.length;
        const safeIdx =
          totalVillages > 0 ? ((widgetPreviewIdx % totalVillages) + totalVillages) % totalVillages : 0;
        const previewProfile = accounts[safeIdx] || activeAccountProfile;
        const pd = previewProfile?.data || createDefaultSavedState();
        const thNum = resolveWidgetThNumber(pd, previewProfile?.name || 'Village');
        const now = widgetRefreshTime;

        const activeBuilders = (pd.lockedResults || [])
          .filter((r) => r && typeof r.targetTimestamp === 'number' && r.targetTimestamp > now)
          .sort((a, b) => a.targetTimestamp - b.targetTimestamp);

        const regCap = Math.min(6, Math.max(1, pd.numBuilders || 6));
        const busyReg = activeBuilders.filter((r) => !r.isGoblin).length;
        const goblinBusy = activeBuilders.some((r) => r.isGoblin);

        const boostParts: string[] = [];
        if (pd.builderBoostEndTime && pd.builderBoostEndTime > now) {
          const remM = Math.max(1, Math.floor((pd.builderBoostEndTime - now) / 60000));
          const h = Math.floor(remM / 60);
          const m = remM % 60;
          boostParts.push(`Builder 10x (${h > 0 ? `${h}h ${m}m` : `${m}m`})`);
        }
        if (pd.labBoostEndTime && pd.labBoostEndTime > now) {
          const remM = Math.max(1, Math.floor((pd.labBoostEndTime - now) / 60000));
          const h = Math.floor(remM / 60);
          const m = remM % 60;
          boostParts.push(`Lab 24x (${h > 0 ? `${h}h ${m}m` : `${m}m`})`);
        }
        if (pd.petBoostEndTime && pd.petBoostEndTime > now) {
          const remM = Math.max(1, Math.floor((pd.petBoostEndTime - now) / 60000));
          const h = Math.floor(remM / 60);
          const m = remM % 60;
          boostParts.push(`Pet 24x (${h > 0 ? `${h}h ${m}m` : `${m}m`})`);
        }

        const labAndPetRows: Array<{
          key: string;
          title: string;
          targetLvl: string;
          targetTs: number;
          rawId?: number | string;
          upgradeLevel?: number;
          category: 'laboratory' | 'pethouse';
        }> = [];

        if (pd.targetLabTimestamp && pd.targetLabTimestamp > now) {
          const baseLabName =
            pd.labTimer?.upgradeTitle && pd.labTimer.upgradeTitle !== 'Troop / Spell Upgrade'
              ? pd.labTimer.upgradeTitle
              : pd.labTimer?.rawId
              ? resolveUpgradeName(pd.labTimer.rawId, 'Lab Research')
              : 'Lab Research';
          labAndPetRows.push({
            key: 'lab_main',
            title: `${baseLabName} · LAB`,
            targetLvl:
              typeof pd.labTimer?.upgradeLevel === 'number'
                ? `→ ${pd.labTimer.upgradeLevel + 1}`
                : '',
            targetTs: pd.targetLabTimestamp,
            rawId: pd.labTimer?.rawId,
            upgradeLevel: pd.labTimer?.upgradeLevel,
            category: 'laboratory',
          });
        }

        if (pd.targetGoblinLabTimestamp && pd.targetGoblinLabTimestamp > now) {
          const baseGobLabName =
            pd.goblinLabTimer?.upgradeTitle &&
            pd.goblinLabTimer.upgradeTitle !== 'Goblin Researcher'
              ? pd.goblinLabTimer.upgradeTitle
              : pd.goblinLabTimer?.rawId
              ? resolveUpgradeName(pd.goblinLabTimer.rawId, 'Goblin Lab')
              : 'Goblin Lab';
          labAndPetRows.push({
            key: 'lab_goblin',
            title: `${baseGobLabName} · G-LAB`,
            targetLvl:
              typeof pd.goblinLabTimer?.upgradeLevel === 'number'
                ? `→ ${pd.goblinLabTimer.upgradeLevel + 1}`
                : '',
            targetTs: pd.targetGoblinLabTimestamp,
            rawId: pd.goblinLabTimer?.rawId,
            upgradeLevel: pd.goblinLabTimer?.upgradeLevel,
            category: 'laboratory',
          });
        }

        if (pd.targetPetTimestamp && pd.targetPetTimestamp > now) {
          const basePetName =
            pd.petTimer?.upgradeTitle && pd.petTimer.upgradeTitle !== 'Active Pet Upgrade'
              ? pd.petTimer.upgradeTitle
              : pd.petTimer?.rawId
              ? resolveUpgradeName(pd.petTimer.rawId, 'Pet Upgrade')
              : 'Pet Upgrade';
          labAndPetRows.push({
            key: 'pet_main',
            title: `${basePetName} · PET`,
            targetLvl:
              typeof pd.petTimer?.upgradeLevel === 'number'
                ? `→ ${pd.petTimer.upgradeLevel + 1}`
                : '',
            targetTs: pd.targetPetTimestamp,
            rawId: pd.petTimer?.rawId,
            upgradeLevel: pd.petTimer?.upgradeLevel,
            category: 'pethouse',
          });
        }

        const formatSubFinishDate = (ts: number) => {
          const dObj = new Date(ts);
          const dd = String(dObj.getDate()).padStart(2, '0');
          const mm = String(dObj.getMonth() + 1).padStart(2, '0');
          const yyyy = dObj.getFullYear();
          const timeStr = dObj
            .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            .toLowerCase();
          return `Finishes ${dd}/${mm}/${yyyy} ${timeStr}`;
        };

        const calcBarPercent = (ts: number) => {
          const remSec = Math.max(0, (ts - now) / 1000);
          const maxRef = Math.max(remSec, 14 * 86400);
          return Math.min(95, Math.max(12, Math.round(100 - (remSec / maxRef) * 85)));
        };

        const updatedTimeStr = new Date(now)
          .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          .toLowerCase();

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setIsWidgetPreviewOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Exact Home Screen Widget Container */}
              <div className="rounded-[22px] bg-[#121622] border border-[#262F42] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-2.5 max-h-[80dvh] flex flex-col">
                {/* 1. Widget Header: 3D TH Icon + Village Name (NO Tag) + Switch Button + Refresh Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <img
                    src={getTownHallIconSrc(thNum)}
                    alt={`Town Hall ${thNum}`}
                    className="w-11 h-11 object-contain shrink-0 drop-shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-black text-white leading-tight truncate">
                      {previewProfile?.name || 'Village'}
                    </h3>
                    <p className="text-[11px] font-extrabold text-[#F3CA65] tracking-wide uppercase mt-0.5 truncate">
                      TH {thNum} · {busyReg}/{regCap} BUILDERS{goblinBusy ? ' + G' : ''}
                    </p>
                  </div>

                  {/* Account Switch Button (⇄) */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      const nextIdx = totalVillages > 0 ? (safeIdx + 1) % totalVillages : 0;
                      setWidgetPreviewIdx(nextIdx);
                      setWidgetRefreshTime(Date.now());
                      if (accounts[nextIdx]) {
                        syncAllVillagesToNativeWidget(accounts, accounts[nextIdx].id);
                      }
                    }}
                    title="Switch Widget Account"
                    className="tactile h-9 px-2.5 rounded-xl bg-[#1A202E] hover:bg-[#222A3C] border border-[#2E384D] text-[#F3CA65] text-xs font-extrabold flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    ⇄ {safeIdx + 1}/{Math.max(1, totalVillages)}
                  </button>

                  {/* One-Tap Refresh Button (↻) */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setWidgetRefreshTime(Date.now());
                      syncAllVillagesToNativeWidget(
                        accounts,
                        previewProfile?.id || activeAccountId
                      );
                      showToast('success', 'Widget refreshed & synced!');
                    }}
                    title="One-Tap Refresh Widget"
                    className="tactile w-9 h-9 rounded-xl bg-[#1A202E] hover:bg-[#222A3C] border border-[#2E384D] text-[#F3CA65] text-base font-extrabold flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    ↻
                  </button>
                </div>

                {/* 2. Boost Banner Box */}
                <div className="rounded-xl bg-[#1A172B] border border-[#4C3B78] px-3 py-2 flex items-center gap-2 shrink-0">
                  <span className="text-[#F3CA65] text-sm">🕒</span>
                  <span
                    className={`text-xs font-bold truncate ${
                      boostParts.length > 0 ? 'text-[#4ADE80]' : 'text-[#CBD5E1]'
                    }`}
                  >
                    {boostParts.length > 0 ? boostParts.join(' · ') : 'No active boosts'}
                  </span>
                </div>

                {/* 3. Scrollable Upgrade Cards (Builders + Lab + Pets) */}
                <div className="overflow-y-auto space-y-2 pr-0.5 flex-1">
                  {activeBuilders.length === 0 && labAndPetRows.length === 0 ? (
                    <div className="rounded-2xl bg-[#181E2C] border border-[#263044] p-5 text-center text-xs font-bold text-[#94A3B8]">
                      All Builders, Lab &amp; Pets Idle
                    </div>
                  ) : (
                    <>
                      {activeBuilders.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-extrabold text-[#F3CA65] tracking-wider px-0.5">
                            BUILDERS &nbsp;{busyReg}/{regCap}
                            {goblinBusy ? ' + Goblin' : ''}
                          </p>
                          {activeBuilders.map((item) => {
                            const baseTitle =
                              item.upgradeTitle ||
                              (item.isGoblin ? 'Goblin Builder' : 'Upgrade');
                            const titleWithTag = item.isGoblin
                              ? `${baseTitle} · G`
                              : baseTitle;
                            const targetLvl =
                              typeof item.upgradeLevel === 'number'
                                ? `→ ${item.upgradeLevel + 1}`
                                : '';
                            return (
                              <div
                                key={`${item.builderIndex}_${item.targetTimestamp}`}
                                className="rounded-[14px] bg-[#181E2C] border border-[#263044] px-2.5 py-2.5 flex items-center gap-2.5"
                              >
                                <UpgradeAssetIcon
                                  rawId={item.rawId}
                                  upgradeTitle={baseTitle}
                                  upgradeLevel={item.upgradeLevel}
                                  category="builders"
                                  className="!w-11 !h-11 !rounded-xl !bg-transparent !border-0 !p-0 !shadow-none"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[13.5px] font-bold text-white truncate">
                                      {titleWithTag}
                                    </p>
                                    {targetLvl && (
                                      <span className="text-[12.5px] font-extrabold text-[#F3CA65] shrink-0">
                                        {targetLvl}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[13.5px] font-extrabold text-[#4ADE80] leading-tight mt-0.5">
                                    {formatCompletionDate(item.targetTimestamp)}
                                  </p>
                                  <div className="w-full h-[3px] rounded-full bg-[#252D3D] overflow-hidden mt-1.5">
                                    <div
                                      className="h-full bg-[#4ADE80] rounded-full"
                                      style={{
                                        width: `${calcBarPercent(item.targetTimestamp)}%`,
                                      }}
                                    />
                                  </div>
                                  <p className="text-[10.5px] font-medium text-[#8E9AA8] mt-1 truncate">
                                    {formatSubFinishDate(item.targetTimestamp)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {labAndPetRows.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-extrabold text-[#F3CA65] tracking-wider px-0.5">
                            LAB &amp; PETS &nbsp;{labAndPetRows.length} Active
                          </p>
                          {labAndPetRows.map((row) => (
                            <div
                              key={row.key}
                              className="rounded-[14px] bg-[#181E2C] border border-[#263044] px-2.5 py-2.5 flex items-center gap-2.5"
                            >
                              <UpgradeAssetIcon
                                rawId={row.rawId}
                                upgradeTitle={row.title.replace(/ · (LAB|G-LAB|PET)$/, '')}
                                upgradeLevel={row.upgradeLevel}
                                category={row.category}
                                className="!w-11 !h-11 !rounded-xl !bg-transparent !border-0 !p-0 !shadow-none"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[13.5px] font-bold text-white truncate">
                                    {row.title}
                                  </p>
                                  {row.targetLvl && (
                                    <span className="text-[12.5px] font-extrabold text-[#F3CA65] shrink-0">
                                      {row.targetLvl}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-[13.5px] font-extrabold leading-tight mt-0.5 ${
                                    row.category === 'laboratory'
                                      ? 'text-[#60A5FA]'
                                      : 'text-[#4ADE80]'
                                  }`}
                                >
                                  {formatCompletionDate(row.targetTs)}
                                </p>
                                <div className="w-full h-[3px] rounded-full bg-[#252D3D] overflow-hidden mt-1.5">
                                  <div
                                    className="h-full bg-[#4ADE80] rounded-full"
                                    style={{ width: `${calcBarPercent(row.targetTs)}%` }}
                                  />
                                </div>
                                <p className="text-[10.5px] font-medium text-[#8E9AA8] mt-1 truncate">
                                  {formatSubFinishDate(row.targetTs)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 4. Widget Footer */}
                <div className="flex items-center justify-between pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      if (previewProfile && previewProfile.id !== activeAccountId) {
                        handleAccountChipClick(previewProfile);
                      }
                      setIsWidgetPreviewOpen(false);
                    }}
                    className="text-[10.5px] font-extrabold tracking-wider text-[#CBD5E1] hover:text-white uppercase cursor-pointer"
                  >
                    OPEN VILLAGE &nbsp;↗
                  </button>
                  <span className="text-[10.5px] font-bold text-[#8E9AA8] uppercase">
                    UPDATED {updatedTimeStr}
                  </span>
                </div>
              </div>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  setIsWidgetPreviewOpen(false);
                }}
                className="tactile w-full py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm bg-[#161B26] hover:bg-[#1E2534] text-[#CBD5E1] border border-[#2A303C] cursor-pointer"
              >
                Close Widget Preview
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
