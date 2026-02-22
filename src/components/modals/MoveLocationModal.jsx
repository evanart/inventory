/** MoveLocationModal -- Modal to pick a valid destination for moving a floor, room, or container */

import TypeIcon from "../TypeIcon.jsx";
import { findParentChain } from "../../utils/tree.js";

export default function MoveLocationModal({ node, tree, onMove, onCancel }) {
  const locations = [];
  function walk(n, path, depth) {
    if (n.type !== "item") {
      locations.push({ id: n.id, label: path.join(" > "), depth, name: n.name, type: n.type });
      (n.children || []).forEach(c => walk(c, [...path, c.name], depth + 1));
    }
  }
  walk(tree, [tree.name], 0);
  const chain = findParentChain(tree, node.id);
  const currentParentId = chain && chain.length >= 2 ? chain[chain.length - 2].id : null;
  const validDestinations = locations.filter(l => {
    if (l.id === node.id || l.id === currentParentId) return false;
    if (node.type === "floor") return l.id === tree.id;
    if (node.type === "room") return l.type === "floor";
    if (node.type === "container") return l.type === "room" || l.type === "container";
    return false;
  });
  return (
    <div data-component="MoveLocationModal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Move "{node.name}"</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>Select a new location</div>
        <div style={{ flex: 1, overflow: "auto", borderRadius: 8, border: "1px solid #ddd" }}>
          {validDestinations.length === 0 ? (
            <div style={{ padding: "12px", textAlign: "center", color: "#999", fontSize: 12 }}>No valid destinations</div>
          ) : (
            validDestinations.map(loc => (
              <button key={loc.id} onClick={() => onMove(loc.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "10px 12px",
                  paddingLeft: 12 + (loc.depth - 1) * 16, border: "none", borderBottom: "1px solid #f5f5f5",
                  background: "#fff", cursor: "pointer",
                  fontSize: 13, color: "#222",
                  fontWeight: 400,
                }}>
                <TypeIcon type={loc.type} size={14} /> {loc.name}
              </button>
            ))
          )}
        </div>
        <button onClick={onCancel} style={{ marginTop: 12, padding: "11px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}
