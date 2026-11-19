import assert from 'node:assert/strict';
import test from 'node:test';
import { convertPrintPixels, PDF_COLOR_MODES } from '../src/editor/printColors.js';
const pixel = (rgb, mode) => [...convertPrintPixels({ width: 1, height: 1, data: new Uint8ClampedArray([...rgb, 255]) }, mode)];

test('RGB channels are preserved and generic CMYK keeps white and pure K black', () => {
  assert.deepEqual(pixel([19, 85, 177], 'RGB'), [19, 85, 177]);
  assert.deepEqual(pixel([255, 255, 255], 'CMYK'), [0, 0, 0, 0]);
  assert.deepEqual(pixel([0, 0, 0], 'CMYK'), [0, 0, 0, 255]);
  assert.deepEqual(pixel([255, 0, 0], 'CMYK'), [0, 255, 255, 0]);
});

test('rich black uses CMY as well as K and remains within 300 percent ink', () => {
  const [c, m, y, k] = pixel([0, 0, 0], 'CMYK_RICH');
  assert.ok(c > 0 && m > 0 && y > 0 && k < 255);
  assert.ok(c + m + y + k <= 765);
});

test('ink limits hold after quantization for dark saturated colors and neutral tones', () => {
  for (const mode of ['CMYK_240', 'CMYK_RICH']) {
    const limit = Math.floor((mode === 'CMYK_240' ? 2.4 : 3) * 255);
    for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
      assert.ok(pixel([r, g, b], mode).reduce((sum, value) => sum + value, 0) <= limit);
    }
    assert.deepEqual(pixel([255, 255, 255], mode), [0, 0, 0, 0]);
  }
  assert.notDeepEqual(pixel([50, 0, 0], 'CMYK_240'), pixel([50, 0, 0], 'CMYK'));
});

test('all offered modes convert and unknown modes fail instead of silently exporting another mode', () => {
  for (const { value } of PDF_COLOR_MODES.filter((mode) => mode.value !== "ICC")) {
    assert.equal(pixel([50, 70, 90], value).length, value === "RGB" ? 3 : 4);
  }
  assert.throws(() => pixel([0, 0, 0], "ICC"), /selected profile/);
  assert.throws(() => pixel([0, 0, 0], 'FOGRA39'), /supported/);
});

test("rich black keeps CMY in black and uses less K than the standard separation", () => {
  const pixel = { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) };
  const standard = convertPrintPixels(pixel, "CMYK");
  const rich = convertPrintPixels(pixel, "CMYK_RICH");
  assert.deepEqual([...standard], [0, 0, 0, 255]);
  assert.ok(rich[0] > 0 && rich[1] > 0 && rich[2] > 0);
  assert.ok(rich[3] < standard[3]);
  assert.ok(rich.reduce((sum, value) => sum + value, 0) <= 3 * 255);
});
