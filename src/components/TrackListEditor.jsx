import React from "react";
import Button from "antd/es/button";
import Input from "antd/es/input";
import Tabs from "antd/es/tabs";

function TrackSide({ side }) {
  const label = side.toUpperCase();
  return (
    <section className="track-side" aria-labelledby={`side-${side}-heading`}>
      <label className="field" id={`side-${side}-heading`}>Side {label} title
        <Input id={`side-${side}-title`} defaultValue={`SIDE ${label}`} maxLength={80} />
      </label>
      <div className="track-table-wrap">
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

function TrackListEditor() {
  return (
    <aside className="inner-editor" aria-label="Inner panel settings">
      <div className="editor-heading">
        <h2>Track list</h2>
      </div>
      <Tabs
        className="tracks-tabs"
        defaultActiveKey="a"
        items={["a", "b"].map((side) => ({
          key: side,
          label: `Side ${side.toUpperCase()}`,
          forceRender: true,
          children: <TrackSide side={side} />
        }))}
      />
    </aside>
  );
}

export default React.memo(TrackListEditor);
