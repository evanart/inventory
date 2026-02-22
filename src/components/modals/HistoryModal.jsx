/** HistoryModal -- Modal showing the timeline of events for a node (created, moved, renamed, etc.) */

import TypeIcon from "../TypeIcon.jsx";
import { formatRelativeTime } from "../../utils/history.js";

export default function HistoryModal({ node, onClose }) {
  const entries = [...(node.history || [])].reverse();
  const formatEntry = (entry) => {
    switch (entry.event) {
      case "created": {
        const loc = entry.parentPath && entry.parentPath.length > 0 ? " in " + entry.parentPath.join(" > ") : "";
        const src = entry.source === "ai" ? " via AI" : entry.source === "import" ? " via import" : " manually";
        return "Created" + loc + src;
      }
      case "moved":
        return "Moved from " + (entry.fromPath || []).join(" > ") + " to " + (entry.toPath || []).join(" > ");
      case "renamed":
        return `Renamed from "${entry.from}" to "${entry.to}"`;
      case "quantity_changed":
        return `Quantity: ${entry.from == null ? "unknown" : entry.from} → ${entry.to == null ? "unknown" : entry.to}`;
      case "category_changed":
        return `Category: ${entry.from} → ${entry.to}`;
      default:
        return entry.event;
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420, maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <TypeIcon type={node.type} size={16} /> {node.name}
        </div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14, textTransform: "capitalize" }}>{node.type} history</div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: 13 }}>No history recorded</div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: i < entries.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0e7490", flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{formatEntry(entry)}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }} title={entry.timestamp}>{formatRelativeTime(entry.timestamp)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Close</button>
      </div>
    </div>
  );
}
