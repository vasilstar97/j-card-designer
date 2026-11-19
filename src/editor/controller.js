import { getPdfColorLabel, isPdfColorMode } from "./printColors.js";
import { renderArtwork as renderSvgArtwork } from "./artwork.js";
import { colorDefaults, localMonth, paletteDefaults, PADDING_MM, BLEED_MM, PANEL } from "./constants.js";
import { readImageFile, readImageUrl } from "./images.js";
import { createPrintPdf } from "./pdfExport.js";
import { readTrackRows, renderTrackList } from "./tracks.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let coverDataUrl = "";
let toastTimer;
let onEditorChange = null;
const palette = [...paletteDefaults];

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3800);
}

export function createDefaultCardState() {
  const emptyTracks = () => Array.from({ length: 6 }, () => ({ title: "", highlighted: false }));
  return {
    artist: "Artist",
    album: "Album title",
    info: "Debut album",
    coverFeather: 0,
    quote: "",
    font: "Open Sans",
    date: localMonth(),
    colors: { ...colorDefaults },
    palette: [...paletteDefaults],
    sideATitle: "SIDE A",
    sideBTitle: "SIDE B",
    sideASongs: emptyTracks(),
    sideBSongs: emptyTracks(),
    cover: ""
  };
}

export function captureCardState() {
  return {
    artist: $("#artist-name").value,
    album: $("#album-name").value,
    info: $("#info-text").value,
    coverFeather: Math.min(PANEL.front / 2, Math.max(0, Number($("#cover-feather").value) || 0)),
    quote: $("#quote-text").value,
    font: $("#font-family").value,
    date: $("#recorded-date").value,
    colors: {
      background: $("#background-color").value,
      accent: $("#accent-color").value,
      text: $("#text-color").value
    },
    palette: [...palette],
    sideATitle: $("#side-a-title").value,
    sideBTitle: $("#side-b-title").value,
    sideASongs: readTrackRows("a"),
    sideBSongs: readTrackRows("b"),
    cover: coverDataUrl
  };
}

function artworkData(state) {
  const [year, month] = (state.date || localMonth()).split("-");
  return {
    background: state.colors.background,
    artist: state.artist.trim(),
    album: state.album.trim(),
    info: state.info.trim(),
    coverFeather: state.coverFeather,
    quote: state.quote.trim(),
    font: state.font,
    date: `recorded ${month}/${year}`,
    padding: PADDING_MM,
    bleed: BLEED_MM,
    accent: state.colors.accent,
    text: state.colors.text,
    sideATitle: state.sideATitle.trim(),
    sideBTitle: state.sideBTitle.trim(),
    sideASongs: state.sideASongs.filter((track) => track.title.trim()),
    sideBSongs: state.sideBSongs.filter((track) => track.title.trim()),
    cover: state.cover
  };
}

function updateArtwork({ notify = true } = {}) {
  const state = captureCardState();
  renderSvgArtwork(artworkData(state), state.palette, $("#artwork"));
  if (notify) onEditorChange?.(state);
}

export function restoreCardState(state) {
  $("#artist-name").value = state.artist;
  $("#album-name").value = state.album;
  $("#info-text").value = state.info;
  $("#cover-feather").value = String(state.coverFeather ?? 0);
  $("#quote-text").value = state.quote;
  $("#font-family").value = state.font;
  $("#recorded-date").value = state.date || localMonth();
  $("#side-a-title").value = state.sideATitle;
  $("#side-b-title").value = state.sideBTitle;
  Object.entries({ ...colorDefaults, ...state.colors }).forEach(([name, color]) => {
    $(`#${name}-color`).value = color;
  });
  palette.splice(0, palette.length, ...state.palette);
  coverDataUrl = state.cover || "";
  $("#image-status").textContent = coverDataUrl ? "Saved cover image" : "";
  renderTrackList("a", state.sideASongs);
  renderTrackList("b", state.sideBSongs);
  updateArtwork({ notify: false });
}

export function createCardArtworkSvg(state) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "fixed";
  svg.style.left = "-10000px";
  svg.style.visibility = "hidden";
  document.body.append(svg);
  renderSvgArtwork(artworkData(state), state.palette, svg);
  return svg;
}

