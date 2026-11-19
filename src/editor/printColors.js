// These are generic separations, not ICC print profiles.
export const PDF_COLOR_MODES = [
  { value: "RGB", label: "RGB (sRGB)" },
  { value: "ICC", label: "CMYK (ICC profile)" },
  { value: "CMYK", label: "CMYK (generic)" },
  { value: "CMYK_240", label: "CMYK (generic, 240% ink)" },
  { value: "CMYK_RICH", label: "CMYK (generic, rich black, 300% ink)" }
];

export function isPdfColorMode(value) {
  return PDF_COLOR_MODES.some((mode) => mode.value === value);
}

export function getPdfColorLabel(value) {
  return PDF_COLOR_MODES.find((mode) => mode.value === value)?.label || value;
}

export function convertPrintPixels(imageData, colorMode) {
  if (!isPdfColorMode(colorMode)) throw new Error("Choose a supported PDF color mode.");
  if (colorMode === "ICC") throw new Error("ICC colors must be converted with the selected profile.");
  const pixels = imageData.data;
  const rgb = colorMode === "RGB";
  const output = new Uint8Array(imageData.width * imageData.height * (rgb ? 3 : 4));
  const richBlack = colorMode === "CMYK_RICH";
  const inkLimit = colorMode === "CMYK_240" ? 2.4 : richBlack ? 3 : Infinity;
  for (let source = 0, target = 0; source < pixels.length; source += 4) {
    if (rgb) {
      output[target++] = pixels[source];
      output[target++] = pixels[source + 1];
      output[target++] = pixels[source + 2];
      continue;
    }
    const red = pixels[source] / 255;
    const green = pixels[source + 1] / 255;
    const blue = pixels[source + 2] / 255;
    // Maximum black replacement by default; rich black retains more CMY.
    const key = (1 - Math.max(red, green, blue)) * (richBlack ? 0.5 : 1);
    const divisor = 1 - key;
    const cyan = divisor === 0 ? 0 : (1 - red - key) / divisor;
    const magenta = divisor === 0 ? 0 : (1 - green - key) / divisor;
    const yellow = divisor === 0 ? 0 : (1 - blue - key) / divisor;
    const chromaticInk = cyan + magenta + yellow;
    // Keep K and proportionally reduce CMY to stay within the chosen ink budget.
    const factor = chromaticInk > 0 ? Math.min(1, (inkLimit - key) / chromaticInk) : 1;
    output[target++] = Math.round(cyan * factor * 255);
    output[target++] = Math.round(magenta * factor * 255);
    output[target++] = Math.round(yellow * factor * 255);
    output[target++] = Math.round(key * 255);
    // Quantization must not push the total above the advertised limit.
    const maxTotal = Math.floor(inkLimit * 255);
    let excess = output[target - 4] + output[target - 3] + output[target - 2] + output[target - 1] - maxTotal;
    for (let channel = target - 4; channel < target - 1 && excess > 0; channel++) {
      const reduction = Math.min(output[channel], excess);
      output[channel] -= reduction;
      excess -= reduction;
    }
  }
  return output;
}
