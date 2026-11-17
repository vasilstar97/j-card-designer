import React from "react";
import Upload from "antd/es/upload";
import { DesignColorControl } from "./ColorControls.jsx";
import PaletteEditor from "./PaletteEditor.jsx";
import { PANEL } from "../editor/constants.js";

const { Dragger } = Upload;

function ReleaseSettings({
  onCoverFile,
  paletteColors,
  designColors,
  onPaletteColorChange,
  onPaletteReorder,
  onDesignColorChange
}) {
  return (
    <div className="release-settings" aria-label="Design settings">
      <div className="editor-content">
        <div className="section-content">
          <div className="field" role="group" aria-labelledby="cover-image-label">
            <span id="cover-image-label" className="field-label">Cover image</span>
            <Dragger
            className="cover-uploader"
            accept="image/*"
            maxCount={1}
            multiple={false}
            showUploadList={false}
            beforeUpload={(file) => {
              onCoverFile(file);
              return false;
            }}
          >
            <p className="ant-upload-text">Choose or drop an image or image URL</p>
            <p className="ant-upload-hint">You can also paste an image or image URL from the clipboard</p>
          </Dragger>
          </div>
          <label className="field">Cover feather (mm)
            <input id="cover-feather" type="number" min="0" max={PANEL.front / 2} step="0.1" defaultValue="0" />
          </label>
          <label className="field">Artist
            <input id="artist-name" type="text" defaultValue="Artist" maxLength={160} />
          </label>
          <label className="field">Album title
            <input id="album-name" type="text" defaultValue="Album title" maxLength={160} />
          </label>
          <label className="field">Release info
            <textarea id="info-text" rows={2} placeholder="e.g. album, side B" defaultValue="Debut album" />
          </label>
          <div className="field-row">
            <label className="field">Month / year
              <input id="recorded-date" type="month" />
            </label>
            <label className="field">Font
              <select id="font-family">
                <option value="Open Sans">Open Sans</option>
                <option value="Noto Sans JP">Noto Sans JP</option>
              </select>
            </label>
          </div>
          <label className="field">Back cover quote
            <textarea id="quote-text" rows={3} placeholder="Enter a quote or release text" />
          </label>
          <section className="color-settings" aria-label="Artwork colors">
            <div className="palette-setting">
              <div className="color-setting-label">Palette</div>
              <PaletteEditor colors={paletteColors} onChange={onPaletteColorChange} onReorder={onPaletteReorder} />
            </div>
            <div className="design-colors">
              <DesignColorControl
                label="Text"
                color={designColors.text}
                onChange={(value) => onDesignColorChange("text", value)}
                onPick={(value) => onDesignColorChange("text", value)}
              />
              <DesignColorControl
                label="Accent"
                color={designColors.accent}
                onChange={(value) => onDesignColorChange("accent", value)}
                onPick={(value) => onDesignColorChange("accent", value)}
              />
              <DesignColorControl
                label="Background"
                color={designColors.background}
                onChange={(value) => onDesignColorChange("background", value)}
                onPick={(value) => onDesignColorChange("background", value)}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ReleaseSettings);
