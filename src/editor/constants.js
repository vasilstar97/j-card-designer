export const PANEL = {
  back: 26.9876,
  side: 12.7,
  front: 65.0875,
  inner: 63.5,
  height: 101.6
};

export const PADDING_MM = 3;
export const BLEED_MM = 3;
export const MARK_EXTENSION_MM = 3;

export const paletteDefaults = ["#333333", "#666666", "#999999", "#FFFFFF", "#F55E36"];
export const colorDefaults = { background: "#000000", accent: "#F55E36", text: "#FFFFFF" };

export function localMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