export function getPaletteColors() {
  return [...palette];
}

export function showEditorMessage(message, isError = false) {
  showToast(message, isError);
}

export function setPaletteColor(index, color) {
  if (!Number.isInteger(index) || index < 0 || index >= palette.length) return;
  palette[index] = color.toUpperCase();
  updateArtwork();
}

export function movePaletteColor(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
      from < 0 || to < 0 || from >= palette.length || to >= palette.length) return;
  const [color] = palette.splice(from, 1);
  palette.splice(to, 0, color);
  updateArtwork();
}

export function setDesignColor(name, color) {
  const input = $(`#${name}-color`);
  input.value = color.toUpperCase();
  updateArtwork();
}

function resetPalette() {
  palette.splice(0, palette.length, ...paletteDefaults);
  window.dispatchEvent(new CustomEvent("designreset", { detail: getPaletteColors() }));
}

function setImage(dataUrl, label) {
  coverDataUrl = dataUrl;
  $("#image-status").textContent = `${label} — cover updated.`;
  updateArtwork();
}

function getUrlFromTransfer(transfer) {
  if (!transfer) return null;
  for (const value of [transfer.getData("text/uri-list"), transfer.getData("text/plain")]) {
    for (const line of value.split(/\r?\n/)) {
      const candidate = line.trim();
      if (!candidate || candidate.startsWith("#")) continue;
      try {
        const url = new URL(candidate);
        if (url.protocol === "http:" || url.protocol === "https:") return url.href;
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
      }
    }
  }
  return null;
}

function isLikelyImageUrl(value) {
  try {
    return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(new URL(value).pathname);
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

async function loadImageUrl(url) {
  try {
    const dataUrl = await readImageUrl(url);
    if (dataUrl) setImage(dataUrl, "Image URL");
  } catch (error) {
    if (!isLikelyImageUrl(url)) return;
    showToast(
      error instanceof TypeError
        ? "Could not load the image URL (the server may block CORS requests)."
        : error.message,
      true
    );
  }
}

export function loadImageFile(file) {
  readImageFile(file)
    .then((dataUrl) => setImage(dataUrl, file.name))
    .catch((error) => showToast(error.message, true));
}

export async function exportArtwork(cardStates, paperSize, colorMode, iccOptions) {
  if (!["A4", "A3"].includes(paperSize)) {
    showToast("Choose A4 or A3 for the PDF.", true);
    return;
  }
  if (!isPdfColorMode(colorMode)) {
    showToast("Choose a supported PDF color mode.", true);
    return;
  }
  if (!cardStates.length) {
    showToast("Add at least one J-card before exporting.", true);
    return;
  }

  const artworkSvgs = [];
  try {
    artworkSvgs.push(...cardStates.map(createCardArtworkSvg));
    const blob = await createPrintPdf(artworkSvgs, paperSize, colorMode, iccOptions);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const now = new Date();
    const dateStamp = [
      String(now.getDate()).padStart(2, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getFullYear()).slice(-2)
    ].join("-");
    const profileSuffix = colorMode === "ICC"
      ? "-" + (iccOptions?.profile?.name || "profile").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 70)
      : "";
    link.download = `j-card-${dateStamp}-${paperSize}-${colorMode}${profileSuffix}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast(`PDF exported successfully (${cardStates.length} J-cards, ${paperSize}, ${getPdfColorLabel(colorMode)}).`);
  } catch (error) {
    showToast(error.message || "Could not export PDF.", true);
  } finally {
    artworkSvgs.forEach((svg) => svg.remove());
  }
}

export function resetEditor() {
  $("#artist-name").value = "Artist";
  $("#album-name").value = "Album title";
  $("#info-text").value = "Debut album";
  $("#cover-feather").value = "0";
  $("#quote-text").value = "";
  $("#font-family").value = "Open Sans";
  $("#recorded-date").value = localMonth();
  $("#side-a-title").value = "SIDE A";
  $("#side-b-title").value = "SIDE B";
  renderTrackList("a");
  renderTrackList("b");
  Object.entries(colorDefaults).forEach(([name, color]) => {
    $(`#${name}-color`).value = color;
  });
  resetPalette();
  coverDataUrl = "";
  $("#image-status").textContent = "";
  updateArtwork();
}

