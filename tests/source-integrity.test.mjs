// Read-only regression checks for the research prototype's source-level invariants.
// These checks do not replace browser end-to-end testing or human-subject validation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const scenarios = read('src/data/scenarios.ts');
const app = read('src/App.tsx');
const measures = read('src/research/measures.ts');
const ids = [...scenarios.matchAll(/^\s*id:\s*"(L[1-3]|M[1-3]|H[1-3])",/gm)].map(m => m[1]);
test('nine unique authored scenarios, three per load', () => {
  assert.deepEqual([...ids].sort(), ['H1','H2','H3','L1','L2','L3','M1','M2','M3']);
});
test('each scenario defines answer key and awareness probe', () => {
  assert.equal((scenarios.match(/\bcorrect:\s*"/g) || []).length, 9);
  assert.equal((scenarios.match(/\bsagatCorrect:\s*"/g) || []).length, 9);
  assert.equal((scenarios.match(/\btrendData:\s*trend\(/g) || []).length, 9);
});
test('scenario provenance explicitly excludes field data and physical validation', () => {
  assert.match(scenarios, /measuredFieldData:\s*false/);
  assert.match(scenarios, /validatedPhysicalModel:\s*false/);
});
test('measurement formulas and safeguards remain present', () => {
  assert.match(measures, /11-Number\(v\.Performance\)/);
  assert.match(measures, /rows\.length\?/);
  assert.match(app, /answeredAt - questionStartTime/);
});
test('both spreadsheet worksheets and CSV quoting remain present', () => {
  assert.match(app, /"Raw Data"/);
  assert.match(app, /"Summary Stats"/);
  assert.match(app, /replace\(\/"\/g, '""'\)/);
});
