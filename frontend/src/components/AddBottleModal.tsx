import { useState } from "react";
import { api } from "../api";
import type { NewBottle } from "../types";

const REGIONS = [
  "Bordeaux",
  "Burgundy",
  "Champagne",
  "Rhône",
  "Tuscany",
  "Piedmont",
  "Napa Valley",
  "Rioja",
  "Mosel",
  "Port",
];
const SIZES = ["Half (375ml)", "Standard (750ml)", "Magnum (1.5L)", "Jeroboam (3L)"];

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const DEFAULT: NewBottle = {
  name: "",
  producer: "",
  region: "Bordeaux",
  vintage: 2019,
  quantity: 6,
  size: "Standard (750ml)",
  purchase_price_chf: 250,
  market_price_chf: 320,
  purchase_date: "2022-01-01",
  drink_from: 2026,
  drink_to: 2045,
  critic_score: 94,
  notes: "",
};

export default function AddBottleModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState<NewBottle>(DEFAULT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof NewBottle>(key: K, value: NewBottle[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      await api.addBottle({ ...form, notes: form.notes || undefined });
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add lot");
    } finally {
      setSaving(false);
    }
  }

  const numField = (label: string, key: keyof NewBottle, step = 1) => (
    <div>
      <label>{label}</label>
      <input
        type="number"
        step={step}
        value={form[key] as number}
        onChange={(e) => set(key, Number(e.target.value) as never)}
      />
    </div>
  );

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Passion-Asset Desk · Acquisition</div>
        <h3>Add a lot to the cellar</h3>
        <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>
          Persisted to the cellar volume and re-scored by the engine on save.
        </div>

        <div className="form-grid">
          <div className="full">
            <label>Wine</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Château …" />
          </div>
          <div>
            <label>Producer</label>
            <input value={form.producer} onChange={(e) => set("producer", e.target.value)} />
          </div>
          <div>
            <label>Region</label>
            <select value={form.region} onChange={(e) => set("region", e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {numField("Vintage", "vintage")}
          {numField("Quantity (bottles)", "quantity")}
          <div>
            <label>Format</label>
            <select value={form.size} onChange={(e) => set("size", e.target.value)}>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {numField("Critic score", "critic_score")}
          {numField("Purchase / unit (CHF)", "purchase_price_chf", 10)}
          {numField("Market / unit (CHF)", "market_price_chf", 10)}
          <div>
            <label>Purchase date</label>
            <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
          </div>
          <div />
          {numField("Drink from", "drink_from")}
          {numField("Drink to", "drink_to")}
          <div className="full">
            <label>Notes</label>
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Provenance, allocation…" />
          </div>
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={saving || !form.name || !form.producer}>
            {saving ? "saving…" : "＋ acquire lot"}
          </button>
        </div>
      </div>
    </div>
  );
}
