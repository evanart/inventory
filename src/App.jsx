import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "home-inventory-v2";
const API_PROXY = import.meta.env.VITE_API_PROXY_URL || "";
const API_KEY = import.meta.env.VITE_API_KEY || "";
const MAX_INPUT_LENGTH = 500;

const DEFAULT_STRUCTURE = {
  id: "house", name: "House", type: "house", children: [
    { id: "f1", name: "Main Floor", type: "floor", children: [
      { id: "garage", name: "Garage", type: "room", children: [] },
      { id: "office_main", name: "Office (Main)", type: "room", children: [] },
      { id: "kitchen", name: "Kitchen", type: "room", children: [] },
      { id: "pantry", name: "Pantry", type: "room", children: [] },
      { id: "dining", name: "Dining Area", type: "room", children: [] },
      { id: "living", name: "Living Room", type: "room", children: [] },
      { id: "foyer", name: "Foyer", type: "room", children: [] },
      { id: "bath_main", name: "Bath (Main)", type: "room", children: [] },
      { id: "laundry_closet", name: "Hall", type: "room", children: [] },
      { id: "office_up", name: "Office (Upper)", type: "room", children: [] },
      { id: "screened_porch", name: "Screened Porch", type: "room", children: [] },
      { id: "deck", name: "Deck", type: "room", children: [] },
      { id: "porch", name: "Porch", type: "room", children: [] },
    ]},
    { id: "f2", name: "Upper Floor", type: "floor", children: [
      { id: "primary_bed", name: "Primary Bedroom", type: "room", children: [] },
      { id: "bath_primary", name: "Bath (Primary)", type: "room", children: [] },
      { id: "wic_primary", name: "W.I.C. (Primary)", type: "room", children: [] },
      { id: "bedroom_2", name: "Bedroom 2", type: "room", children: [] },
      { id: "wic_2", name: "W.I.C. (Bed 2)", type: "room", children: [] },
      { id: "bath_2", name: "Bath 2", type: "room", children: [] },
      { id: "hall_upper", name: "Hall", type: "room", children: [] },
      { id: "laundry", name: "Laundry", type: "room", children: [] },
      { id: "bedroom_3", name: "Bedroom 3", type: "room", children: [] },
      { id: "bedroom_4", name: "Bedroom 4", type: "room", children: [] },
      { id: "wic_4", name: "W.I.C. (Bed 4)", type: "room", children: [] },
    ]},
    { id: "f3", name: "Lower Level", type: "floor", children: [
      { id: "exercise", name: "Exercise Room", type: "room", children: [] },
      { id: "bath_lower", name: "Bath (Lower)", type: "room", children: [] },
      { id: "attic", name: "Attic", type: "room", children: [] },
    ]},
  ]
};

const TYPE_ICONS = { house: "🏠", floor: "🏗", room: "🚪", container: "📦", item: "📌" };
const TYPE_COLORS = { house: "#111", floor: "#444", room: "#0e7490", container: "#155e75", item: "#0e7490" };
const CATEGORIES = ["tools","cleaning","electronics","holiday","clothing","kitchen","bathroom","office","sports","crafts","baby","storage","misc"];
const CAT_COLORS = {
  tools:"#f59e0b",cleaning:"#10b981",electronics:"#3b82f6",holiday:"#ef4444",
  clothing:"#8b5cf6",kitchen:"#f97316",bathroom:"#06b6d4",office:"#6366f1",
  sports:"#22c55e",crafts:"#ec4899",baby:"#a78bfa",storage:"#78716c",misc:"#999"
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function countItems(n) { return n.type === "item" ? 1 : (n.children || []).reduce((s, c) => s + countItems(c), 0); }
function findNode(t, id) {
  if (t.id === id) return t;
  for (const c of (t.children || [])) { const f = findNode(c, id); if (f) return f; }
  return null;
}
function findParentChain(t, id, chain = []) {
  if (t.id === id) return [...chain, t];
  for (const c of (t.children || [])) { const r = findParentChain(c, id, [...chain, t]); if (r) return r; }
  return null;
}
function addToTree(t, pid, node) {
  if (t.id === pid) return { ...t, children: [...(t.children || []), node] };
  return { ...t, children: (t.children || []).map(c => addToTree(c, pid, node)) };
}
function removeFromTree(t, id) {
  return { ...t, children: (t.children || []).filter(c => c.id !== id).map(c => removeFromTree(c, id)) };
}
function updateInTree(t, id, updates) {
  if (t.id === id) return { ...t, ...updates };
  return { ...t, children: (t.children || []).map(c => updateInTree(c, id, updates)) };
}
function flattenItems(n) { return n.type === "item" ? [n] : (n.children || []).flatMap(c => flattenItems(c)); }
function normalizeName(name) {
  let n = name.toLowerCase().trim();
  if (n.endsWith('ies') && n.length > 4) return n.slice(0, -3) + 'y';
  if (n.endsWith('ses') || n.endsWith('xes') || n.endsWith('zes')) return n.slice(0, -2);
  if (n.endsWith('ches') || n.endsWith('shes')) return n.slice(0, -2);
  if (n.endsWith('s') && !n.endsWith('ss') && n.length > 2) return n.slice(0, -1);
  return n;
}
function itemsSimilar(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;
  if (n1.length > 2 && n2.length > 2 && (n1.includes(n2) || n2.includes(n1))) return true;
  const t1 = n1.split(/\s+/).filter(w => w.length > 2);
  const t2 = n2.split(/\s+/).filter(w => w.length > 2);
  if (t1.length > 1 && t2.length > 1) {
    const shared = t1.filter(w => t2.some(w2 => normalizeName(w) === normalizeName(w2)));
    if (shared.length >= Math.min(t1.length, t2.length) * 0.5 && shared.length > 0) return true;
  }
  return false;
}
function findSimilarItems(tree, itemName, excludeIds) {
  return flattenItems(tree)
    .filter(item => !(excludeIds || []).includes(item.id) && itemsSimilar(item.name, itemName))
    .map(item => {
      const chain = findParentChain(tree, item.id);
      return { ...item, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
    });
}
function findAllDuplicateGroups(tree) {
  const allItems = flattenItems(tree).map(item => {
    const chain = findParentChain(tree, item.id);
    return { ...item, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
  });
  const groups = [], processed = new Set();
  for (let i = 0; i < allItems.length; i++) {
    if (processed.has(allItems[i].id)) continue;
    const group = [allItems[i]];
    for (let j = i + 1; j < allItems.length; j++) {
      if (processed.has(allItems[j].id)) continue;
      if (itemsSimilar(allItems[i].name, allItems[j].name)) {
        group.push(allItems[j]);
        processed.add(allItems[j].id);
      }
    }
    if (group.length > 1) {
      groups.push(group);
      processed.add(allItems[i].id);
    }
  }
  return groups;
}
function findOrCreatePath(tree, pathNames, types, source = "manual") {
  let updated = { ...tree }, parentId = tree.id;
  for (let i = 0; i < pathNames.length; i++) {
    const name = pathNames[i], type = types[i] || "container";
    const parent = findNode(updated, parentId);
    let match = (parent.children || []).find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!match) {
      const parentChain = findParentChain(updated, parentId);
      const parentPath = parentChain ? parentChain.map(n => n.name) : [];
      const nn = { id: uid() + i, name, type, children: [], history: [{ event: "created", timestamp: nowISO(), source, parentPath }] };
      updated = addToTree(updated, parentId, nn);
      parentId = nn.id;
    } else { parentId = match.id; }
  }
  return { tree: updated, leafId: parentId };
}
function moveNode(tree, nodeId, newParentId) {
  const node = findNode(tree, nodeId);
  if (!node || node.id === newParentId) return tree;
  const newParent = findNode(tree, newParentId);
  if (!newParent) return tree;
  const nodeCopy = { ...node };
  let updated = removeFromTree(tree, nodeId);
  updated = addToTree(updated, newParentId, nodeCopy);
  return updated;
}
function deleteNodeCascade(tree, nodeId) {
  return removeFromTree(tree, nodeId);
}
function deleteNodePreserveChildren(tree, nodeId) {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const parent = findParentChain(tree, nodeId);
  if (!parent || parent.length < 2) return removeFromTree(tree, nodeId);
  const parentId = parent[parent.length - 2].id;
  let updated = tree;
  (node.children || []).forEach(child => {
    updated = moveNode(updated, child.id, parentId);
  });
  updated = removeFromTree(updated, nodeId);
  return updated;
}
function findOrCreateLocation(tree, locationName, type, parentPath) {
  let current = tree;
  for (const pathName of parentPath) {
    const match = (current.children || []).find(c => c.name.toLowerCase() === pathName.toLowerCase());
    if (match) current = match;
    else return null;
  }
  const existing = (current.children || []).find(c => c.name.toLowerCase() === locationName.toLowerCase() && c.type === type);
  if (existing) return tree;
  const newNode = { id: uid(), name: locationName, type, children: [], history: [{ event: "created", timestamp: nowISO(), source: "ai", parentPath: parentPath }] };
  return addToTree(tree, current.id, newNode);
}

const nowISO = () => new Date().toISOString();
function formatRelativeTime(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + " min ago";
  if (diffHours < 24) return "today at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return diffDays + " days ago";
  if (diffDays < 30) return Math.floor(diffDays / 7) + " wk ago";
  if (diffDays < 365) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function migrateTree(node) {
  return {
    ...node,
    history: node.history || [],
    ...(node.type === "house" ? { deletedLog: node.deletedLog || [] } : {}),
    children: (node.children || []).map(migrateTree),
  };
}
function addHistoryEntry(tree, nodeId, entry) {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  return updateInTree(tree, nodeId, {
    history: [...(node.history || []), { ...entry, timestamp: nowISO() }],
  });
}
function snapshotToDeletedLog(tree, nodeId) {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const parentChain = findParentChain(tree, nodeId);
  const parentPath = parentChain ? parentChain.slice(0, -1).map(n => n.name) : [];
  const entry = { node, deletedAt: nowISO(), parentPath };
  return { ...tree, deletedLog: [...(tree.deletedLog || []), entry].slice(-100) };
}

function escapeCSVField(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      if (text[i] === '"') {
        i++;
        let field = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += text[i]; i++; }
        }
        row.push(field);
      } else {
        let field = "";
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') { field += text[i]; i++; }
        row.push(field);
      }
      if (i < text.length && text[i] === ',') { i++; } else { break; }
    }
    if (i < text.length && text[i] === '\r') i++;
    if (i < text.length && text[i] === '\n') i++;
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) rows.push(row);
  }
  return rows;
}

