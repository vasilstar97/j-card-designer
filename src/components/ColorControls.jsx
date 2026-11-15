import React from "react";
import Button from "antd/es/button";
import ColorPicker from "antd/es/color-picker";
import message from "antd/es/message";

function EyeDropperButton({ label, onPick }) {
  const pickFromScreen = async () => {
    if (!window.EyeDropper) {
      message.info("Screen color picking is not supported in this browser.");
      return;
    }
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      onPick(sRGBHex);
    } catch (error) {
      if (error.name !== "AbortError") message.error("Could not pick a screen color.");
    }
  };

  return (
    <Button
      className="eyedropper-button"
      htmlType="button"
      aria-label={`Pick ${label} from screen`}
      title={`Pick ${label} from screen`}
      onClick={pickFromScreen}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m10.9 1.8 3.3 3.3-2 2-1.1-1.1-4.9 4.9a2 2 0 0 1-2.8-2.8l4.9-4.9-1.1-1.1 2-2.3 1.7 2Z" />
        <path d="m4.5 9.5-2.8 2.8a1.2 1.2 0 0 0 1.7 1.7l2.8-2.8" />
      </svg>
    </Button>
  );
}

function ColorPickerPanel({ panel, label, onPick }) {
  return (
    <div className="color-picker-panel">
      {panel}
      <div className="color-picker-extra">
        <EyeDropperButton label={label} onPick={onPick} />
      </div>
    </div>
  );
}

export function PaletteColorControl({ index, color, onChange, onPick }) {
  const label = `palette color ${index + 1}`;
  return (
    <div className="palette-color-control">
      <ColorPicker
        value={color}
        aria-label={`Palette color ${index + 1}`}
        showText={false}
        disabledAlpha
        onChange={(value) => onChange(value.toHexString())}
        panelRender={(panel) => (
          <ColorPickerPanel panel={panel} label={label} onPick={onPick} />
        )}
      />
    </div>
  );
}

export function DesignColorControl({ label, color, onChange, onPick }) {
  return (
    <div className="design-color-control">
      <span className="design-color-label">{label}</span>
      <ColorPicker
        value={color}
        aria-label={`${label} color`}
        showText={(currentColor) => (
          <span className="design-color-hex">{currentColor.toHexString().toUpperCase()}</span>
        )}
        disabledAlpha
        onChange={(value) => onChange(value.toHexString())}
        panelRender={(panel) => (
          <ColorPickerPanel panel={panel} label={label.toLowerCase()} onPick={onPick} />
        )}
      />
    </div>
  );
}
