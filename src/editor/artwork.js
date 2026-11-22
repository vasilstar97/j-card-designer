import { readCoverFeathers } from "./coverSettings.js";
import { MARK_EXTENSION_MM, PANEL } from "./constants.js";

const textMeasureContext = document.createElement("canvas").getContext("2d");

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
}

function approximateWrap(text, maxWidth, fontSize, measureWidth = approximateTextWidth) {
  const capacity = Math.max(1, maxWidth / fontSize);
  const wordWidth = measureWidth;
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (wordWidth(word) > capacity) {
        if (line) lines.push(line);
        line = "";
        let part = "";
        for (const character of [...word]) {
          if (part && wordWidth(part + character) > capacity) {
            lines.push(part);
            part = character;
          } else {
            part += character;
          }
        }
        line = part;
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (wordWidth(candidate) > capacity && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function approximateTextWidth(text) {
  return [...text].reduce((width, character) =>
    width + (/[\u1100-\u11ff\u2e80-\u9fff\uf900-\ufaff\uac00-\ud7af\uff01-\uff60]/u.test(character) ? 1 : 0.48), 0);
}

function measuredTextWidth(text, fontFamily, fontWeight) {
  if (!textMeasureContext) return approximateTextWidth(text);
  textMeasureContext.font = `${fontWeight} 100px "${fontFamily}"`;
  return textMeasureContext.measureText(text).width / 100;
}

function svgTextLines(lines, x, y, options = {}) {
  if (!lines.length) return "";
  const { size = 3, lineHeight = 4, color = "#FFFFFF", weight = 400, anchor = "start", baseline } = options;
  const tspans = lines.map((line, index) =>
    `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join("");
  const baselineAttribute = baseline ? ` dominant-baseline="${baseline}"` : "";
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${escapeXml(options.font || "Open Sans")}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${baselineAttribute}>${tspans}</text>`;
}


export function renderArtwork(data, palette, svgElement) {
  const xBack = 0;
  const xSide = PANEL.back;
  const xFront = xSide + PANEL.side;
  const xInner = xFront + PANEL.front;
  const totalWidth = xInner + PANEL.inner;
  const coverBound = PANEL.front;
  const feathers = readCoverFeathers(data);
  const bottomFeather = Math.max(0, Math.min(Number(feathers.coverBottomFeather) || 0, PANEL.front / 2));
  const sidesFeather = Math.max(0, Math.min(Number(feathers.coverSidesFeather) || 0, PANEL.front / 2));
  const bleed = Math.max(0, Math.min(data.bleed, 10));
  const coverBleedOverlap = Math.min(bleed, 0.2);
  const pad = Math.max(0, Math.min(data.padding, 15));
  const font = escapeXml(data.font);
  const pieces = [];
  const innerBlockHeight = (PANEL.height - 3 * pad) / 2;
  const sideAY = pad;
  const sideBY = sideAY + innerBlockHeight + pad;
  const innerContentWidth = PANEL.inner - 2 * pad;
  const clipDefs = `<defs>
    <clipPath id="backPanelClip"><rect x="0" y="0" width="${PANEL.height}" height="${PANEL.back}"/></clipPath>
    <clipPath id="sidePanelClip"><rect x="0" y="0" width="${PANEL.height}" height="${PANEL.side}"/></clipPath>
    <clipPath id="frontClip"><rect x="${xFront}" y="0" width="${PANEL.front}" height="${PANEL.height}"/></clipPath>
    <clipPath id="coverClip"><rect x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}"/></clipPath>
    <clipPath id="topCoverBleedClip"><rect x="${xFront}" y="${-bleed}" width="${PANEL.front}" height="${bleed + coverBleedOverlap}"/></clipPath>
    <clipPath id="innerPanelClip"><rect x="${xInner}" y="0" width="${PANEL.inner}" height="${PANEL.height}"/></clipPath>
  </defs>`;
  const horizontalFeatherStart = sidesFeather / PANEL.front;
  const horizontalFeatherEnd = 1 - horizontalFeatherStart;
  const coverFeatherDefs = bottomFeather > 0 || sidesFeather > 0 ? `<defs>
    <linearGradient id="coverHorizontalFeatherGradient" gradientUnits="userSpaceOnUse" x1="${xFront}" y1="0" x2="${xFront + PANEL.front}" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0"/>
      <stop offset="${horizontalFeatherStart}" stop-color="white" stop-opacity="1"/>
      <stop offset="${horizontalFeatherEnd}" stop-color="white" stop-opacity="1"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="coverBottomFeatherGradient" gradientUnits="userSpaceOnUse" x1="0" y1="${coverBound - bottomFeather}" x2="0" y2="${coverBound}">
      <stop offset="0" stop-color="white" stop-opacity="1"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="coverHorizontalFeatherMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${xFront}" y="${-bleed}" width="${PANEL.front}" height="${coverBound + bleed}">
      <rect x="${xFront}" y="${-bleed}" width="${PANEL.front}" height="${coverBound + bleed}" fill="url(#coverHorizontalFeatherGradient)"/>
    </mask>
    <mask id="coverBottomFeatherMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}">
      <rect x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" fill="url(#coverBottomFeatherGradient)"/>
    </mask>
  </defs>` : "";

  pieces.push(clipDefs);
  if (coverFeatherDefs) pieces.push(coverFeatherDefs);
  pieces.push(renderPrintGuides({ totalWidth, xSide, xFront, xInner, bleed }));
  pieces.push(`<rect x="${-bleed}" y="${-bleed}" width="${totalWidth + bleed * 2}" height="${PANEL.height + bleed * 2}" fill="${data.background}"/>`);

  if (data.quote) {
    const quoteLines = approximateWrap(data.quote, PANEL.height - pad * 2, 3,
      (text) => measuredTextWidth(text, data.font, 600));
    const lineHeight = 4;
    const quoteHeight = quoteLines.length * lineHeight;
    const quoteY = (PANEL.back - quoteHeight) / 2 + lineHeight / 2;
    pieces.push(`<g transform="translate(${xBack + PANEL.back} 0) rotate(90)" clip-path="url(#backPanelClip)">`);
    pieces.push(svgTextLines(quoteLines, PANEL.height / 2, quoteY, {
      size: 3, lineHeight, color: data.accent, weight: 600, anchor: "middle", baseline: "central", font
    }));
    pieces.push("</g>");
  }

  pieces.push(`<g transform="translate(${xSide + PANEL.side} 0) rotate(90)" clip-path="url(#sidePanelClip)">`);
  const paletteStart = coverBound;
  const sideTextWidth = Math.max(1, paletteStart - 2 * pad);
  const sideArtistLines = approximateWrap(data.artist || "", sideTextWidth, 3,
    (text) => measuredTextWidth(text, data.font, 600));
  const sideAlbumLines = approximateWrap(data.album || "", sideTextWidth, 3,
    (text) => measuredTextWidth(text, data.font, 600));
  const sideLineHeight = Math.min(4, Math.max(0, PANEL.side - 2 * pad) / (sideArtistLines.length + sideAlbumLines.length));
  const sideTextY = pad + sideLineHeight / 2;
  pieces.push(`<g id="side-panel-copy">`);
  pieces.push(svgTextLines(sideArtistLines, pad, sideTextY, {
    size: 3, lineHeight: sideLineHeight, color: data.accent, weight: 600, font, anchor: "start", baseline: "central"
  }));
  pieces.push(svgTextLines(sideAlbumLines, pad, sideTextY + sideArtistLines.length * sideLineHeight, {
    size: 3, lineHeight: sideLineHeight, color: data.text, weight: 600, font, anchor: "start", baseline: "central"
  }));
  pieces.push("</g>");
  const paletteEnd = PANEL.height - pad;
  const swatchWidth = Math.max(0, (paletteEnd - paletteStart) / palette.length);
  // Merge equal neighbours and overlap internal edges to prevent raster seams.
  for (let index = 0; index < palette.length;) {
    const color = palette[index];
    let next = index + 1;
    while (next < palette.length && palette[next].toLowerCase() === color.toLowerCase()) next++;
    const sx = paletteStart + index * swatchWidth;
    const end = Math.min(paletteEnd, paletteStart + next * swatchWidth + 0.04);
    pieces.push(`<rect x="${sx}" y="${pad}" width="${end - sx}" height="${Math.max(0, PANEL.side - 2 * pad)}" fill="${color}"/>`);
    index = next;
  }
  pieces.push("</g>");

  if (data.cover) {
    const coverImage = `<image href="${data.cover}" x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" preserveAspectRatio="xMidYMid slice"/>`;
    const reflectedImage = `<image href="${data.cover}" x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" preserveAspectRatio="xMidYMid slice" transform="translate(0 ${coverBleedOverlap}) scale(1 -1)"/>`;
    if (bottomFeather > 0 || sidesFeather > 0) {
      const horizontalMask = sidesFeather > 0 ? ' mask="url(#coverHorizontalFeatherMask)"' : "";
      const bottomMask = bottomFeather > 0 ? ' mask="url(#coverBottomFeatherMask)"' : "";
      pieces.push(`<g clip-path="url(#topCoverBleedClip)"${horizontalMask}>${reflectedImage}</g>`);
      pieces.push(`<g${horizontalMask}><g${bottomMask}>${coverImage}</g></g>`);
    } else {
      pieces.push(`<g clip-path="url(#topCoverBleedClip)">${reflectedImage}</g>`);
      pieces.push(coverImage);
    }
  } else {
    pieces.push(`<g clip-path="url(#coverClip)">
      <rect x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" fill="#1A1A1A"/>
      <path d="M${xFront} ${coverBound} L${xFront + PANEL.front} 0 M${xFront} ${coverBound * .55} L${xFront + PANEL.front * .55} 0 M${xFront + PANEL.front * .45} ${coverBound} L${xFront + PANEL.front} ${coverBound * .45}" stroke="#333333" stroke-width=".35"/>
      <text x="${xFront + PANEL.front / 2}" y="${coverBound / 2}" text-anchor="middle" fill="#FFFFFF" font-family="${font}" font-size="3" letter-spacing=".35">COVER ART</text>
    </g>`);
  }

  pieces.push(`<g clip-path="url(#frontClip)">`);
  // All positions describe 4 mm line boxes, with text centered inside each line.
  const lineHeight = 4;
  const frontTextTop = coverBound + pad;
  const dateTop = PANEL.height - pad - lineHeight;
  const infoBottom = dateTop - pad;
  const artistAvailableHeight = Math.max(lineHeight, infoBottom - frontTextTop - pad - 2 * lineHeight);
  const titleY = frontTextTop + lineHeight / 2;
  const artistLines = approximateWrap(
    data.artist || "",
    PANEL.front - pad * 2,
    3,
    (text) => measuredTextWidth(text, data.font, 600)
  );
  const maxArtistLines = Math.max(1, Math.floor(artistAvailableHeight / 4));
  const shownArtistLines = artistLines.slice(0, maxArtistLines);
  pieces.push(svgTextLines(shownArtistLines, xFront + pad, titleY, {
    size: 3, lineHeight, color: data.accent, weight: 600, font, anchor: "start", baseline: "central"
  }));
  const albumY = titleY + Math.max(1, shownArtistLines.length) * 4 + pad;
  const dateY = dateTop + lineHeight / 2;
  const albumTop = albumY - lineHeight / 2;
  const albumMaxHeight = Math.max(0, infoBottom - albumTop);
  const infoSize = 3;
  const albumLineHeight = lineHeight;
  const titleRows = approximateWrap(data.album || "", PANEL.front - pad * 2, infoSize,
    (text) => measuredTextWidth(text, data.font, 600));
  const infoRows = approximateWrap(data.info || "", PANEL.front - pad * 2, infoSize,
    (text) => measuredTextWidth(text, data.font, 400));
  // Text guides are layout references, not clipping masks. Only the panel edge clips ink.
  pieces.push("<g>");
  pieces.push(svgTextLines(titleRows, xFront + pad, albumY, {
    size: infoSize, lineHeight: albumLineHeight, color: data.text, weight: 600, font, anchor: "start", baseline: "central"
  }));
  pieces.push(svgTextLines(infoRows, xFront + pad, albumY + titleRows.length * albumLineHeight, {
    size: infoSize, lineHeight: albumLineHeight, color: data.text, weight: 400, font, anchor: "start", baseline: "central"
  }));
  pieces.push("</g>");
  pieces.push(svgTextLines([data.date], xFront + PANEL.front - pad, dateY, {
    size: 3, lineHeight, color: data.accent, weight: 400, font, anchor: "end", baseline: "central"
  }));
  pieces.push("</g>");

  pieces.push(`<g clip-path="url(#innerPanelClip)">`);
  const sideATitleLines = approximateWrap(data.sideATitle, innerContentWidth, 3,
    (text) => measuredTextWidth(text, data.font, 600));
  const sideATitleY = sideAY + 2;
  const sideATitleHeight = Math.max(3, sideATitleLines.length * 4);
  const sideASongsGuideY = sideAY + sideATitleHeight + pad;
  const sideATracksY = sideASongsGuideY + 1.5;
  pieces.push(svgTextLines(sideATitleLines, xInner + pad, sideATitleY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start", baseline: "central"
  }));
  pieces.push(renderInnerTracks(
    data.sideASongs, xInner + pad, sideATracksY,
    innerContentWidth, data.text, data.accent, font
  ));
  pieces.push("</g>");

  pieces.push(`<g clip-path="url(#innerPanelClip)">`);
  const sideBTitleLines = approximateWrap(data.sideBTitle, innerContentWidth, 3,
    (text) => measuredTextWidth(text, data.font, 600));
  const sideBTitleY = sideBY + 2;
  const sideBTitleHeight = Math.max(3, sideBTitleLines.length * 4);
  const sideBSongsGuideY = sideBY + sideBTitleHeight + pad;
  const sideBTracksY = sideBSongsGuideY + 1.5;
  pieces.push(svgTextLines(sideBTitleLines, xInner + pad, sideBTitleY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start", baseline: "central"
  }));
  pieces.push(renderInnerTracks(
    data.sideBSongs, xInner + pad, sideBTracksY,
    innerContentWidth, data.text, data.accent, font
  ));
  pieces.push("</g>");

  pieces.push(renderLayoutGuides({
    xBack, xSide, xFront, xInner, coverBound, pad, innerBlockHeight,
    innerContentWidth, sideAY, sideBY, sideTextWidth, paletteStart, paletteEnd,
    titleY, shownArtistLines, albumY, albumMaxHeight, dateY,
    sideATitleLines, sideATitleY, sideASongsGuideY,
    sideBTitleLines, sideBTitleY, sideBSongsGuideY
  }));
  const printMargin = bleed + MARK_EXTENSION_MM;
  svgElement.setAttribute("viewBox", `${-printMargin} ${-printMargin} ${totalWidth + printMargin * 2} ${PANEL.height + printMargin * 2}`);
  svgElement.innerHTML = pieces.join("");
  const alignSidePanelCopy = () => {
    const copy = svgElement.querySelector("#side-panel-copy");
    if (!copy) return;
    const bounds = copy.getBBox();
    const safeCenter = pad + (PANEL.side - 2 * pad) / 2;
    copy.setAttribute("transform", `translate(0 ${safeCenter - bounds.y - bounds.height / 2})`);
  };
  alignSidePanelCopy();
  document.fonts.ready.then(alignSidePanelCopy);
}

function renderPrintGuides({ totalWidth, xSide, xFront, xInner, bleed }) {
  const markExtent = bleed + MARK_EXTENSION_MM;
  const height = PANEL.height;
  const cropMarks = [
    `M${-markExtent} 0H0 M0 ${-markExtent}V0`,
    `M${totalWidth} ${-markExtent}V0 M${totalWidth} 0h${markExtent}`,
    `M${-markExtent} ${height}H0 M0 ${height}V${height + markExtent}`,
    `M${totalWidth} ${height}V${height + markExtent} M${totalWidth} ${height}h${markExtent}`
  ].join(" ");
  const foldLines = [xSide, xFront, xInner]
    .map((x) => `<line x1="${x}" y1="${-markExtent}" x2="${x}" y2="${height + markExtent}"/>`)
    .join("");

  return `<g class="print-guides" fill="none" stroke-width=".5">
    <g stroke="#D3232F">
      <path d="${cropMarks}"/>
    </g>
    <g stroke="#00A63C">${foldLines}</g>
  </g>`;
}

function renderGuideLines(rectangles, segments = []) {
  const lines = [...segments];
  for (const [x, y, width, height] of rectangles) {
    if (width <= 0 || height <= 0) continue;
    lines.push([x, y, x + width, y], [x, y + height, x + width, y + height],
      [x, y, x, y + height], [x + width, y, x + width, y + height]);
  }
  const round = (value) => Number(value.toFixed(6));
  const groups = new Map();
  for (const [x1, y1, x2, y2] of lines) {
    const horizontal = y1 === y2;
    const fixed = round(horizontal ? y1 : x1);
    const key = `${horizontal ? "h" : "v"}:${fixed}`;
    if (!groups.has(key)) groups.set(key, { horizontal, fixed, ranges: [] });
    groups.get(key).ranges.push([
      round(Math.min(horizontal ? x1 : y1, horizontal ? x2 : y2)),
      round(Math.max(horizontal ? x1 : y1, horizontal ? x2 : y2))
    ]);
  }
  const pieces = [];
  for (const { horizontal, fixed, ranges } of groups.values()) {
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const range of ranges) {
      const previous = merged.at(-1);
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
      else merged.push([...range]);
    }
    for (const [start, end] of merged) {
      // Align dash phase to the artwork axes, rather than each rectangle's perimeter.
      const path = horizontal ? `M${start} ${fixed}H${end}` : `M${fixed} ${start}V${end}`;
      pieces.push(`<path d="${path}" stroke-dashoffset="${round(start % 2)}"/>`);
    }
  }
  return pieces.join("");
}

function renderLayoutGuides(layout) {
  const {
    xBack, xSide, xFront, xInner, coverBound, pad, innerBlockHeight,
    innerContentWidth, sideAY, sideBY, sideTextWidth, paletteStart, paletteEnd,
    titleY, shownArtistLines, albumY, albumMaxHeight, dateY,
    sideATitleLines, sideATitleY, sideASongsGuideY,
    sideBTitleLines, sideBTitleY, sideBSongsGuideY
  } = layout;
  const innerGuides = (blockY, titleLines, titleY, songsY) => {
    const titleHeight = Math.max(3, titleLines.length * 4);
    const songsBottom = blockY + innerBlockHeight;
    return [
      [xInner + pad, titleY - 2, innerContentWidth, titleHeight],
      [xInner + pad, songsY, innerContentWidth, songsBottom - songsY]
    ];
  };
  const totalWidth = xInner + PANEL.inner;
  const grid = renderGuideLines([[xBack, 0, totalWidth, PANEL.height]], [
    ...[xSide, xFront, xInner].map((x) => [x, 0, x, PANEL.height]),
    [xFront, coverBound, xFront + PANEL.front, coverBound]
  ]);
  const padding = renderGuideLines([
    [xBack + pad, pad, PANEL.back - 2 * pad, PANEL.height - 2 * pad],
    [xSide + pad, pad, PANEL.side - 2 * pad, sideTextWidth],
    [xSide + pad, paletteStart, PANEL.side - 2 * pad, paletteEnd - paletteStart],
    [xFront + pad, titleY - 2, PANEL.front - 2 * pad, Math.max(4, shownArtistLines.length * 4)],
    [xFront + pad, albumY - 2, PANEL.front - 2 * pad, albumMaxHeight],
    [xFront + pad, dateY - 2, PANEL.front - 2 * pad, 4],
    ...innerGuides(sideAY, sideATitleLines, sideATitleY, sideASongsGuideY),
    ...innerGuides(sideBY, sideBTitleLines, sideBTitleY, sideBSongsGuideY)
  ]);
  const style = 'fill="none" stroke="#999" stroke-width=".25" stroke-dasharray="1 1" stroke-linecap="butt" opacity=".8"';
  return `<g class="screen-only grid-guides" ${style}>${grid}</g>
    <g class="screen-only padding-guides" ${style}>${padding}</g>`;
}

function renderInnerTracks(tracks, x, startY, columnWidth, textColor, accentColor, font) {
  const fontSize = 2.5;
  const lineHeight = 3;
  const numberColumnWidth = approximateTextWidth(`${tracks.length}. `) * fontSize + 1;
  const titleX = x + numberColumnWidth;
  const titleWidth = columnWidth - numberColumnWidth;
  let y = startY;
  const pieces = [];

  tracks.forEach((track, index) => {
    const lines = approximateWrap(track.title, titleWidth, fontSize,
      (text) => measuredTextWidth(text, font, 400));
    pieces.push(svgTextLines([`${index + 1}.`], x, y, {
      size: fontSize, lineHeight, color: textColor, weight: 400, font, anchor: "start", baseline: "central"
    }));
    pieces.push(svgTextLines(lines, titleX, y, {
      size: fontSize, lineHeight, color: track.highlighted ? accentColor : textColor, weight: 400, font, anchor: "start", baseline: "central"
    }));
    y += Math.max(1, lines.length) * lineHeight;
  });

  return pieces.join("");
}

