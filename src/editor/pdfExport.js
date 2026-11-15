import { BLEED_MM, MARK_EXTENSION_MM, PANEL } from "./constants.js";
import { createPrintCanvas } from "./printRaster.js";

const encoder = new TextEncoder();
const SHEETS = {
  A4: { width: 210, height: 297, columns: 1, cardsPerPage: 2 },
  A3: { width: 420, height: 297, columns: 2, cardsPerPage: 4 }
};
const SHEET_GAP_MM = 10;

function toUint8(value) {
  return typeof value === "string" ? encoder.encode(value) : value;
}

function joinBytes(parts) {
  const arrays = parts.map(toUint8);
  const result = new Uint8Array(arrays.reduce((sum, array) => sum + array.length, 0));
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

async function deflate(bytes) {
  if (!window.CompressionStream) {
    throw new Error("PDF export requires a modern browser with CompressionStream support.");
  }
  const compressed = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

function makePdf(pages, pageWidthPt, pageHeightPt, colorSpace) {
  const pageReferences = pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  const objects = [
    toUint8("<< /Type /Catalog /Pages 2 0 R >>"),
    toUint8(`<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`)
  ];
  pages.forEach(({ imageBytes, pixelWidth, pixelHeight }, index) => {
    const pageObject = 3 + index * 3;
    const imageObject = pageObject + 1;
    const contentObject = pageObject + 2;
    const pageContent = `q\n${pageWidthPt.toFixed(4)} 0 0 ${pageHeightPt.toFixed(4)} 0 0 cm\n/Im0 Do\nQ`;
    objects.push(toUint8(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(4)} ${pageHeightPt.toFixed(4)}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    ));
    objects.push(joinBytes([
      `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /${colorSpace} /BitsPerComponent 8 /Filter /FlateDecode /Length ${imageBytes.length} >>\nstream\n`,
      imageBytes,
      "\nendstream"
    ]));
    objects.push(toUint8(`<< /Length ${encoder.encode(pageContent).length} >>\nstream\n${pageContent}\nendstream`));
  });
  const pieces = [toUint8("%PDF-1.4\n%JCard\n")];
  const offsets = [0];
  let offset = pieces[0].length;
  objects.forEach((object, index) => {
    offsets.push(offset);
    const wrapped = joinBytes([`${index + 1} 0 obj\n`, object, "\nendobj\n"]);
    pieces.push(wrapped);
    offset += wrapped.length;
  });
  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const objectOffset of offsets.slice(1)) xref += `${String(objectOffset).padStart(10, "0")} 00000 n \n`;
  pieces.push(toUint8(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([joinBytes(pieces)], { type: "application/pdf" });
}

function rgbToCmyk(imageData) {
  const pixels = imageData.data;
  const output = new Uint8Array(imageData.width * imageData.height * 4);
  for (let source = 0, target = 0; source < pixels.length; source += 4, target += 4) {
    const red = pixels[source] / 255;
    const green = pixels[source + 1] / 255;
    const blue = pixels[source + 2] / 255;
    const key = 1 - Math.max(red, green, blue);
    const divisor = 1 - key;
    const cyan = divisor === 0 ? 0 : (1 - red - key) / divisor;
    const magenta = divisor === 0 ? 0 : (1 - green - key) / divisor;
    const yellow = divisor === 0 ? 0 : (1 - blue - key) / divisor;
    output[target] = Math.round(cyan * 255);
    output[target + 1] = Math.round(magenta * 255);
    output[target + 2] = Math.round(yellow * 255);
    output[target + 3] = Math.round(key * 255);
  }
  return output;
}

function getRgbPixels(imageData) {
  const pixels = imageData.data;
  const output = new Uint8Array(imageData.width * imageData.height * 3);
  for (let source = 0, target = 0; source < pixels.length; source += 4, target += 3) {
    output[target] = pixels[source];
    output[target + 1] = pixels[source + 1];
    output[target + 2] = pixels[source + 2];
  }
  return output;
}

export async function createPrintPdf(svgElements, paperSize, colorMode = "CMYK") {
  const sheet = SHEETS[paperSize];
  if (!sheet) throw new Error("Choose A4 or A3 for the PDF.");
  if (!svgElements.length) throw new Error("The PDF needs at least one J-card.");
  if (!["RGB", "CMYK"].includes(colorMode)) throw new Error("Choose RGB or CMYK for the PDF.");
  const colorSpace = colorMode === "RGB" ? "DeviceRGB" : "DeviceCMYK";

  const pageWidth = Math.round((sheet.width / 25.4) * 300);
  const pageHeight = Math.round((sheet.height / 25.4) * 300);
  const pageWidthPt = (sheet.width / 25.4) * 72;
  const pageHeightPt = (sheet.height / 25.4) * 72;
  const cardWidthMm = PANEL.back + PANEL.side + PANEL.front + PANEL.inner + (BLEED_MM + MARK_EXTENSION_MM) * 2;
  const cardHeightMm = PANEL.height + (BLEED_MM + MARK_EXTENSION_MM) * 2;
  const cardWidthPx = Math.round((cardWidthMm / 25.4) * 300);
  const cardHeightPx = Math.round((cardHeightMm / 25.4) * 300);
  if (cardWidthMm > sheet.width || cardHeightMm > sheet.height) {
    throw new Error(`${paperSize} is too small to fit a J-card at its print size.`);
  }

  const pageCount = Math.ceil(svgElements.length / sheet.cardsPerPage);
  const pages = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const start = pageIndex * sheet.cardsPerPage;
    const cardCount = Math.min(sheet.cardsPerPage, svgElements.length - start);
    const rows = Math.ceil(cardCount / sheet.columns);
    const layoutHeight = rows * cardHeightMm + Math.max(0, rows - 1) * SHEET_GAP_MM;
    const top = (sheet.height - layoutHeight) / 2;
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = pageWidth;
    pageCanvas.height = pageHeight;
    const pageContext = pageCanvas.getContext("2d", { willReadFrequently: true });
    if (!pageContext) throw new Error("This browser cannot create a print sheet.");
    pageContext.fillStyle = "#FFFFFF";
    pageContext.fillRect(0, 0, pageWidth, pageHeight);

    for (let cardIndex = 0; cardIndex < cardCount; cardIndex++) {
      const cardCanvas = await createPrintCanvas(svgElements[start + cardIndex]);
      const row = Math.floor(cardIndex / sheet.columns);
      const firstInRow = row * sheet.columns;
      const cardsInRow = Math.min(sheet.columns, cardCount - firstInRow);
      const rowWidth = cardsInRow * cardWidthMm + Math.max(0, cardsInRow - 1) * SHEET_GAP_MM;
      const x = (sheet.width - rowWidth) / 2 + (cardIndex - firstInRow) * (cardWidthMm + SHEET_GAP_MM);
      const y = top + row * (cardHeightMm + SHEET_GAP_MM);
      pageContext.drawImage(
        cardCanvas,
        Math.round((x / 25.4) * 300),
        Math.round((y / 25.4) * 300),
        cardWidthPx,
        cardHeightPx
      );
    }

    const imageData = pageContext.getImageData(0, 0, pageWidth, pageHeight);
    const colorBytes = colorMode === "RGB" ? getRgbPixels(imageData) : rgbToCmyk(imageData);
    const compressed = await deflate(colorBytes);
    pages.push({ imageBytes: compressed, pixelWidth: pageWidth, pixelHeight: pageHeight });
  }
  return makePdf(pages, pageWidthPt, pageHeightPt, colorSpace);
}
