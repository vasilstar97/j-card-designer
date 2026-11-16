import { useEffect, useRef, useState } from "react";
import { BLEED_MM, MARK_EXTENSION_MM, PANEL } from "../editor/constants.js";

const margin = BLEED_MM + MARK_EXTENSION_MM;
const aspectRatio = (PANEL.back + PANEL.side + PANEL.front + PANEL.inner + 2 * margin) / (PANEL.height + 2 * margin);
const initialCamera = { x: 0, y: 0, zoom: 1 };

export default function useArtworkViewport(enabled) {
  const viewportRef = useRef(null);
  const drag = useRef(null);
  const [camera, setCamera] = useState(initialCamera);
  const [fitWidth, setFitWidth] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    const observer = new ResizeObserver(() => {
      setFitWidth(Math.max(1, Math.min(viewport.clientWidth - 48, (viewport.clientHeight - 48) * aspectRatio)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const viewport = viewportRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
      drag.current = null;
      setCamera((current) => {
        const zoom = Math.max(0.1, Math.min(8, current.zoom * Math.exp(-delta * 0.0015)));
        const ratio = zoom / current.zoom;
        return { zoom, x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio };
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [enabled]);

  const onPointerDown = (event) => {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: camera.x, y: camera.y };
  };
  const onPointerMove = (event) => {
    const start = drag.current;
    if (!enabled || !start || event.pointerId !== start.id) return;
    setCamera((current) => ({ ...current, x: start.x + event.clientX - start.startX, y: start.y + event.clientY - start.startY }));
  };
  const onPointerUp = (event) => {
    drag.current = null;
    if (enabled && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return {
    viewportRef,
    camera,
    reset: () => { drag.current = null; setCamera(initialCamera); },
    planeStyle: {
      width: fitWidth,
      height: fitWidth / aspectRatio,
      transform: `translate(-50%, -50%) translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
    },
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onLostPointerCapture: () => { drag.current = null; } }
  };
}
