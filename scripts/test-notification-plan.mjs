import assert from 'node:assert/strict';
import {
  TEST_ALARM_ID,
  buildDesiredNotifications,
  executeSyncPassWithAdapter,
  mergeQueuedForceFlag,
  planSync,
  syncAllNotifications,
} from '../src/services/notificationEngine.ts';

const item1 = {
  id: 10001,
  villageId: 'main',
  slotKey: 'builder_0',
  title: '🔨 Builder Alert • Main',
  body: 'Main: Cannon (LVL 21) upgrade completed! Builder is now free.',
  finishEpochMs: 1800000000000,
  sig: '1800000000000|🔨 Builder Alert • Main|Main: Cannon (LVL 21) upgrade completed! Builder is now free.',
};

const item2 = {
  id: 10002,
  villageId: 'main',
  slotKey: 'lab_main',
  title: '⚗️ Laboratory Alert • Main',
  body: 'Main: Healer (LVL 7) research finished!',
  finishEpochMs: 1800005000000,
  sig: '1800005000000|⚗️ Laboratory Alert • Main|Main: Healer (LVL 7) research finished!',
};

// ============================================================================
// EXISTING TESTS (a)-(f)
// ============================================================================

// (a) force=false and an identical pending item -> NOT in toSchedule
{
  const pending = [{ id: item1.id, extra: { sig: item1.sig } }];
  const plan = planSync([item1], pending, { force: false });
  assert.deepStrictEqual(plan.toSchedule, []);
  assert.deepStrictEqual(plan.toCancel, []);
  console.log('PASS (a): force=false skips identical pending item');
}

// (b) force=true and an identical pending item -> IS in toSchedule
{
  const pending = [{ id: item1.id, extra: { sig: item1.sig } }];
  const plan = planSync([item1], pending, { force: true });
  assert.deepStrictEqual(plan.toSchedule, [item1]);
  assert.deepStrictEqual(plan.toCancel, []);
  console.log('PASS (b): force=true includes identical pending item in toSchedule');
}

// (c) orphan pending ids are in toCancel in both modes; TEST_ALARM_ID is never in toCancel
{
  const orphanId = 77777;
  const pending = [
    { id: item1.id, extra: { sig: item1.sig } },
    { id: orphanId, extra: { sig: 'old|sig|here' } },
    { id: TEST_ALARM_ID, extra: { sig: 'test|alarm|sig' } },
  ];

  const planNormal = planSync([item1], pending, { force: false });
  assert.deepStrictEqual(planNormal.toSchedule, []);
  assert.deepStrictEqual(planNormal.toCancel, [orphanId]);
  assert.equal(planNormal.toCancel.includes(TEST_ALARM_ID), false);

  const planForced = planSync([item1], pending, { force: true });
  assert.deepStrictEqual(planForced.toSchedule, [item1]);
  assert.deepStrictEqual(planForced.toCancel, [orphanId]);
  assert.equal(planForced.toCancel.includes(TEST_ALARM_ID), false);
  console.log('PASS (c): orphan IDs cancelled in both modes; TEST_ALARM_ID never cancelled');
}

// (d) pending item with a different sig -> in toSchedule in both modes
{
  const pending = [
    { id: item1.id, extra: { sig: 'different|old|sig' } },
    { id: item2.id, extra: {} }, // missing sig treated as changed
  ];

  const planNormal = planSync([item1, item2], pending, { force: false });
  assert.deepStrictEqual(planNormal.toSchedule, [item1, item2]);
  assert.deepStrictEqual(planNormal.toCancel, []);

  const planForced = planSync([item1, item2], pending, { force: true });
  assert.deepStrictEqual(planForced.toSchedule, [item1, item2]);
  assert.deepStrictEqual(planForced.toCancel, []);
  console.log('PASS (d): changed or missing sig scheduled in both modes');
}

// (e) desired empty array / empty accounts guard unchanged
{
  const planEmpty = planSync([], [], { force: false });
  assert.deepStrictEqual(planEmpty, { toSchedule: [], toCancel: [] });

  const planOnlyTest = planSync([], [{ id: TEST_ALARM_ID, extra: { sig: 't' } }], { force: true });
  assert.deepStrictEqual(planOnlyTest, { toSchedule: [], toCancel: [] });

  assert.deepStrictEqual(buildDesiredNotifications([], Date.now()), []);
  // Empty accounts guard returns cleanly without throwing or cancelling
  const res = syncAllNotifications([], { force: true });
  assert.ok(res instanceof Promise);
  console.log('PASS (e): empty desired / empty accounts guard unchanged');
}