function exportTreeToCSV(tree) {
  const rows = [["Floor", "Room", "Container", "Item Name", "Quantity", "Category"]];
  for (const floor of (tree.children || [])) {
    if (floor.type !== "floor") continue;
    for (const room of (floor.children || [])) {
      if (room.type !== "room") continue;
      for (const child of (room.children || [])) {
        if (child.type === "item") {
          rows.push([floor.name, room.name, "", child.name, child.quantity != null ? child.quantity : "", child.category || "misc"]);
        }
      }
      function walkContainers(container, containerPath) {
        for (const child of (container.children || [])) {
          if (child.type === "item") {
            rows.push([floor.name, room.name, containerPath, child.name, child.quantity != null ? child.quantity : "", child.category || "misc"]);
          } else if (child.type === "container") {
            walkContainers(child, containerPath + " > " + child.name);
          }
        }
      }
      for (const child of (room.children || [])) {
        if (child.type === "container") walkContainers(child, child.name);
      }
    }
  }
  return rows.map(row => row.map(escapeCSVField).join(",")).join("\n");
}

function importCSVToTree(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error("CSV file is empty or has no data rows.");
  let tree = JSON.parse(JSON.stringify(DEFAULT_STRUCTURE));
  let count = 0;
  const errors = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(cell => cell.trim() === "")) continue;
    const floorName = (row[0] || "").trim();
    const roomName = (row[1] || "").trim();
    const containerStr = (row[2] || "").trim();
    const itemName = (row[3] || "").trim();
    const qtyStr = (row[4] || "").trim();
    const category = (row[5] || "misc").trim().toLowerCase();
    if (!floorName || !roomName || !itemName) { errors.push("Row " + (r + 1) + ": missing floor, room, or item name"); continue; }
    const pathNames = [floorName, roomName];
    const types = ["floor", "room"];
    if (containerStr) {
      for (const c of containerStr.split(" > ").map(s => s.trim()).filter(Boolean)) {
        pathNames.push(c);
        types.push("container");
      }
    }
    const { tree: updated, leafId } = findOrCreatePath(tree, pathNames, types, "import");
    tree = updated;
    const validCat = CATEGORIES.includes(category) ? category : "misc";
    const quantity = qtyStr === "" ? null : (isNaN(Number(qtyStr)) ? null : Number(qtyStr));
    const importChain = findParentChain(tree, leafId);
    const importParentPath = importChain ? importChain.map(n => n.name) : [];
    tree = addToTree(tree, leafId, { id: uid(), name: itemName, type: "item", quantity, category: validCat, children: [], history: [{ event: "created", timestamp: nowISO(), source: "import", parentPath: importParentPath }] });
    count++;
  }
  return { tree, count, errors };
}

