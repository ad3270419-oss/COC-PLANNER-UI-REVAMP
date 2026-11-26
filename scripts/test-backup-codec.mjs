import assert from 'node:assert/strict';
import { PREFIX, decodeBackup, encodeBackup } from '../src/services/backupCodec.ts';

function buildVillage(idx, baseNow) {
  const names = ['Main TH17', 'Mini TH16', 'Donation TH15', 'Rush TH14'];
  const tags = ['#2PP0R9UQ8', '#9LJ8Q2VGC', '#Q0Y82V9PR', '#L8G9U2C0V'];
  const thLevels = [17, 16, 15, 14];
  const day = 86_400_000;
  const hour = 3_600_000;

  const upgrades = [
    { rawId: '1000084', title: 'Monolith', level: 4, d: '12', h: '8', m: '45', s: 12, isGoblin: false },
    { rawId: '1000027', title: 'Inferno Tower', level: 11, d: '9', h: '14', m: '20', s: 5, isGoblin: false },
    { rawId: '1000072', title: 'Spell Tower', level: 3, d: '6', h: '3', m: '15', s: 40, isGoblin: false },
    { rawId: '1000021', title: 'X-Bow', level: 12, d: '4', h: '19', m: '50', s: 33, isGoblin: false },
    { rawId: '28000000', title: 'Barbarian King', level: 98, d: '5', h: '11', m: '10', s: 0, isGoblin: false },
    { rawId: '28000001', title: 'Archer Queen', level: 99, d: '7', h: '2', m: '30', s: 18, isGoblin: false },
  ];

  // 7 builder slots: 6 active + 1 empty (slot 7 idle)
  const builders = [
    ...upgrades.map((u) => ({
      d: u.d,
      h: u.h,
      m: u.m,
      s: u.s,
      upgradeTitle: u.title,
      upgradeLevel: u.level,
      rawId: u.rawId,
    })),
    { d: '', h: '', m: '' },
  ];

  const lockedResults = upgrades.map((u, slotIdx) => {
    const targetTimestamp =
      baseNow +
      Number(u.d) * day +
      Number(u.h) * hour +
      Number(u.m) * 60_000 +
      u.s * 1000 +
      idx * 120_000;
    return {
      builderIndex: slotIdx,
      slotBadge: `B${slotIdx + 1}`,
      upgradeTitle: u.title,
      upgradeLevel: u.level,
      rawId: u.rawId,
      isGoblin: u.isGoblin,
      targetTimestamp,
      formattedDate: 'Thu, Nov 28 · 4:15 PM',
    };
  });

  return {
    id: `village_${idx + 1}`,
    name: names[idx],
    tag: tags[idx],
    data: {
      mode: 'builders',
      numBuilders: 6,
      builders,
      potions: String(idx),
      lockedResults,
      lockedSavedText: idx > 0 ? `${idx * 9}h saved` : '',
      researchPotions: 2,
      labTimer: {
        d: '8',
        h: '12',
        m: '30',
        s: 45,
        upgradeTitle: 'Root Rider',
        upgradeLevel: 3,
        rawId: '4000110',
      },
      goblinLabTimer:
        idx % 2 === 0
          ? {
              d: '3',
              h: '6',
              m: '15',
              s: 0,
              upgradeTitle: 'Overgrowth Spell',
              upgradeLevel: 4,
              rawId: '26000070',
            }
          : { d: '', h: '', m: '' },
      targetLabTimestamp: baseNow + 8 * day + 12 * hour + 30 * 60_000,
      labFormattedDate: 'Wed, Dec 4 · 9:20 AM',
      labSavedText: '1d 22h saved',
      targetGoblinLabTimestamp: idx % 2 === 0 ? baseNow + 3 * day + 6 * hour + 15 * 60_000 : null,
      goblinLabFormattedDate: idx % 2 === 0 ? 'Sat, Nov 29 · 3:05 AM' : '',
      petPotions: 1,
      petTimer: {
        d: '6',
        h: '4',
        m: '20',
        s: 10,
        upgradeTitle: 'Spirit Fox',
        upgradeLevel: 10,
        rawId: '73000011',
      },
      targetPetTimestamp: baseNow + 6 * day + 4 * hour + 20 * 60_000,
      petFormattedDate: 'Tue, Dec 2 · 1:10 AM',
      petSavedText: '23h saved',
      builderBoostEndTime: idx === 0 ? baseNow + 45 * 60_000 : null,
      labBoostEndTime: idx === 1 ? baseNow + 30 * 60_000 : null,
      petBoostEndTime: null,
      builderBiteEndTime: null,
      studySoupEndTime: null,
      builderApprentice: {
        id: 93000000,
        level: 8,
        assignedSlot: 0,
        activeSessionEndTime: baseNow + 25 * 60_000,
        cooldownEndTime: baseNow + 23 * hour,
        recurrent: true,
      },
      labApprentice: {
        id: 93000001,
        level: 10,
        assignedSlot: 'main',
        activeSessionEndTime: null,
        cooldownEndTime: baseNow + 14 * hour,
        recurrent: false,
      },
      thLevel: thLevels[idx],
      lastSynced: '8:45 PM',
    },
  };
}

function buildFourVillageBackup() {
  const baseNow = 1795668000000;
  return {
    clashPlannerBackupVersion: 1,
    exportedAt: baseNow,
    activeAccountId: 'village_1',
    accounts: [0, 1, 2, 3].map((i) => buildVillage(i, baseNow)),
  };
}

function wrapEvery(str, width) {
  const lines = [];
  for (let i = 0; i < str.length; i += width) {
    lines.push(str.slice(i, i + width));
  }
  return lines.join('\n');
}

