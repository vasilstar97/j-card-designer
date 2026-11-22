// The divider belongs to neither side; empty editable rows remain in their side.
export function splitTrackEntries(entries) {
  const sides = { a: [], b: [] };
  let side = "a";
  for (const entry of entries) {
    if (entry.divider) side = "b";
    else sides[side].push({ title: entry.title, highlighted: entry.highlighted });
  }
  return sides;
}