async function apiCall(systemPrompt, userMessage, mode) {
  if (!API_PROXY) throw new Error("API proxy not configured. Set VITE_API_PROXY_URL.");
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  const res = await fetch(API_PROXY, {
    method: "POST",
    headers,
    body: JSON.stringify({ system: systemPrompt, message: userMessage, mode }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("API key invalid or missing. Check VITE_API_KEY environment variable.");
    }
    throw new Error("API error " + res.status + ": " + (errText || "Unknown error"));
  }
  const data = await res.json();
  return data.text;
}

async function parseWithClaude(text, tree) {
  const allNodes = [];
  function walk(n, path) {
    allNodes.push({ path: path.join(" > "), type: n.type, name: n.name });
    (n.children || []).forEach(c => walk(c, [...path, c.name]));
  }
  walk(tree, [tree.name]);
  const summary = allNodes.filter(n => n.type !== "item").map(n => n.path).join("\n");
  const systemPrompt = "You extract item storage info from natural language and place it in a house hierarchy.\n\nCurrent structure:\n" + summary + "\n\nReturn ONLY valid JSON:\n{\n  \"action\": \"store\" | \"remove\",\n  \"items\": [{\n    \"name\": \"item name (singular lowercase)\",\n    \"quantity\": number or null,\n    \"path\": [\"Floor Name\", \"Room Name\", \"Container (optional)\", \"Sub-container (optional)\"],\n    \"category\": one of: " + CATEGORIES.join(", ") + "\n  }],\n  \"createLocations\": [{\"name\": \"location name\", \"type\": \"floor\" | \"room\", \"parentPath\": [\"Floor Name\"] or []}]\n}\n\nRules:\n- path = array from floor to most specific container\n- Match existing locations when clearly the same\n- New containers are created automatically in the path\n- If user mentions a room or floor that doesn't exist, add it to createLocations\n- quantity null = unknown amount\n- \"the garage\" -> [\"Main Floor\", \"Garage\"]\n- \"wood shelf in the garage\" -> [\"Main Floor\", \"Garage\", \"Wood Shelf\"]\n- If user says \"store X in the guest bedroom on the main floor\", and guest bedroom doesn't exist, add {\"name\": \"Guest Bedroom\", \"type\": \"room\", \"parentPath\": [\"Main Floor\"]} to createLocations";
  const raw = await apiCall(systemPrompt, text, "parse");
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

async function searchWithClaude(query, tree) {
  const allItems = flattenItems(tree).map(item => {
    const chain = findParentChain(tree, item.id);
    return { ...item, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
  });
  const systemPrompt = "You help find items in a home inventory. Given a query and item list with full paths, return a helpful concise plain text answer. If nothing matches, say so.";
  return await apiCall(systemPrompt, "Items:\n" + JSON.stringify(allItems) + "\n\nQuery: \"" + query + "\"", "search");
}

function useSpeech() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const retryCount = useRef(0);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const r = new SR();
      r.continuous = false; r.interimResults = true; r.lang = "en-US";
      r.onresult = e => { setError(null); retryCount.current = 0; setTranscript(Array.from(e.results).map(x => x[0].transcript).join("")); };
      r.onend = () => setListening(false);
      r.onerror = (e) => {
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
    if (listening) ref.current.stop();
    else { setTranscript(""); try { ref.current.start(); setListening(true); } catch(ex) { setError("Couldn't start mic."); } }
  }, [listening]);
  return { listening, transcript, setTranscript, supported, toggle, error };
}

function loadDataLocal() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; }
  catch(e) { return null; }
}
async function loadDataFromServer() {
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
const saveTimeout = { current: null };
function saveData(data) {
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
function debouncedSave(data) {
  clearTimeout(saveTimeout.current);
  saveTimeout.current = setTimeout(() => saveData(data), 500);
}
function flushSave(data) {
  clearTimeout(saveTimeout.current);
  saveData(data);
}

function Breadcrumb({ chain, onNavigate }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", marginBottom: 14, fontSize: 13 }}>
      {chain.map((node, i) => (
        <span key={node.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "#ccc", margin: "0 3px" }}>›</span>}
          <button onClick={() => onNavigate(node.id)} style={{
            background: i === chain.length - 1 ? "#111" : "none", border: "none", cursor: "pointer",
            padding: "3px 10px", borderRadius: 4, fontWeight: i === chain.length - 1 ? 600 : 400,
            color: i === chain.length - 1 ? "#fff" : "#666", fontSize: 13,
            fontFamily: "'Rubik', sans-serif",
          }}>{TYPE_ICONS[node.type] || "📁"} {node.name}</button>
        </span>
      ))}
    </div>
  );
}

function ItemCard({ node, onDelete, onEdit, onMove, onHistory }) {
  const cat = node.category || "misc";
  const createdEntry = node.history && node.history.length > 0 ? node.history[0] : null;
  return (
    <div style={{
      background: "#fff", borderRadius: 8, padding: "10px 14px",
      border: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        background: CAT_COLORS[cat] || "#999", color: "#fff", fontSize: 9,
        fontWeight: 700, borderRadius: 4, padding: "2px 7px", textTransform: "uppercase", flexShrink: 0,
        fontFamily: "'Rubik', sans-serif", letterSpacing: "0.04em",
      }}>{cat}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111", textTransform: "capitalize" }}>{node.name}</span>
          {node.quantity != null && <span style={{ fontSize: 12, color: "#999", marginLeft: 6 }}>×{node.quantity}</span>}
        </div>
        {createdEntry && <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>Added {formatRelativeTime(createdEntry.timestamp)}</div>}
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={() => onHistory(node)} title="History" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 13, padding: 4 }}>🕐</button>
        <button onClick={() => onEdit(node)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14, padding: 4 }}>✏️</button>
        <button onClick={() => onMove(node)} title="Move" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14, padding: 4 }}>📂</button>
        <button onClick={() => onDelete(node.id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14, padding: 4 }}>✕</button>
      </div>
    </div>
  );
}

