import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decodeBackup, encodeBackup } from '../src/services/backupCodec.ts';
import {
  HISTORY_KEY_PREFIXES,
  MAX_HISTORY_VALUE_LENGTH,
  collectHistoryForTags,
  restoreHistoryEntries,
} from '../src/services/backupHistory.ts';

function createMemoryStorage(initial = {}, options = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      const keys = Array.from(map.keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (options.shouldThrow && options.shouldThrow(k, v)) {
        throw new Error('QuotaExceededError');
      }
      if (options.onSetItem) {
        options.onSetItem(k, v);
      }
      map.set(k, String(v));
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

function buildRealistic4Village5MonthScenario() {
  const baseNow = 1795668000000;
  const day = 86_400_000;
  const hour = 3_600_000;
  // Seed 7 months in storage (2 old + 5 active) so the 5-month window prunes 2026_05 and 2026_06
  const months = ['2026_05', '2026_06', '2026_07', '2026_08', '2026_09', '2026_10', '2026_11'];
  const villages = [
    { id: 'v1', name: 'Main TH17', tag: '#2PP0R9UQ8', thLevel: 17 },
    { id: 'v2', name: 'Mini TH16', tag: '#9LJ8Q2VGC', thLevel: 16 },
    { id: 'v3', name: 'Donation TH15', tag: '#Q0Y82V9PR', thLevel: 15 },
    { id: 'v4', name: 'Rush TH14', tag: '#L8G9U2C0V', thLevel: 14 },
  ];

  const storageInit = {};

  // Realistic ~2-3KB monthly keys (6 keys per village per month + boost state per village)
  for (let vIdx = 0; vIdx < villages.length; vIdx++) {
    const v = villages[vIdx];
    for (let mIdx = 0; mIdx < months.length; mIdx++) {
      const ym = months[mIdx];

      // 1) village_history_{YYYY_MM}_{TAG}
      const upgrades = {};
      for (let u = 0; u < 24; u++) {
        const id = String(1000000 + u);
        upgrades[`${id}_lvl_${10 + mIdx}`] = {
          rawId: id,
          name: `Defense Building ${u + 1}`,
          fromLevel: 9 + mIdx,
          toLevel: 10 + mIdx,
          count: 1 + (u % 3),
          category: u % 4 === 0 ? 'lab' : u % 5 === 0 ? 'pet' : 'builder',
          updatedAt: baseNow - (4 - mIdx) * 30 * day + u * hour,
        };
      }
      const historyObj = {
        potions: {
          builder: { used: 8 + mIdx, timeSavedMinutes: (8 + mIdx) * 6 * 9 * 60 },
          research: { used: 4 + mIdx, timeSavedMinutes: (4 + mIdx) * 23 * 60 },
          pet: { used: 2 + (mIdx % 3), timeSavedMinutes: (2 + (mIdx % 3)) * 23 * 60 },
          builderBite: { used: 1, timeSavedMinutes: 360 },
          studySoup: { used: 1, timeSavedMinutes: 240 },
        },
        upgrades,
        walls: {
          '15': 35 + mIdx * 4,
          '16': 20 + mIdx * 6,
          '17': 10 + mIdx * 5,
        },
      };
      storageInit[`village_history_${ym}_${v.tag}`] = JSON.stringify(historyObj);

      // 2) village_baseline_{YYYY_MM}_{TAG}
      const baselineObj = {};
      for (let b = 0; b < 55; b++) {
        baselineObj[`${1000000 + b}_${8 + (b % 10)}`] = 1 + (b % 4);
      }
      storageInit[`village_baseline_${ym}_${v.tag}`] = JSON.stringify(baselineObj);

      // 3) village_wall_baseline_{YYYY_MM}_{TAG}
      storageInit[`village_wall_baseline_${ym}_${v.tag}`] = JSON.stringify({
        '14': 50 - mIdx * 5,
        '15': 100 - mIdx * 2,
        '16': 125 + mIdx * 4,
        '17': 50 + mIdx * 3,
      });

      // 4) village_real_freq_snapshot_{YYYY_MM}_{TAG}
      const freqObj = {};
      for (let f = 0; f < 65; f++) {
        freqObj[`${1000000 + f}_${9 + (f % 11)}`] = 1 + (f % 5);
      }
      storageInit[`village_real_freq_snapshot_${ym}_${v.tag}`] = JSON.stringify(freqObj);

      // 5) village_universal_latest_{YYYY_MM}_{TAG}
      storageInit[`village_universal_latest_${ym}_${v.tag}`] = JSON.stringify(freqObj);

      // 6) clash_stats_{TAG}_{YYYY_MM}_builders (and lab/pethouse)
      storageInit[`clash_stats_${v.tag}_${ym}_builders`] = JSON.stringify({
        builderSecondsSaved: (8 + mIdx) * 6 * 9 * 3600,
        builderPotionsCount: 8 + mIdx,
      });
    }

    storageInit[`lastImportedBoostState_${v.tag}`] = JSON.stringify({
      builder: {
        rawBoostSeconds: 2400,
        jsonTimestamp: baseNow - 1200_000,
        startTimestamp: baseNow - 1200_000,
        expiryTimestamp: baseNow + 2400_000,
        creditedPotions: 1,
      },
    });
  }

  const accounts = villages.map((v, idx) => ({
    id: v.id,
    name: v.name,
    tag: v.tag,
    data: {
      mode: 'builders',
      numBuilders: 6,
      builders: [
        { d: '10', h: '5', m: '20', s: 12, upgradeTitle: 'Monolith', upgradeLevel: 4, rawId: '1000084' },
        { d: '8', h: '2', m: '15', s: 0, upgradeTitle: 'Inferno Tower', upgradeLevel: 11, rawId: '1000027' },
        { d: '6', h: '14', m: '40', s: 8, upgradeTitle: 'X-Bow', upgradeLevel: 12, rawId: '1000021' },
        { d: '4', h: '11', m: '5', s: 30, upgradeTitle: 'Scattershot', upgradeLevel: 6, rawId: '1000067' },
        { d: '5', h: '9', m: '0', s: 0, upgradeTitle: 'Barbarian King', upgradeLevel: 98, rawId: '28000000' },
        { d: '3', h: '18', m: '45', s: 19, upgradeTitle: 'Archer Queen', upgradeLevel: 99, rawId: '28000001' },
        { d: '', h: '', m: '' },
      ],
      potions: String(idx),
      lockedResults: [0, 1, 2, 3, 4, 5].map((slot) => ({
        builderIndex: slot,
        slotBadge: `B${slot + 1}`,
        upgradeTitle: `Upgrade ${slot + 1}`,
        upgradeLevel: 10 + slot,
        rawId: String(1000020 + slot),
        isGoblin: false,
        targetTimestamp: baseNow + (slot + 2) * day,
        formattedDate: 'Fri, Nov 29 · 6:00 PM',
      })),
      lockedSavedText: '',
      researchPotions: 1,
      labTimer: { d: '7', h: '6', m: '10', s: 0, upgradeTitle: 'Root Rider', upgradeLevel: 3, rawId: '4000110' },
      goblinLabTimer: { d: '', h: '', m: '' },
      targetLabTimestamp: baseNow + 7 * day + 6 * hour,
      labFormattedDate: 'Tue, Dec 2 · 3:00 PM',
      labSavedText: '',
      targetGoblinLabTimestamp: null,
      goblinLabFormattedDate: '',
      petPotions: 1,
      petTimer: { d: '5', h: '4', m: '20', s: 0, upgradeTitle: 'Spirit Fox', upgradeLevel: 10, rawId: '73000011' },
      targetPetTimestamp: baseNow + 5 * day + 4 * hour,
      petFormattedDate: 'Sun, Nov 30 · 1:20 PM',
      petSavedText: '',
      builderBoostEndTime: null,
      labBoostEndTime: null,
      petBoostEndTime: null,
      builderBiteEndTime: null,
      studySoupEndTime: null,
      builderApprentice: {
        id: 93000000,
        level: 8,
        assignedSlot: 0,
        activeSessionEndTime: null,
        cooldownEndTime: baseNow + 12 * hour,
        recurrent: true,
      },
      labApprentice: {
        id: 93000001,
        level: 10,
        assignedSlot: 'main',
        activeSessionEndTime: null,
        cooldownEndTime: baseNow + 10 * hour,
        recurrent: false,
      },
      thLevel: v.thLevel,
      lastSynced: '9:00 PM',
    },
  }));

  const storage = createMemoryStorage(storageInit);
  const tags = villages.map((v) => v.tag);
  return { accounts, tags, storage, baseNow };
}

async function run() {
  // (a) Collect only one village's whitelisted keys (ignore other tags & non-whitelisted keys)
  const storageA = createMemoryStorage({
    'village_history_2026_11_#AAA111': '{"potions":{},"upgrades":{"x":1}}',
    'village_baseline_2026_11_#AAA111': '{"1000001_17":1}',
    'village_wall_baseline_2026_11_#AAA111': '{"16":100}',
    'village_real_freq_snapshot_2026_11_#AAA111': '{"1000008_21":4}',
    'village_universal_latest_2026_11_#AAA111': '{"1000008_21":4}',
    'clash_stats_#AAA111_2026_11_builders': '{"builderSecondsSaved":32400,"builderPotionsCount":1}',
    'lastImportedBoostState_#AAA111': '{"builder":{"creditedPotions":1}}',
    'clash_recovered_5_builder_potions_#AAA111_2026_11': '1',
    'clash_fixed_duplicate_4_potions_#AAA111_2026_11': '1',
    // Empty value should be skipped
    'village_history_2026_10_#AAA111': '',
    // Second village (must NOT be collected when querying only #AAA111)
    'village_history_2026_11_#BBB222': '{"upgrades":{"y":2}}',
    'clash_stats_#BBB222_2026_11_lab': '{"labSecondsSaved":82800}',
    // Unrelated keys (must NEVER be collected)
    'clash_planner_accounts_v1': '{"accounts":["#AAA111"]}',
    'coc_builder_potion_saved_v2': '{"tag":"#AAA111"}',
    'clash_planner_timers_collapsed': 'true',
    'widget_villages_data': '[{"tag":"#AAA111"}]',
    'widget_active_index': '0',
    'clash_planner_exact_alarm_prompt_ts_v1': '1795668000000',
    'other_random_key_#AAA111': 'ignored',
  });

  const fixedNowNov2026 = new Date(2026, 10, 25); // Nov 25, 2026 (local time)
  const collectedA = collectHistoryForTags(storageA, ['  #aaa111  '], fixedNowNov2026);
  const expectedAKeys = [
    'village_history_2026_11_#AAA111',
    'village_baseline_2026_11_#AAA111',
    'village_wall_baseline_2026_11_#AAA111',
    'village_real_freq_snapshot_2026_11_#AAA111',
    'village_universal_latest_2026_11_#AAA111',
    'clash_stats_#AAA111_2026_11_builders',
    'lastImportedBoostState_#AAA111',
    'clash_recovered_5_builder_potions_#AAA111_2026_11',
    'clash_fixed_duplicate_4_potions_#AAA111_2026_11',
  ].sort();
  assert.deepStrictEqual(Object.keys(collectedA).sort(), expectedAKeys);
  console.log('PASS (a): collectHistoryForTags isolates single village whitelisted keys');

  // (b) village_universal_freq_* is never collected
  const storageB = createMemoryStorage({
    'village_universal_freq_2026_11_#AAA111': '{"corrupted":true}',
    'village_universal_latest_2026_11_#AAA111': '{"clean":true}',
  });
  const collectedB = collectHistoryForTags(storageB, ['#AAA111'], fixedNowNov2026);
  assert.equal('village_universal_freq_2026_11_#AAA111' in collectedB, false);
  assert.equal(collectedB['village_universal_latest_2026_11_#AAA111'], '{"clean":true}');
  assert.equal(HISTORY_KEY_PREFIXES.includes('village_universal_freq_'), false);
  console.log('PASS (b): village_universal_freq_* is never collected');

  // (c) round trip: collect -> encodeBackup/decodeBackup -> restoreHistoryEntries -> byte-identical
  const payloadC = {
    clashPlannerBackupVersion: 2,
    exportedAt: 1795668000000,
    activeAccountId: 'v1',
    accounts: [{ id: 'v1', name: 'Main', tag: '#AAA111', data: {} }],
    history: collectedA,
  };
  const encodedC = await encodeBackup(payloadC);
  const decodedC = await decodeBackup(encodedC);
  assert.equal(decodedC.ok, true);
  assert.equal(decodedC.format, 'cpb1');
  const emptyTarget = createMemoryStorage();
  const resC = restoreHistoryEntries(emptyTarget, decodedC.data.history);
  assert.deepStrictEqual(resC, { written: expectedAKeys.length, skipped: 0, failed: 0 });
  for (const key of expectedAKeys) {
    assert.strictEqual(emptyTarget.getItem(key), storageA.getItem(key));
  }
  console.log('PASS (c): collect -> encodeBackup -> decodeBackup -> restoreHistoryEntries byte-identical');

  // (d) restore never writes a non-whitelisted key (incl. __proto__, constructor, clash_planner_accounts_v1)
  const maliciousPayload = JSON.parse(
    '{"clash_planner_accounts_v1":"hijack","__proto__":"pollute","constructor":"bad","widget_villages_data":"bad","village_universal_freq_2026_11_#AAA111":"legacy","village_history_2026_11_#AAA111":"{\\"valid\\":true}"}'
  );
  const storageD = createMemoryStorage();
  const resD = restoreHistoryEntries(storageD, maliciousPayload);
  assert.deepStrictEqual(resD, { written: 1, skipped: 5, failed: 0 });
  assert.deepStrictEqual(storageD.dump(), {
    'village_history_2026_11_#AAA111': '{"valid":true}',
  });
  assert.equal(({}).pollute, undefined);
  console.log('PASS (d): restore rejects non-whitelisted keys (__proto__, constructor, accounts, legacy)');

  // (e) restore never deletes keys not in backup, and backup value wins for overlapping keys
  const storageE = createMemoryStorage({
    'clash_planner_timers_collapsed': 'false',
    'village_history_2026_10_#OTHER': '{"keep":"me"}',
    'village_history_2026_11_#AAA111': '{"old":"value"}',
  });
  const resE = restoreHistoryEntries(storageE, {
    'village_history_2026_11_#AAA111': '{"new":"from_backup"}',
  });
  assert.deepStrictEqual(resE, { written: 1, skipped: 0, failed: 0 });
  assert.equal(storageE.getItem('clash_planner_timers_collapsed'), 'false');
  assert.equal(storageE.getItem('village_history_2026_10_#OTHER'), '{"keep":"me"}');
  assert.equal(storageE.getItem('village_history_2026_11_#AAA111'), '{"new":"from_backup"}');
  console.log('PASS (e): restore preserves non-backup keys and overwrites backup keys');

  // (f) non-string and oversized values skipped; setItem throw counted as failed and does not abort
  const storageF = createMemoryStorage(
    {},
    {
      shouldThrow: (key) => key === 'village_baseline_2026_11_#FAIL',
    }
  );
  const resF = restoreHistoryEntries(storageF, {
    'village_history_2026_11_#OK1': '{"a":1}',
    'village_baseline_2026_11_#FAIL': '{"quota":true}',
    'village_history_2026_11_#NUM': 12345,
    'village_history_2026_11_#NULL': null,
    'village_history_2026_11_#OBJ': { nested: true },
    'village_history_2026_11_#BIG': 'x'.repeat(MAX_HISTORY_VALUE_LENGTH + 1),
    'village_history_2026_11_#OK2': '{"b":2}',
  });
  assert.deepStrictEqual(resF, { written: 2, skipped: 4, failed: 1 });
  assert.equal(storageF.getItem('village_history_2026_11_#OK1'), '{"a":1}');
  assert.equal(storageF.getItem('village_history_2026_11_#OK2'), '{"b":2}');
  console.log('PASS (f): non-string & oversized skipped; quota error counted as failed without stopping');

  // (g) old v1 backup (no history field) restores cleanly with no errors
  const v1Backup = {
    clashPlannerBackupVersion: 1,
    exportedAt: 1795668000000,
    activeAccountId: 'v1',
    accounts: [{ id: 'v1', name: 'Main', tag: '#AAA111', data: { numBuilders: 6 } }],
  };
  const v1Decoded = await decodeBackup(JSON.stringify(v1Backup, null, 2));
  assert.equal(v1Decoded.ok, true);
  assert.equal(v1Decoded.data.history, undefined);
  const storageG = createMemoryStorage();
  const resG = restoreHistoryEntries(storageG, v1Decoded.data.history);
  assert.deepStrictEqual(resG, { written: 0, skipped: 0, failed: 0 });
  console.log('PASS (g): old v1 backup (no history field) restores with no errors');

  // (h) ordering: history is written strictly BEFORE setAccounts is called
  const callLog = [];
  const storageH = createMemoryStorage(
    {},
    {
      onSetItem: (key) => callLog.push(`storage.setItem:${key}`),
    }
  );
  const mockSetAccounts = (accounts) => {
    callLog.push(`setAccounts:${accounts.length}`);
  };
  const simulateRestoreFlow = (rawObj) => {
    if (rawObj.history !== undefined && rawObj.history !== null) {
      restoreHistoryEntries(storageH, rawObj.history);
    }
    mockSetAccounts(rawObj.accounts);
  };
  simulateRestoreFlow({
    clashPlannerBackupVersion: 2,
    accounts: [{ id: 'v1', tag: '#AAA111' }],
    history: {
      'village_history_2026_11_#AAA111': '{"ok":1}',
      'clash_stats_#AAA111_2026_11_builders': '{"ok":2}',
    },
  });
  const setAccountsIdx = callLog.indexOf('setAccounts:1');
  assert.ok(setAccountsIdx > 0, 'Expected setAccounts to be called after history writes');
  assert.deepStrictEqual(callLog.slice(0, setAccountsIdx), [
    'storage.setItem:village_history_2026_11_#AAA111',
    'storage.setItem:clash_stats_#AAA111_2026_11_builders',
  ]);
  // Also verify App.tsx source keeps restoreHistoryEntries before setAccounts inside restoreAccountsFromBackupObject
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const restoreFnStart = appSrc.indexOf('const restoreAccountsFromBackupObject =');
  const restoreFnSlice = appSrc.slice(restoreFnStart, restoreFnStart + 2500);
  const histIdx = restoreFnSlice.indexOf('restoreHistoryEntries(localStorage, rawObj.history)');
  const setAccIdx = restoreFnSlice.indexOf('setAccounts(restoredAccounts)');
  assert.ok(histIdx > 0 && setAccIdx > 0 && histIdx < setAccIdx, 'App.tsx must call restoreHistoryEntries before setAccounts');
  console.log('PASS (h): history entries are written strictly before setAccounts (mock + App.tsx verified)');

  // (i) 5-month window: 4 months back included, 5 months back excluded, month-less always included
  const storageWindow = createMemoryStorage({
    'village_history_2026_06_#AAA111': '{"old":5}', // 5 months back -> EXCLUDED
    'clash_stats_#AAA111_2026_06_builders': '{"old":5}', // 5 months back -> EXCLUDED
    'clash_recovered_old_#AAA111_2026_06': '1', // 5 months back -> EXCLUDED
    'village_history_2026_07_#AAA111': '{"edge":4}', // 4 months back -> INCLUDED
    'clash_stats_#AAA111_2026_07_lab': '{"edge":4}', // 4 months back -> INCLUDED
    'clash_recovered_edge_#AAA111_2026_07': '1', // 4 months back -> INCLUDED
    'village_history_2026_11_#AAA111': '{"curr":0}', // current month -> INCLUDED
    'lastImportedBoostState_#AAA111': '{"boost":true}', // month-less -> ALWAYS INCLUDED
  });
  const collectedWindow = collectHistoryForTags(storageWindow, ['#AAA111'], fixedNowNov2026);
  assert.deepStrictEqual(Object.keys(collectedWindow).sort(), [
    'clash_recovered_edge_#AAA111_2026_07',
    'clash_stats_#AAA111_2026_07_lab',
    'lastImportedBoostState_#AAA111',
    'village_history_2026_07_#AAA111',
    'village_history_2026_11_#AAA111',
  ]);
  console.log('PASS (i): 4 months back included, 5 months back excluded, month-less always included');

  // (j) Year boundary: now = Jan 2027 keeps 2026_09 .. 2027_01 and drops 2026_08
  const jan2027 = new Date(2027, 0, 15);
  const storageYearBoundary = createMemoryStorage({
    'village_history_2026_08_#AAA111': '{"drop":true}',
    'village_history_2026_09_#AAA111': '{"keep":1}',
    'village_history_2026_10_#AAA111': '{"keep":2}',
    'village_history_2026_11_#AAA111': '{"keep":3}',
    'village_history_2026_12_#AAA111': '{"keep":4}',
    'village_history_2027_01_#AAA111': '{"keep":5}',
    'clash_stats_#AAA111_2026_08_builders': '{"drop":true}',
    'clash_stats_#AAA111_2026_09_builders': '{"keep":1}',
    'clash_stats_#AAA111_2027_01_builders': '{"keep":5}',
    'lastImportedBoostState_#AAA111': '{"keep":"monthless"}',
  });
  const collectedYearBoundary = collectHistoryForTags(storageYearBoundary, ['#AAA111'], jan2027);
  assert.deepStrictEqual(Object.keys(collectedYearBoundary).sort(), [
    'clash_stats_#AAA111_2026_09_builders',
    'clash_stats_#AAA111_2027_01_builders',
    'lastImportedBoostState_#AAA111',
    'village_history_2026_09_#AAA111',
    'village_history_2026_10_#AAA111',
    'village_history_2026_11_#AAA111',
    'village_history_2026_12_#AAA111',
    'village_history_2027_01_#AAA111',
  ]);
  console.log('PASS (j): year boundary (Jan 2027) keeps 2026_09..2027_01 + month-less and drops 2026_08');

  // Benchmark: 4 villages x 5 months of history (~6 keys per village per month + boost state)
  const scenario = buildRealistic4Village5MonthScenario();
  const collectedHistory = collectHistoryForTags(scenario.storage, scenario.tags, fixedNowNov2026);
  const historyKeyCount = Object.keys(collectedHistory).length;
  // 4 villages * (5 months * 6 keys + 1 month-less boost state) = 124 keys (older 2 months pruned)
  assert.equal(historyKeyCount, 124, `Expected 124 keys after 5-month filter, got ${historyKeyCount}`);
  const rawHistoryBytes = Object.values(collectedHistory).reduce((sum, v) => sum + v.length, 0);

  const v1Obj = {
    clashPlannerBackupVersion: 1,
    exportedAt: scenario.baseNow,
    activeAccountId: 'v1',
    accounts: scenario.accounts,
  };
  const v2Obj = {
    clashPlannerBackupVersion: 2,
    exportedAt: scenario.baseNow,
    activeAccountId: 'v1',
    accounts: scenario.accounts,
    history: collectedHistory,
  };

  const v1Pretty = JSON.stringify(v1Obj, null, 2);
  const v1Compact = JSON.stringify(v1Obj);
  const v1Code = await encodeBackup(v1Obj);

  const v2Pretty = JSON.stringify(v2Obj, null, 2);
  const v2Compact = JSON.stringify(v2Obj);
  const v2Code = await encodeBackup(v2Obj);

  // Verify full 4-village x 5-month v2 round trip
  const v2Decoded = await decodeBackup(v2Code);
  assert.equal(v2Decoded.ok, true);
  assert.equal(v2Decoded.format, 'cpb1');
  const freshStorage = createMemoryStorage();
  const v2RestoreRes = restoreHistoryEntries(freshStorage, v2Decoded.data.history);
  assert.deepStrictEqual(v2RestoreRes, { written: historyKeyCount, skipped: 0, failed: 0 });
  for (const [k, v] of Object.entries(collectedHistory)) {
    assert.strictEqual(freshStorage.getItem(k), v);
  }

  console.log('\n--- 4-Village x 5-Month Backup Size Comparison ---');
  console.log(`History entries included: ${historyKeyCount} keys (${rawHistoryBytes} raw value chars)`);
  console.log(`Accounts only (v1)   -> Pretty: ${v1Pretty.length} | Compact: ${v1Compact.length} | CPB1: ${v1Code.length} chars`);
  console.log(`With 5m history (v2) -> Pretty: ${v2Pretty.length} | Compact: ${v2Compact.length} | CPB1: ${v2Code.length} chars`);
  console.log(`History overhead in CPB1: +${v2Code.length - v1Code.length} chars (${((1 - v2Code.length / v2Pretty.length) * 100).toFixed(1)}% smaller than pretty v2 JSON)`);
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
