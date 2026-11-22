import { splitTrackEntries } from "./trackOrder.js";

function listRows(root) {
  return [...root.querySelector("#inner-tracks").children];
}

export function readTrackRows(side, root = document) {
  return splitTrackEntries(listRows(root).map((row) => row.hasAttribute("data-side-divider")
    ? { divider: true }
    : { title: row.querySelector("[data-track-title]").value, highlighted: row.querySelector("[data-track-highlight]").checked }))[side];
}

export function readTracks(side, root = document) {
  return readTrackRows(side, root).filter((track) => track.title.trim());
}

function handle() {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "track-drag-handle";
  button.dataset.moveTrack = "";
  button.draggable = true;
  button.textContent = "\u283f";
  button.title = "Drag to reorder, or use Up / Down arrow keys";
  cell.append(button);
  return cell;
}

function createTrackRow(track) {
  const row = document.createElement("tr");
  row.className = "track-entry";
  const numberCell = document.createElement("td");
  numberCell.className = "track-number";
  const titleCell = document.createElement("td");
  const title = document.createElement("input");
  title.type = "text";
  title.maxLength = 160;
  title.value = track.title;
  title.dataset.trackTitle = "";
  titleCell.append(title);
  const highlightCell = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(track.highlighted);
  checkbox.dataset.trackHighlight = "";
  highlightCell.append(checkbox);
  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "track-remove";
  removeButton.dataset.removeTrack = "";
  removeButton.textContent = "\u00d7";
  actionCell.append(removeButton);
  row.append(handle(), numberCell, titleCell, highlightCell, actionCell);
  return row;
}

export function refreshTrackLabels(root = document) {
  let side = "A", number = 0;
  for (const row of listRows(root)) {
    const move = row.querySelector("[data-move-track]");
    if (row.hasAttribute("data-side-divider")) {
      side = "B"; number = 0;
      move.setAttribute("aria-label", "Move Side A / Side B divider");
      continue;
    }
    number++;
    row.querySelector(".track-number").textContent = `${number}.`;
    row.querySelector("[data-track-title]").setAttribute("aria-label", `Track ${number}, side ${side}`);
    row.querySelector("[data-track-highlight]").setAttribute("aria-label", `Accent track ${number}, side ${side}`);
    row.querySelector("[data-remove-track]").setAttribute("aria-label", `Remove track ${number}, side ${side}`);
    move.setAttribute("aria-label", `Move track ${number}, side ${side}`);
  }
}

export function renderInnerTracks(sideA = null, sideB = null, root = document) {
  const empty = () => Array.from({ length: 6 }, () => ({ title: "", highlighted: false }));
  const divider = document.createElement("tr");
  divider.className = "track-side-divider";
  divider.dataset.sideDivider = "";
  const label = document.createElement("td");
  label.colSpan = 4;
  label.textContent = "Side A / Side B";
  divider.append(handle(), label);
  root.querySelector("#inner-tracks").replaceChildren(
    ...(sideA ?? empty()).map(createTrackRow), divider, ...(sideB ?? empty()).map(createTrackRow)
  );
  refreshTrackLabels(root);
}

export function installTrackEvents(root, onChange) {
  const list = root.querySelector("#inner-tracks");
  let dragged = null;
  const listeners = [];
  const on = (name, fn) => { root.addEventListener(name, fn); listeners.push(() => root.removeEventListener(name, fn)); };
  const clear = () => { list.querySelectorAll('.track-drop-before, .track-drop-after').forEach(row => row.classList.remove('track-drop-before', 'track-drop-after')); };
  on("click", (event) => {
    const remove = event.target.closest("[data-remove-track]");
    if (remove) { remove.closest("tr").remove(); refreshTrackLabels(root); onChange(); return; }
    const add = event.target.closest("[data-add-track]");
    if (add) {
      const row = createTrackRow({ title: "", highlighted: false });
      list.insertBefore(row, add.dataset.addTrack === "a" ? list.querySelector("[data-side-divider]") : null);
      refreshTrackLabels(root); onChange(); row.querySelector("input").focus();
    }
  });
  on("keydown", (event) => {
    const move = event.target.closest("[data-move-track]");
    if (!move || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const row = move.closest("tr");
    const sibling = event.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    list.insertBefore(row, event.key === "ArrowUp" ? sibling : sibling.nextElementSibling);
    refreshTrackLabels(root); move.focus(); onChange();
  });
  on("dragstart", (event) => {
    const move = event.target.closest("[data-move-track]");
    if (!move) return;
    dragged = move.closest("tr");
    event.dataTransfer.setData("application/x-jcard-track", "move");
    event.dataTransfer.effectAllowed = "move";
  });
  on("dragover", (event) => {
    if (!dragged) return;
    const row = event.target.closest("#inner-tracks > tr");
    if (!row) return;
    event.preventDefault(); clear();
    if (row === dragged) return;
    const after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
    row.classList.add(after ? "track-drop-after" : "track-drop-before");
  });
  on("drop", (event) => {
    if (!dragged) return;
    event.preventDefault();
    const row = event.target.closest("#inner-tracks > tr");
    if (row && row !== dragged) {
      const after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      list.insertBefore(dragged, after ? row.nextElementSibling : row);
      refreshTrackLabels(root); onChange();
    }
    clear(); dragged = null;
  });
  on("dragend", () => { clear(); dragged = null; });
  return () => listeners.forEach(remove => remove());
}