function LocationCard({ node, onClick, onRename, onDelete, onMove, onHistory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const count = countItems(node);
  const color = TYPE_COLORS[node.type] || "#666";
  const isDeletable = node.type === "container" || node.type === "room" || node.type === "floor";
  const isMovable = node.type === "room" || node.type === "floor" || node.type === "container";
  const createdEntry = node.history && node.history.length > 0 ? node.history[0] : null;

  if (editing) {
    return (
      <div style={{
        background: "#fff", borderRadius: 8, padding: "10px 16px",
        border: "2px solid #0e7490", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: "#f5f5f5",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
          border: "1px solid #e0e0e0",
        }}>{TYPE_ICONS[node.type] || "📁"}</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => {
            if (e.key === "Enter" && name.trim()) { onRename(node.id, name.trim()); setEditing(false); }
            if (e.key === "Escape") { setName(node.name); setEditing(false); }
          }}
          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, fontWeight: 600, outline: "none" }}
        />
        <button onClick={() => { if (name.trim()) { onRename(node.id, name.trim()); setEditing(false); } }}
          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
        <button onClick={() => { setName(node.name); setEditing(false); }}
          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 8, padding: "12px 16px",
      border: count > 0 ? "2px solid #0e749033" : "1px solid #e0e0e0",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div onClick={() => onClick(node.id)} style={{
        width: 38, height: 38, borderRadius: 8, background: "#f5f5f5",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
        border: "1px solid #e0e0e0",
      }}>{TYPE_ICONS[node.type] || "📁"}</div>
      <div onClick={() => onClick(node.id)} style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 500, fontSize: 14, color: "#111" }}>{node.name}</div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {count > 0 ? count + " item" + (count !== 1 ? "s" : "") : "empty"}
          {(node.children || []).filter(c => c.type !== "item").length > 0 &&
            " · " + (node.children || []).filter(c => c.type !== "item").length + " sub-locations"}
          {createdEntry && <span style={{ color: "#ccc" }}> · Added {formatRelativeTime(createdEntry.timestamp)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); onHistory(node); }} title="History"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 13, padding: 4 }}>🕐</button>
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Rename"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 13, padding: 4 }}>✏️</button>
        {isMovable && (
          <button onClick={(e) => { e.stopPropagation(); onMove(node); }} title="Move"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 13, padding: 4 }}>📂</button>
        )}
        {isDeletable && (
          <button onClick={(e) => { e.stopPropagation(); if (count > 0 && (node.type === "room" || node.type === "floor")) { if (confirm("This " + node.type + " contains " + count + " item(s). Delete anyway?")) onDelete(node.id); } else { onDelete(node.id); } }} title={"Delete " + node.type}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 13, padding: 4 }}>✕</button>
        )}
        <div onClick={() => onClick(node.id)} style={{ color: "#ccc", fontSize: 18, padding: "0 2px", cursor: "pointer" }}>›</div>
      </div>
    </div>
  );
}

function EditItemModal({ item, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity != null ? item.quantity : "");
  const [cat, setCat] = useState(item.category || "misc");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Edit Item</div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 4 }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 4 }}>Quantity</label>
        <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" placeholder="Unknown" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 4 }}>Category</label>
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave({ name: name.trim() || item.name, quantity: qty === "" ? null : Number(qty), category: cat })} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#0e7490", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function MoveItemModal({ item, tree, onMove, onCancel }) {
  const locations = [];
  function walk(n, path, depth) {
    if (n.type !== "item") {
      locations.push({ id: n.id, label: path.join(" > "), depth, name: n.name, type: n.type });
      (n.children || []).forEach(c => walk(c, [...path, c.name], depth + 1));
    }
  }
  walk(tree, [tree.name], 0);
  const chain = findParentChain(tree, item.id);
  const currentParentId = chain && chain.length >= 2 ? chain[chain.length - 2].id : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Move "{item.name}"</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>Select a new location</div>
        <div style={{ flex: 1, overflow: "auto", borderRadius: 8, border: "1px solid #ddd" }}>
          {locations.filter(l => l.type !== "house").map(loc => (
            <button key={loc.id} onClick={() => { if (loc.id !== currentParentId) onMove(loc.id); }}
              disabled={loc.id === currentParentId}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                paddingLeft: 12 + (loc.depth - 1) * 16, border: "none", borderBottom: "1px solid #f5f5f5",
                background: loc.id === currentParentId ? "#e8f7fa" : "#fff", cursor: loc.id === currentParentId ? "default" : "pointer",
                fontSize: 13, color: loc.id === currentParentId ? "#0e7490" : "#222",
                fontWeight: loc.id === currentParentId ? 600 : 400,
              }}>
              {TYPE_ICONS[loc.type]} {loc.name} {loc.id === currentParentId && <span style={{ fontSize: 11 }}>(current)</span>}
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}

function RenameModal({ node, onSave, onCancel }) {
  const [name, setName] = useState(node.name);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Rename {node.type === "floor" ? "Floor" : node.type === "room" ? "Room" : "Container"}</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, fontWeight: 600, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (name.trim()) onSave(name.trim()); }} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: TYPE_COLORS[node.type] || "#0e7490", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function MoveLocationModal({ node, tree, onMove, onCancel }) {
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Move "{node.name}"</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>Select a new location</div>
        <div style={{ flex: 1, overflow: "auto", borderRadius: 8, border: "1px solid #ddd" }}>
          {validDestinations.length === 0 ? (
            <div style={{ padding: "12px", textAlign: "center", color: "#999", fontSize: 12 }}>No valid destinations</div>
          ) : (
            validDestinations.map(loc => (
              <button key={loc.id} onClick={() => onMove(loc.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                  paddingLeft: 12 + (loc.depth - 1) * 16, border: "none", borderBottom: "1px solid #f5f5f5",
                  background: "#fff", cursor: "pointer",
                  fontSize: 13, color: "#222",
                  fontWeight: 400,
                }}>
                {TYPE_ICONS[loc.type]} {loc.name}
              </button>
            ))
          )}
        </div>
        <button onClick={onCancel} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}

function QuickAddItem({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("misc");
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #ddd", marginBottom: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name"
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim(), cat); }}
        autoFocus style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
      <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => { if (name.trim()) onAdd(name.trim(), cat); }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#0e7490", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, cursor: "pointer" }}>✕</button>
    </div>
  );
}

function AddContainerInline({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim()); }}
        placeholder="Container name (e.g. Wood Shelf, Red Box)" autoFocus
        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, outline: "none" }} />
      <button onClick={() => { if (name.trim()) onAdd(name.trim()); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#155e75", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 13, cursor: "pointer" }}>Cancel</button>
    </div>
  );
}

