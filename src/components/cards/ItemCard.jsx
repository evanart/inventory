/** ItemCard -- Displays a single inventory item with category badge, quantity, and action buttons */

import { Pencil, FolderOpen, X } from "lucide-react";
import { CAT_COLORS } from "../../constants/categories.js";
import { formatRelativeTime } from "../../utils/history.js";

export default function ItemCard({ node, onDelete, onEdit, onMove, onHistory }) {
  const cat = node.category || "misc";
  const createdEntry = node.history && node.history.length > 0 ? node.history[0] : null;
  return (
    <div data-component="ItemCard" style={{
      background: "#fff", borderRadius: 8, padding: "10px 14px",
      border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        background: CAT_COLORS[cat] || "#999", color: "#fff", fontSize: 9,
        fontWeight: 700, borderRadius: 4, padding: "2px 7px", textTransform: "uppercase", flexShrink: 0,
        fontFamily: "'Rubik', sans-serif", letterSpacing: "0.04em",
      }}>{cat}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111", textTransform: "capitalize" }}>{node.name}</span>
          {node.quantity != null && <span style={{ fontSize: 12, color: "#999", marginLeft: 6 }}>{"\u00D7"}{node.quantity}</span>}
        </div>
        {createdEntry && <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>Added {formatRelativeTime(createdEntry.timestamp)}</div>}
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={() => onHistory(node)} title="History" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, display: "flex", alignItems: "center" }}>🕐</button>
        <button onClick={() => onEdit(node)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4, display: "flex", alignItems: "center" }}><Pencil size={14} /></button>
        <button onClick={() => onMove(node)} title="Move" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4, display: "flex", alignItems: "center" }}><FolderOpen size={14} /></button>
        <button onClick={() => onDelete(node.id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, display: "flex", alignItems: "center" }}><X size={14} /></button>
      </div>
    </div>
  );
}
