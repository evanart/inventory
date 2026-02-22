/** DeletedLogModal -- Modal showing recently deleted items with option to view their history */

import { useState } from "react";
import TypeIcon from "../TypeIcon.jsx";
import HistoryModal from "./HistoryModal.jsx";
import { formatRelativeTime } from "../../utils/history.js";

export default function DeletedLogModal({ deletedLog, onClose }) {
  const [viewingHistory, setViewingHistory] = useState(null);
  const entries = [...(deletedLog || [])].reverse();
  if (viewingHistory) {
    return <HistoryModal node={viewingHistory} onClose={() => setViewingHistory(null)} />;
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420, maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 2 }}>Recently Deleted</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>
          {entries.length > 0 ? entries.length + " item" + (entries.length !== 1 ? "s" : "") : "Nothing deleted yet"}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: 13 }}>Nothing deleted yet.</div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < entries.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", display: "flex", alignItems: "center", gap: 4 }}><TypeIcon type={entry.node.type} size={14} /> {entry.node.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                    {entry.parentPath.length > 0 ? entry.parentPath.join(" > ") + " · " : ""}
                    Deleted {formatRelativeTime(entry.deletedAt)}
                  </div>
                </div>
                {(entry.node.history || []).length > 0 && (
                  <button onClick={() => setViewingHistory(entry.node)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#0e7490", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    History
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Close</button>
      </div>
    </div>
  );
}
