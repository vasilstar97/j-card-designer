import assert from "node:assert/strict";
import test from "node:test";
import { validateIccProfile, MAX_ICC_BYTES } from "../src/editor/iccProfiles.js";

// Structural fixture only: real LUT conversion is checked with downloaded profiles in the browser.
function header() {
  const bytes = new Uint8Array(152);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => bytes.set(new TextEncoder().encode(value), offset);
  view.setUint32(0, bytes.length);
  bytes[8] = 4;
  text(12, "prtr"); text(16, "CMYK"); text(20, "Lab "); text(36, "acsp");
  view.setUint32(128, 1);
  text(132, "B2A0"); view.setUint32(136, 144); view.setUint32(140, 8);
  return bytes;
}

test("CMYK output headers can be read from ArrayBuffer or a byte view", () => {
  const bytes = header();
  assert.deepEqual(validateIccProfile(bytes.buffer), bytes);
  const wrapper = new Uint8Array(bytes.length + 32);
  wrapper.set(bytes, 16);
  assert.deepEqual(validateIccProfile(wrapper.subarray(16, 16 + bytes.length)), bytes);
});

test("invalid signatures, versions, RGB, display and DeviceLink profiles are rejected", () => {
  for (const [offset, value] of [[36, "xxxx"], [12, "mntr"], [12, "link"], [16, "RGB "], [20, "CMYK"]]) {
    const bytes = header(); bytes.set(new TextEncoder().encode(value), offset);
    assert.throws(() => validateIccProfile(bytes));
  }
  const bytes = header(); bytes[8] = 5;
  assert.throws(() => validateIccProfile(bytes), /v2 or v4/);
});

test("truncated, oversized and out-of-bounds tags are rejected before reaching WASM", () => {
  assert.throws(() => validateIccProfile(new ArrayBuffer(10)), /valid ICC/);
  assert.throws(() => validateIccProfile(new ArrayBuffer(MAX_ICC_BYTES + 1)), /16 MB/);
  assert.throws(() => validateIccProfile(header().subarray(0, 150)), /incomplete/);
  for (const [offset, value] of [[128, 999], [136, 148], [136, 0], [140, 999], [140, 0]]) {
    const bytes = header(); new DataView(bytes.buffer).setUint32(offset, value);
    assert.throws(() => validateIccProfile(bytes));
  }
});

test("CMYK profiles that only describe input colors cannot be used as print destinations", () => {
  const bytes = header(); bytes.set(new TextEncoder().encode("A2B0"), 132);
  assert.throws(() => validateIccProfile(bytes), /no output conversion table/);
});
