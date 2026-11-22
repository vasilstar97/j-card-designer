import React, { useEffect, useRef, useState } from "react";
import Dropdown from "antd/es/dropdown";
import Modal from "antd/es/modal";
import Input from "antd/es/input";
import Popconfirm from "antd/es/popconfirm";
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

export default function CardStorage({ cards, groups, ungroupedCollapsed, onToggleUngrouped, onMoveGroup, activeCardId, onSelectCard, onAddCard, onDuplicateCard, onCloseCard, onImportCard, importing, onIncludeInPdfChange, onAddGroup, onUpdateGroup, onDeleteGroup, onMoveCard }) {
  const importInput = useRef(null);
  const stack = useRef(null);
  const [renaming, setRenaming] = useState(null);
  const renameInput = useRef(null);
  const [draggingGroup, setDraggingGroup] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const previousCount = useRef(cards.length);
  useEffect(() => {
    if (cards.length > previousCount.current && stack.current) stack.current.scrollTop = 0;
    previousCount.current = cards.length;
  }, [cards.length]);

  const drop = (event, groupId, beforeId = null) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-jcard-id");
    if (id) onMoveCard(id, groupId, beforeId);
    setDragging(null);
    setDropTarget(null);
  };
  const allowDrop = (event, key, acceptGroups = false) => {
    if (!dragging && !(acceptGroups && draggingGroup)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(key);
  };
  const finishGroupDrop = (event, beforeId) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-jcard-group");
    if (id) onMoveGroup(id, beforeId);
    setDraggingGroup(null);
    setDropTarget(null);
  };
  const renderBoundary = (beforeId) => <tr className={`storage-drop-boundary${dropTarget === `boundary:${beforeId}` ? " is-drop-target" : ""}`}
    onDragOver={(event) => allowDrop(event, `boundary:${beforeId}`, true)}
    onDrop={(event) => {
      if (event.dataTransfer.getData("application/x-jcard-group")) finishGroupDrop(event, beforeId);
      else drop(event, null);
    }}>
    <td colSpan={3}><span>{draggingGroup ? "Move group here" : "Move out of group"}</span></td>
  </tr>;
  const saveRename = () => {
    if (!renaming?.name.trim()) return;
    if (renaming.id) onUpdateGroup(renaming.id, { name: renaming.name.trim() });
    else onAddGroup(renaming.name.trim());
    setRenaming(null);
  };
  const renderCard = (card, siblings, index) => {
    const groupId = card.groupId || null;
    const items = [
      { key: "up", label: "Move up", disabled: index === 0 },
      { key: "down", label: "Move down", disabled: index === siblings.length - 1 },
      { type: "divider" },
      { key: "ungrouped", label: "Move to Ungrouped", disabled: !groupId },
      ...groups.map((group) => ({ key: `group:${group.id}`, label: `Move to ${group.name}`, disabled: group.id === groupId }))
    ];
    return <tr className={`cassette-row${dragging === card.id ? " is-dragging" : ""}${dropTarget === card.id ? " is-drop-target" : ""}`} key={card.id}
      onDragOver={(event) => allowDrop(event, card.id)} onDrop={(event) => drop(event, groupId, card.id)}>
      <td className="storage-pdf-cell">
        <input type="checkbox" checked={card.includeInPdf !== false} aria-label={`Include ${card.title} in PDF`}
          onChange={(event) => onIncludeInPdfChange(card.id, event.target.checked)} />
      </td>
      <td className="storage-spine-cell">
        <div className={`cassette-item${card.id === activeCardId ? " is-active" : ""}`} draggable
          onDragStart={(event) => { event.dataTransfer.setData("application/x-jcard-id", card.id); event.dataTransfer.effectAllowed = "move"; setDragging(card.id); }}
          onDragEnd={() => { setDragging(null); setDropTarget(null); }}>
          <button className="cassette-select" type="button" aria-pressed={card.id === activeCardId}
            aria-label={`${card.data.artist || "Artist"} \u00b7 ${card.title}`} title={`${card.data.artist || "Artist"} \u00b7 ${card.title} \u00b7 Drag to reorder`}
            onClick={() => onSelectCard(card.id)} style={{ background: card.data.colors.background }}>
            <CardSpine data={card.data} />
          </button>
        </div>
      </td>
      <td className="storage-delete-cell">
        <div className="cassette-row-actions">
          <Dropdown trigger={["click"]} menu={{ items, onClick: ({ key }) => {
            if (key === "up") onMoveCard(card.id, groupId, siblings[index - 1].id);
            else if (key === "down") onMoveCard(card.id, groupId, siblings[index + 2]?.id || null);
            else onMoveCard(card.id, key === "ungrouped" ? null : key.slice(6));
          } }}>
            <button className="cassette-remove" type="button" aria-label={`Organize ${card.title}`} title="Move cassette">{"\u22ee"}</button>
          </Dropdown>
          <Popconfirm title="Delete J-card?" description={`Remove ${card.title} from this device?`}
            placement="right" okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
            disabled={cards.length <= 1} onConfirm={() => onCloseCard(card.id)}>
            <button className="cassette-remove" type="button" aria-label={`Delete ${card.title}`} disabled={cards.length <= 1} title="Delete J-card">
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 5.5h13M7 5.5V3h6v2.5M5 5.5l.8 11h8.4l.8-11M8 8.5v5M12 8.5v5" />
              </svg>
            </button>
          </Popconfirm>
        </div>
      </td>
    </tr>;
  };
  return <aside className="storage-sidebar" aria-label="Cassette storage"
    style={{ "--spine-width": `${PANEL.height}mm`, "--spine-aspect": PANEL.height / PANEL.side }}>
    <div className="storage-toolbar">
      <div className="storage-actions">
        <button className="storage-add" type="button" disabled={importing} onClick={() => importInput.current?.click()}>{importing ? "Importing..." : "Import"}</button>
        <button className="storage-add" type="button" aria-label="Duplicate current J-card" onClick={onDuplicateCard}>Duplicate</button>
        <button className="storage-add" type="button" aria-label="Add J-card" onClick={onAddCard}>+ Add</button>
        <button className="storage-add" type="button" onClick={() => setRenaming({ id: null, name: "" })}>+ Group</button>
      </div>
      <input ref={importInput} type="file" accept=".json,application/json" hidden aria-label="Import cassette file" onChange={(event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (file) onImportCard(file);
      }} />
    </div>
    <div className="cassette-stack" ref={stack} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null); }}>
      <table className="storage-table" aria-label="J-card designs">
        <colgroup><col className="storage-pdf-column" /><col /><col className="storage-action-column" /></colgroup>
        <thead><tr><th scope="col" title="Include in PDF">PDF</th><th scope="col">Side panel</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
        {[{ id: null, name: "Ungrouped", collapsed: ungroupedCollapsed }, ...groups].map((group) => {
          const siblings = cards.filter((card) => (card.groupId || null) === group.id);
          return <tbody key={group.id || "ungrouped"}>
            {group.id && renderBoundary(group.id)}
            <tr className={`storage-group${dropTarget === `group:${group.id}` ? " is-drop-target" : ""}`}
              onDragOver={(event) => allowDrop(event, `group:${group.id}`, !!group.id)} onDrop={(event) => {
                if (event.dataTransfer.getData("application/x-jcard-group") && group.id) finishGroupDrop(event, group.id);
                else drop(event, group.id);
              }}>
              <td colSpan={3}>
                <div className="storage-group-heading" draggable={!!group.id}
                  onDragStart={(event) => {
                    if (!group.id) return;
                    event.dataTransfer.setData("application/x-jcard-group", group.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingGroup(group.id);
                  }}
                  onDragEnd={() => { setDraggingGroup(null); setDropTarget(null); }}>
                    <button className="storage-group-toggle" type="button" aria-expanded={!group.collapsed}
                      onClick={() => group.id ? onUpdateGroup(group.id, { collapsed: !group.collapsed }) : onToggleUngrouped()}>
                      <span aria-hidden="true">{group.collapsed ? "\u25b8" : "\u25be"}</span>
                      <span className="storage-group-name">{group.name}</span><span className="storage-group-count">{siblings.length}</span>
                      {group.collapsed && siblings.some((card) => card.id === activeCardId) && <span className="storage-group-active" title="Contains selected cassette">{"\u25cf"}</span>}
                    </button>
                    {group.id && <Dropdown trigger={["click"]} menu={{ items: [{ key: "up", label: "Move group up", disabled: groups[0]?.id === group.id }, { key: "down", label: "Move group down", disabled: groups.at(-1)?.id === group.id }, { type: "divider" }, { key: "rename", label: "Rename group" }, { key: "delete", label: "Ungroup all & remove group" }], onClick: ({ key }) => {
                      const index = groups.findIndex((item) => item.id === group.id);
                      if (key === "up") onMoveGroup(group.id, groups[index - 1].id);
                      else if (key === "down") onMoveGroup(group.id, groups[index + 2]?.id || null);
                      else if (key === "rename") setRenaming({ id: group.id, name: group.name });
                      else onDeleteGroup(group.id);
                    } }}><button className="cassette-remove" type="button" aria-label={`Organize group ${group.name}`}>{"\u22ee"}</button></Dropdown>}
                </div>
              </td>
            </tr>
            {!group.collapsed && siblings.map((card, index) => renderCard(card, siblings, index))}
            {!group.collapsed && !siblings.length && <tr className="storage-group-empty" onDragOver={(event) => allowDrop(event, `group:${group.id}`)} onDrop={(event) => drop(event, group.id)}><td colSpan={3}>Drag cassettes here or use their menu</td></tr>}
          </tbody>;
        })}
        <tbody>{renderBoundary(null)}</tbody>
      </table>
    </div>
    <Modal title={renaming?.id ? "Rename group" : "New group"} open={!!renaming} onOk={saveRename} onCancel={() => setRenaming(null)}
      okText={renaming?.id ? "Save" : "Create"} okButtonProps={{ disabled: !renaming?.name.trim() }} destroyOnHidden
      afterOpenChange={(open) => { if (open) renameInput.current?.focus({ cursor: "all" }); }}>
      <label className="field-label" htmlFor="storage-group-name">Group name</label>
      <Input ref={renameInput} id="storage-group-name" aria-label={renaming?.id ? "Rename group" : "New group name"} maxLength={100}
        value={renaming?.name || ""} onChange={(event) => setRenaming({ ...renaming, name: event.target.value })}
        onPressEnter={saveRename} />
    </Modal>
    <p className="storage-note">Saved on this device &middot; Drag to organize</p>
  </aside>;
}
