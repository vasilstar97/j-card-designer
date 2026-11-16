import React, { useRef, useState } from "react";
import { PaletteColorControl } from "./ColorControls.jsx";

const dragType = "application/x-j-card-palette-index";

export default function PaletteEditor({ colors, onChange, onReorder }) {
  const container = useRef(null);
  const draggedIndex = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const finishDrag = () => {
    draggedIndex.current = null;
    setDropIndex(null);
  };
  const moveWithKeyboard = (event, index) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const target = index + (event.key === "ArrowLeft" ? -1 : 1);
    if (target < 0 || target >= colors.length) return;
    onReorder(index, target);
    requestAnimationFrame(() => container.current?.querySelectorAll(".palette-reorder")[target]?.focus());
  };

  return (
    <div className="palette-colors" ref={container} role="group" aria-label="Palette colors. Drag handles or use left and right arrow keys to reorder."
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDropIndex(null);
      }}>
      {colors.map((color, index) => (
        <div className={`palette-slot${dropIndex === index ? " is-drop-target" : ""}`} key={index}
          onDragOver={(event) => {
            if (draggedIndex.current === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropIndex(index);
          }}
          onDrop={(event) => {
            if (draggedIndex.current === null) return;
            event.preventDefault();
            onReorder(draggedIndex.current, index);
            finishDrag();
          }}>
          <PaletteColorControl index={index} color={color}
            onChange={(value) => onChange(index, value)} onPick={(value) => onChange(index, value)} />
          <button className="palette-reorder" type="button" draggable
            aria-label={`Reorder palette color ${index + 1}`}
            title="Drag to reorder, or use ← / → when focused"
            onKeyDown={(event) => moveWithKeyboard(event, index)}
            onDragStart={(event) => {
              draggedIndex.current = index;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(dragType, String(index));
              event.dataTransfer.setDragImage(event.currentTarget.parentElement, 12, 12);
            }}
            onDragEnd={finishDrag}>⠿</button>
        </div>
      ))}
    </div>
  );
}
