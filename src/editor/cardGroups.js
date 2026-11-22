export function normalizeGroups(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).filter((group) => {
    if (!group || typeof group.id !== 'string' || typeof group.name !== 'string' || !group.name.trim() || seen.has(group.id)) return false;
    seen.add(group.id);
    return true;
  }).map((group) => ({ id: group.id, name: group.name.trim(), collapsed: group.collapsed === true }));
}

export function moveCard(cards, cardId, groupId = null, beforeId = null) {
  const card = cards.find((item) => item.id === cardId);
  if (!card || cardId === beforeId) return cards;
  const remaining = cards.filter((item) => item.id !== cardId);
  const target = remaining.findIndex((item) => item.id === beforeId && (item.groupId || null) === groupId);
  const groupEnd = remaining.reduce((last, item, index) => (item.groupId || null) === groupId ? index + 1 : last, 0);
  remaining.splice(target < 0 ? groupEnd : target, 0, { ...card, groupId });
  return remaining;
}

export function storageOrder(cards, groups) {
  return [null, ...groups.map((group) => group.id)].flatMap((id) => cards.filter((card) => (card.groupId || null) === id));
}

export function moveGroup(groups, groupId, beforeId = null) {
  const group = groups.find((item) => item.id === groupId);
  if (!group || groupId === beforeId) return groups;
  const remaining = groups.filter((item) => item.id !== groupId);
  const target = remaining.findIndex((item) => item.id === beforeId);
  remaining.splice(target < 0 ? remaining.length : target, 0, group);
  return remaining;
}
