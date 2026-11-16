import React, { useEffect, useState } from "react";
import Card3DPreview from "./Card3DPreview.jsx";

function CardTabs({ cards, activeCardId, onSelectCard, onAddCard, onCloseCard, onRegisterTitleUpdater }) {
  const [titleOverride, setTitleOverride] = useState(null);
  useEffect(() => {
    onRegisterTitleUpdater((id, title) => setTitleOverride({ id, title }));
    return () => onRegisterTitleUpdater(null);
  }, [onRegisterTitleUpdater]);
  useEffect(() => setTitleOverride(null), [activeCardId, cards]);

  return (
    <div className="card-tabs" role="tablist" aria-label="J-card designs">
      {cards.map((card) => {
        const title = titleOverride?.id === card.id ? titleOverride.title : card.title;
        return (
          <div className="card-tab-item" role="presentation" key={card.id}>
            <button
              className="card-tab"
              type="button"
              role="tab"
              aria-selected={card.id === activeCardId}
              onClick={() => onSelectCard(card.id)}
              title={title}
            >
              {title}
            </button>
            {cards.length > 1 && (
              <button
                className="card-tab-close"
                type="button"
                aria-label={`Close ${title}`}
                onClick={() => onCloseCard(card.id)}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button className="card-tab-add" type="button" aria-label="Add J-card" onClick={onAddCard}>
        +
      </button>
    </div>
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
  onColorModeChange,
  viewMode,
  onViewModeToggle
}) {
  return (
    <footer className="preview-footer" aria-label="Preview and export controls">
      <button
        className="preview-mode-toggle"
        type="button"
        aria-label={`Switch to ${viewMode === "2d" ? "3D" : "2D"} preview`}
        aria-pressed={viewMode === "3d"}
        onClick={onViewModeToggle}
      >
        {viewMode === "2d" ? "3D" : "2D"}
      </button>
      <div className="preview-footer-options">
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
  cards,
  activeCardId,
  onSelectCard,
  onAddCard,
  onCloseCard,
  onRegisterTitleUpdater,
  onExport,
  exporting,
  includeInPdf,
  onIncludeInPdfChange,
  hasIncludedCards
}) {
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("RGB");
  const [viewMode, setViewMode] = useState("2d");
  return (
    <section className="preview-area" aria-label="J-card preview">
      <CardTabs
        cards={cards}
        activeCardId={activeCardId}
        onSelectCard={onSelectCard}
        onAddCard={onAddCard}
        onCloseCard={onCloseCard}
        onRegisterTitleUpdater={onRegisterTitleUpdater}
      />
      <div className="preview-main">
        <div className={`artwork-wrap${viewMode === "3d" ? " is-3d" : ""}`}>
          <svg id="artwork" xmlns="http://www.w3.org/2000/svg" aria-label="J-card artwork preview" />
          {viewMode === "3d" && <Card3DPreview />}
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
        viewMode={viewMode}
        onViewModeToggle={() => setViewMode((mode) => mode === "2d" ? "3d" : "2d")}
      />
    </section>
  );
}
