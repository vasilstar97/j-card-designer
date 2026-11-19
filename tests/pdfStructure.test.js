import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync, inflateSync } from "node:zlib";
import { makePdf } from "../src/editor/pdfExport.js";

const page = { imageBytes: deflateSync(new Uint8Array([0, 0, 0, 0])), pixelWidth: 1, pixelHeight: 1 };

test("ICC PDF shares one embedded profile across pages and references it as the output intent", async () => {
  const profile = new Uint8Array([0, 255, 123, 12, 29]);
  const blob = makePdf([page, page], 595.2756, 841.8898, "DeviceCMYK", {
    compressed: deflateSync(profile), name: "Profile (print) / тест", intent: "relative"
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  assert.equal((text.match(/\/ICCBased 9 0 R/g) || []).length, 2);
  assert.match(text, /\/OutputIntents \[10 0 R\]/);
  assert.match(text, /\/DestOutputProfile 9 0 R/);
  assert.match(text, /\/OutputConditionIdentifier <FEFF[0-9a-f]+>/);
  assert.match(text, /\/Intent \/RelativeColorimetric/);
  const stream = /9 0 obj\n<< \/N 4 .*?\/Length (\d+) >>\nstream\n/.exec(text);
  const first = stream.index + stream[0].length;
  assert.deepEqual(new Uint8Array(inflateSync(bytes.subarray(first, first + Number(stream[1])))), profile);
  const offsets = [...text.matchAll(/^(\d{10}) 00000 n /gm)].map((match) => Number(match[1]));
  offsets.forEach((offset, index) => assert.ok(text.slice(offset).startsWith(`${index + 1} 0 obj\n`)));
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xref, xref + 4), "xref");
});

test("unprofiled RGB and CMYK exports do not claim to have an ICC profile", async () => {
  for (const space of ["DeviceRGB", "DeviceCMYK"]) {
    const text = await makePdf([page], 1190.5512, 841.8898, space).text();
    assert.match(text, new RegExp(`/ColorSpace /${space}`));
    assert.ok(!text.includes("OutputIntents") && !text.includes("ICCBased"));
    assert.match(text, /MediaBox \[0 0 1190.5512 841.8898\]/);
  }
});
