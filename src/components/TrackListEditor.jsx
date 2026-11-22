import React from "react";
import Button from "antd/es/button";
import Tabs from "antd/es/tabs";

function InnerSettings() {
  return <section className="track-side" aria-label="Inner settings">
    <label className="field">Side A title
      <input id="side-a-title" type="text" aria-label="Side A title" defaultValue="SIDE A" maxLength={80} />
    </label>
    <label className="field">Side B title
      <input id="side-b-title" type="text" aria-label="Side B title" defaultValue="SIDE B" maxLength={80} />
    </label>
    <div className="track-table-wrap" role="group" aria-labelledby="inner-songs-label">
      <div id="inner-songs-label" className="field-label">Songs</div>
      <p className="track-reorder-hint">Drag songs or the divider to reorder. Above the divider: Side A. Below: Side B.</p>
      <table className="track-table inner-track-table" aria-label="Songs on both sides">
        <thead><tr>
          <th scope="col"><span className="visually-hidden">Move</span></th>
          <th scope="col">#</th><th scope="col">Track</th><th scope="col">Accent</th><th scope="col"><span className="visually-hidden">Delete</span></th>
        </tr></thead>
        <tbody id="inner-tracks" />
      </table>
    </div>
    <div className="add-track-actions">
      <Button className="button button-light" data-add-track="a" htmlType="button">Add to Side A</Button>
      <Button className="button button-light" data-add-track="b" htmlType="button">Add to Side B</Button>
    </div>
  </section>;
}

function TrackListEditor({ children }) {
  return <aside className="editor inner-editor editor-sidebar" aria-label="Editor settings">
    <Tabs className="tracks-tabs" defaultActiveKey="outer" items={[
      { key: "outer", label: "Outer", forceRender: true, children },
      { key: "inner", label: "Inner", forceRender: true, children: <InnerSettings /> }
    ]} />
  </aside>;
}

export default React.memo(TrackListEditor);