function DuplicateSuggestionModal({ pendingStore, onResolve, onCancel }) {
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Similar Items Found</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>These items may already exist in your inventory.</div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {itemsWithDupes.map(item => {
            const choice = choices[item.idx];
            return (
              <div key={item.idx} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 4 }}>
                  Storing "{item.name}"{item.quantity != null && " ×" + item.quantity} in {item.targetPath}
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
                    {dup.quantity != null && <span style={{ color: "#999" }}>×{dup.quantity}</span>}
                    <span style={{ color: "#999", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dup.fullPath}</span>
                    {choice.targetId === dup.id && <span style={{ color: "#0e7490", flexShrink: 0 }}>●</span>}
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
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
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
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onResolve(choices)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#0e7490", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function DuplicateScanModal({ groups, onMerge, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
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
                  {item.quantity != null && <span style={{ color: "#999" }}>×{item.quantity}</span>}
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

function HistoryModal({ node, onClose }) {
  const entries = [...(node.history || [])].reverse();
  const formatEntry = (entry) => {
    switch (entry.event) {
      case "created": {
        const loc = entry.parentPath && entry.parentPath.length > 0 ? " in " + entry.parentPath.join(" > ") : "";
        const src = entry.source === "ai" ? " via AI" : entry.source === "import" ? " via import" : " manually";
        return "Created" + loc + src;
      }
      case "moved":
        return "Moved from " + (entry.fromPath || []).join(" > ") + " to " + (entry.toPath || []).join(" > ");
      case "renamed":
        return `Renamed from "${entry.from}" to "${entry.to}"`;
      case "quantity_changed":
        return `Quantity: ${entry.from == null ? "unknown" : entry.from} → ${entry.to == null ? "unknown" : entry.to}`;
      case "category_changed":
        return `Category: ${entry.from} → ${entry.to}`;
      default:
        return entry.event;
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420, maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 2 }}>
          {TYPE_ICONS[node.type]} {node.name}
        </div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14, textTransform: "capitalize" }}>{node.type} history</div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: 13 }}>No history recorded</div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: i < entries.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0e7490", flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{formatEntry(entry)}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }} title={entry.timestamp}>{formatRelativeTime(entry.timestamp)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Close</button>
      </div>
    </div>
  );
}