// (f) forced flag merging: a queued normal call after a forced call must not drop the forced run
{
  let queuedForce = false;
  queuedForce = mergeQueuedForceFlag(queuedForce, true);
  assert.equal(queuedForce, true);
  queuedForce = mergeQueuedForceFlag(queuedForce, false);
  assert.equal(queuedForce, true);
  queuedForce = mergeQueuedForceFlag(queuedForce, undefined);
  assert.equal(queuedForce, true);
  assert.equal(mergeQueuedForceFlag(false, false), false);
  assert.equal(mergeQueuedForceFlag(false, undefined), false);
  console.log('PASS (f): queued force flag merges with OR and is never dropped by normal call');
}

// ============================================================================
// PART 7 TESTS (a)-(h): Safe orphan cleanup, failure isolation, verification & A/B/C/D replay
// ============================================================================

function createMockAdapter(hooks = {}) {
  const store = new Map();
  const scheduleCalls = [];
  const cancelCalls = [];

  return {
    store,
    scheduleCalls,
    cancelCalls,
    async getPending() {
      if (hooks.onGetPending) {
        return hooks.onGetPending(store);
      }
      return {
        notifications: Array.from(store.values()).map((n) => ({
          id: n.id,
          title: n.title,
          extra: n.extra,
        })),
      };
    },
    async schedule({ notifications }) {
      scheduleCalls.push(notifications.map((n) => n.id));
      if (hooks.onSchedule) {
        await hooks.onSchedule(notifications, store);
        return;
      }
      for (const n of notifications) {
        store.set(n.id, n);
      }
    },
    async cancel({ notifications }) {
      cancelCalls.push(notifications.map((n) => n.id));
      for (const { id } of notifications) {
        store.delete(id);
      }
    },
  };
}

// PART 7 (a): stale snapshot, non-full pass -> non-active village A pending alarm is NOT cancelled
{
  const pendingA = {
    id: 20001,
    title: '🔨 Builder Alert • Village A',
    extra: { sig: 'oldA', villageId: 'village_A', slotKey: 'builder_0' },
  };
  const desiredB = {
    id: 20002,
    villageId: 'village_B',
    slotKey: 'builder_0',
    title: '🔨 Builder Alert • Village B',
    body: 'Village B: Builder 1 upgrade finished!',
    finishEpochMs: 1800000000000,
    sig: 'sigB',
  };
  const plan = planSync([desiredB], [pendingA], {
    force: false,
    activeVillageId: 'village_B',
    knownVillageIds: ['village_A', 'village_B'],
    fullCleanup: false,
  });
  assert.deepStrictEqual(plan.toSchedule, [desiredB]);
  assert.deepStrictEqual(plan.toCancel, []);
  console.log('PASS PART 7 (a): stale non-active village A pending alarm is NOT cancelled in non-full pass');
}

// PART 7 (b): deleted village alarm IS cancelled in non-full pass
{
  const pendingDeleted = {
    id: 30001,
    title: '🔨 Builder Alert • Deleted Village',
    extra: { sig: 'oldDel', villageId: 'village_DELETED', slotKey: 'builder_0' },
  };
  const plan = planSync([], [pendingDeleted], {
    force: false,
    activeVillageId: 'village_B',
    knownVillageIds: ['village_A', 'village_B'],
    fullCleanup: false,
  });
  assert.deepStrictEqual(plan.toCancel, [30001]);
  console.log('PASS PART 7 (b): deleted village alarm IS cancelled in non-full pass');
}

// PART 7 (c): active village orphan IS cancelled in non-full pass
{
  const pendingActiveOrphan = {
    id: 40001,
    title: '🔨 Builder Alert • Village B',
    extra: { sig: 'oldB', villageId: 'village_B', slotKey: 'builder_1' },
  };
  const plan = planSync([], [pendingActiveOrphan], {
    force: false,
    activeVillageId: 'village_B',
    knownVillageIds: ['village_A', 'village_B'],
    fullCleanup: false,
  });
  assert.deepStrictEqual(plan.toCancel, [40001]);
  console.log('PASS PART 7 (c): active village orphan IS cancelled in non-full pass');
}

// PART 7 (d): legacy pending (no villageId) is NOT cancelled in a non-full pass
{
  const pendingLegacy = {
    id: 50001,
    title: '🔨 Builder Alert • Old Build',
    extra: { sig: 'legacySigOnly' },
  };
  const pendingNoExtra = {
    id: 50002,
    title: '🔨 Builder Alert • Very Old Build',
  };
  const plan = planSync([], [pendingLegacy, pendingNoExtra], {
    force: false,
    activeVillageId: 'village_B',
    knownVillageIds: ['village_A', 'village_B'],
    fullCleanup: false,
  });
  assert.deepStrictEqual(plan.toCancel, []);
  console.log('PASS PART 7 (d): legacy pending (no villageId) is NOT cancelled in non-full pass');
}

