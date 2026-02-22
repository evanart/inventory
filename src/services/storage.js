/** storage -- Data persistence: localStorage read/write, server sync, debounced saving */

import { STORAGE_KEY, API_PROXY, API_KEY } from "../constants/inventory.js";

export function loadDataLocal() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; }
  catch(e) { return null; }
}
export async function loadDataFromServer() {
  if (!API_PROXY) return loadDataLocal();
  try {
    const headers = {};
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }
    const res = await fetch(API_PROXY + "/data", { headers });
    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();
    if (data) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
      return data;
    }
    return loadDataLocal();
  } catch(e) {
    console.warn("Failed to load from server, using local cache:", e);
    return loadDataLocal();
  }
}
export const saveTimeout = { current: null };
export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error(e); }
  if (API_PROXY) {
    const headers = { "Content-Type": "application/json" };
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }
    fetch(API_PROXY + "/data", {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    }).catch(e => console.warn("Failed to sync to server:", e));
  }
}
export function debouncedSave(data) {
  clearTimeout(saveTimeout.current);
  saveTimeout.current = setTimeout(() => saveData(data), 500);
}
export function flushSave(data) {
  clearTimeout(saveTimeout.current);
  saveData(data);
}
