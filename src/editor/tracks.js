export function readTrackRows(side, root = document) {
  return [...root.querySelector(`#side-${side}-tracks`).querySelectorAll(".track-entry")]
    .map((row) => ({
      title: row.querySelector("[data-track-title]").value.trim(),
      highlighted: row.querySelector("[data-track-highlight]").checked
    }));
}

export function readTracks(side, root = document) {
  return readTrackRows(side, root).filter((track) => track.title);
}

export function renderTrackList(side, songs = null, root = document) {
  const list = root.querySelector(`#side-${side}-tracks`);
  list.replaceChildren();
  const entries = songs ?? Array.from({ length: 6 }, () => ({ title: "", highlighted: false }));
  for (const [index, track] of entries.entries()) {
    const row = document.createElement("tr");
    row.className = "track-entry";

    const numberCell = document.createElement("td");
    numberCell.className = "track-number";
    numberCell.textContent = `${index + 1}.`;
    const title = document.createElement("input");
    title.type = "text";
    title.maxLength = 160;
    title.value = track.title;
    title.dataset.trackTitle = "";
    title.setAttribute("aria-label", `Track ${index + 1}, side ${side.toUpperCase()}`);
    const titleCell = document.createElement("td");
    titleCell.append(title);

    const highlightCell = document.createElement("td");
    highlightCell.className = "track-highlight-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(track.highlighted);
    checkbox.tabIndex = -1;
    checkbox.dataset.trackHighlight = "";
    checkbox.setAttribute("aria-label", `Accent track ${index + 1}, side ${side.toUpperCase()}`);
    highlightCell.append(checkbox);

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "track-remove";
    removeButton.tabIndex = -1;
    removeButton.dataset.removeTrack = "";
    removeButton.dataset.side = side;
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove track ${index + 1}, side ${side.toUpperCase()}`);
    actionCell.append(removeButton);

    row.append(numberCell, titleCell, highlightCell, actionCell);
    list.append(row);
  }
}
