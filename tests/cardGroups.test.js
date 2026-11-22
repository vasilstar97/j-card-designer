import test from 'node:test';
import assert from 'node:assert/strict';
import { moveCard, moveGroup, normalizeGroups, storageOrder } from '../src/editor/cardGroups.js';
const cards = () => [
  { id: 'a', groupId: null, data: { album: 'A' }, includeInPdf: true },
  { id: 'b', groupId: 'g' }, { id: 'c', groupId: 'g' }, { id: 'd', groupId: null }
];
test('moving into and out of a group preserves cassette content and PDF choice', () => {
  const source = cards();
  const grouped = moveCard(source, 'a', 'g', 'c');
  assert.deepEqual(grouped.map(c => c.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(grouped.find(c => c.id === 'a'), { ...source[0], groupId: 'g' });
  const ungrouped = moveCard(grouped, 'a', null);
  assert.equal(ungrouped.find(c => c.id === 'a').groupId, null);
  assert.equal(source[0].groupId, null);
});
test('reordering can move both directions and append to an empty group', () => {
  let result = moveCard(cards(), 'c', 'g', 'b');
  assert.deepEqual(result.filter(c => c.groupId === 'g').map(c => c.id), ['c', 'b']);
  result = moveCard(result, 'c', 'g');
  assert.deepEqual(result.filter(c => c.groupId === 'g').map(c => c.id), ['b', 'c']);
  result = moveCard(result, 'a', 'empty');
  assert.equal(result.filter(c => c.groupId === 'empty').length, 1);
  assert.equal(new Set(result.map(c => c.id)).size, 4);
});
test('display and PDF use the same section order, including collapsed groups', () => {
  assert.deepEqual(storageOrder(cards(), [{ id: 'g', collapsed: true }]).map(c => c.id), ['a', 'd', 'b', 'c']);
});
test('group metadata rejects duplicates and invalid names and normalizes collapsed state', () => {
  assert.deepEqual(normalizeGroups([{ id: 'g', name: ' Group ', collapsed: true }, { id: 'g', name: 'duplicate' }, { id: 'bad', name: '' }]), [{ id: 'g', name: 'Group', collapsed: true }]);
  assert.deepEqual(normalizeGroups(undefined), []);
});

test('moving groups preserves their collapsed state and changes the PDF section order', () => {
  const groups = [{ id: 'g', name: 'First', collapsed: true }, { id: 'h', name: 'Second', collapsed: false }];
  const source = [...cards(), { id: 'e', groupId: 'h' }];
  const moved = moveGroup(groups, 'h', 'g');
  assert.deepEqual(moved.map(group => group.id), ['h', 'g']);
  assert.equal(moved[1].collapsed, true);
  assert.deepEqual(storageOrder(source, moved).map(card => card.id), ['a', 'd', 'e', 'b', 'c']);
  assert.deepEqual(moveGroup(moved, 'h').map(group => group.id), ['g', 'h']);
  assert.deepEqual(groups.map(group => group.id), ['g', 'h']);
  assert.equal(moveGroup(groups, 'missing'), groups);
  assert.equal(moveGroup(groups, 'g', 'g'), groups);
});