function bind(target, eventName, handler, listeners) {
  target.addEventListener(eventName, handler);
  listeners.push(() => target.removeEventListener(eventName, handler));
}

export function installEvents(onChange) {
  onEditorChange = onChange;
  const listeners = [];
  const on = (target, eventName, handler) => bind(target, eventName, handler, listeners);

  $("#recorded-date").value = localMonth();
  on(document.fonts, "loadingdone", updateArtwork);
  document.fonts.ready.then(() => updateArtwork());

  // Bind only artwork fields. Native handlers on React-controlled export selects
  // can trigger a parent render before React reads the new selection.
  $$("#artist-name, #album-name, #info-text, #cover-feather, #quote-text, #recorded-date, #font-family, #side-a-title, #side-b-title").forEach((input) => {
    on(input, "input", updateArtwork);
    on(input, "change", updateArtwork);
  });
  const trackEditor = $(".inner-editor");
  on(trackEditor, "input", (event) => {
    if (event.target.matches("[data-track-title]")) updateArtwork();
  });
  on(trackEditor, "change", (event) => {
    if (event.target.matches("[data-track-highlight]")) updateArtwork();
  });
  on(trackEditor, "click", (event) => {
    const removeButton = event.target.closest("[data-remove-track]");
    if (removeButton) {
      const { side } = removeButton.dataset;
      removeButton.closest(".track-entry").remove();
      renderTrackList(side, readTrackRows(side));
      updateArtwork();
      return;
    }

    const addButton = event.target.closest("[data-add-track]");
    if (!addButton) return;
    const side = addButton.dataset.addTrack;
    const list = $(`#side-${side}-tracks`);
    const tracks = readTrackRows(side);
    tracks.push({ title: "", highlighted: false });
    renderTrackList(side, tracks);
    updateArtwork();
    list.querySelector(".track-entry:last-child [data-track-title]")?.focus();
  });
  on($("#show-grid"), "change", (event) => {
    $("#artwork").classList.toggle("hide-grid", !event.target.checked);
  });
  on($("#show-padding-guides"), "change", (event) => {
    $("#artwork").classList.toggle("hide-padding-guides", !event.target.checked);
  });
  on($("#show-print-guides"), "change", (event) => {
    $("#artwork").classList.toggle("hide-print-guides", !event.target.checked);
  });
  $("#artwork").classList.toggle("hide-grid", !$("#show-grid").checked);
  $("#artwork").classList.toggle("hide-padding-guides", !$("#show-padding-guides").checked);
  $("#artwork").classList.toggle("hide-print-guides", !$("#show-print-guides").checked);

  on(document, "paste", (event) => {
    if (event.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
    const imageItem = [...(event.clipboardData?.items || [])].find((item) =>
      item.kind === "file" && item.type.startsWith("image/")
    );
    const imageFile = imageItem?.getAsFile();
    if (imageFile) {
      event.preventDefault();
      loadImageFile(imageFile);
      return;
    }
    const url = getUrlFromTransfer(event.clipboardData);
    if (url) {
      event.preventDefault();
      void loadImageUrl(url);
    }
  });
  const coverUploader = $(".cover-uploader");
  on(coverUploader, "dragover", (event) => {
    if (!event.dataTransfer?.files.length && getUrlFromTransfer(event.dataTransfer)) {
      event.preventDefault();
    }
  });
  on(coverUploader, "drop", (event) => {
    if (event.dataTransfer?.files.length) return;
    const url = getUrlFromTransfer(event.dataTransfer);
    if (!url) return;
    event.preventDefault();
    void loadImageUrl(url);
  });

  renderTrackList("a");
  renderTrackList("b");
  updateArtwork();

  return () => {
    listeners.forEach((removeListener) => removeListener());
    if (onEditorChange === onChange) onEditorChange = null;
  };
}
