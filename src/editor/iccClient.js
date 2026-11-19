import { validateIccProfile } from "./iccProfiles.js";

export async function createIccConverter(profile, intent = "relative", blackPointCompensation = true) {
  validateIccProfile(profile?.bytes);
  const worker = new Worker(new URL("./iccWorker.js", import.meta.url), { type: "module" });
  const pending = new Map();
  let sequence = 0;
  let closed = false;
  const close = () => {
    closed = true;
    worker.terminate();
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error("ICC conversion was interrupted."));
    }
    pending.clear();
  };
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    clearTimeout(request.timer);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data);
  };
  worker.onerror = (event) => {
    event.preventDefault();
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error("The ICC color engine could not run. Try reloading the page."));
    }
    pending.clear();
    worker.terminate();
    closed = true;
  };
  const send = (data, transfer = []) => new Promise((resolve, reject) => {
    if (closed) { reject(new Error("The ICC conversion has been closed.")); return; }
    const id = ++sequence;
    const timer = setTimeout(() => {
      close();
    }, 120000);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ ...data, id }, transfer);
  });
  try {
    const { name } = await send({ type: "open", bytes: profile.bytes, intent, blackPointCompensation });
    return {
      name,
      async convert(imageData) {
        const { pixels } = await send({ type: "convert", pixels: imageData.data.buffer }, [imageData.data.buffer]);
        return new Uint8Array(pixels);
      },
      close
    };
  } catch (error) {
    close();
    throw error;
  }
}
