import React from "react";
import Button from "antd/es/button";
import Tabs from "antd/es/tabs";

function TrackSide({ side }) {
  const label = side.toUpperCase();
  return (
    <section className="track-side" aria-label={`Side ${label} settings`}>
      <label className="field">Title
        <input id={`side-${side}-title`} type="text" aria-label={`Side ${label} title`} defaultValue={`SIDE ${label}`} maxLength={80} />
      </label>
      <div className="track-table-wrap" role="group" aria-labelledby={`side-${side}-songs-label`}>
        <div id={`side-${side}-songs-label`} className="field-label">Songs</div>
        <table className="track-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Track</th>
              <th scope="col">Accent</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody id={`side-${side}-tracks`} />
        </table>
      </div>
      <Button className="button button-light add-track-button" data-add-track={side} htmlType="button">
        Add track
      </Button>
    </section>
  );
}

function TrackListEditor({ children }) {
  return (
    <aside className="editor inner-editor editor-sidebar" aria-label="Editor settings">
      <Tabs
        className="tracks-tabs"
        defaultActiveKey="design"
        items={[{ key: "design", label: "Design", forceRender: true, children }, ...["a", "b"].map((side) => ({
          key: side,
          label: `Side ${side.toUpperCase()}`,
          forceRender: true,
          children: <TrackSide side={side} />
        }))]}
      />
    </aside>
  );
}

export default React.memo(TrackListEditor);
