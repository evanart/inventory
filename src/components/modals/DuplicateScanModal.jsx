/** DuplicateScanModal -- Modal showing all groups of similar items with merge actions */

export default function DuplicateScanModal({ groups, onMerge, onClose }) {
  return (
    <div data-component="DuplicateScanModal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
       >
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Duplicate Scan</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>
          {groups.length > 0 ? groups.length + " group" + (groups.length !== 1 ? "s" : "") + " of similar items found." : "No duplicate items found in your inventory."}
        </div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((group, gIdx) => (
            <div key={gIdx} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 6, textTransform: "capitalize" }}>
                Similar: "{group[0].name}"
              </div>
              {group.map(item => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", marginBottom: 3,
                  borderRadius: 6, background: "#fafafa", fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{item.name}</span>
                  {item.quantity != null && <span style={{ color: "#999" }}>{"\u00D7"}{item.quantity}</span>}
                  <span style={{ color: "#999", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fullPath}</span>
                  <button onClick={() => onMerge(group, item.id)} title="Merge all into this one"
                    style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #ddd", background: "#fff", color: "#0e7490", fontSize: 10, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Keep</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 14, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Close</button>
      </div>
    </div>
  );
}
