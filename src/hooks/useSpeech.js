/** useSpeech -- Custom hook for Web Speech API: mic toggle, transcript, auto-settle after silence */

import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState(null);
  const [settled, setSettled] = useState(false);
  const ref = useRef(null);
  const retryCount = useRef(0);
  const settleTimer = useRef(null);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const r = new SR();
      r.continuous = true; r.interimResults = true; r.lang = "en-US";
      r.onresult = e => {
        setError(null); retryCount.current = 0;
        setTranscript(Array.from(e.results).map(x => x[0].transcript).join(""));
        clearTimeout(settleTimer.current);
        const allFinal = Array.from(e.results).every(r => r.isFinal);
        if (allFinal) {
          settleTimer.current = setTimeout(() => { setSettled(true); r.stop(); }, 2000);
        }
      };
      r.onend = () => { clearTimeout(settleTimer.current); setListening(false); };
      r.onerror = (e) => {
        clearTimeout(settleTimer.current);
        if (e.error === "no-speech" && retryCount.current < 2) { retryCount.current++; setTimeout(() => { try { r.start(); setListening(true); } catch(ex) {} }, 300); return; }
        setListening(false);
        if (e.error !== "aborted") setError(e.error === "no-speech" ? "No speech detected. Tap to try again." : "Mic error: " + e.error);
      };
      ref.current = r;
    }
  }, []);
  const toggle = useCallback(() => {
    if (!ref.current) return;
    setError(null); retryCount.current = 0;
    clearTimeout(settleTimer.current);
    if (listening) { setSettled(true); ref.current.stop(); }
    else { setTranscript(""); setSettled(false); try { ref.current.start(); setListening(true); } catch(ex) { setError("Couldn't start mic."); } }
  }, [listening]);
  return { listening, transcript, setTranscript, supported, toggle, error, settled, setSettled };
}
