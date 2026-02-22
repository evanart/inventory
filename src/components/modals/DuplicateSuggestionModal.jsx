/** DuplicateSuggestionModal -- Modal to resolve potential duplicates when AI stores new items */

import { useState } from "react";

export default function DuplicateSuggestionModal({ pendingStore, onResolve, onCancel }) {
  const itemsWithDupes = pendingStore.items.map((item, idx) => ({ ...item, idx })).filter(item => item.duplicates.length > 0);
  const [choices, setChoices] = useState(() =>
    pendingStore.items.map(item => ({
      action: item.duplicates.length > 0 ? "add" : "add",
      targetId: item.duplicates.length > 0 ? item.duplicates[0].id : null
    }))
  );
  const setChoice = (idx, action, targetId) => {
    setChoices(prev => prev.map((c, i) => i === idx ? { action, targetId: targetId !== undefined ? targetId : c.targetId } : c));
  };
  return (
    <div data-component="DuplicateSuggestionModal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
       >
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Similar Items Found</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>These items may already exist in your inventory.</div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {itemsWithDupes.map(item => {
            const choice = choices[item.idx];
            return (
              <div key={item.idx} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 4 }}>
                  Storing "{item.name}"{item.quantity != null && " \u00D7" + item.quantity} in {item.targetPath}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Found similar:</div>
                {item.duplicates.map(dup => (
                  <div key={dup.id} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", marginBottom: 4,
                    borderRadius: 6, background: choice.targetId === dup.id ? "#e8f7fa" : "#fafafa",
                    border: "1px solid " + (choice.targetId === dup.id ? "#a3d5de" : "#f5f5f5"),
                    cursor: "pointer", fontSize: 12,
                  }} onClick={() => setChoice(item.idx, choice.action, dup.id)}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{dup.name}</span>
                    {dup.quantity != null && <span style={{ color: "#999" }}>{"\u00D7"}{dup.quantity}</span>}
                    <span style={{ color: "#999", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dup.fullPath}</span>
                    {choice.targetId === dup.id && <span style={{ color: "#0e7490", flexShrink: 0 }}>{"\u25CF"}</span>}
                  </div>
                ))}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {[
                    { action: "add", label: "Store Here Too" },
                    { action: "addToExisting", label: "Add to Existing" },
                    { action: "moveHere", label: "Move Here" },
                    { action: "skip", label: "Skip" },
                  ].map(opt => (
                    <button key={opt.action} onClick={() => setChoice(item.idx, opt.action)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        border: choice.action === opt.action ? "none" : "1px solid #ddd",
                        background: choice.action === opt.action
                          ? (opt.action === "skip" ? "#fee2e2" : "#0e7490") : "#fff",
                        color: choice.action === opt.action
                          ? (opt.action === "skip" ? "#991b1b" : "#fff") : "#666",
                      }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onResolve(choices)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "#0e7490", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
