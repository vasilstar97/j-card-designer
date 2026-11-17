import React, { useEffect, useRef, useState } from "react";
import { PANEL } from "../editor/constants.js";

const RENDER_SCALE = 2;
const CASE_SCALE = 3.1 * RENDER_SCALE;
const CASE_WIDTH = PANEL.front * CASE_SCALE;
const CASE_HEIGHT = PANEL.height * CASE_SCALE;
const CASE_DEPTH = PANEL.side * CASE_SCALE;

const panelRanges = {
  back: { x: 0, width: PANEL.back },
  side: { x: PANEL.back, width: PANEL.side },
  front: { x: PANEL.back + PANEL.side, width: PANEL.front },
  inner: { x: PANEL.back + PANEL.side + PANEL.front, width: PANEL.inner }
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("Could not render the artwork for 3D preview.")), { once: true });
    image.src = url;
  });
}

async function createPanelTextures(sourceSvg) {
  await document.fonts.ready;
  const viewBox = sourceSvg.getAttribute("viewBox").trim().split(/\s+/).map(Number);
  if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error("The J-card preview has invalid dimensions.");
  }
  const svg = sourceSvg.cloneNode(true);
  svg.removeAttribute("id");
  svg.removeAttribute("class");
  svg.removeAttribute("style");
  svg.querySelectorAll(".screen-only, .print-guides").forEach((element) => element.remove());
  // Use exact panel boundaries to avoid sampling the adjacent panel or bleed.
  const entries = Object.entries(panelRanges).map(([name, range]) => {
    const panelSvg = svg.cloneNode(true);
    panelSvg.setAttribute("viewBox", `${range.x} 0 ${range.width} ${PANEL.height}`);
    panelSvg.setAttribute("width", `${range.width * CASE_SCALE}px`);
    panelSvg.setAttribute("height", `${CASE_HEIGHT}px`);
    panelSvg.setAttribute("preserveAspectRatio", "none");
    return [name, URL.createObjectURL(new Blob(
      [new XMLSerializer().serializeToString(panelSvg)],
      { type: "image/svg+xml;charset=utf-8" }
    ))];
  });
  try {
    // Keep vector textures; avoid four canvas rasterizations and PNG encodes per edit.
    await Promise.all(entries.map(([, url]) => loadImage(url)));
    return Object.fromEntries(entries);
  } catch (error) {
    entries.forEach(([, url]) => URL.revokeObjectURL(url));
    throw error;
  }
}

function PanelTexture({ src, widthMm, className = "" }) {
  if (!src) return null;
  return (
    <img
      className={`card3d-panel-texture ${className}`}
      src={src}
      alt=""
      draggable="false"
      style={{ width: widthMm * CASE_SCALE, height: PANEL.height * CASE_SCALE }}
    />
  );
}

export default function Card3DPreview() {
  const [textures, setTextures] = useState(null);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState({ x: -12, y: -18 });
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef(null);
  const dragStart = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      setZoom((current) => Math.max(0.5, Math.min(2.5, current * Math.exp(-delta * 0.0015))));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => {
    if (textures) Object.values(textures).forEach((url) => URL.revokeObjectURL(url));
  }, [textures]);

  useEffect(() => {
    const sourceSvg = document.querySelector("#artwork");
    if (!sourceSvg) return undefined;
    let generation = 0;
    let active = true;
    let timer;
    let rendering = false;
    const refreshTextures = async () => {
      if (rendering || !active) return;
      rendering = true;
      const currentGeneration = generation;
      try {
        const nextTextures = await createPanelTextures(sourceSvg);
        if (!active || currentGeneration !== generation) {
          Object.values(nextTextures).forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setTextures(nextTextures);
        setError("");
      } catch (renderError) {
        if (!active || currentGeneration !== generation) return;
        setError(renderError.message || "Could not render the 3D preview.");
      } finally {
        rendering = false;
        if (active && currentGeneration !== generation) {
          clearTimeout(timer);
          timer = setTimeout(refreshTextures, 180);
        }
      }
    };
    const observer = new MutationObserver(() => {
      generation++;
      clearTimeout(timer);
      timer = setTimeout(refreshTextures, 180);
    });
    observer.observe(sourceSvg, { childList: true, subtree: true, characterData: true, attributes: true });
    refreshTextures();

    return () => {
      active = false;
      generation++;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotationX: rotation.x,
      rotationY: rotation.y
    };
  };
  const onPointerMove = (event) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setRotation({
      x: Math.max(-65, Math.min(65, start.rotationX - (event.clientY - start.y) * 0.45)),
      y: start.rotationY + (event.clientX - start.x) * 0.55
    });
  };
  const onPointerUp = (event) => {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const modelStyle = {
    width: CASE_WIDTH,
    height: CASE_HEIGHT,
    transform: `scale3d(${zoom}, ${zoom}, ${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
    "--paper-offset": `${2 * RENDER_SCALE}px`,
    "--inner-width": `${PANEL.inner * CASE_SCALE}px`,
    "--case-depth": `${CASE_DEPTH}px`,
    "--case-width": `${CASE_WIDTH}px`,
    "--case-height": `${CASE_HEIGHT}px`
  };

  return (
    <div
      className="card3d-stage"
      ref={stageRef}
      aria-label="3D J-card preview. Drag to rotate. Scroll to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {error ? (
        <p className="card3d-error" role="status">{error}</p>
      ) : (
        <>
          <div className="card3d-supersample" style={{
            width: `${RENDER_SCALE * 100}%`, height: `${RENDER_SCALE * 100}%`,
            transform: `translate(-50%, -50%) scale(${1 / RENDER_SCALE})`,
            perspective: 1100 * RENDER_SCALE,
            "--edge-width": `${RENDER_SCALE}px`
          }}>
          <div className="card3d-model" style={modelStyle}>
            <div className="card3d-face card3d-front-face">
              <PanelTexture src={textures?.front} widthMm={PANEL.front} className="card3d-front-texture" />
              <div className="card3d-glass" />
            </div>
            <div className="card3d-face card3d-inner-insert">
              <PanelTexture src={textures?.inner} widthMm={PANEL.inner} className="card3d-inner-texture" />
            </div>
            <div className="card3d-face card3d-back-face">
              <div className="card3d-back-panel">
                <PanelTexture src={textures?.back} widthMm={PANEL.back} className="card3d-back-texture" />
              </div>
              <div className="card3d-glass" />
            </div>
            <div className="card3d-face card3d-back-reverse">
              <div className="card3d-back-reverse-panel" />
            </div>
            <div className="card3d-face card3d-spine-face">
              <PanelTexture src={textures?.side} widthMm={PANEL.side} className="card3d-spine-texture" />
            </div>
            <div className="card3d-face card3d-spine-reverse" />
            <div className="card3d-face card3d-wall card3d-top-wall"><div className="card3d-glass" /></div>
            <div className="card3d-face card3d-wall card3d-bottom-wall"><div className="card3d-glass" /></div>
            <div className="card3d-face card3d-wall card3d-right-wall"><div className="card3d-glass" /></div>
          </div>
          </div>
          <span className="card3d-hint">Drag to rotate · Scroll to zoom · {Math.round(zoom * 100)}%</span>
        </>
      )}
    </div>
  );
}
