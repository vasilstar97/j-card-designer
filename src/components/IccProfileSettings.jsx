import React, { useRef, useState } from "react";
import { createIccConverter } from "../editor/iccClient.js";
import { ICC_INTENTS, MAX_ICC_BYTES, validateIccProfile } from "../editor/iccProfiles.js";

export default function IccProfileSettings({ settings, setSettings, disabled }) {
  const input = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const importProfile = async (file) => {
    setError("");
    setLoading(true);
    let converter;
    try {
      if (file.size > MAX_ICC_BYTES) throw new Error("ICC profiles must be 16 MB or smaller.");
      const bytes = await file.arrayBuffer();
      validateIccProfile(bytes);
      converter = await createIccConverter({ bytes }, settings.intent, settings.blackPointCompensation);
      const id = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
      const profile = { id, bytes, name: converter.name || file.name, fileName: file.name };
      setSettings((current) => ({ ...current, profileId: id,
        profiles: current.profiles.some((p) => p.id === id) ? current.profiles : [...current.profiles, profile] }));
    } catch (failure) {
      setError(failure.message || "Could not import the ICC profile.");
    } finally {
      converter?.close();
      setLoading(false);
    }
  };
  const update = (patch) => setSettings((current) => ({ ...current, ...patch }));
  return (
    <div className="icc-settings" role="group" aria-label="ICC print settings">
      <div className="icc-controls">
        <label>Profile
          <select aria-label="ICC output profile" value={settings.profileId} disabled={disabled || loading}
            onChange={(event) => update({ profileId: event.target.value })}>
            {!settings.profiles.length && <option value="">Import a CMYK profile</option>}
            {settings.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
        </label>
        <button type="button" className="button button-light" disabled={disabled || loading} onClick={() => input.current?.click()}>
          {loading ? "Checking profile…" : "Import ICC"}
        </button>
        <button type="button" className="button button-light" disabled={disabled || loading || !settings.profileId}
          onClick={() => setSettings((current) => {
            const profiles = current.profiles.filter((p) => p.id !== current.profileId);
            return { ...current, profiles, profileId: profiles[0]?.id || "" };
          })}>Remove profile</button>
        <input ref={input} type="file" hidden accept=".icc,.icm,application/vnd.iccprofile" aria-label="Import ICC profile"
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importProfile(file); }} />
        <label>Rendering intent
          <select aria-label="ICC rendering intent" value={settings.intent} disabled={disabled}
            onChange={(event) => update({ intent: event.target.value })}>
            {ICC_INTENTS.map((intent) => <option key={intent.value} value={intent.value}>{intent.label}</option>)}
          </select>
        </label>
        <label className="guide-toggle" title="Map the source black point to the printable black of the selected profile.">
          <input type="checkbox" checked={settings.blackPointCompensation} disabled={disabled}
            onChange={(event) => update({ blackPointCompensation: event.target.checked })} />
          <span>Black point compensation</span>
        </label>
      </div>
      <p className="icc-note">sRGB artwork → selected CMYK profile. Saved on this device and embedded in the PDF.</p>
      <p className="icc-note">Get profiles from your print shop or the ICC registry: {" "}
        <a href="https://registry.color.org/profile-registry/PSOcoated_v3" target="_blank" rel="noreferrer">PSO Coated v3 (FOGRA51)</a>
        {" · "}<a href="https://registry.color.org/profile-registry/PSOuncoated_v3_FOGRA52" target="_blank" rel="noreferrer">PSO Uncoated v3 (FOGRA52)</a>
      </p>
      {error && <p className="icc-error" role="alert">{error}</p>}
    </div>
  );
}
