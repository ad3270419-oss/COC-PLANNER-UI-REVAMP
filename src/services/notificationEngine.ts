import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from '@capacitor/local-notifications';

export const CHANNEL_ID = 'clash_alerts_v2';
export const CHANNEL_NAME = 'Upgrade Reminders';
export const SMALL_ICON = 'ic_stat_clash';
export const TEST_ALARM_ID = 900001;
export const MIN_LEAD_MS = 5000;

const EXACT_ALARM_PROMPT_STORAGE_KEY = 'clash_planner_exact_alarm_prompt_ts_v1';
const EXACT_ALARM_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MIN_SLOT_ID = 1000;
const MAX_SLOT_ID = 1999990999;
const SLOT_ID_RANGE = MAX_SLOT_ID - MIN_SLOT_ID + 1;

export type PermissionTriState = 'granted' | 'denied' | 'unknown';
export type NotificationDisplayStatus = PermissionTriState | 'blocked';

export interface NotificationPermissionResult {
  display: PermissionTriState;
  exact: PermissionTriState;
}

export interface NotificationStatusSnapshot {
  permission: NotificationDisplayStatus;
  exact: PermissionTriState;
  lastSyncAt: number | null;
  lastForcedRegisterAt: number | null;
  desiredCount: number;
  lastError: string | null;
}

export interface UpgradeSlotSnapshot {
  slotIndex?: number;
  name?: string | null;
  targetLevel?: number | null;
  finishEpochMs?: number | null;
  remainingSeconds?: number | null;
  isActive?: boolean;
}

export interface HelperSlotSnapshot {
  assignedSlot: number | 'main' | 'goblin' | null;
  cooldownEndTime: number | null;
  recurrent?: boolean;
}

export interface AccountSnapshot {
  id: string;
  name: string;
  builders: UpgradeSlotSnapshot[];
  labMain?: UpgradeSlotSnapshot | null;
  labGoblin?: UpgradeSlotSnapshot | null;
  petMain?: UpgradeSlotSnapshot | null;
  builderBoostEndTime?: number | null;
  labBoostEndTime?: number | null;
  petBoostEndTime?: number | null;
  builderHelper?: HelperSlotSnapshot | null;
  labHelper?: HelperSlotSnapshot | null;
}

export interface DesiredNotificationItem {
  id: number;
  title: string;
  body: string;
  finishEpochMs: number;
  sig: string;
}

const PLACEHOLDER_UPGRADE_NAMES = new Set<string>([
  'defense upgrade',
  'defense / building upgrade',
  'building upgrade',
  'goblin builder',
  'troop / spell upgrade',
  'goblin researcher',
  'active pet upgrade',
  'upgrade',
  'research',
  'goblin lab',
  'pet',
  'unknown',
  'empty',
  'idle',
]);

const GENERIC_BUILDER_NAME_PATTERN = /^builder\s+\d+(\s+upgrade)?$/i;

let cachedDisplayPermission: NotificationDisplayStatus = 'unknown';
let cachedExactPermission: PermissionTriState = 'unknown';
let lastSyncAt: number | null = null;
let lastForcedRegisterAt: number | null = null;
let lastDesiredCount = 0;
let lastError: string | null = null;
let inFlightPermissionRequest: Promise<NotificationPermissionResult> | null = null;

let isSyncRunning = false;
let latestQueuedAccounts: AccountSnapshot[] | null = null;
let latestQueuedForce = false;
let activeSyncPromise: Promise<void> | null = null;

export function isNativeNotificationPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function logError(context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  lastError = `${context}: ${msg}`;
  console.error(`[NotificationEngine] ${context}`, err);
}

function normalizePermissionState(value: unknown): PermissionTriState {
  if (value === 'granted') return 'granted';
  if (value === 'denied') return 'denied';
  return 'unknown';
}

