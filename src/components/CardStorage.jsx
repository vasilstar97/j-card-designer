import React, { useEffect, useState } from "react";
import { createCardArtworkSvg } from "../editor/controller.js";
import { PANEL } from "../editor/constants.js";

const CardSpine = React.memo(function CardSpine({ data }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active) return;
      // Use the print renderer, omitting the cover outside the spine.
      const artwork = createCardArtworkSvg({ ...data, cover: "" });
      try {
        artwork.querySelectorAll(".screen-only, .print-guides").forEach((node) => node.remove());
        const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PANEL.height} ${PANEL.side}"><g transform="translate(0 ${PANEL.side}) rotate(-90) translate(${-PANEL.back} 0)">${artwork.innerHTML}</g></svg>`;
        setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sourceSvg)}`);
      } finally {
        artwork.remove();
      }
    };
    refresh();
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    return () => {
      active = false;
      document.fonts.removeEventListener("loadingdone", refresh);
    };
  }, [data]);
  return source ? <img className="cassette-spine" src={source} alt="" draggable="false" /> : null;
});

export default function CardStorage({ cards, activeCardId, onSelectCard, onAddCard, onCloseCard }) {
  return (
    <aside className="storage-sidebar" aria-label="Cassette storage">
      <div className="editor-heading">
        <h2>Storage</h2>
        <button className="storage-add" type="button" aria-label="Add J-card" onClick={onAddCard}>+ Add</button>
      </div>
      <div className="cassette-stack" role="tablist" aria-label="J-card designs" aria-orientation="vertical">
        {cards.map((card) => (
          <div className={`cassette-item${card.id === activeCardId ? " is-active" : ""}`} key={card.id}>
            <button className="cassette-select" type="button" role="tab" aria-selected={card.id === activeCardId}
              aria-label={`${card.data.artist || "Artist"} — ${card.title}`} title={`${card.data.artist || "Artist"} — ${card.title}`}
              onClick={() => onSelectCard(card.id)} style={{ background: card.data.colors.background }}>
              <CardSpine data={card.data} />
            </button>
            {cards.length > 1 && <button className="cassette-remove" type="button" aria-label={`Close ${card.title}`}
              title="Remove J-card" onClick={() => onCloseCard(card.id)}>×</button>}
          </div>
        ))}
      </div>
      <p className="storage-note">Saved on this device</p>
    </aside>
  );
}
