import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTrackEntries } from '../src/editor/trackOrder.js';
const song = (title, highlighted = false) => ({ title, highlighted });
test('moving the side divider changes the assignment while preserving song order and accents', () => {
  const first = song('A', true), second = song('B'), third = song('C', true);
  assert.deepEqual(splitTrackEntries([first, { divider: true }, second, third]), { a: [first], b: [second, third] });
  assert.deepEqual(splitTrackEntries([first, second, { divider: true }, third]), { a: [first, second], b: [third] });
});
test('divider supports empty sides and blank editable rows', () => {
  const blank = song('');
  assert.deepEqual(splitTrackEntries([{ divider: true }, blank]), { a: [], b: [blank] });
  assert.deepEqual(splitTrackEntries([blank, { divider: true }]), { a: [blank], b: [] });
  assert.deepEqual(splitTrackEntries([{ divider: true }]), { a: [], b: [] });
});
