/** NlpInputArea -- AI natural language input with textarea, mic toggle, and send button */

import { Mic, MicOff, Send } from "lucide-react";
import { MAX_INPUT_LENGTH } from "../../constants/inventory.js";

export default function NlpInputArea({ input, onInputChange, onSubmit, loading, speech }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea value={input} onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
            placeholder={'"Put the hammer in the garage" or "Where are my tools?"'}
            maxLength={MAX_INPUT_LENGTH}
            rows={2}
            style={{
              width: "100%", borderRadius: 12, border: "2px solid " + (speech.listening ? "#ef4444" : "#e0e0e0"),
              padding: "14px 16px", paddingRight: 52, fontSize: 15, resize: "none",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          />
          {speech.listening && (
            <div style={{ position: "absolute", bottom: -20, left: 0, fontSize: 11, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, animation: "fadeIn .2s ease" }}>
              <Mic size={12} /> Listening...
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {speech.supported && (
            <button onClick={speech.toggle} title={speech.listening ? "Stop listening" : "Voice input"} style={{
              width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: speech.listening ? "#ef4444" : "#f5f5f5",
              color: speech.listening ? "#fff" : "#666",
              animation: speech.listening ? "pulse 1.5s infinite" : "none",
            }}>
              {speech.listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
          <button onClick={onSubmit} disabled={loading || !input.trim()} title="Send" style={{
            width: 44, height: 44, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: loading ? "#999" : "#0e7490", color: "#fff",
            opacity: !input.trim() && !loading ? 0.4 : 1,
          }}>
            <Send size={20} />
          </button>
        </div>
      </div>
      {speech.error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{speech.error}</div>}
    </div>
  );
}
