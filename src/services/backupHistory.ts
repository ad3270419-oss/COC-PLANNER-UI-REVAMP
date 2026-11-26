export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RestoreHistoryResult {
  written: number;
  skipped: number;
  failed: number;
}

/**
 * Whitelist of localStorage key prefixes that hold per-village monthly progress
 * and 5-month upgrade history.
 *
 * Intentionally EXCLUDES:
 * - village_universal_freq_ (legacy fallback-corrupted key)
 * - clash_planner_accounts_v1, coc_builder_potion_saved_* (account state)
 * - widget_*, clash_planner_timers_collapsed, clash_planner_exact_alarm_prompt_ts_v1 (UI/widget/notification prefs)
 */
export const HISTORY_KEY_PREFIXES = [
  'village_history_',
  'village_baseline_',
  'village_wall_baseline_',
  'village_real_freq_snapshot_',
  'village_universal_latest_',
  'clash_stats_',
  'lastImportedBoostState_',
  'clash_recovered_',
  'clash_fixed_',
] as const;

export const MAX_HISTORY_VALUE_LENGTH = 500_000;
export const HISTORY_MONTH_WINDOW = 5;

const KEY_YEAR_MONTH_REGEX = /_(\d{4})_(\d{2})(?=_|$)/;

function buildAllowedMonthSet(now: Date): Set<string> {
  const allowed = new Set<string>();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth();
  for (let offset = 0; offset < HISTORY_MONTH_WINDOW; offset++) {
    const d = new Date(baseYear, baseMonth - offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    allowed.add(`${yyyy}_${mm}`);
  }
  return allowed;
}

export function isWhitelistedHistoryKey(key: string): boolean {
  if (typeof key !== 'string' || key.length === 0) return false;
  return HISTORY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Collects raw localStorage progress/history strings whose keys start with a
 * whitelisted prefix, whose upper-cased key contains at least one of the
 * provided village tags (upper-cased), and (when the key contains a YYYY_MM
 * month segment) whose month falls within the last 5 calendar months
 * (current local month + 4 previous). Keys with no month segment are always
 * included.
 *
 * Values are returned verbatim without parsing or transforming.
 */
export function collectHistoryForTags(
  storage: StorageLike,
  tags: string[],
  now: Date = new Date()
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!storage || !Array.isArray(tags) || tags.length === 0) {
    return result;
  }

  const normalizedTags = Array.from(
    new Set(
      tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0)
    )
  );

  if (normalizedTags.length === 0) {
    return result;
  }

  const allowedMonths = buildAllowedMonthSet(now);

  let totalKeys = 0;
  try {
    totalKeys = storage.length;
  } catch {
    return result;
  }

  for (let i = 0; i < totalKeys; i++) {
    let key: string | null = null;
    try {
      key = storage.key(i);
    } catch {
      continue;
    }
    if (!key || !isWhitelistedHistoryKey(key)) continue;

    const upperKey = key.toUpperCase();
    const matchesTag = normalizedTags.some((tag) => upperKey.includes(tag));
    if (!matchesTag) continue;

    const monthMatch = key.match(KEY_YEAR_MONTH_REGEX);
    if (monthMatch) {
      const keyYearMonth = `${monthMatch[1]}_${monthMatch[2]}`;
      if (!allowedMonths.has(keyYearMonth)) {
        continue;
      }
    }

    let value: string | null = null;
    try {
      value = storage.getItem(key);
    } catch {
      continue;
    }

    if (value === null || value === '') continue;
    result[key] = value;
  }

  return result;
}

/**
 * Restores whitelisted progress/history entries into storage as raw strings.
 * - Accepts only a plain object (non-null, non-array).
 * - Validates key prefix whitelist and string value length <= 500,000 chars.
 * - Backup values overwrite existing values for keys present in the backup.
 * - Never deletes or modifies any key that is not in the backup.
 * - Catches storage.setItem quota/runtime errors per key and continues.
 */
export function restoreHistoryEntries(
  storage: StorageLike,
  history: unknown
): RestoreHistoryResult {
  const stats: RestoreHistoryResult = { written: 0, skipped: 0, failed: 0 };

  if (
    !storage ||
    history === null ||
    typeof history !== 'object' ||
    Array.isArray(history)
  ) {
    return stats;
  }

  const entries = Object.entries(history as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (!isWhitelistedHistoryKey(key)) {
      stats.skipped++;
      continue;
    }
    if (typeof value !== 'string' || value.length > MAX_HISTORY_VALUE_LENGTH) {
      stats.skipped++;
      continue;
    }

    try {
      storage.setItem(key, value);
      stats.written++;
    } catch {
      stats.failed++;
    }
  }

  return stats;
}
