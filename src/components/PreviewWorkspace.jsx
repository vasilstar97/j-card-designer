import React, { useState } from "react";
import Card3DPreview from "./Card3DPreview.jsx";
import useArtworkViewport from "./useArtworkViewport.js";

function PreviewToolbar({ viewMode, onViewModeToggle, onFit, onActualSize, isActualSize }) {
  return (
    <nav className="preview-toolbar" aria-label="Preview controls">
      <button
        className="preview-mode-toggle"
        type="button"
        aria-label={`Switch to ${viewMode === "2d" ? "3D" : "2D"} preview`}
        aria-pressed={viewMode === "3d"}
        onClick={onViewModeToggle}
      >
        {viewMode === "2d" ? "3D" : "2D"}
      </button>
      <div className="preview-guide-options">
        <label className="guide-toggle">
          <input id="show-grid" type="checkbox" defaultChecked />
          <span>Grid</span>
        </label>
        <label className="guide-toggle">
          <input id="show-padding-guides" type="checkbox" defaultChecked />
          <span>Padding guides</span>
        </label>
        <label className="guide-toggle">
          <input id="show-print-guides" type="checkbox" defaultChecked />
          <span>Fold &amp; cut marks</span>
        </label>
      </div>
      {viewMode === "2d" && <div className="preview-scale-controls">
        <button className="preview-fit" type="button" onClick={onFit}>Fit</button>
        <button className="preview-fit" type="button" onClick={onActualSize} aria-pressed={isActualSize}
          title="Use artwork dimensions in CSS millimeters. Physical size depends on browser zoom and display scaling.">1:1 (mm)</button>
      </div>}
    </nav>
  );
}

function PreviewFooter({
  onExport,
  exporting,
  includeInPdf,
  onIncludeInPdfChange,
  hasIncludedCards,
  paperSize,
  onPaperSizeChange,
  colorMode,
  onColorModeChange
}) {
  return (
    <footer className="preview-footer" aria-label="PDF export controls">
      <div className="export-actions">
        <label className="guide-toggle" title="Include this J-card in the exported PDF">
          <input type="checkbox" checked={includeInPdf} onChange={(event) => onIncludeInPdfChange(event.target.checked)} />
          <span>Include in PDF</span>
        </label>
        <select
          className="paper-size-select"
          aria-label="PDF paper size"
          value={paperSize}
          onChange={(event) => onPaperSizeChange(event.target.value)}
        >
          <option value="A4">A4</option>
          <option value="A3">A3</option>
        </select>
        <select
          className="color-mode-select"
          aria-label="PDF color mode"
          title="RGB stays closer to the preview; ask the print shop to convert it. Generic CMYK is not tied to a print profile."
          value={colorMode}
          onChange={(event) => onColorModeChange(event.target.value)}
        >
          <option value="RGB">RGB (sRGB)</option>
          <option value="CMYK">CMYK (generic)</option>
        </select>
        <button className="button button-primary" type="button" disabled={exporting || !hasIncludedCards} onClick={() => onExport(paperSize, colorMode)}>
          Download PDF
        </button>
      </div>
    </footer>
  );
}

export default function PreviewWorkspace({
  onExport,
  exporting,
  includeInPdf,
  onIncludeInPdfChange,
  hasIncludedCards
}) {
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("RGB");
  const [viewMode, setViewMode] = useState("2d");
  const viewport = useArtworkViewport(viewMode === "2d");
  return (
    <section className="preview-area" aria-label="J-card preview">
      <PreviewToolbar viewMode={viewMode} onViewModeToggle={() => setViewMode((mode) => mode === "2d" ? "3d" : "2d")}
        onFit={viewport.reset} onActualSize={viewport.actualSize} isActualSize={viewport.camera.actualSize && viewport.camera.zoom === 1} />
      <div className="preview-main">
        <div className={`artwork-wrap${viewMode === "3d" ? " is-3d" : ""}`} ref={viewport.viewportRef}
          {...viewport.handlers} onDragStart={(event) => event.preventDefault()}>
          <div className="artwork-plane" style={viewport.planeStyle}>
            <svg id="artwork" xmlns="http://www.w3.org/2000/svg" aria-label="J-card artwork preview" />
          </div>
          {viewMode === "3d" && <Card3DPreview />}
          {viewMode === "2d" && <span className="canvas-hint">Drag to move · Scroll to zoom · {Math.round(viewport.camera.zoom * 100)}%</span>}
        </div>
        <div className="canvas-footer">
          <span id="image-status" aria-live="polite" />
        </div>
      </div>
      <PreviewFooter
        onExport={onExport}
        exporting={exporting}
        includeInPdf={includeInPdf}
        onIncludeInPdfChange={onIncludeInPdfChange}
        hasIncludedCards={hasIncludedCards}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />
    </section>
  );
}
