import { useEffect, useRef, useState } from "react";
import { isPdfColorMode } from "../editor/printColors.js";
import { ICC_INTENTS, validateIccProfile } from "../editor/iccProfiles.js";
import { loadPrintSettings, savePrintSettings } from "../editor/storage.js";

const defaults = { paperSize: "A4", colorMode: "RGB", profiles: [], profileId: "", intent: "relative", blackPointCompensation: true };

export default function usePrintSettings() {
  const [settings, setSettings] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(settings);
  latest.current = settings;
  useEffect(() => {
    let active = true;
    loadPrintSettings().then((saved) => {
      if (!active || !saved) return;
      const profiles = Array.isArray(saved.profiles) ? saved.profiles.filter((profile) => {
        try {
          validateIccProfile(profile.bytes);
          return typeof profile.id === "string" && typeof profile.name === "string";
        } catch { return false; }
      }) : [];
      setSettings({
        paperSize: ["A4", "A3"].includes(saved.paperSize) ? saved.paperSize : "A4",
        colorMode: isPdfColorMode(saved.colorMode) ? saved.colorMode : "RGB",
        profiles,
        profileId: profiles.some((p) => p.id === saved.profileId) ? saved.profileId : profiles[0]?.id || "",
        intent: ICC_INTENTS.some((item) => item.value === saved.intent) ? saved.intent : "relative",
        blackPointCompensation: saved.blackPointCompensation !== false
      });
    }).catch(() => {
      if (active) setError("Could not restore saved PDF settings.");
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return undefined;
    const persist = () => savePrintSettings(latest.current).catch(() => setError("PDF settings could not be saved on this device."));
    const timer = setTimeout(persist, 300);
    const onPageHide = () => { clearTimeout(timer); void persist(); };
    window.addEventListener("pagehide", onPageHide);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", onPageHide); };
  }, [ready, settings]);
  const update = (patch) => setSettings((current) => ({ ...current, ...patch }));
  const profile = settings.profiles.find((item) => item.id === settings.profileId);
  return { settings, setSettings, update, profile, ready, error };
}
