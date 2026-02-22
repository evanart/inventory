/** LoadingIndicator -- "Thinking..." spinner with shimmer bar and cancel button */

import { Loader2 } from "lucide-react";

export default function LoadingIndicator({ onCancel }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
      borderRadius: 12, marginBottom: 16, background: "#fff",
      border: "1px solid #e0e0e0", animation: "fadeIn .2s ease",
    }}>
      <Loader2 size={18} color="#0e7490" style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 14, color: "#555", fontWeight: 500 }}>Thinking...</span>
      <div style={{
        flex: 1, height: 4, borderRadius: 2, overflow: "hidden",
        background: "#f0f0f0",
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #f0f0f0 0%, #0e7490 50%, #f0f0f0 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }} />
      </div>
      <button onClick={onCancel} style={{
        padding: "4px 12px", borderRadius: 6, border: "1px solid #ddd",
        background: "#fff", color: "#666", fontSize: 12, fontWeight: 600,
        cursor: "pointer", flexShrink: 0,
      }}>Cancel</button>
    </div>
  );
}
