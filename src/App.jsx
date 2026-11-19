import React, { useCallback, useEffect, useRef, useState } from "react";
import ConfigProvider from "antd/es/config-provider";
import {
  captureCardState,
  createDefaultCardState,
  exportArtwork,
  installEvents,
  loadImageFile,
  movePaletteColor,
  restoreCardState,
  setDesignColor as setEditorDesignColor,
  setPaletteColor,
  showEditorMessage
} from "./editor/controller.js";
import { loadWorkspace, saveWorkspace } from "./editor/storage.js";
import { cardFileName, readCardFile, serializeCard } from "./editor/cardTransfer.js";
import PreviewWorkspace from "./components/PreviewWorkspace.jsx";
import ReleaseSettings from "./components/ReleaseSettings.jsx";
import TrackListEditor from "./components/TrackListEditor.jsx";
import CardStorage from "./components/CardStorage.jsx";
import { colorDefaults, PANEL } from "./editor/constants.js";

function createCardId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCardTitle(album) {
  return album.trim() || "Untitled J-card";
}

function createCard(data = createDefaultCardState()) {
  return { id: createCardId(), title: getCardTitle(data.album), includeInPdf: true, data };
}

function normalizeCard(card) {
  if (!card || typeof card.id !== "string" || !card.data || typeof card.data !== "object") return null;
  const defaults = createDefaultCardState();
  const data = { ...defaults, ...card.data };
  if (
    typeof data.artist !== "string" ||
    typeof data.album !== "string" ||
    typeof data.info !== "string" ||
    typeof data.quote !== "string" ||
    typeof data.font !== "string" ||
    typeof data.date !== "string" ||
    typeof data.cover !== "string" ||
    typeof data.coverFeather !== "number" ||
    !Number.isFinite(data.coverFeather) ||
    data.coverFeather < 0 ||
    !Array.isArray(data.palette) ||
    !Array.isArray(data.sideASongs) ||
    !Array.isArray(data.sideBSongs)
  ) return null;
  data.coverFeather = Math.min(PANEL.front / 2, data.coverFeather);
  data.colors = { ...defaults.colors, ...data.colors };
  const isHexColor = (color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color);
  const validTracks = (tracks) =>
    tracks.every((track) =>
      track &&
      typeof track.title === "string" &&
      typeof track.highlighted === "boolean"
    );
  if (
    data.palette.length !== 5 ||
    !data.palette.every(isHexColor) ||
    !Object.values(data.colors).every(isHexColor) ||
    !validTracks(data.sideASongs) ||
    !validTracks(data.sideBSongs)
  ) return null;
  return { id: card.id, title: getCardTitle(data.album), includeInPdf: card.includeInPdf !== false, data };
}