function DeletedLogModal({ deletedLog, onClose }) {
  const [viewingHistory, setViewingHistory] = useState(null);
  const entries = [...(deletedLog || [])].reverse();
  if (viewingHistory) {
    return <HistoryModal node={viewingHistory} onClose={() => setViewingHistory(null)} />;
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420, maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeIn .2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 2 }}>Recently Deleted</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>
          {entries.length > 0 ? entries.length + " item" + (entries.length !== 1 ? "s" : "") : "Nothing deleted yet"}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: 13 }}>Nothing deleted yet.</div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < entries.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{TYPE_ICONS[entry.node.type]} {entry.node.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                    {entry.parentPath.length > 0 ? entry.parentPath.join(" > ") + " · " : ""}
                    Deleted {formatRelativeTime(entry.deletedAt)}
                  </div>
                </div>
                {(entry.node.history || []).length > 0 && (
                  <button onClick={() => setViewingHistory(entry.node)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#0e7490", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    History
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  const [tree, setTree] = useState(DEFAULT_STRUCTURE);
  const [currentId, setCurrentId] = useState("house");
  const [mode, setMode] = useState("browse");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [movingLocation, setMovingLocation] = useState(null);
  const [renamingLocation, setRenamingLocation] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [pendingStore, setPendingStore] = useState(null);
  const [duplicateScanResults, setDuplicateScanResults] = useState(null);
  const [historyNode, setHistoryNode] = useState(null);
  const [showDeletedLog, setShowDeletedLog] = useState(false);
  const speech = useSpeech();

  const fileInputRef = useRef(null);
  const treeRef = useRef(tree);
  const inputRef = useRef(input);
  const modeRef = useRef(mode);
  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    let cancelled = false;
    // Show local data immediately, then replace with server data
    const local = loadDataLocal();
    if (local) setTree(migrateTree(local));
    loadDataFromServer().then(d => {
      if (!cancelled && d) setTree(migrateTree(d));
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (ready) debouncedSave(tree); }, [tree, ready]);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); } catch(e) { /* noop */ }
        if (API_PROXY) {
          const url = API_KEY ? `${API_PROXY}/data?key=${encodeURIComponent(API_KEY)}` : `${API_PROXY}/data`;
          navigator.sendBeacon(url, JSON.stringify(tree));
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tree]);
  useEffect(() => { if (speech.transcript) setInput(speech.transcript); }, [speech.transcript]);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text) return;
    if (text.length > MAX_INPUT_LENGTH) {
      setMessage({ type: "error", text: "Input too long (max " + MAX_INPUT_LENGTH + " characters)." });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      if (modeRef.current === "search") {
        const ans = await searchWithClaude(text, treeRef.current);
        setMessage({ type: "info", text: ans });
      } else {
        const parsed = await parseWithClaude(text, treeRef.current);
        if (parsed.action === "remove") {
          setUndoStack(prev => [...prev.slice(-9), { tree: treeRef.current, label: "remove" }]);
          let updated = treeRef.current;
          for (const item of parsed.items) {
            const all = flattenItems(updated);
            const match = all.find(n => n.name === item.name);
            if (match) {
              updated = snapshotToDeletedLog(updated, match.id);
              updated = removeFromTree(updated, match.id);
            }
          }
          setTree(updated);
          setMessage({ type: "success", text: "Removed: " + parsed.items.map(i => i.name).join(", ") });
        } else {
          let updated = treeRef.current;
          if (parsed.createLocations && parsed.createLocations.length > 0) {
            for (const loc of parsed.createLocations) {
              updated = findOrCreateLocation(updated, loc.name, loc.type, loc.parentPath);
            }
          }
          const preparedItems = [];
          let tempTree = updated;
          let hasDuplicates = false;
          for (const item of parsed.items) {
            const pathNames = item.path || [];
            const types = pathNames.map((_, i) => i === 0 ? "floor" : i === 1 ? "room" : "container");
            const { tree: t, leafId } = findOrCreatePath(tempTree, pathNames, types, "ai");
            tempTree = t;
            const chain = findParentChain(tempTree, leafId);
            const targetPath = chain ? chain.map(n => n.name).join(" > ") : pathNames.join(" > ");
            const duplicates = findSimilarItems(tempTree, item.name);
            if (duplicates.length > 0) hasDuplicates = true;
            preparedItems.push({ ...item, leafId, targetPath, duplicates });
          }
          if (hasDuplicates) {
            setPendingStore({ items: preparedItems, treeWithPaths: tempTree, undoTree: treeRef.current });
          } else {
            setUndoStack(prev => [...prev.slice(-9), { tree: treeRef.current, label: "store" }]);
            const stored = [];
            for (const item of preparedItems) {
              const parent = findNode(tempTree, item.leafId);
              const existing = (parent.children || []).find(c => c.type === "item" && c.name === item.name);
              if (existing) tempTree = removeFromTree(tempTree, existing.id);
              const itemParentChain = findParentChain(tempTree, item.leafId);
              const itemParentPath = itemParentChain ? itemParentChain.map(n => n.name) : (item.path || []);
              const itemNode = { id: uid(), name: item.name, type: "item", quantity: item.quantity, category: item.category || "misc", children: [], history: [{ event: "created", timestamp: nowISO(), source: "ai", parentPath: itemParentPath }] };
              tempTree = addToTree(tempTree, item.leafId, itemNode);
              const ch = findParentChain(tempTree, itemNode.id);
              stored.push(ch ? ch.map(n => n.name).join(" > ") : item.name);
            }
            setTree(tempTree);
            setMessage({ type: "success", text: "Stored: " + stored.join("; ") });
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "Something went wrong. Try again." });
    }
    setInput(""); speech.setTranscript(""); setLoading(false);
  }, [speech]);

  const handleResolveDuplicates = useCallback((choices) => {
    if (!pendingStore) return;
    setUndoStack(prev => [...prev.slice(-9), { tree: pendingStore.undoTree, label: "store" }]);
    let updated = pendingStore.treeWithPaths;
    const stored = [];
    for (let i = 0; i < pendingStore.items.length; i++) {
      const item = pendingStore.items[i];
      const choice = choices[i];
      if (choice.action === "skip") continue;
      if (choice.action === "addToExisting" && choice.targetId) {
        const existing = findNode(updated, choice.targetId);
        if (existing) {
          const newQty = (existing.quantity != null || item.quantity != null)
            ? (existing.quantity || 0) + (item.quantity || 0) : null;
          updated = updateInTree(updated, existing.id, { quantity: newQty });
          updated = addHistoryEntry(updated, existing.id, { event: "quantity_changed", from: existing.quantity, to: newQty });
          const chain = findParentChain(updated, existing.id);
          stored.push((chain ? chain.map(n => n.name).join(" > ") : existing.name) + " (updated qty)");
        }
      } else if (choice.action === "moveHere" && choice.targetId) {
        const existing = findNode(updated, choice.targetId);
        if (existing) {
          const fromChain = findParentChain(updated, existing.id);
          const fromPath = fromChain ? fromChain.slice(0, -1).map(n => n.name) : [];
          const toChain = findParentChain(updated, item.leafId);
          const toPath = toChain ? toChain.map(n => n.name) : [];
          updated = removeFromTree(updated, existing.id);
          const movedNode = { ...existing, quantity: item.quantity != null ? item.quantity : existing.quantity, history: [...(existing.history || []), { event: "moved", fromPath, toPath, timestamp: nowISO() }] };
          updated = addToTree(updated, item.leafId, movedNode);
          const chain = findParentChain(updated, movedNode.id);
          stored.push((chain ? chain.map(n => n.name).join(" > ") : item.name) + " (moved)");
        }
      } else {
        const parent = findNode(updated, item.leafId);
        const existingInSameLocation = (parent.children || []).find(c => c.type === "item" && c.name === item.name);
        if (existingInSameLocation) updated = removeFromTree(updated, existingInSameLocation.id);
        const newItemParentChain = findParentChain(updated, item.leafId);
        const newItemParentPath = newItemParentChain ? newItemParentChain.map(n => n.name) : (item.path || []);
        const itemNode = { id: uid(), name: item.name, type: "item", quantity: item.quantity, category: item.category || "misc", children: [], history: [{ event: "created", timestamp: nowISO(), source: "ai", parentPath: newItemParentPath }] };
        updated = addToTree(updated, item.leafId, itemNode);
        const chain = findParentChain(updated, itemNode.id);
        stored.push(chain ? chain.map(n => n.name).join(" > ") : item.name);
      }
    }
    setTree(updated);
    setPendingStore(null);
    if (stored.length > 0) setMessage({ type: "success", text: "Stored: " + stored.join("; ") });
    else setMessage({ type: "info", text: "No items stored." });
  }, [pendingStore]);

  const handleDuplicateScan = () => {
    const groups = findAllDuplicateGroups(tree);
    setDuplicateScanResults(groups);
    setShowDataMenu(false);
  };
  const handleMergeDuplicates = (group, keepId) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "merge" }]);
    let updated = tree;
    const keep = group.find(item => item.id === keepId);
    if (!keep) return;
    let totalQty = 0, hasQty = false;
    for (const item of group) {
      if (item.quantity != null) { totalQty += item.quantity; hasQty = true; }
      if (item.id !== keepId) {
        updated = snapshotToDeletedLog(updated, item.id);
        updated = removeFromTree(updated, item.id);
      }
    }
    if (hasQty) updated = updateInTree(updated, keepId, { quantity: totalQty });
    setTree(updated);
    setDuplicateScanResults(findAllDuplicateGroups(updated));
    setMessage({ type: "success", text: 'Merged ' + group.length + ' items into "' + keep.name + '"' });
  };

  const prevListening = useRef(false);
  useEffect(() => {
    if (prevListening.current && !speech.listening && inputRef.current.trim()) handleSubmit();
    prevListening.current = speech.listening;
  }, [speech.listening, handleSubmit]);

  const handleDelete = (id) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "delete" }]);
    const withLog = snapshotToDeletedLog(tree, id);
    setTree(removeFromTree(withLog, id));
  };
  const handleUndo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setTree(prev.tree);
    setMessage({ type: "info", text: "Undid last " + prev.label });
  };
  const handleEditSave = (updates) => {
    if (!editingItem) return;
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "edit" }]);
    let newTree = updateInTree(tree, editingItem.id, updates);
    if (updates.name !== undefined && updates.name !== editingItem.name)
      newTree = addHistoryEntry(newTree, editingItem.id, { event: "renamed", from: editingItem.name, to: updates.name });
    if (updates.quantity !== undefined && updates.quantity !== editingItem.quantity)
      newTree = addHistoryEntry(newTree, editingItem.id, { event: "quantity_changed", from: editingItem.quantity, to: updates.quantity });
    if (updates.category !== undefined && updates.category !== editingItem.category)
      newTree = addHistoryEntry(newTree, editingItem.id, { event: "category_changed", from: editingItem.category, to: updates.category });
    setTree(newTree);
    setEditingItem(null);
  };
  const handleRenameLocation = (id, newName) => {
    const node = findNode(tree, id);
    const oldName = node ? node.name : "";
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "rename" }]);
    let newTree = updateInTree(tree, id, { name: newName });
    if (oldName && oldName !== newName)
      newTree = addHistoryEntry(newTree, id, { event: "renamed", from: oldName, to: newName });
    setTree(newTree);
  };
  const handleMoveItem = (destId) => {
    if (!movingItem) return;
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "move" }]);
    const itemNode = findNode(tree, movingItem.id);
    const fromChain = findParentChain(tree, movingItem.id);
    const fromPath = fromChain ? fromChain.slice(0, -1).map(n => n.name) : [];
    const destChain = findParentChain(tree, destId);
    const toPath = destChain ? destChain.map(n => n.name) : [];
    const movedNode = { ...itemNode, history: [...(itemNode.history || []), { event: "moved", fromPath, toPath, timestamp: nowISO() }] };
    let updated = removeFromTree(tree, movingItem.id);
    updated = addToTree(updated, destId, movedNode);
    setTree(updated);
    setMovingItem(null);
    setMessage({ type: "success", text: 'Moved "' + movedNode.name + '" to ' + (toPath.length ? toPath.join(" > ") : "new location") });
  };
  const handleAddContainer = (name) => {
    const parentPath = findParentChain(tree, currentId);
    const containerNode = { id: uid(), name, type: "container", children: [], history: [{ event: "created", timestamp: nowISO(), source: "manual", parentPath: parentPath ? parentPath.map(n => n.name) : [] }] };
    setTree(t => addToTree(t, currentId, containerNode));
    setAdding(false);
  };
  const handleMoveLocation = (destId) => {
    if (!movingLocation) return;
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "move" }]);
    const fromChain = findParentChain(tree, movingLocation.id);
    const fromPath = fromChain ? fromChain.slice(0, -1).map(n => n.name) : [];
    const destChain = findParentChain(tree, destId);
    const toPath = destChain ? destChain.map(n => n.name) : [];
    let updated = moveNode(tree, movingLocation.id, destId);
    updated = addHistoryEntry(updated, movingLocation.id, { event: "moved", fromPath, toPath });
    setTree(updated);
    setMovingLocation(null);
    setMessage({ type: "success", text: 'Moved "' + movingLocation.name + '" to ' + (toPath.length ? toPath.join(" > ") : "new location") });
  };
  const handleQuickAddItem = (name, cat) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "add" }]);
    const parentPath = findParentChain(tree, currentId);
    const itemNode = { id: uid(), name, type: "item", quantity: null, category: cat, children: [], history: [{ event: "created", timestamp: nowISO(), source: "manual", parentPath: parentPath ? parentPath.map(n => n.name) : [] }] };
    setTree(t => addToTree(t, currentId, itemNode));
    setAddingItem(false);
  };
  const handleExportCSV = () => {
    const csv = exportTreeToCSV(tree);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "home-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
    setShowDataMenu(false);
    setMessage({ type: "success", text: "Exported " + flattenItems(tree).length + " items to CSV." });
  };
  const handleImportCSV = () => {
    if (fileInputRef.current) fileInputRef.current.click();
    setShowDataMenu(false);
  };
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { tree: newTree, count, errors } = importCSVToTree(evt.target.result);
        setUndoStack(prev => [...prev.slice(-9), { tree, label: "import" }]);
        setTree(newTree);
        flushSave(newTree);
        setCurrentId("house");
        let msg = "Imported " + count + " items from CSV.";
        if (errors.length > 0) msg += " (" + errors.length + " row(s) skipped)";
        setMessage({ type: "success", text: msg });
      } catch (err) {
        setMessage({ type: "error", text: "Import failed: " + err.message });
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };
  const handleLoadSampleData = () => {
    setShowDataMenu(false);
    fetch(import.meta.env.BASE_URL + "sample-inventory.csv")
      .then(res => { if (!res.ok) throw new Error("Could not load sample data file."); return res.text(); })
      .then(csvText => {
        const { tree: newTree, count } = importCSVToTree(csvText);
        setUndoStack(prev => [...prev.slice(-9), { tree, label: "load sample data" }]);
        setTree(newTree);
        flushSave(newTree);
        setCurrentId("house");
        setMessage({ type: "success", text: "Loaded sample data — " + count + " items across your house." });
      })
      .catch(err => { setMessage({ type: "error", text: "Failed to load sample data: " + err.message }); });
  };
  const handleClearAll = () => {
    const emptyTree = JSON.parse(JSON.stringify(DEFAULT_STRUCTURE));
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "clear all" }]);
    setTree(emptyTree);
    flushSave(emptyTree);
    setCurrentId("house");
    setShowDataMenu(false);
    setMessage({ type: "info", text: "All items and containers cleared. House structure preserved." });
  };

  const currentNode = findNode(tree, currentId) || tree;
  const breadcrumb = findParentChain(tree, currentId) || [tree];
  const containers = (currentNode.children || []).filter(c => c.type !== "item");
  const items = (currentNode.children || []).filter(c => c.type === "item");
  const canAddItems = currentNode.type !== "house" && currentNode.type !== "floor";
  const canRename = currentNode.type !== "house";
  const totalItems = flattenItems(tree).length;
  const nlpAvailable = !!API_PROXY;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Catamaran',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {editingItem && <EditItemModal item={editingItem} onSave={handleEditSave} onCancel={() => setEditingItem(null)} />}
      {movingItem && <MoveItemModal item={movingItem} tree={tree} onMove={handleMoveItem} onCancel={() => setMovingItem(null)} />}
      {movingLocation && <MoveLocationModal node={movingLocation} tree={tree} onMove={handleMoveLocation} onCancel={() => setMovingLocation(null)} />}
      {renamingLocation && <RenameModal node={renamingLocation} onSave={(name) => { handleRenameLocation(renamingLocation.id, name); setRenamingLocation(null); }} onCancel={() => setRenamingLocation(null)} />}
      {pendingStore && <DuplicateSuggestionModal pendingStore={pendingStore} onResolve={handleResolveDuplicates} onCancel={() => setPendingStore(null)} />}
      {duplicateScanResults && <DuplicateScanModal groups={duplicateScanResults} onMerge={handleMergeDuplicates} onClose={() => setDuplicateScanResults(null)} />}
      {historyNode && <HistoryModal node={historyNode} onClose={() => setHistoryNode(null)} />}
      {showDeletedLog && <DeletedLogModal deletedLog={tree.deletedLog || []} onClose={() => setShowDeletedLog(false)} />}

      <div style={{ background: "#000", padding: "32px 16px 22px", color: "#fff" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Home Inventory</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 6, letterSpacing: "0.04em", fontWeight: 400 }}>Everything in its right place</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{totalItems} items tracked</div>
          </div>
          <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, alignItems: "center" }}>
            {undoStack.length > 0 && (
              <button onClick={handleUndo} style={{
                padding: "4px 8px", borderRadius: 6, border: "none",
                background: "transparent", color: "#666", fontSize: 12, cursor: "pointer",
                transition: "color 0.2s",
              }} onMouseEnter={e => e.target.style.color = "#ddd"} onMouseLeave={e => e.target.style.color = "#666"}>↩</button>
            )}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowDataMenu(!showDataMenu)} style={{
                padding: "4px 8px", borderRadius: 6, border: "none",
                background: "transparent", color: "#666", fontSize: 14, cursor: "pointer",
                transition: "color 0.2s",
              }} onMouseEnter={e => e.target.style.color = "#ddd"} onMouseLeave={e => e.target.style.color = "#666"}>⚙</button>
              {showDataMenu && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff",
                  borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.15)", overflow: "hidden", zIndex: 50, minWidth: 200,
                }}>
                  <button onClick={handleExportCSV} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
                    fontSize: 13, color: "#222", cursor: "pointer", fontWeight: 500,
                  }}>📤 Export CSV</button>
                  <button onClick={handleImportCSV} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
                    fontSize: 13, color: "#222", cursor: "pointer", fontWeight: 500,
                  }}>📥 Import CSV</button>
                  <button onClick={handleLoadSampleData} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
                    fontSize: 13, color: "#222", cursor: "pointer", fontWeight: 500,
                  }}>📋 Load Sample Data</button>
                  <button onClick={handleDuplicateScan} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
                    fontSize: 13, color: "#222", cursor: "pointer", fontWeight: 500,
                  }}>🔍 Find Duplicates</button>
                  <button onClick={() => { setShowDeletedLog(true); setShowDataMenu(false); }} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f5f5f5", background: "#fff",
                    fontSize: 13, color: "#222", cursor: "pointer", fontWeight: 500,
                  }}>🗂 Recently Deleted</button>
                  <button onClick={handleClearAll} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", background: "#fff",
                    fontSize: 13, color: "#dc2626", cursor: "pointer", fontWeight: 500,
                  }}>🗑 Clear All Items</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 12px" }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "2px solid #111", marginBottom: 14 }}>
          {[["browse","Browse"],["store","Store"],["search","Find"]].map(([m,l]) => {
            const disabled = !nlpAvailable && m !== "browse";
            return (
              <button key={m} onClick={() => { if (!disabled) { setMode(m); setMessage(null); } }}
                title={disabled ? "Set up Cloudflare Worker proxy to enable NLP" : ""}
                style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: 13, fontFamily: "'Rubik', sans-serif", letterSpacing: "0.03em",
                  background: mode === m ? "#000" : "#fff",
                  color: mode === m ? "#fff" : disabled ? "#ccc" : "#555",
                  opacity: disabled ? 0.6 : 1,
                }}>{l}</button>
            );
          })}
        </div>

        {!nlpAvailable && mode === "browse" && totalItems === 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 12, lineHeight: 1.5, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
            NLP features (Store & Find) require a Cloudflare Worker proxy. Browse mode and manual add work without it. Load sample data from ⚙ to explore.
          </div>
        )}

        {(mode === "store" || mode === "search") && nlpAvailable && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  placeholder={mode === "store"
                    ? 'e.g. "Spare lightbulbs on the wood shelf in the garage"'
                    : 'e.g. "Do I have any lightbulbs?"'}
                  maxLength={MAX_INPUT_LENGTH}
                  rows={2}
                  style={{
                    width: "100%", borderRadius: 10, border: "1px solid " + (speech.listening ? "#ef4444" : "#ddd"),
                    padding: "10px 12px", fontSize: 14, resize: "none",
                    fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .2s",
                  }}
                />
                {speech.listening && (
                  <div style={{ position: "absolute", bottom: -18, left: 0, fontSize: 11, color: "#ef4444", fontWeight: 600, animation: "fadeIn .2s ease" }}>🎤 Listening...</div>
                )}
              </div>
              {speech.supported && (
                <button onClick={speech.toggle} style={{
                  width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: speech.listening ? "#ef4444" : "#0e7490",
                  animation: speech.listening ? "pulse 1.5s infinite" : "none",
                  marginBottom: speech.listening ? 18 : 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1H3v1a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11v-1h-2z"/>
                  </svg>
                </button>
              )}
            </div>
            {speech.error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 6, marginTop: speech.listening ? 10 : 0 }}>{speech.error}</div>}
            <button onClick={handleSubmit} disabled={loading || !input.trim()} style={{
              width: "100%", padding: "11px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 14, fontFamily: "'Rubik', sans-serif",
              cursor: loading ? "wait" : "pointer",
              background: loading ? "#999" : "#0e7490",
              color: "#fff", marginBottom: 14, marginTop: speech.listening ? 10 : 0,
              opacity: !input.trim() && !loading ? 0.5 : 1,
            }}>{loading ? "Thinking..." : mode === "store" ? "Store" : "Search"}</button>
          </>
        )}

        {message && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, lineHeight: 1.5,
            animation: "fadeIn .2s ease",
            background: message.type === "error" ? "#fef2f2" : message.type === "info" ? "#e8f7fa" : "#e8f7fa",
            color: message.type === "error" ? "#991b1b" : message.type === "info" ? "#0a5c6e" : "#0a5c6e",
            border: "1px solid " + (message.type === "error" ? "#fecaca" : message.type === "info" ? "#a3d5de" : "#a3d5de"),
            whiteSpace: "pre-wrap",
          }}>{message.text}</div>
        )}

        <Breadcrumb chain={breadcrumb} onNavigate={setCurrentId} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: 19, fontWeight: 600, color: "#111" }}>
              {TYPE_ICONS[currentNode.type]} {currentNode.name}
            </span>
            {canRename && (
              <button onClick={() => setRenamingLocation(currentNode)} title="Rename"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 13, padding: "2px 4px" }}>✏️</button>
            )}
            <span style={{ fontSize: 13, color: "#999" }}>
              {countItems(currentNode)} item{countItems(currentNode) !== 1 ? "s" : ""}
            </span>
          </div>
          {canAddItems && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setAddingItem(true)} style={{
                padding: "5px 12px", borderRadius: 6, border: "2px solid #0e7490",
                background: "#fff", color: "#0e7490", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif",
              }}>+ Item</button>
              <button onClick={() => setAdding(true)} style={{
                padding: "5px 12px", borderRadius: 6, border: "2px solid #111",
                background: "#fff", color: "#111", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif",
              }}>+ Container</button>
            </div>
          )}
        </div>

        {adding && <AddContainerInline onAdd={handleAddContainer} onCancel={() => setAdding(false)} />}

        {containers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: items.length > 0 ? 14 : 0 }}>
            {containers.map(c => <LocationCard key={c.id} node={c} onClick={setCurrentId} onRename={handleRenameLocation} onDelete={handleDelete} onMove={setMovingLocation} onHistory={setHistoryNode} />)}
          </div>
        )}

        {addingItem && canAddItems && <QuickAddItem onAdd={handleQuickAddItem} onCancel={() => setAddingItem(false)} />}

        {items.length > 0 && (
          <>
            <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: 11, fontWeight: 500, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 8px" }}>Items here</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map(i => <ItemCard key={i.id} node={i} onDelete={handleDelete} onEdit={setEditingItem} onMove={setMovingItem} onHistory={setHistoryNode} />)}
            </div>
          </>
        )}

        {containers.length === 0 && items.length === 0 && (
          <div style={{ textAlign: "center", color: "#999", padding: "30px 16px", fontSize: 14 }}>
            {currentNode.type === "house"
              ? "Tap a floor to explore your house"
              : "Nothing here yet. Store items or add a container."}
          </div>
        )}
      </div>

      {showDataMenu && <div onClick={() => setShowDataMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileSelected} style={{ display: "none" }} />
    </div>
  );
}
