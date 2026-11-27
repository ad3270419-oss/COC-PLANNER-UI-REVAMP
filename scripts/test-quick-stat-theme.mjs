import assert from 'node:assert/strict';
import {
  QUICK_STAT_COLORS,
  getQuickStatCssVars,
  getQuickStatTone,
} from '../src/services/quickStatTheme.ts';

// 1. Builders always returns 'active' (never pulses, never idle)
for (const value of [3601, 3600, 3599, 1, 0, -10, null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(
    getQuickStatTone('builders', value),
    'active',
    `builders should always be 'active' for ${String(value)}`
  );
}
console.log('PASS: builders always returns "active"');

// 2. Timer cards (free, lab, pet) threshold and edge-case tests
const timerKinds = ['free', 'lab', 'pet'];
for (const kind of timerKinds) {
  assert.equal(getQuickStatTone(kind, 3601), 'active', `${kind} 3601 -> active`);
  assert.equal(getQuickStatTone(kind, 3600), 'active', `${kind} 3600 -> active`);
  assert.equal(getQuickStatTone(kind, 3599), 'soon', `${kind} 3599 -> soon`);
  assert.equal(getQuickStatTone(kind, 1), 'soon', `${kind} 1 -> soon`);
  assert.equal(getQuickStatTone(kind, 0), 'idle', `${kind} 0 -> idle`);
  assert.equal(getQuickStatTone(kind, -1), 'idle', `${kind} -1 -> idle`);
  assert.equal(getQuickStatTone(kind, -3600), 'idle', `${kind} -3600 -> idle`);
  assert.equal(getQuickStatTone(kind, null), 'idle', `${kind} null -> idle`);
  assert.equal(getQuickStatTone(kind, undefined), 'idle', `${kind} undefined -> idle`);
  assert.equal(getQuickStatTone(kind, Number.NaN), 'idle', `${kind} NaN -> idle`);
  assert.equal(getQuickStatTone(kind, Number.POSITIVE_INFINITY), 'idle', `${kind} Infinity -> idle`);
}
console.log('PASS: free/lab/pet tone thresholds (3601/3600 active, 3599/1 soon, <=0/null/undefined/NaN idle)');

// 3. Exact locked hex values in QUICK_STAT_COLORS
assert.equal(QUICK_STAT_COLORS.builders.outline, '#E5BA54');
assert.equal(QUICK_STAT_COLORS.builders.text, '#F2CF7C');
assert.equal(QUICK_STAT_COLORS.free.outline, '#E5BA54');
assert.equal(QUICK_STAT_COLORS.free.text, '#F2CF7C');
assert.equal(QUICK_STAT_COLORS.lab.outline, '#F472B6');
assert.equal(QUICK_STAT_COLORS.lab.text, '#F9A8D4');
assert.equal(QUICK_STAT_COLORS.pet.outline, '#8B5CF6');
assert.equal(QUICK_STAT_COLORS.pet.text, '#B79BFF');
console.log('PASS: QUICK_STAT_COLORS contains all exact locked outline & text hex values');

// 4. CSS custom properties map cleanly
assert.equal(getQuickStatCssVars('builders')['--neon'], '#E5BA54');
assert.equal(getQuickStatCssVars('free')['--neon-text'], '#F2CF7C');
assert.equal(getQuickStatCssVars('lab')['--neon'], '#F472B6');
assert.equal(getQuickStatCssVars('lab')['--neon-rgb'], '244, 114, 182');
assert.equal(getQuickStatCssVars('pet')['--neon'], '#8B5CF6');
assert.equal(getQuickStatCssVars('pet')['--neon-rgb'], '139, 92, 246');
console.log('PASS: CSS variable helpers produce valid hex and RGB triplets');