// PART 7 (e): fullCleanup cancels every orphan (non-active, deleted, legacy), never TEST_ALARM_ID
{
  const pending = [
    { id: 60001, extra: { sig: 'a', villageId: 'village_A', slotKey: 'builder_0' } },
    { id: 60002, extra: { sig: 'del', villageId: 'village_DELETED', slotKey: 'builder_0' } },
    { id: 60003, extra: { sig: 'legacy' } },
    { id: TEST_ALARM_ID, extra: { sig: 'test', villageId: '__test__', slotKey: 'test_alarm' } },
  ];
  const plan = planSync([], pending, {
    force: true,
    activeVillageId: 'village_B',
    knownVillageIds: ['village_A', 'village_B'],
    fullCleanup: true,
  });
  assert.deepStrictEqual(plan.toCancel, [60001, 60002, 60003]);
  assert.equal(plan.toCancel.includes(TEST_ALARM_ID), false);
  console.log('PASS PART 7 (e): fullCleanup cancels every orphan except TEST_ALARM_ID');
}

// Async tests (f), (g), (h)
(async () => {
  const NOW = 1_800_000_000_000;

  // PART 7 (f): batch rejects when containing one bad item -> good items still scheduled one-by-one, deleted village still cancelled
  {
    const accounts = [
      {
        id: 'village_A',
        name: 'Village A',
        builders: [
          { slotIndex: 0, name: 'Builder 1 Upgrade', finishEpochMs: NOW + 120_000, remainingSeconds: 120, isActive: true },
          { slotIndex: 1, name: 'Builder 2 Upgrade', finishEpochMs: NOW + 180_000, remainingSeconds: 180, isActive: true },
          { slotIndex: 2, name: 'Builder 3 Upgrade', finishEpochMs: NOW + 240_000, remainingSeconds: 240, isActive: true },
        ],
      },
    ];
    const desired = buildDesiredNotifications(accounts, NOW);
    assert.equal(desired.length, 3);
    const badId = desired[1].id;

    const adapter = createMockAdapter({
      onSchedule: async (notifications, store) => {
        if (notifications.some((n) => n.id === badId)) {
          throw new Error(`Simulated native rejection for bad item ${badId}`);
        }
        for (const n of notifications) {
          store.set(n.id, n);
        }
      },
    });
    // Seed a deleted village alarm to verify cancel step is NOT blocked by failed batch
    adapter.store.set(99901, {
      id: 99901,
      title: '🔨 Builder Alert • Gone Village',
      extra: { sig: 'gone', villageId: 'village_GONE', slotKey: 'builder_0' },
    });

    const res = await executeSyncPassWithAdapter(accounts, adapter, {
      force: false,
      activeVillageId: 'village_A',
      fullCleanup: false,
      now: NOW,
    });
    assert.ok(res);
    assert.equal(res.report.scheduled, 2);
    assert.equal(res.report.failed, 1);
    assert.equal(res.report.cancelled, 1);
    assert.deepStrictEqual(res.report.cancelledVillages, ['Gone Village']);
    assert.ok(Array.isArray(res.report.errors) && res.report.errors.length === 1);
    // Both good items are stored; bad item is not; deleted village was cancelled
    assert.equal(adapter.store.has(desired[0].id), true);
    assert.equal(adapter.store.has(desired[1].id), false);
    assert.equal(adapter.store.has(desired[2].id), true);
    assert.equal(adapter.store.has(99901), false);
    // Verify extra carries sig, villageId, slotKey
    const stored0 = adapter.store.get(desired[0].id);
    assert.equal(stored0.extra.villageId, 'village_A');
    assert.equal(stored0.extra.slotKey, 'builder_0');
    assert.equal(stored0.extra.sig, desired[0].sig);
    console.log('PASS PART 7 (f): batch rejection falls back one-by-one, schedules good items, and still cancels deleted village');
  }

  // PART 7 (g): verification detects id missing from getPending() and re-schedules it individually once more
  {
    const accounts = [
      {
        id: 'village_A',
        name: 'Village A',
        builders: [
          { slotIndex: 0, name: 'Builder 1 Upgrade', finishEpochMs: NOW + 120_000, remainingSeconds: 120, isActive: true },
          { slotIndex: 1, name: 'Builder 2 Upgrade', finishEpochMs: NOW + 180_000, remainingSeconds: 180, isActive: true },
        ],
      },
    ];
    const desired = buildDesiredNotifications(accounts, NOW);
    const droppedId = desired[1].id;
    let firstBatchDropped = false;

    const adapter = createMockAdapter({
      onSchedule: async (notifications, store) => {
        for (const n of notifications) {
          // Silently drop droppedId on the initial batch call (simulating OS/storage drop)
          if (!firstBatchDropped && notifications.length > 1 && n.id === droppedId) {
            firstBatchDropped = true;
            continue;
          }
          store.set(n.id, n);
        }
      },
    });

    const res = await executeSyncPassWithAdapter(accounts, adapter, {
      force: false,
      activeVillageId: 'village_A',
      fullCleanup: false,
      now: NOW,
    });
    assert.ok(res);
    assert.equal(res.report.missing, 1);
    assert.equal(res.report.failed, 0);
    assert.equal(res.report.scheduled, 2);
    // Both IDs are now present after verification re-scheduled droppedId individually
    assert.equal(adapter.store.has(desired[0].id), true);
    assert.equal(adapter.store.has(droppedId), true);
    assert.deepStrictEqual(adapter.scheduleCalls[adapter.scheduleCalls.length - 1], [droppedId]);
    console.log('PASS PART 7 (g): post-schedule verification detects missing id and re-schedules it individually');
  }

  // PART 7 (h): replay A/B/C/D switching sequence with stale non-active data -> A's (and B/C's) alarms survive
  {
    const mkTimer = (id, name, finishMs) => ({
      id,
      name,
      builders: [
        { slotIndex: 0, name: 'Builder 1 Upgrade', finishEpochMs: finishMs, remainingSeconds: 120, isActive: true },
      ],
    });
    const mkEmpty = (id, name) => ({ id, name, builders: [] });

    const adapter = createMockAdapter();

    // 1) A active with 2m timer -> sync
    await executeSyncPassWithAdapter(
      [mkTimer('A', 'Village A', NOW + 120_000), mkEmpty('B', 'Village B'), mkEmpty('C', 'Village C'), mkEmpty('D', 'Village D')],
      adapter,
      { activeVillageId: 'A', fullCleanup: false, now: NOW }
    );
    const idA = Array.from(adapter.store.keys())[0];
    assert.ok(idA);

    // 2) Switch to B with STALE A (missing timer), B gets 2m timer -> sync
    await executeSyncPassWithAdapter(
      [mkEmpty('A', 'Village A'), mkTimer('B', 'Village B', NOW + 130_000), mkEmpty('C', 'Village C'), mkEmpty('D', 'Village D')],
      adapter,
      { activeVillageId: 'B', fullCleanup: false, now: NOW + 1000 }
    );
    assert.equal(adapter.store.has(idA), true, 'A alarm must survive switch to B with stale A');

    // 3) Switch to C with STALE A & B, C gets 2m timer -> sync
    await executeSyncPassWithAdapter(
      [mkEmpty('A', 'Village A'), mkEmpty('B', 'Village B'), mkTimer('C', 'Village C', NOW + 140_000), mkEmpty('D', 'Village D')],
      adapter,
      { activeVillageId: 'C', fullCleanup: false, now: NOW + 2000 }
    );
    assert.equal(adapter.store.has(idA), true, 'A alarm must survive switch to C with stale A');
    assert.equal(adapter.store.size, 3);

    // 4) Switch to D (untouched) with STALE A, B, C -> sync (both normal and force=true resume)
    await executeSyncPassWithAdapter(
      [mkEmpty('A', 'Village A'), mkEmpty('B', 'Village B'), mkEmpty('C', 'Village C'), mkEmpty('D', 'Village D')],
      adapter,
      { activeVillageId: 'D', fullCleanup: false, now: NOW + 3000 }
    );
    await executeSyncPassWithAdapter(
      [mkEmpty('A', 'Village A'), mkEmpty('B', 'Village B'), mkEmpty('C', 'Village C'), mkEmpty('D', 'Village D')],
      adapter,
      { force: true, activeVillageId: 'D', fullCleanup: false, now: NOW + 4000 }
    );
    assert.equal(adapter.store.has(idA), true, 'A alarm must survive on D even with stale data');
    assert.equal(adapter.store.size, 3, 'All 3 non-active village alarms (A, B, C) survive');
    console.log('PASS PART 7 (h): A/B/C/D switching sequence with stale data preserves A, B, and C alarms');
  }
})();
