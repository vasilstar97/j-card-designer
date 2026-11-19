import { readCoverFeathers } from "./coverSettings.js";
import { PANEL } from "./constants.js";
import { validateEmbeddedImage } from "./images.js";

const FORMAT = "j-card-generator";
const VERSION = 2;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isColor = (value) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);

export function serializeCard(card) {
  const data = { ...card.data, ...readCoverFeathers(card.data) };
  delete data.coverFeather;
  return JSON.stringify({ format: FORMAT, version: VERSION, card: { includeInPdf: card.includeInPdf !== false, data } }, null, 2);
}

export function cardFileName(data) {
  const title = [data.artist, data.album].filter((value) => value.trim()).join(" - ");
  const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").slice(0, 140);
  return `${safeTitle || "cassette"}.jcard.json`;
}

export async function parseCardFile(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid cassette JSON.");
  }
  if (!isObject(payload) || payload.format !== FORMAT) throw new Error("Choose a cassette file exported by this app (.jcard.json).");
  if (![1, VERSION].includes(payload.version)) throw new Error("This cassette file version is not supported.");
  if (!isObject(payload.card) || !isObject(payload.card.data)) throw new Error("The cassette file has no valid design data.");
  const { data, includeInPdf = true } = payload.card;
  const stringFields = ["artist", "album", "info", "quote", "font", "date", "sideATitle", "sideBTitle", "cover"];
  if (stringFields.some((key) => typeof data[key] !== "string") || typeof includeInPdf !== "boolean") {
    throw new Error("The cassette file contains invalid text or settings.");
  }
  const feathers = readCoverFeathers(data);
  if (!["Open Sans", "Noto Sans JP"].includes(data.font) ||
      (data.date !== "" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.date)) ||
      Object.values(feathers).some((value) => !Number.isFinite(value) || value < 0 || value > PANEL.front / 2)) {
    throw new Error("The cassette file contains invalid font, date, or cover settings.");
  }
  if (!Array.isArray(data.palette) || data.palette.length !== 5 || !data.palette.every(isColor) ||
      !isObject(data.colors) || !["background", "accent", "text"].every((key) => isColor(data.colors[key]))) {
    throw new Error("The cassette file contains invalid colors.");
  }
  const readTracks = (tracks) => {
    if (!Array.isArray(tracks) || tracks.length > 1000 || tracks.some((track) =>
      !isObject(track) || typeof track.title !== "string" || typeof track.highlighted !== "boolean")) {
      throw new Error("The cassette file contains an invalid track list.");
    }
    return tracks.map(({ title, highlighted }) => ({ title, highlighted }));
  };
  const cleanData = Object.fromEntries(stringFields.map((key) => [key, data[key]]));
  Object.assign(cleanData, feathers);
  cleanData.colors = Object.fromEntries(["background", "accent", "text"].map((key) => [key, data.colors[key]]));
  cleanData.palette = [...data.palette];
  cleanData.sideASongs = readTracks(data.sideASongs);
  cleanData.sideBSongs = readTracks(data.sideBSongs);
  await validateEmbeddedImage(cleanData.cover);
  return { data: cleanData, includeInPdf };
}

export async function readCardFile(file) {
  if (!file || file.size > MAX_FILE_BYTES) throw new Error("Choose a cassette file smaller than 32 MB.");
  return parseCardFile(await file.text());
}
