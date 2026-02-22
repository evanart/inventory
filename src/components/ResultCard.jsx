/** ResultCard -- Auto-dismissing notification card for search results, success, error, and info messages */

import { useState, useEffect, useRef } from "react";
import { Search, Check, AlertCircle, Info, X } from "lucide-react";

export default function ResultCard({ message, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timerRef.current);
  }, [message]);

  useEffect(() => {
    if (!visible) {
      const fadeTimer = setTimeout(onDismiss, 300);
      return () => clearTimeout(fadeTimer);
    }
  }, [visible, onDismiss]);

  if (!message) return null;

  const iconMap = { search: Search, success: Check, error: AlertCircle, info: Info };
  const IconComponent = iconMap[message.type] || Info;
  const bgMap = { search: "#f0f9ff", success: "#f0fdf4", error: "#fef2f2", info: "#f0f9ff" };
  const borderMap = { search: "#0e7490", success: "#16a34a", error: "#dc2626", info: "#0e7490" };
  const labelMap = { search: "Search Result", success: "Done", error: "Error", info: "Info" };

  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12, marginBottom: 16,
      background: bgMap[message.type] || bgMap.info,
      borderLeft: "4px solid " + (borderMap[message.type] || borderMap.info),
      display: "flex", alignItems: "flex-start", gap: 12,
      animation: visible ? "slideIn .3s ease" : "slideOut .3s ease forwards",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: (borderMap[message.type] || borderMap.info) + "15",
      }}>
        <IconComponent size={18} color={borderMap[message.type] || borderMap.info} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik', sans-serif" }}>
          {labelMap[message.type] || "Info"}
        </div>
        <div style={{ fontSize: 14, color: "#222", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {message.text}
        </div>
      </div>
      <button onClick={() => setVisible(false)} style={{
        background: "none", border: "none", cursor: "pointer", padding: 8, flexShrink: 0,
        color: "#999", display: "flex", alignItems: "center",
      }}>
        <X size={16} />
      </button>
    </div>
  );
}
