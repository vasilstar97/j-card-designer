import React, { useEffect, useRef, useState } from "react";
import Modal from "antd/es/modal";
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

export default function CardStorage({ cards, activeCardId, onSelectCard, onAddCard, onCloseCard, onImportCard, importing, onIncludeInPdfChange }) {
  const importInput = useRef(null);
  const stack = useRef(null);
  const newestCardId = cards[0]?.id;
  useEffect(() => {
    if (stack.current) stack.current.scrollTop = 0;
  }, [newestCardId]);
  const [modal, contextHolder] = Modal.useModal();
  const confirmRemoval = (card) => modal.confirm({
    title: "Delete J-card?",
    content: `${card.data.artist || "Artist"} — ${card.title}. This design will be removed from storage on this device.`,
    okText: "Delete",
    cancelText: "Cancel",
    okButtonProps: { danger: true },
    centered: true,
    onOk: () => onCloseCard(card.id)
  });
  return (
    <aside className="storage-sidebar" aria-label="Cassette storage"
      style={{ "--spine-width": `${PANEL.height}mm`, "--spine-aspect": PANEL.height / PANEL.side }}>
      {contextHolder}
      <div className="storage-toolbar">
        <div className="storage-actions">
          <button className="storage-add" type="button" disabled={importing} onClick={() => importInput.current?.click()}>
            {importing ? "Importing…" : "Import"}
          </button>
          <button className="storage-add" type="button" aria-label="Add J-card" onClick={onAddCard}>+ Add</button>
        </div>
        <input ref={importInput} type="file" accept=".json,application/json" hidden aria-label="Import cassette file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImportCard(file);
          }} />
      </div>
      <div className="cassette-stack" ref={stack}>
        <table className="storage-table" aria-label="J-card designs">
          <colgroup><col className="storage-pdf-column" /><col /><col className="storage-action-column" /></colgroup>
          <thead><tr>
            <th scope="col" title="Include in PDF">PDF</th>
            <th scope="col">Side panel</th>
            <th scope="col"><span className="visually-hidden">Delete</span></th>
          </tr></thead>
          <tbody>
            {cards.map((card) => (
              <tr className="cassette-row" key={card.id}>
                <td className="storage-pdf-cell">
                  <input type="checkbox" checked={card.includeInPdf !== false} aria-label={`Include ${card.title} in PDF`}
                    onChange={(event) => onIncludeInPdfChange(card.id, event.target.checked)} />
                </td>
                <td className="storage-spine-cell">
                  <div className={`cassette-item${card.id === activeCardId ? " is-active" : ""}`}>
                    <button className="cassette-select" type="button" aria-pressed={card.id === activeCardId}
                      aria-label={`${card.data.artist || "Artist"} — ${card.title}`} title={`${card.data.artist || "Artist"} — ${card.title}`}
                      onClick={() => onSelectCard(card.id)} style={{ background: card.data.colors.background }}>
                      <CardSpine data={card.data} />
                    </button>
                  </div>
                </td>
                <td className="storage-delete-cell">
                  <button className="cassette-remove" type="button" aria-label={`Delete ${card.title}`} disabled={cards.length <= 1}
                    title="Delete J-card" onClick={() => confirmRemoval(card)}>
                    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 5.5h13M7 5.5V3h6v2.5M5 5.5l.8 11h8.4l.8-11M8 8.5v5M12 8.5v5" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="storage-note">Saved on this device</p>
    </aside>
  );
}
