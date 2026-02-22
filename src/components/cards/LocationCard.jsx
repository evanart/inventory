/** LocationCard -- Displays a floor/room/container with item count, inline rename, and action buttons */

import { useState } from "react";
import { Pencil, FolderOpen, X, ChevronRight } from "lucide-react";
import TypeIcon from "../TypeIcon.jsx";
import { TYPE_COLORS } from "../../constants/nodeTypes.js";
import { countItems } from "../../utils/tree.js";
import { formatRelativeTime } from "../../utils/history.js";

export default function LocationCard({ node, onClick, onRename, onDelete, onMove, onHistory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const count = countItems(node);
  const color = TYPE_COLORS[node.type] || "#666";
  const isDeletable = node.type === "container" || node.type === "room" || node.type === "floor";
  const isMovable = node.type === "room" || node.type === "floor" || node.type === "container";
  const createdEntry = node.history && node.history.length > 0 ? node.history[0] : null;

  if (editing) {
    return (
      <div data-component="LocationCard" style={{
        background: "#fff", borderRadius: 8, padding: "10px 16px",
        border: "2px solid #0e7490", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: "#f5f5f5",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          border: "1px solid #e0e0e0",
        }}><TypeIcon type={node.type} size={18} /></div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => {
            if (e.key === "Enter" && name.trim()) { onRename(node.id, name.trim()); setEditing(false); }
            if (e.key === "Escape") { setName(node.name); setEditing(false); }
          }}
          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, fontWeight: 600, outline: "none" }}
        />
        <button onClick={() => { if (name.trim()) { onRename(node.id, name.trim()); setEditing(false); } }}
          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
        <button onClick={() => { setName(node.name); setEditing(false); }}
          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={14} /></button>
      </div>
    );
  }

  return (
    <div data-component="LocationCard" style={{
      background: "#fff", borderRadius: 8, padding: "12px 16px",
      border: "1px solid #f0f0f0",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div onClick={() => onClick(node.id)} style={{
        width: 38, height: 38, borderRadius: 8, background: "#f5f5f5",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid #e0e0e0",
      }}><TypeIcon type={node.type} size={18} /></div>
      <div onClick={() => onClick(node.id)} style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 500, fontSize: 14, color: "#111" }}>{node.name}</div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {count > 0 ? count + " item" + (count !== 1 ? "s" : "") : "empty"}
          {(node.children || []).filter(c => c.type !== "item").length > 0 &&
            " \u00B7 " + (node.children || []).filter(c => c.type !== "item").length + " sub-locations"}
          {createdEntry && <span style={{ color: "#ccc" }}> · Added {formatRelativeTime(createdEntry.timestamp)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); onHistory(node); }} title="History"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 13, padding: 4 }}>🕐</button>
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Rename"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4, display: "flex", alignItems: "center" }}><Pencil size={14} /></button>
        {isMovable && (
          <button onClick={(e) => { e.stopPropagation(); onMove(node); }} title="Move"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4, display: "flex", alignItems: "center" }}><FolderOpen size={14} /></button>
        )}
        {isDeletable && (
          <button onClick={(e) => { e.stopPropagation(); if (count > 0 && (node.type === "room" || node.type === "floor")) { if (confirm("This " + node.type + " contains " + count + " item(s). Delete anyway?")) onDelete(node.id); } else { onDelete(node.id); } }} title={"Delete " + node.type}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, display: "flex", alignItems: "center" }}><X size={14} /></button>
        )}
        <div onClick={() => onClick(node.id)} style={{ color: "#ccc", padding: "0 2px", cursor: "pointer", display: "flex", alignItems: "center" }}><ChevronRight size={18} /></div>
      </div>
    </div>
  );
}
