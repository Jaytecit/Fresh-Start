/**
 * Smoke: elite weight transplant when actuator count grows/shrinks.
 * Run: npx tsx scripts/smoke-brain-transplant.mts
 */
import assert from 'node:assert/strict';
import { makeShape } from '../src/brain/network.ts';
import {
  canTransplantShapes,
  transplantWeights,
} from '../src/brain/transplantWeights.ts';

const from = makeShape(2);
const to = makeShape(4);
assert.equal(canTransplantShapes(from, to), true);
assert.equal(canTransplantShapes(from, makeShape(2, from.inputCount + 1)), true);
assert.equal(
  canTransplantShapes(makeShape(2, from.inputCount + 1), from),
  false,
);

const src = new Float32Array(from.weightCount);
for (let i = 0; i < src.length; i++) src[i] = i + 1;

const out = transplantWeights(from, src, to);
assert.ok(out);
assert.equal(out.length, to.weightCount);

const sharedH = Math.min(from.hiddenCount, to.hiddenCount);
for (let h = 0; h < sharedH; h++) {
  for (let i = 0; i < from.inputCount; i++) {
    assert.equal(
      out[h * to.inputCount + i],
      src[h * from.inputCount + i],
      `W1 mismatch at h=${h} i=${i}`,
    );
  }
}

const shrunk = transplantWeights(to, out, from);
assert.ok(shrunk);
assert.equal(shrunk.length, from.weightCount);

console.log('smoke-brain-transplant: ok');
