/** SettingsMenu -- Dropdown menu with export, import, sample data, duplicates, deleted, and clear */

import { Upload, Download, ClipboardList, Search, Trash2 } from "lucide-react";

export default function SettingsMenu({ onExportCSV, onImportCSV, onLoadSample, onDuplicateScan, onShowDeleted, onClearAll }) {
  const btnStyle = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "12px 14px",
    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
    fontSize: 14, color: "#222", cursor: "pointer", fontWeight: 500,
  };
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff",
      borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.15)", overflow: "hidden", zIndex: 50, minWidth: 200,
    }}>
      <button onClick={onExportCSV} style={btnStyle}><Upload size={14} color="#666" /> Export CSV</button>
      <button onClick={onImportCSV} style={btnStyle}><Download size={14} color="#666" /> Import CSV</button>
      <button onClick={onLoadSample} style={btnStyle}><ClipboardList size={14} color="#666" /> Load Sample Data</button>
      <button onClick={onDuplicateScan} style={btnStyle}><Search size={14} color="#666" /> Find Duplicates</button>
      <button onClick={onShowDeleted} style={btnStyle}>🗂 Recently Deleted</button>
      <button onClick={onClearAll} style={{ ...btnStyle, color: "#dc2626", borderBottom: "none" }}><Trash2 size={14} color="#dc2626" /> Clear All Items</button>
    </div>
  );
}