function App() {
  const initialCards = useRef(null);
  if (!initialCards.current) initialCards.current = [createCard()];
  const [cards, setCards] = useState(initialCards.current);
  const [activeCardId, setActiveCardId] = useState(initialCards.current[0].id);
  const [paletteColors, setPaletteColors] = useState(initialCards.current[0].data.palette);
  const [designColors, setDesignColors] = useState(colorDefaults);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const cardsRef = useRef(cards);
  const activeCardIdRef = useRef(activeCardId);
  const workspaceLoaded = useRef(false);
  const persistenceAvailable = useRef(true);
  const saveTimer = useRef(null);

  const scheduleSave = useCallback((immediate = false) => {
    if (!workspaceLoaded.current || !persistenceAvailable.current) return;
    clearTimeout(saveTimer.current);
    const persist = () => {
      saveTimer.current = null;
      saveWorkspace({
        cards: cardsRef.current,
        activeCardId: activeCardIdRef.current
      }).catch((error) => {
        persistenceAvailable.current = false;
        showEditorMessage(`Could not save designs locally: ${error.message}`, true);
      });
    };
    if (immediate) persist();
    else saveTimer.current = setTimeout(persist, 350);
  }, []);

  const syncColors = useCallback((data) => {
    setPaletteColors((current) =>
      current.length === data.palette.length && current.every((color, index) => color === data.palette[index])
        ? current
        : [...data.palette]
    );
    setDesignColors((current) =>
      current.background === data.colors.background &&
      current.accent === data.colors.accent &&
      current.text === data.colors.text
        ? current
        : { ...data.colors }
    );
  }, []);

  const updateActiveCard = useCallback((data) => {
    const activeId = activeCardIdRef.current;
    const nextCards = cardsRef.current.map((card) =>
      card.id === activeId ? { ...card, title: getCardTitle(data.album), data } : card
    );
    cardsRef.current = nextCards;
    setCards(nextCards);
    syncColors(data);
    scheduleSave();
  }, [scheduleSave, syncColors]);

  useEffect(() => {
    let active = true;
    const removeEditorEvents = installEvents(updateActiveCard);
    const saveOnPageHide = () => {
      clearTimeout(saveTimer.current);
      if (!workspaceLoaded.current || !persistenceAvailable.current) return;
      saveWorkspace({
        cards: cardsRef.current,
        activeCardId: activeCardIdRef.current
      }).catch((error) => {
        showEditorMessage(`Could not save designs locally: ${error.message}`, true);
      });
    };
    window.addEventListener("pagehide", saveOnPageHide);

    loadWorkspace().then((workspace) => {
      if (!active) return;
      const savedCards = Array.isArray(workspace?.cards)
        ? workspace.cards.map(normalizeCard).filter(Boolean)
        : [];
      if (savedCards.length) {
        if (savedCards.length !== workspace.cards.length) {
          showEditorMessage("Some saved J-cards could not be loaded.", true);
        }
        const selected = savedCards.find((card) => card.id === workspace.activeCardId) || savedCards[0];
        cardsRef.current = savedCards;
        activeCardIdRef.current = selected.id;
        setCards(savedCards);
        setActiveCardId(selected.id);
        restoreCardState(selected.data);
        syncColors(selected.data);
      } else {
        const data = captureCardState();
        const firstCard = { ...cardsRef.current[0], title: getCardTitle(data.album), data };
        cardsRef.current = [firstCard];
        setCards([firstCard]);
        syncColors(data);
      }
      workspaceLoaded.current = true;
      setWorkspaceReady(true);
      if (!savedCards.length) scheduleSave();
    }).catch((error) => {
      if (!active) return;
      persistenceAvailable.current = false;
      const data = captureCardState();
      const firstCard = { ...cardsRef.current[0], title: getCardTitle(data.album), data };
      cardsRef.current = [firstCard];
      setCards([firstCard]);
      syncColors(data);
      workspaceLoaded.current = true;
      setWorkspaceReady(true);
      showEditorMessage(`Could not load saved designs: ${error.message}`, true);
    });

    return () => {
      active = false;
      clearTimeout(saveTimer.current);
      window.removeEventListener("pagehide", saveOnPageHide);
      removeEditorEvents();
    };
  }, [scheduleSave, syncColors, updateActiveCard]);

  const updateDesignColor = (name, value) => {
    const hex = value.toUpperCase();
    setDesignColors((colors) => ({ ...colors, [name]: hex }));
    setEditorDesignColor(name, hex);
  };

  const updatePaletteColor = (index, value) => {
    const hex = value.toUpperCase();
    setPaletteColors((colors) => colors.map((color, i) => i === index ? hex : color));
    setPaletteColor(index, hex);
  };

  const reorderPaletteColors = (from, to) => {
    movePaletteColor(from, to);
    scheduleSave(true);
  };

  const selectCard = (nextId) => {
    if (nextId === activeCardIdRef.current) return;
    const currentData = captureCardState();
    const nextCards = cardsRef.current.map((card) =>
      card.id === activeCardIdRef.current
        ? { ...card, title: getCardTitle(currentData.album), data: currentData }
        : card
    );
    const selected = nextCards.find((card) => card.id === nextId);
    if (!selected) return;
    cardsRef.current = nextCards;
    activeCardIdRef.current = nextId;
    setCards(nextCards);
    setActiveCardId(nextId);
    restoreCardState(selected.data);
    syncColors(selected.data);
    scheduleSave();
  };

  const appendCard = (nextCard) => {
    const currentData = captureCardState();
    const nextCards = cardsRef.current.map((card) =>
      card.id === activeCardIdRef.current
        ? { ...card, title: getCardTitle(currentData.album), data: currentData }
        : card
    );
    nextCards.unshift(nextCard);
    cardsRef.current = nextCards;
    activeCardIdRef.current = nextCard.id;
    setCards(nextCards);
    setActiveCardId(nextCard.id);
    restoreCardState(nextCard.data);
    syncColors(nextCard.data);
    scheduleSave(true);
  };

  const addCard = () => appendCard(createCard());

  const importCard = async (file) => {
    setImporting(true);
    try {
      const imported = await readCardFile(file);
      appendCard({ ...createCard(imported.data), includeInPdf: imported.includeInPdf });
      showEditorMessage("Cassette imported successfully.");
    } catch (error) {
      showEditorMessage(error.message || "Could not import the cassette.", true);
    } finally {
      setImporting(false);
    }
  };

  const exportCard = () => {
    const data = captureCardState();
    const card = { ...cardsRef.current.find((item) => item.id === activeCardIdRef.current), data };
    const blob = new Blob([serializeCard(card)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = cardFileName(data);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showEditorMessage("Cassette exported with its cover and track lists.");
  };

  const closeCard = (cardId) => {
    if (cardsRef.current.length <= 1) return;
    const currentData = captureCardState();
    const currentIndex = cardsRef.current.findIndex((card) => card.id === cardId);
    const nextCards = cardsRef.current
      .map((card) => card.id === activeCardIdRef.current
        ? { ...card, title: getCardTitle(currentData.album), data: currentData }
        : card
      )
      .filter((card) => card.id !== cardId);
    cardsRef.current = nextCards;
    setCards(nextCards);
    if (activeCardIdRef.current === cardId) {
      const selected = nextCards[Math.min(currentIndex, nextCards.length - 1)];
      activeCardIdRef.current = selected.id;
      setActiveCardId(selected.id);
      restoreCardState(selected.data);
      syncColors(selected.data);
    }
    scheduleSave();
  };

  const setCardIncludeInPdf = (cardId, includeInPdf) => {
    const data = captureCardState();
    const nextCards = cardsRef.current.map((card) => {
      let next = card.id === activeCardIdRef.current ? { ...card, title: getCardTitle(data.album), data } : card;
      if (card.id === cardId) next = { ...next, includeInPdf };
      return next;
    });
    cardsRef.current = nextCards;
    setCards(nextCards);
    scheduleSave(true);
  };

  const setIncludeInPdf = (includeInPdf) => setCardIncludeInPdf(activeCardIdRef.current, includeInPdf);

  const handleExport = async (paperSize, colorMode, iccOptions) => {
    const currentData = captureCardState();
    const exportCards = cardsRef.current.map((card) =>
      card.id === activeCardIdRef.current
        ? { ...card, title: getCardTitle(currentData.album), data: currentData }
        : card
    );
    cardsRef.current = exportCards;
    scheduleSave();
    const includedCards = exportCards.filter((card) => card.includeInPdf !== false);
    if (!includedCards.length) {
      showEditorMessage("Select at least one J-card to include in the PDF.", true);
      return;
    }
    setExporting(true);
    try {
      await exportArtwork(includedCards.map((card) => card.data), paperSize, colorMode, iccOptions);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ConfigProvider
      componentSize="small"
      theme={{
        token: {
          colorPrimary: "#F55E36",
          colorText: "#000000",
          borderRadius: 6,
          fontFamily: '"DM Sans", "Open Sans", sans-serif',
          controlHeight: 36,
          controlHeightSM: 30,
          fontSize: 12
        }
      }}
    >
      <>
        <main className={`workspace${workspaceReady ? "" : " workspace-loading"}`} aria-busy={!workspaceReady}>
          <CardStorage
            cards={cards}
            activeCardId={activeCardId}
            onSelectCard={selectCard}
            onAddCard={addCard}
            onImportCard={importCard}
            importing={importing}
            onIncludeInPdfChange={setCardIncludeInPdf}
            onCloseCard={closeCard}
          />
          <PreviewWorkspace
            cover={cards.find((card) => card.id === activeCardId)?.data.cover || ""}
            onExport={handleExport}
            onExportCard={exportCard}
            includeInPdf={cards.find((card) => card.id === activeCardId)?.includeInPdf !== false}
            onIncludeInPdfChange={setIncludeInPdf}
            hasIncludedCards={cards.some((card) => card.includeInPdf !== false)}
            exporting={exporting}
          />
          <TrackListEditor>
            <ReleaseSettings
              onCoverFile={loadImageFile}
              paletteColors={paletteColors}
              designColors={designColors}
              onPaletteColorChange={updatePaletteColor}
              onPaletteReorder={reorderPaletteColors}
              onDesignColorChange={updateDesignColor}
            />
          </TrackListEditor>
        </main>
        <input id="background-color" type="color" defaultValue="#000000" hidden />
        <input id="accent-color" type="color" defaultValue="#F55E36" hidden />
        <input id="text-color" type="color" defaultValue="#FFFFFF" hidden />
        <div className="toast" id="toast" role="status" aria-live="polite" />
      </>
    </ConfigProvider>
  );
}

export default App;
