/** HeaderBar -- Top bar with app title, item count, undo button, and settings dropdown */

import { Home, Undo2, Settings } from "lucide-react";
import SettingsMenu from "./SettingsMenu.jsx";

export default function HeaderBar({
  totalItems, undoStack, onUndo, showDataMenu, onToggleDataMenu,
  onExportCSV, onImportCSV, onLoadSample, onDuplicateScan, onShowDeleted, onClearAll,
}) {
  return (
    <div style={{ background: "#fff", padding: "16px 16px 14px", borderBottom: "1px solid #e0e0e0" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Home size={22} color="#0e7490" />
          <div>
            <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: 18, fontWeight: 600, color: "#111", letterSpacing: "0.02em" }}>Home Inventory</div>
            <div style={{ fontSize: 12, color: "#999" }}>{totalItems} items tracked</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {undoStack.length > 0 && (
            <button onClick={onUndo} title="Undo" style={{
              width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0",
              background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#666",
            }}><Undo2 size={16} /></button>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={onToggleDataMenu} title="Settings" style={{
              width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0",
              background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#666",
            }}><Settings size={16} /></button>
            {showDataMenu && (
              <SettingsMenu
                onExportCSV={onExportCSV}
                onImportCSV={onImportCSV}
                onLoadSample={onLoadSample}
                onDuplicateScan={onDuplicateScan}
                onShowDeleted={onShowDeleted}
                onClearAll={onClearAll}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
