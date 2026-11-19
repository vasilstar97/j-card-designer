export const MAX_ICC_BYTES = 16 * 1024 * 1024;
export const ICC_INTENTS = [
  { value: "relative", label: "Relative colorimetric", code: 1 },
  { value: "perceptual", label: "Perceptual", code: 0 }
];

export function validateIccProfile(value) {
  const bytes = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;
  if (!bytes || bytes.length < 132) throw new Error("This is not a valid ICC profile.");
  if (bytes.length > MAX_ICC_BYTES) throw new Error("ICC profiles must be 16 MB or smaller.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = (offset) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (view.getUint32(0) !== bytes.length || signature(36) !== "acsp") {
    throw new Error("The ICC profile is damaged or incomplete.");
  }
  if (![2, 4].includes(bytes[8])) throw new Error("Choose an ICC v2 or v4 profile.");
  if (signature(12) !== "prtr" || signature(16) !== "CMYK") {
    throw new Error("Choose a CMYK output (printer) profile, not an RGB, display or DeviceLink profile.");
  }
  if (!["XYZ ", "Lab "].includes(signature(20))) throw new Error("Unsupported ICC connection space.");
  const count = view.getUint32(128);
  const tableEnd = 132 + count * 12;
  if (tableEnd > bytes.length) throw new Error("The ICC tag table is incomplete.");
  const tags = new Set();
  for (let i = 0; i < count; i++) {
    const entry = 132 + i * 12;
    const offset = view.getUint32(entry + 4);
    const size = view.getUint32(entry + 8);
    if (offset < tableEnd || size < 8 || offset + size > bytes.length) {
      throw new Error("The ICC profile contains an invalid tag.");
    }
    tags.add(signature(entry));
  }
  if (!["B2A0", "B2A1", "B2A2"].some((tag) => tags.has(tag))) {
    throw new Error("This profile cannot convert RGB artwork to CMYK: it has no output conversion table.");
  }
  return bytes;
}
