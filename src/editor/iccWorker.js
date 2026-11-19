import wasmUrl from "lcms-wasm/dist/lcms.wasm?url";
import { openIccTransform } from "./iccTransform.js";

let transform;
self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === "open") {
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error("Could not load the ICC color engine.");
      transform?.close();
      transform = await openIccTransform(data.bytes, data.intent, data.blackPointCompensation,
        { wasmBinary: await response.arrayBuffer() });
      self.postMessage({ id, name: transform.name });
    } else if (type === "convert") {
      if (!transform) throw new Error("Load an ICC profile before converting.");
      const pixels = transform.convert(new Uint8ClampedArray(data.pixels));
      self.postMessage({ id, pixels: pixels.buffer }, [pixels.buffer]);
    } else {
      throw new Error("Unknown ICC conversion request.");
    }
  } catch (error) {
    self.postMessage({ id, error: error.message || "ICC conversion failed." });
  }
};
