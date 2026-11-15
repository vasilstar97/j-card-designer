import { BLEED_MM, MARK_EXTENSION_MM, PANEL } from "./constants.js";

export async function createPrintCanvas(svgElement) {
  await document.fonts.ready;
  const sourceSvg = svgElement.cloneNode(true);
  sourceSvg.querySelectorAll(".screen-only").forEach((element) => element.remove());
  sourceSvg.classList.remove("hide-print-guides");
  sourceSvg.removeAttribute("style");
  sourceSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const totalWidth = PANEL.back + PANEL.side + PANEL.front + PANEL.inner;
  const printMargin = BLEED_MM + MARK_EXTENSION_MM;
  const widthMm = totalWidth + printMargin * 2;
  const heightMm = PANEL.height + printMargin * 2;
  sourceSvg.setAttribute("width", `${widthMm}mm`);
  sourceSvg.setAttribute("height", `${heightMm}mm`);

  const svgBlob = new Blob([new XMLSerializer().serializeToString(sourceSvg)], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise((resolve, reject) => {
      const raster = new Image();
      raster.addEventListener("load", () => resolve(raster));
      raster.addEventListener("error", () => reject(new Error("Could not render the artwork for print.")));
      raster.src = svgUrl;
    });

    const pixelWidth = Math.round((widthMm / 25.4) * 300);
    const pixelHeight = Math.round((heightMm / 25.4) * 300);
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot create the print image.");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
