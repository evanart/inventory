/** RenameModal -- Modal with a text input to rename a floor, room, or container */

import { useState } from "react";
import { TYPE_COLORS } from "../../constants/nodeTypes.js";

export default function RenameModal({ node, onSave, onCancel }) {
  const [name, setName] = useState(node.name);
  return (
    <div data-component="RenameModal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 340 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Rename {node.type === "floor" ? "Floor" : node.type === "room" ? "Room" : "Container"}</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, fontWeight: 600, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (name.trim()) onSave(name.trim()); }} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: TYPE_COLORS[node.type] || "#0e7490", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
