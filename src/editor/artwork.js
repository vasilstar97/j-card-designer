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
  const coverFeather = Math.max(0, Math.min(Number(data.coverFeather) || 0, PANEL.front / 2));
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
    <clipPath id="backTextClip"><rect x="0" y="0" width="${PANEL.height}" height="${PANEL.back}"/></clipPath>
    <clipPath id="sideTextClip"><rect x="0" y="0" width="${PANEL.height}" height="${PANEL.side}"/></clipPath>
    <clipPath id="frontClip"><rect x="${xFront}" y="0" width="${PANEL.front}" height="${PANEL.height}"/></clipPath>
    <clipPath id="coverClip"><rect x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}"/></clipPath>
    <clipPath id="topCoverBleedClip"><rect x="${xFront}" y="${-bleed}" width="${PANEL.front}" height="${bleed + coverBleedOverlap}"/></clipPath>
    <clipPath id="sideATracksClip"><rect x="${xInner + pad}" y="${sideAY}" width="${innerContentWidth}" height="${Math.max(0, innerBlockHeight)}"/></clipPath>
    <clipPath id="sideBTracksClip"><rect x="${xInner + pad}" y="${sideBY}" width="${innerContentWidth}" height="${Math.max(0, innerBlockHeight)}"/></clipPath>
  </defs>`;
  const horizontalFeatherStart = coverFeather / PANEL.front;
  const horizontalFeatherEnd = 1 - horizontalFeatherStart;
  const bottomFeatherStart = 1 - coverFeather / coverBound;
  const coverFeatherDefs = coverFeather > 0 ? `<defs>
    <linearGradient id="coverHorizontalFeatherGradient" gradientUnits="userSpaceOnUse" x1="${xFront}" y1="0" x2="${xFront + PANEL.front}" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0"/>
      <stop offset="${horizontalFeatherStart}" stop-color="white" stop-opacity="1"/>
      <stop offset="${horizontalFeatherEnd}" stop-color="white" stop-opacity="1"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="coverBottomFeatherGradient" gradientUnits="userSpaceOnUse" x1="0" y1="${coverBound - coverFeather}" x2="0" y2="${coverBound}">
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
    const quoteLines = approximateWrap(data.quote, PANEL.height - pad * 2, 3);
    const lineHeight = 4;
    const quoteHeight = quoteLines.length * lineHeight;
    const quoteY = (PANEL.back - quoteHeight) / 2 + 3;
    pieces.push(`<g transform="translate(${xBack + PANEL.back} 0) rotate(90)" clip-path="url(#backTextClip)">`);
    pieces.push(svgTextLines(quoteLines, PANEL.height / 2, quoteY, {
      size: 3, lineHeight, color: data.accent, weight: 600, anchor: "middle", font
    }));
    pieces.push("</g>");
  }

  pieces.push(`<g transform="translate(${xSide + PANEL.side} 0) rotate(90)" clip-path="url(#sideTextClip)">`);
  const paletteStart = coverBound;
  const sideTextWidth = Math.max(1, paletteStart - 2 * pad);
  const sideArtistLines = data.artist ? approximateWrap(data.artist, sideTextWidth, 3) : [];
  const sideAlbumLines = data.album ? approximateWrap(data.album, sideTextWidth, 3) : [];
  const sideTextLines = [...sideArtistLines, ...sideAlbumLines];
  const sideTextY = (PANEL.side - (sideTextLines.length - 1) * 4) / 2;
  pieces.push(`<g id="side-panel-copy">`);
  pieces.push(svgTextLines(sideArtistLines, pad, sideTextY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start"
  }));
  pieces.push(svgTextLines(sideAlbumLines, pad, sideTextY + sideArtistLines.length * 4, {
    size: 3, lineHeight: 4, color: data.text, weight: 600, font, anchor: "start"
  }));
  pieces.push("</g>");
  const paletteEnd = PANEL.height - pad;
  const swatchSize = Math.max(0, Math.min(PANEL.side - 2 * pad, (paletteEnd - paletteStart) / 5));
  const swatchGap = ((paletteEnd - paletteStart) - swatchSize * 5) / 4;
  palette.forEach((color, index) => {
    const sx = paletteStart + index * (swatchSize + swatchGap);
    pieces.push(`<rect x="${sx}" y="${pad}" width="${swatchSize}" height="${swatchSize}" fill="${color}"/>`);
  });
  pieces.push("</g>");

  if (data.cover) {
    const coverImage = `<image href="${data.cover}" x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" preserveAspectRatio="xMidYMid slice"/>`;
    const reflectedImage = `<image href="${data.cover}" x="${xFront}" y="0" width="${PANEL.front}" height="${coverBound}" preserveAspectRatio="xMidYMid slice" transform="translate(0 ${coverBleedOverlap}) scale(1 -1)"/>`;
    if (coverFeather > 0) {
      pieces.push(`<g clip-path="url(#topCoverBleedClip)" mask="url(#coverHorizontalFeatherMask)">${reflectedImage}</g>`);
      pieces.push(`<g mask="url(#coverHorizontalFeatherMask)"><g mask="url(#coverBottomFeatherMask)">${coverImage}</g></g>`);
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
  const titleY = coverBound + pad + 2.25;
  const dateReserve = 8;
  const artistAvailableHeight = Math.max(4, PANEL.height - pad - dateReserve - titleY);
  const artistLines = approximateWrap(
    data.artist || "",
    PANEL.front - pad * 2,
    3,
    (text) => measuredTextWidth(text, data.font, 600)
  );
  const maxArtistLines = Math.max(1, Math.floor(artistAvailableHeight / 4));
  const shownArtistLines = artistLines.slice(0, maxArtistLines);
  pieces.push(svgTextLines(shownArtistLines, xFront + pad, titleY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start"
  }));
  const albumY = titleY + Math.max(1, shownArtistLines.length) * 4 + pad;
  const dateY = PANEL.height - pad - 1;
  const albumMaxHeight = Math.max(3, dateY - albumY - pad);
  let infoSize = 3;
  let albumLines = [];
  let albumLineHeight = 4;
  while (infoSize >= 1.8) {
    albumLineHeight = infoSize * 1.35;
    const titleLines = approximateWrap(data.album || "", PANEL.front - pad * 2, infoSize);
    const infoLines = approximateWrap(data.info || "", PANEL.front - pad * 2, infoSize);
    albumLines = [...titleLines, ...infoLines];
    if (albumLines.length * albumLineHeight <= albumMaxHeight) break;
    infoSize -= 0.2;
  }
  const titleRows = approximateWrap(data.album || "", PANEL.front - pad * 2, infoSize);
  const infoRows = approximateWrap(data.info || "", PANEL.front - pad * 2, infoSize);
  pieces.push(svgTextLines(titleRows, xFront + pad, albumY, {
    size: infoSize, lineHeight: albumLineHeight, color: data.text, weight: 600, font, anchor: "start"
  }));
  pieces.push(svgTextLines(infoRows, xFront + pad, albumY + titleRows.length * albumLineHeight, {
    size: infoSize, lineHeight: albumLineHeight, color: data.text, weight: 400, font, anchor: "start"
  }));
  pieces.push(svgTextLines([data.date], xFront + PANEL.front - pad, dateY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 400, font, anchor: "end"
  }));
  pieces.push("</g>");

  pieces.push(`<g clip-path="url(#sideATracksClip)">`);
  const sideATitleLines = approximateWrap(data.sideATitle, innerContentWidth, 3);
  const sideATitleY = sideAY + 3;
  const sideATitleHeight = Math.max(3, sideATitleLines.length * 4);
  const sideASongsGuideY = sideATitleY - 3 + sideATitleHeight + pad;
  const sideATracksY = sideASongsGuideY + 2.5;
  pieces.push(svgTextLines(sideATitleLines, xInner + pad, sideATitleY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start"
  }));
  pieces.push(renderInnerTracks(
    data.sideASongs, xInner + pad, sideATracksY,
    innerContentWidth, data.text, data.accent, font
  ));
  pieces.push("</g>");

  pieces.push(`<g clip-path="url(#sideBTracksClip)">`);
  const sideBTitleLines = approximateWrap(data.sideBTitle, innerContentWidth, 3);
  const sideBTitleY = sideBY + 3;
  const sideBTitleHeight = Math.max(3, sideBTitleLines.length * 4);
  const sideBSongsGuideY = sideBTitleY - 3 + sideBTitleHeight + pad;
  const sideBTracksY = sideBSongsGuideY + 2.5;
  pieces.push(svgTextLines(sideBTitleLines, xInner + pad, sideBTitleY, {
    size: 3, lineHeight: 4, color: data.accent, weight: 600, font, anchor: "start"
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
    const text = copy?.querySelector("text");
    if (!copy || !text) return;
    const bounds = text.getBBox();
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

function renderLayoutGuides(layout) {
  const {
    xBack, xSide, xFront, xInner, coverBound, pad, innerBlockHeight,
    innerContentWidth, sideAY, sideBY, sideTextWidth, paletteStart, paletteEnd,
    titleY, shownArtistLines, albumY, albumMaxHeight, dateY,
    sideATitleLines, sideATitleY, sideASongsGuideY,
    sideBTitleLines, sideBTitleY, sideBSongsGuideY
  } = layout;
  const rect = (x, y, width, height) =>
    `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(0, height)}"/>`;
  const innerGuides = (blockY, titleLines, titleY, songsY) => {
    const titleHeight = Math.max(3, titleLines.length * 4);
    const songsBottom = blockY + innerBlockHeight;
    return [
      rect(xInner + pad, titleY - 3, innerContentWidth, titleHeight),
      rect(xInner + pad, songsY, innerContentWidth, songsBottom - songsY)
    ].join("");
  };
  return `  <g class="screen-only grid-guides" fill="none" stroke="#777" stroke-width=".35" stroke-dasharray="2 1.5" opacity=".85">
    ${rect(xBack, 0, PANEL.back, PANEL.height)}
    ${rect(xSide, 0, PANEL.side, PANEL.height)}
    ${rect(xFront, 0, PANEL.front, PANEL.height)}
    ${rect(xInner, 0, PANEL.inner, PANEL.height)}
  <line x1="${xFront}" y1="${coverBound}" x2="${xFront + PANEL.front}" y2="${coverBound}"/>
  </g>
  <g class="screen-only padding-guides" fill="none" stroke="#999" stroke-width=".25" stroke-dasharray="1 1" opacity=".8">
    ${rect(xBack + pad, pad, PANEL.back - 2 * pad, PANEL.height - 2 * pad)}
    <g transform="translate(${xSide + PANEL.side} 0) rotate(90)">
      ${rect(pad, pad, sideTextWidth, PANEL.side - 2 * pad)}
      ${rect(paletteStart, pad, paletteEnd - paletteStart, PANEL.side - 2 * pad)}
    </g>
    ${rect(xFront + pad, titleY - 3, PANEL.front - 2 * pad, Math.max(4, shownArtistLines.length * 4))}
    ${rect(xFront + pad, albumY - 3, PANEL.front - 2 * pad, albumMaxHeight)}
    ${rect(xFront + pad, dateY - 3, PANEL.front - 2 * pad, 4)}
    ${innerGuides(sideAY, sideATitleLines, sideATitleY, sideASongsGuideY)}
    ${innerGuides(sideBY, sideBTitleLines, sideBTitleY, sideBSongsGuideY)}
  </g>`;
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
    const lines = approximateWrap(track.title, titleWidth, fontSize);
    pieces.push(svgTextLines([`${index + 1}.`], x, y, {
      size: fontSize, lineHeight, color: textColor, weight: 400, font, anchor: "start"
    }));
    pieces.push(svgTextLines(lines, titleX, y, {
      size: fontSize, lineHeight, color: track.highlighted ? accentColor : textColor, weight: 400, font, anchor: "start"
    }));
    y += Math.max(1, lines.length) * lineHeight;
  });

  return pieces.join("");
}