async function run() {
  const sample = buildFourVillageBackup();
  const prettyJson = JSON.stringify(sample, null, 2);
  const compactJson = JSON.stringify(sample);
  const encoded = await encodeBackup(sample);

  assert.ok(encoded.startsWith(PREFIX), `Expected encoded code to start with ${PREFIX}`);

  // (a) encode -> decode round trip deep-equals original
  const resA = await decodeBackup(encoded);
  assert.equal(resA.ok, true, 'Case (a) should succeed');
  assert.equal(resA.format, 'cpb1');
  assert.deepStrictEqual(resA.data, sample);
  console.log('PASS (a): encode -> decode round trip deep-equals original');

  // (b) old pretty JSON decodes
  const resB = await decodeBackup(prettyJson);
  assert.equal(resB.ok, true, 'Case (b) should succeed');
  assert.equal(resB.format, 'json');
  assert.deepStrictEqual(resB.data, sample);
  console.log('PASS (b): old pretty JSON decodes');

  // (c) compact JSON decodes
  const resC = await decodeBackup(compactJson);
  assert.equal(resC.ok, true, 'Case (c) should succeed');
  assert.equal(resC.format, 'json');
  assert.deepStrictEqual(resC.data, sample);
  console.log('PASS (c): compact JSON decodes');

  // (d) code with a line break every 60 characters decodes
  const wrapped60 = wrapEvery(encoded, 60);
  const resD = await decodeBackup(wrapped60);
  assert.equal(resD.ok, true, 'Case (d) should succeed');
  assert.equal(resD.format, 'cpb1');
  assert.deepStrictEqual(resD.data, sample);
  console.log('PASS (d): line-wrapped (every 60 chars) CPB1 code decodes');

  // (e) code with text before and after (like a chat message) decodes
  const chatMsg1 = `Hey! Here is my Clash Planner backup:\n${encoded}\nSave this for later thanks!`;
  const resE1 = await decodeBackup(chatMsg1);
  assert.equal(resE1.ok, true, 'Case (e1) multiline chat message should succeed');
  assert.equal(resE1.format, 'cpb1');
  assert.deepStrictEqual(resE1.data, sample);

  const chatMsg2 = `Backup code: ${wrapEvery(encoded, 60)} hope it works`;
  const resE2 = await decodeBackup(chatMsg2);
  assert.equal(resE2.ok, true, 'Case (e2) wrapped code inside chat message should succeed');
  assert.equal(resE2.format, 'cpb1');
  assert.deepStrictEqual(resE2.data, sample);
  console.log('PASS (e): CPB1 code with text before and after decodes');

  // (f) code with last 10 characters removed -> reason 'cut_off'
  const truncated = encoded.slice(0, -10);
  const resF = await decodeBackup(truncated);
  assert.equal(resF.ok, false, 'Case (f) should fail');
  assert.equal(resF.reason, 'cut_off', `Expected 'cut_off', got '${resF.reason}'`);
  console.log(`PASS (f): truncated CPB1 -> reason='${resF.reason}' ("${resF.message}")`);

  // (g) code with one character changed in the middle -> 'cut_off' or 'corrupt', never a wrong object
  const midIdx = Math.floor(encoded.length / 2);
  const origChar = encoded[midIdx];
  const replacementChar = origChar === 'A' ? 'B' : 'A';
  const mutated = encoded.slice(0, midIdx) + replacementChar + encoded.slice(midIdx + 1);
  const resG = await decodeBackup(mutated);
  assert.equal(resG.ok, false, 'Case (g) mutated CPB1 must fail');
  assert.ok(
    resG.reason === 'cut_off' || resG.reason === 'corrupt',
    `Expected 'cut_off' or 'corrupt', got '${resG.reason}'`
  );
  console.log(`PASS (g): mutated CPB1 -> reason='${resG.reason}' ("${resG.message}")`);

  // (h) empty string -> 'empty'
  const resH1 = await decodeBackup('');
  assert.equal(resH1.ok, false);
  assert.equal(resH1.reason, 'empty');
  assert.equal(resH1.message, 'Nothing pasted yet');

  const resH2 = await decodeBackup('\uFEFF \u200B \n\t ');
  assert.equal(resH2.ok, false);
  assert.equal(resH2.reason, 'empty');
  console.log('PASS (h): empty / BOM / zero-width string -> reason="empty"');

  // (i) CompressionStream removed from globalThis -> encodeBackup returns plain minified JSON and decodeBackup reads it
  const originalCompressionStream = globalThis.CompressionStream;
  try {
    delete globalThis.CompressionStream;
    const fallbackEncoded = await encodeBackup(sample);
    assert.equal(fallbackEncoded, compactJson, 'Fallback output should equal minified JSON');
    assert.ok(!fallbackEncoded.startsWith(PREFIX), 'Fallback output should not have CPB1 prefix');
    const resI = await decodeBackup(fallbackEncoded);
    assert.equal(resI.ok, true, 'Case (i) decodeBackup should read fallback minified JSON');
    assert.equal(resI.format, 'json');
    assert.deepStrictEqual(resI.data, sample);
    console.log('PASS (i): without CompressionStream, encodeBackup falls back to minified JSON and decodeBackup reads it');
  } finally {
    globalThis.CompressionStream = originalCompressionStream;
  }

  console.log('\n--- 4-Village Backup Size Comparison ---');
  console.log(`Pretty JSON : ${prettyJson.length} chars`);
  console.log(`Compact JSON: ${compactJson.length} chars`);
  console.log(`CPB1 Code   : ${encoded.length} chars (${((1 - encoded.length / prettyJson.length) * 100).toFixed(1)}% smaller than pretty JSON, ${((1 - encoded.length / compactJson.length) * 100).toFixed(1)}% smaller than compact JSON)`);
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
