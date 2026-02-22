/** AddContainerInline -- Inline form to create a new container (shelf, box, drawer, etc.) */

import { useState } from "react";

export default function AddContainerInline({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  return (
    <div data-component="AddContainerInline" style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim()); }}
        placeholder="Container name (e.g. Wood Shelf, Red Box)" autoFocus
        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, outline: "none" }} />
      <button onClick={() => { if (name.trim()) onAdd(name.trim()); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#155e75", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 13, cursor: "pointer" }}>Cancel</button>
    </div>
  );
}
