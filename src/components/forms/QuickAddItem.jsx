/** QuickAddItem -- Inline form to manually add a single item with name and category */

import { useState } from "react";
import { X } from "lucide-react";
import { CATEGORIES } from "../../constants/categories.js";

export default function QuickAddItem({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("misc");
  return (
    <div data-component="QuickAddItem" style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #ddd", marginBottom: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name"
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim(), cat); }}
        autoFocus style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
      <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => { if (name.trim()) onAdd(name.trim(), cat); }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#0e7490", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={14} /></button>
    </div>
  );
}