function canPromptExactAlarmSettingNow(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(EXACT_ALARM_PROMPT_STORAGE_KEY);
    if (!raw) return true;
    const lastTs = Number(raw);
    if (!Number.isFinite(lastTs)) return true;
    return Date.now() - lastTs >= EXACT_ALARM_PROMPT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function recordExactAlarmPromptTimestamp(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EXACT_ALARM_PROMPT_STORAGE_KEY, String(Date.now()));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Ensures the Android high-importance notification channel exists.
 * Idempotent, never caches an "already initialized" flag in localStorage
 * so APK overwrite updates always restore/keep the channel without Clear Data.
 */
export async function ensureChannel(): Promise<void> {
  if (!isNativeNotificationPlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      description: 'Clash of Clans builder, laboratory, pet house, boost, and helper alerts',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch (err) {
    logError('ensureChannel failed', err);
  }
}

/**
 * Checks/requests notification display permission and inspects exact alarm permission.
 * Prompts for exact alarm setting at most once per 24 hours, non-blocking, never throws.
 */
export async function ensureNotificationPermissions(): Promise<NotificationPermissionResult> {
  if (!isNativeNotificationPlatform()) {
    return { display: 'unknown', exact: 'unknown' };
  }

  if (inFlightPermissionRequest) {
    return inFlightPermissionRequest;
  }

  inFlightPermissionRequest = (async (): Promise<NotificationPermissionResult> => {
    let display: PermissionTriState = 'unknown';
    let exact: PermissionTriState = 'unknown';

    try {
      const current = await LocalNotifications.checkPermissions();
      display = normalizePermissionState(current?.display);
      if (display !== 'granted') {
        const requested = await LocalNotifications.requestPermissions();
        display = normalizePermissionState(requested?.display);
      }
      if (display !== 'granted') {
        try {
          const enabled = await LocalNotifications.areEnabled();
          if (enabled?.value === true) {
            display = 'granted';
          }
        } catch {
          // Ignore areEnabled fallback errors
        }
      }
    } catch (err) {
      logError('display permission check failed', err);
    }

    try {
      const exactStatus = await LocalNotifications.checkExactNotificationSetting();
      exact = normalizePermissionState(exactStatus?.exact_alarm);
      if (exact !== 'granted' && canPromptExactAlarmSettingNow()) {
        recordExactAlarmPromptTimestamp();
        void LocalNotifications.changeExactNotificationSetting().catch((promptErr) => {
          logError('changeExactNotificationSetting failed', promptErr);
        });
      }
    } catch (err) {
      logError('exact alarm permission check failed', err);
    }

    cachedDisplayPermission = display === 'denied' ? 'blocked' : display;
    cachedExactPermission = exact;
    return { display, exact };
  })();

  try {
    return await inFlightPermissionRequest;
  } finally {
    inFlightPermissionRequest = null;
  }
}

/**
 * Deterministic positive 32-bit FNV-1a hash mapped into [1000, 1_999_990_999].
 */
export function getSlotNotificationId(villageId: string, slotKey: string): number {
  const combined = `${villageId}::${slotKey}`;
  let hash = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return (unsigned % SLOT_ID_RANGE) + MIN_SLOT_ID;
}

function allocateUniqueId(baseId: number, usedIds: Set<number>): number {
  let candidate =
    Number.isFinite(baseId) && baseId >= MIN_SLOT_ID && baseId <= MAX_SLOT_ID
      ? Math.trunc(baseId)
      : MIN_SLOT_ID;
  while (usedIds.has(candidate) || candidate === TEST_ALARM_ID) {
    candidate = candidate >= MAX_SLOT_ID ? MIN_SLOT_ID : candidate + 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function sanitizeUpgradeName(rawName: string | null | undefined): string | null {
  if (typeof rawName !== 'string') return null;
  const trimmed = rawName.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (PLACEHOLDER_UPGRADE_NAMES.has(normalized)) return null;
  if (GENERIC_BUILDER_NAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function formatOptionalLevel(targetLevel: number | null | undefined): string {
  if (
    typeof targetLevel === 'number' &&
    Number.isFinite(targetLevel) &&
    targetLevel >= 1
  ) {
    return ` (LVL ${Math.floor(targetLevel)})`;
  }
  return '';
}

function getHelperAvailableTimestamp(
  helper: HelperSlotSnapshot | null | undefined,
  assignedUpgradeFinishTimestamp: number | null | undefined,
  now: number
): number | null {
  if (
    !helper ||
    typeof helper.cooldownEndTime !== 'number' ||
    !Number.isFinite(helper.cooldownEndTime) ||
    helper.cooldownEndTime <= now + MIN_LEAD_MS
  ) {
    return null;
  }

  const isAssignedRecurrent =
    helper.assignedSlot !== null &&
    helper.assignedSlot !== undefined &&
    helper.recurrent !== false;

  if (
    isAssignedRecurrent &&
    typeof assignedUpgradeFinishTimestamp === 'number' &&
    Number.isFinite(assignedUpgradeFinishTimestamp) &&
    assignedUpgradeFinishTimestamp > now
  ) {
    if (helper.cooldownEndTime > assignedUpgradeFinishTimestamp) {
      return Math.trunc(helper.cooldownEndTime);
    }
    return null;
  }

  return Math.trunc(helper.cooldownEndTime);
}

/**
 * Pure, strictly validated desired notification builder across all accounts.
 */
export function buildDesiredNotifications(
  accounts: AccountSnapshot[],
  now = Date.now()
): DesiredNotificationItem[] {
  if (!Array.isArray(accounts) || accounts.length === 0) return [];

  const desired: DesiredNotificationItem[] = [];
  const usedIds = new Set<number>([TEST_ALARM_ID]);

  const pushValidated = (
    villageId: string,
    slotKey: string,
    title: string,
    body: string,
    finishEpochMs: number | null | undefined
  ) => {
    if (typeof finishEpochMs !== 'number' || !Number.isFinite(finishEpochMs)) return;
    const epochMs = Math.trunc(finishEpochMs);
    if (epochMs <= now + MIN_LEAD_MS) return;

    const id = allocateUniqueId(getSlotNotificationId(villageId, slotKey), usedIds);
    const sig = `${epochMs}|${title}|${body}`;
    desired.push({
      id,
      title,
      body,
      finishEpochMs: epochMs,
      sig,
    });
  };

  for (const account of accounts) {
    if (!account || typeof account.id !== 'string' || !account.id.trim()) continue;
    const villageId = account.id;
    const villageName =
      typeof account.name === 'string' && account.name.trim()
        ? account.name.trim()
        : 'Village';

    const builderFinishBySlot = new Map<number, number>();

    // Builders: builder_0 .. builder_6
    if (Array.isArray(account.builders)) {
      for (const b of account.builders) {
        if (!b || typeof b.slotIndex !== 'number' || !Number.isInteger(b.slotIndex)) continue;
        if (b.slotIndex < 0 || b.slotIndex > 6) continue;

        const hasRealRemaining =
          b.isActive === true ||
          (typeof b.remainingSeconds === 'number' &&
            Number.isFinite(b.remainingSeconds) &&
            b.remainingSeconds > 0);
        if (!hasRealRemaining) continue;

        if (
          typeof b.finishEpochMs === 'number' &&
          Number.isFinite(b.finishEpochMs) &&
          b.finishEpochMs > now
        ) {
          builderFinishBySlot.set(b.slotIndex, Math.trunc(b.finishEpochMs));
        }

        const validName = sanitizeUpgradeName(b.name);

        if (
          typeof b.finishEpochMs === 'number' &&
          Number.isFinite(b.finishEpochMs) &&
          b.finishEpochMs > now + MIN_LEAD_MS
        ) {
          const body = validName
            ? `${villageName}: ${validName}${formatOptionalLevel(b.targetLevel)} upgrade completed! Builder is now free.`
            : `${villageName}: Builder ${b.slotIndex + 1} upgrade finished!`;
          pushValidated(
            villageId,
            `builder_${b.slotIndex}`,
            `🔨 Builder Alert • ${villageName}`,
            body,
            b.finishEpochMs
          );
        }
      }
    }

    // Laboratory Primary: lab_main
    let labMainFinishTs: number | null = null;
    if (account.labMain) {
      const hasRealRemaining =
        typeof account.labMain.remainingSeconds === 'number' &&
        Number.isFinite(account.labMain.remainingSeconds) &&
        account.labMain.remainingSeconds > 0;
      if (
        hasRealRemaining &&
        typeof account.labMain.finishEpochMs === 'number' &&
        Number.isFinite(account.labMain.finishEpochMs) &&
        account.labMain.finishEpochMs > now
      ) {
        labMainFinishTs = Math.trunc(account.labMain.finishEpochMs);
      }
      const validName = sanitizeUpgradeName(account.labMain.name);
      if (hasRealRemaining && labMainFinishTs && labMainFinishTs > now + MIN_LEAD_MS) {
        const body = validName
          ? `${villageName}: ${validName}${formatOptionalLevel(account.labMain.targetLevel)} research finished!`
          : `${villageName}: Laboratory upgrade finished!`;
        pushValidated(
          villageId,
          'lab_main',
          `⚗️ Laboratory Alert • ${villageName}`,
          body,
          labMainFinishTs
        );
      }
    }

    // Laboratory Goblin: lab_goblin
    let labGoblinFinishTs: number | null = null;
    if (account.labGoblin) {
      const hasRealRemaining =
        typeof account.labGoblin.remainingSeconds === 'number' &&
        Number.isFinite(account.labGoblin.remainingSeconds) &&
        account.labGoblin.remainingSeconds > 0;
      if (
        hasRealRemaining &&
        typeof account.labGoblin.finishEpochMs === 'number' &&
        Number.isFinite(account.labGoblin.finishEpochMs) &&
        account.labGoblin.finishEpochMs > now
      ) {
        labGoblinFinishTs = Math.trunc(account.labGoblin.finishEpochMs);
      }
      const validName = sanitizeUpgradeName(account.labGoblin.name);
      if (hasRealRemaining && labGoblinFinishTs && labGoblinFinishTs > now + MIN_LEAD_MS) {
        const body = validName
          ? `${villageName}: ${validName}${formatOptionalLevel(account.labGoblin.targetLevel)} research finished!`
          : `${villageName}: Goblin Researcher upgrade finished!`;
        pushValidated(
          villageId,
          'lab_goblin',
          `⚗️ Laboratory Alert • ${villageName}`,
          body,
          labGoblinFinishTs
        );
      }
    }

    // Pet House: pet_main
    if (account.petMain) {
      const hasRealRemaining =
        typeof account.petMain.remainingSeconds === 'number' &&
        Number.isFinite(account.petMain.remainingSeconds) &&
        account.petMain.remainingSeconds > 0;
      const validName = sanitizeUpgradeName(account.petMain.name);
      if (
        hasRealRemaining &&
        typeof account.petMain.finishEpochMs === 'number' &&
        Number.isFinite(account.petMain.finishEpochMs) &&
        account.petMain.finishEpochMs > now + MIN_LEAD_MS
      ) {
        const body = validName
          ? `${villageName}: ${validName}${formatOptionalLevel(account.petMain.targetLevel)} upgrade is complete! Pet is ready for battle.`
          : `${villageName}: Pet House upgrade finished!`;
        pushValidated(
          villageId,
          'pet_main',
          `🐾 Pet House Alert • ${villageName}`,
          body,
          account.petMain.finishEpochMs
        );
      }
    }

    // Potion Boosts: boost_builder, boost_lab, boost_pet
    pushValidated(
      villageId,
      'boost_builder',
      `⚡ Builder Boost Expired • ${villageName}`,
      `${villageName}: Builder Potion boost has ended! Upgrades are back to normal speed.`,
      account.builderBoostEndTime
    );
    pushValidated(
      villageId,
      'boost_lab',
      `⚡ Lab Boost Expired • ${villageName}`,
      `${villageName}: Research Potion boost has ended!`,
      account.labBoostEndTime
    );
    pushValidated(
      villageId,
      'boost_pet',
      `⚡ Pet Boost Expired • ${villageName}`,
      `${villageName}: Pet Potion boost has ended!`,
      account.petBoostEndTime
    );

    // Helpers: helper_builder, helper_lab (reuses recurrent skip rule)
    const assignedBuilderSlot =
      typeof account.builderHelper?.assignedSlot === 'number'
        ? account.builderHelper.assignedSlot
        : null;
    const assignedBuilderFinish =
      assignedBuilderSlot !== null ? builderFinishBySlot.get(assignedBuilderSlot) ?? null : null;
    const builderHelperNotifyTs = getHelperAvailableTimestamp(
      account.builderHelper,
      assignedBuilderFinish,
      now
    );
    pushValidated(
      villageId,
      'helper_builder',
      `👷 Builder Helper Available • ${villageName}`,
      `${villageName}: Builder's Apprentice cooldown has ended and is ready to assign!`,
      builderHelperNotifyTs
    );

    const assignedLabFinish =
      account.labHelper?.assignedSlot === 'main'
        ? labMainFinishTs
        : account.labHelper?.assignedSlot === 'goblin'
        ? labGoblinFinishTs
        : null;
    const labHelperNotifyTs = getHelperAvailableTimestamp(
      account.labHelper,
      assignedLabFinish,
      now
    );
    pushValidated(
      villageId,
      'helper_lab',
      `🔬 Lab Helper Available • ${villageName}`,
      `${villageName}: Lab Apprentice cooldown has ended and is ready to assign!`,
      labHelperNotifyTs
    );
  }

  return desired;
}

function toCapacitorSchema(item: DesiredNotificationItem): LocalNotificationSchema {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    schedule: {
      at: new Date(item.finishEpochMs),
      allowWhileIdle: true,
    },
    channelId: CHANNEL_ID,
    smallIcon: SMALL_ICON,
    extra: { sig: item.sig },
  };
}

export interface PendingNotificationLike {
  id: number;
  extra?: Record<string, unknown> | null;
}

export interface SyncPlan {
  toSchedule: DesiredNotificationItem[];
  toCancel: number[];
}

export interface SyncNotificationOptions {
  force?: boolean;
}

function getPendingSignature(pending: PendingNotificationLike): string | null {
  const extra = pending.extra as Record<string, unknown> | null | undefined;
  if (extra && typeof extra.sig === 'string' && extra.sig.length > 0) {
    return extra.sig;
  }
  return null;
}

/**
 * Pure diff planner between desired notifications and Capacitor's saved pending list.
 * - force = false: schedule only missing IDs or changed signatures.
 * - force = true: schedule ALL desired items (re-registering AlarmManager alarms even when sig matches).
 * - In both modes, cancel only orphaned pending IDs (never TEST_ALARM_ID).
 */
export function planSync(
  desired: DesiredNotificationItem[],
  pending: PendingNotificationLike[],
  options?: SyncNotificationOptions
): SyncPlan {
  const force = options?.force === true;
  const pendingById = new Map<number, PendingNotificationLike>();
  for (const p of pending) {
    if (typeof p?.id === 'number' && Number.isFinite(p.id)) {
      pendingById.set(p.id, p);
    }
  }

  const desiredIds = new Set<number>();
  const toSchedule: DesiredNotificationItem[] = [];

  for (const item of desired) {
    desiredIds.add(item.id);
    if (force) {
      toSchedule.push(item);
      continue;
    }
    const existing = pendingById.get(item.id);
    if (!existing) {
      toSchedule.push(item);
      continue;
    }
    const existingSig = getPendingSignature(existing);
    if (existingSig !== item.sig) {
      toSchedule.push(item);
    }
  }

  const toCancel: number[] = [];
  for (const p of pending) {
    if (
      typeof p?.id === 'number' &&
      Number.isFinite(p.id) &&
      !desiredIds.has(p.id) &&
      p.id !== TEST_ALARM_ID
    ) {
      toCancel.push(p.id);
    }
  }

  return { toSchedule, toCancel };
}

/**
 * Merges queued force flags with logical OR so a normal sync queued after
 * a forced sync never drops the pending forced re-registration.
 */
export function mergeQueuedForceFlag(existingForce: boolean, incomingForce?: boolean): boolean {
  return existingForce || incomingForce === true;
}

async function scheduleBatchWithSingleRetry(
  notifications: LocalNotificationSchema[]
): Promise<boolean> {
  if (notifications.length === 0) return true;
  try {
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch (firstErr) {
    logError('LocalNotifications.schedule failed on first attempt, retrying once', firstErr);
    try {
      await LocalNotifications.schedule({ notifications });
      return true;
    } catch (retryErr) {
      logError('LocalNotifications.schedule failed on retry', retryErr);
      return false;
    }
  }
}

async function runSingleSyncPass(
  accounts: AccountSnapshot[],
  options?: SyncNotificationOptions
): Promise<void> {
  if (!isNativeNotificationPlatform()) return;

  // (a) Guard: empty / undefined / unloaded accounts must never cancel existing alarms
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return;
  }

  const force = options?.force === true;

  try {
    // (b) Ensure channel & permissions
    await ensureChannel();
    const perms = await ensureNotificationPermissions();
    if (perms.display === 'denied') {
      cachedDisplayPermission = 'blocked';
      return;
    }

    // (c) Inspect currently pending Android notifications
    let pending: PendingLocalNotificationSchema[] = [];
    try {
      const pendingResult = await LocalNotifications.getPending();
      pending = Array.isArray(pendingResult?.notifications) ? pendingResult.notifications : [];
    } catch (err) {
      logError('LocalNotifications.getPending failed', err);
      return;
    }

    // (d) Build desired set across ALL accounts
    const desired = buildDesiredNotifications(accounts, Date.now());

    // (e) Plan schedule & orphan cancel sets
    const { toSchedule, toCancel } = planSync(desired, pending, { force });

    // (f) SCHEDULE FIRST in one call — never cancel before schedule succeeds
    if (toSchedule.length > 0) {
      const scheduledOk = await scheduleBatchWithSingleRetry(toSchedule.map(toCapacitorSchema));
      if (!scheduledOk) {
        return;
      }
    }

    // (g) THEN cancel only orphaned pending IDs (never touch matching IDs or TEST_ALARM_ID)
    if (toCancel.length > 0) {
      try {
        await LocalNotifications.cancel({
          notifications: toCancel.map((id) => ({ id })),
        });
      } catch (cancelErr) {
        logError('LocalNotifications.cancel orphans failed', cancelErr);
      }
    }

    const nowTs = Date.now();
    lastSyncAt = nowTs;
    lastDesiredCount = desired.length;
    if (force) {
      lastForcedRegisterAt = nowTs;
    }
    lastError = null;
  } catch (err) {
    logError('syncAllNotifications pass failed', err);
  }
}

/**
 * Latest-wins serialized sync:
 * At most one run executes at a time; concurrent calls store the newest snapshot
 * and run exactly once more after the active pass finishes (no unbounded queue).
 * Queued force flags are merged with OR so a forced refresh is never dropped.
 */
export function syncAllNotifications(
  accounts: AccountSnapshot[],
  options?: SyncNotificationOptions
): Promise<void> {
  if (!isNativeNotificationPlatform()) {
    return Promise.resolve();
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return Promise.resolve();
  }

  latestQueuedAccounts = accounts;
  latestQueuedForce = mergeQueuedForceFlag(latestQueuedForce, options?.force);

  if (isSyncRunning && activeSyncPromise) {
    return activeSyncPromise;
  }

  isSyncRunning = true;
  activeSyncPromise = (async () => {
    try {
      while (latestQueuedAccounts !== null) {
        const nextAccounts = latestQueuedAccounts;
        const nextForce = latestQueuedForce;
        latestQueuedAccounts = null;
        latestQueuedForce = false;
        await runSingleSyncPass(nextAccounts, { force: nextForce });
      }
    } catch (err) {
      logError('sync queue loop error', err);
    } finally {
      isSyncRunning = false;
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

export async function getPendingAlarmCount(): Promise<number> {
  if (!isNativeNotificationPlatform()) return 0;
  try {
    const res = await LocalNotifications.getPending();
    return Array.isArray(res?.notifications) ? res.notifications.length : 0;
  } catch (err) {
    logError('getPendingAlarmCount failed', err);
    return 0;
  }
}

export async function scheduleTestAlarm(): Promise<Date | null> {
  if (!isNativeNotificationPlatform()) return null;
  try {
    await ensureChannel();
    const perms = await ensureNotificationPermissions();
    if (perms.display === 'denied') {
      cachedDisplayPermission = 'blocked';
      return null;
    }

    const triggerEpochMs = Date.now() + 60_000;
    const title = 'Test alarm';
    const body = 'Clash Planner test notification arrived!';
    const testItem: DesiredNotificationItem = {
      id: TEST_ALARM_ID,
      title,
      body,
      finishEpochMs: triggerEpochMs,
      sig: `${triggerEpochMs}|${title}|${body}`,
    };

    const ok = await scheduleBatchWithSingleRetry([toCapacitorSchema(testItem)]);
    if (!ok) return null;
    return new Date(triggerEpochMs);
  } catch (err) {
    logError('scheduleTestAlarm failed', err);
    return null;
  }
}

export function getNotificationStatus(): NotificationStatusSnapshot {
  return {
    permission: cachedDisplayPermission,
    exact: cachedExactPermission,
    lastSyncAt,
    lastForcedRegisterAt,
    desiredCount: lastDesiredCount,
    lastError,
  };
}
