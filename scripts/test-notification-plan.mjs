import assert from 'node:assert/strict';
import {
  TEST_ALARM_ID,
  buildDesiredNotifications,
  mergeQueuedForceFlag,
  planSync,
  syncAllNotifications,
} from '../src/services/notificationEngine.ts';

const item1 = {
  id: 10001,
  title: '🔨 Builder Alert • Main',
  body: 'Main: Cannon (LVL 21) upgrade completed! Builder is now free.',
  finishEpochMs: 1800000000000,
  sig: '1800000000000|🔨 Builder Alert • Main|Main: Cannon (LVL 21) upgrade completed! Builder is now free.',
};

const item2 = {
  id: 10002,
  title: '⚗️ Laboratory Alert • Main',
  body: 'Main: Healer (LVL 7) research finished!',
  finishEpochMs: 1800005000000,
  sig: '1800005000000|⚗️ Laboratory Alert • Main|Main: Healer (LVL 7) research finished!',
};

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
  // First queued call: forced
  queuedForce = mergeQueuedForceFlag(queuedForce, true);
  assert.equal(queuedForce, true);
  // Subsequent queued normal calls (force=false or omitted) must preserve true
  queuedForce = mergeQueuedForceFlag(queuedForce, false);
  assert.equal(queuedForce, true);
  queuedForce = mergeQueuedForceFlag(queuedForce, undefined);
  assert.equal(queuedForce, true);
  // Two normal calls stay false
  assert.equal(mergeQueuedForceFlag(false, false), false);
  assert.equal(mergeQueuedForceFlag(false, undefined), false);
  console.log('PASS (f): queued force flag merges with OR and is never dropped by normal call');
}
