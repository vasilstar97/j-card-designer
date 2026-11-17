import assert from "node:assert/strict";
import test from "node:test";
import { cardFileName, parseCardFile, readCardFile, serializeCard } from "../src/editor/cardTransfer.js";

function fixture() {
  return {
    id: "local-only-id",
    includeInPdf: false,
    data: {
      artist: "Исполнитель", album: "Альбом", info: "LP\n2026", quote: "<quote> & текст",
      font: "Open Sans", date: "2026-11", cover: "", coverFeather: 2.5,
      sideATitle: "SIDE A", sideBTitle: "SIDE B",
      colors: { background: "#000000", accent: "#F55E36", text: "#FFFFFF" },
      palette: ["#F55E36", "#FFFFFF", "#333333", "#666666", "#999999"],
      sideASongs: [{ title: "Первая", highlighted: true }, { title: "", highlighted: false }],
      sideBSongs: [{ title: "Вторая", highlighted: false }]
    }
  };
}

test("a portable cassette preserves all editable data and PDF selection, without local identity", async () => {
  const card = fixture();
  const text = serializeCard(card);
  assert.equal(text.includes(card.id), false);
  assert.deepEqual(await parseCardFile(text), { data: card.data, includeInPdf: false });
});

test("empty recorded date is preserved, as allowed by the editor", async () => {
  const card = fixture();
  card.data.date = "";
  assert.equal((await parseCardFile(serializeCard(card))).data.date, "");
});

test("unrelated JSON and unsupported versions are rejected", async () => {
  await assert.rejects(parseCardFile("not JSON"), /not valid cassette JSON/);
  await assert.rejects(parseCardFile('{"hello":"world"}'), /exported by this app/);
  const file = JSON.parse(serializeCard(fixture()));
  file.version = 999;
  await assert.rejects(parseCardFile(JSON.stringify(file)), /version is not supported/);
});

test("invalid design fields are rejected before restoring a cassette", async () => {
  for (const mutate of [
    (data) => { data.sideATitle = null; },
    (data) => { data.palette = ["#FFFFFF"]; },
    (data) => { data.colors.text = "url(javascript:alert(1))"; },
    (data) => { data.sideASongs[0].highlighted = "yes"; },
    (data) => { data.date = "2026-13"; },
    (data) => { data.coverFeather = -1; },
    (data) => { data.cover = 'https://example.com/cover.png" onload="alert(1)'; }
  ]) {
    const card = fixture();
    mutate(card.data);
    await assert.rejects(parseCardFile(serializeCard(card)));
  }
});

test("unknown file properties are not copied into editor state", async () => {
  const card = fixture();
  card.data.unrelated = { injected: true };
  card.data.sideASongs[0].unrelated = true;
  const imported = await parseCardFile(serializeCard(card));
  assert.equal(Object.hasOwn(imported.data, "unrelated"), false);
  assert.equal(Object.hasOwn(imported.data.sideASongs[0], "unrelated"), false);
});

test("oversized files are rejected without reading their contents", async () => {
  await assert.rejects(readCardFile({ size: 33 * 1024 * 1024, text: () => { throw Error("Should not read"); } }), /smaller than 32 MB/);
});

test("download names preserve Unicode and remove filesystem separators", () => {
  assert.equal(cardFileName(fixture().data), "Исполнитель - Альбом.jcard.json");
  assert.equal(cardFileName({ artist: "a/b", album: 'c:d?"' }), "a-b - c-d--.jcard.json");
});
