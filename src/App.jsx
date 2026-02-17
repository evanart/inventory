import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "home-inventory-v2";
const API_PROXY = import.meta.env.VITE_API_PROXY_URL || "";

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

function buildTestData() {
  const s = JSON.parse(JSON.stringify(DEFAULT_STRUCTURE));
  const find = (id) => { const q = [s]; while (q.length) { const n = q.shift(); if (n.id === id) return n; (n.children||[]).forEach(c=>q.push(c)); } return null; };
  const add = (pid, node) => { const p = find(pid); if (p) p.children.push(node); };
  const mkC = (id,name) => ({id,name,type:"container",children:[]});
  const mkI = (name,qty,cat) => ({id:"t"+Math.random().toString(36).slice(2,8),name,type:"item",quantity:qty,category:cat,children:[]});
  add("garage", mkC("g_ws","Wood Shelf"));
  add("g_ws", mkI("spare lightbulbs",6,"electronics"));
  add("g_ws", mkI("wd-40",2,"tools"));
  add("g_ws", mkI("gorilla glue",1,"tools"));
  add("g_ws", mkI("duct tape",3,"tools"));
  add("garage", mkC("g_tb","Tool Bench"));
  add("g_tb", mkI("cordless drill",1,"tools"));
  add("g_tb", mkI("socket set",1,"tools"));
  add("g_tb", mkI("tape measure",2,"tools"));
  add("g_tb", mkI("level",1,"tools"));
  add("garage", mkC("g_hol","Holiday Bins"));
  add("g_hol", mkI("christmas lights",4,"holiday"));
  add("g_hol", mkI("halloween decorations",1,"holiday"));
  add("g_hol", mkI("easter baskets",3,"holiday"));
  add("kitchen", mkC("k_cab","Upper Cabinets"));
  add("k_cab", mkI("coffee mugs",8,"kitchen"));
  add("k_cab", mkI("dinner plates",12,"kitchen"));
  add("k_cab", mkI("mixing bowls",3,"kitchen"));
  add("kitchen", mkC("k_draw","Junk Drawer"));
  add("k_draw", mkI("batteries (aa)",12,"electronics"));
  add("k_draw", mkI("scissors",2,"tools"));
  add("k_draw", mkI("rubber bands",null,"misc"));
  add("k_draw", mkI("takeout menus",null,"misc"));
  add("kitchen", mkC("k_under","Under Sink"));
  add("k_under", mkI("dish soap",2,"cleaning"));
  add("k_under", mkI("sponges",4,"cleaning"));
  add("k_under", mkI("trash bags",1,"cleaning"));
  add("pantry", mkI("canned tomatoes",6,"kitchen"));
  add("pantry", mkI("pasta boxes",4,"kitchen"));
  add("pantry", mkI("olive oil",2,"kitchen"));
  add("living", mkC("l_tv","TV Console"));
  add("l_tv", mkI("roku remote",1,"electronics"));
  add("l_tv", mkI("hdmi cables",3,"electronics"));
  add("l_tv", mkI("game controllers",2,"electronics"));
  add("living", mkC("l_shelf","Bookshelf"));
  add("l_shelf", mkI("board games",5,"misc"));
  add("l_shelf", mkI("photo albums",3,"misc"));
  add("office_main", mkC("o_desk","Desk"));
  add("o_desk", mkI("usb hub",1,"electronics"));
  add("o_desk", mkI("drawing tablet",1,"electronics"));
  add("o_desk", mkI("blue pens",6,"office"));
  add("office_main", mkC("o_cab","File Cabinet"));
  add("o_cab", mkI("tax documents",null,"office"));
  add("o_cab", mkI("printer paper",2,"office"));
  add("primary_bed", mkC("pb_night","Nightstand"));
  add("pb_night", mkI("phone charger",2,"electronics"));
  add("pb_night", mkI("reading glasses",1,"misc"));
  add("primary_bed", mkC("pb_closet","Closet Shelf"));
  add("pb_closet", mkI("extra pillows",3,"misc"));
  add("pb_closet", mkI("winter blankets",2,"clothing"));
  add("bedroom_3", mkC("b3_toy","Toy Bin"));
  add("b3_toy", mkI("stuffed animals",null,"baby"));
  add("b3_toy", mkI("building blocks",1,"baby"));
  add("b3_toy", mkI("play kitchen set",1,"baby"));
  add("bedroom_3", mkC("b3_shelf","Book Shelf"));
  add("b3_shelf", mkI("picture books",15,"baby"));
  add("b3_shelf", mkI("coloring books",4,"crafts"));
  add("laundry", mkI("detergent",1,"cleaning"));
  add("laundry", mkI("dryer sheets",1,"cleaning"));
  add("laundry", mkI("stain remover",1,"cleaning"));
  add("exercise", mkI("yoga mat",1,"sports"));
  add("exercise", mkI("dumbbells (set)",1,"sports"));
  add("exercise", mkI("resistance bands",3,"sports"));
  add("exercise", mkI("foam roller",1,"sports"));
  add("attic", mkC("a_bins","Storage Bins"));
  add("a_bins", mkI("baby clothes (0-12mo)",2,"baby"));
  add("a_bins", mkI("old tax records",null,"office"));
  add("a_bins", mkI("camping tent",1,"sports"));
  add("a_bins", mkI("sleeping bags",2,"sports"));
  return s;
}

const TYPE_ICONS = { house: "🏠", floor: "🏗", room: "🚪", container: "📦", item: "📌" };
const TYPE_COLORS = { house: "#1e293b", floor: "#475569", room: "#2563eb", container: "#7c3aed", item: "#059669" };
const CATEGORIES = ["tools","cleaning","electronics","holiday","clothing","kitchen","bathroom","office","sports","crafts","baby","storage","misc"];
const CAT_COLORS = {
  tools:"#f59e0b",cleaning:"#10b981",electronics:"#3b82f6",holiday:"#ef4444",
  clothing:"#8b5cf6",kitchen:"#f97316",bathroom:"#06b6d4",office:"#6366f1",
  sports:"#22c55e",crafts:"#ec4899",baby:"#a78bfa",storage:"#78716c",misc:"#94a3b8"
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
function findOrCreatePath(tree, pathNames, types) {
  let updated = { ...tree }, parentId = tree.id;
  for (let i = 0; i < pathNames.length; i++) {
    const name = pathNames[i], type = types[i] || "container";
    const parent = findNode(updated, parentId);
    let match = (parent.children || []).find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!match) {
      const nn = { id: uid() + i, name, type, children: [] };
      updated = addToTree(updated, parentId, nn);
      parentId = nn.id;
    } else { parentId = match.id; }
  }
  return { tree: updated, leafId: parentId };
}

async function apiCall(systemPrompt, userMessage) {
  if (!API_PROXY) throw new Error("API proxy not configured. Set VITE_API_PROXY_URL.");
  const res = await fetch(API_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, message: userMessage }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
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
  const systemPrompt = "You extract item storage info from natural language and place it in a house hierarchy.\n\nCurrent structure:\n" + summary + "\n\nReturn ONLY valid JSON:\n{\n  \"action\": \"store\" | \"remove\",\n  \"items\": [{\n    \"name\": \"item name (singular lowercase)\",\n    \"quantity\": number or null,\n    \"path\": [\"Floor Name\", \"Room Name\", \"Container (optional)\", \"Sub-container (optional)\"],\n    \"category\": one of: " + CATEGORIES.join(", ") + "\n  }]\n}\n\nRules:\n- path = array from floor to most specific container\n- Match existing locations when clearly the same\n- New containers are fine\n- quantity null = unknown amount\n- \"the garage\" -> [\"Main Floor\", \"Garage\"]\n- \"wood shelf in the garage\" -> [\"Main Floor\", \"Garage\", \"Wood Shelf\"]";
  const raw = await apiCall(systemPrompt, text);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

async function searchWithClaude(query, tree) {
  const allItems = flattenItems(tree).map(item => {
    const chain = findParentChain(tree, item.id);
    return { ...item, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
  });
  const systemPrompt = "You help find items in a home inventory. Given a query and item list with full paths, return a helpful concise plain text answer. If nothing matches, say so.";
  return await apiCall(systemPrompt, "Items:\n" + JSON.stringify(allItems) + "\n\nQuery: \"" + query + "\"");
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

function loadData() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; }
  catch(e) { return null; }
}
const saveTimeout = { current: null };
function debouncedSave(data) {
  clearTimeout(saveTimeout.current);
  saveTimeout.current = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error(e); }
  }, 500);
}

function Breadcrumb({ chain, onNavigate }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", marginBottom: 12, fontSize: 13 }}>
      {chain.map((node, i) => (
        <span key={node.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "#cbd5e1", margin: "0 2px" }}>›</span>}
          <button onClick={() => onNavigate(node.id)} style={{
            background: i === chain.length - 1 ? "#e2e8f0" : "none", border: "none", cursor: "pointer",
            padding: "3px 8px", borderRadius: 6, fontWeight: i === chain.length - 1 ? 700 : 500,
            color: i === chain.length - 1 ? "#1e293b" : "#64748b", fontSize: 13,
          }}>{TYPE_ICONS[node.type] || "📁"} {node.name}</button>
        </span>
      ))}
    </div>
  );
}

function ItemCard({ node, onDelete, onEdit, onMove }) {
  const cat = node.category || "misc";
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "10px 14px",
      border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        background: CAT_COLORS[cat] || "#94a3b8", color: "#fff", fontSize: 9,
        fontWeight: 700, borderRadius: 5, padding: "2px 6px", textTransform: "uppercase", flexShrink: 0,
      }}>{cat}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", textTransform: "capitalize" }}>{node.name}</span>
        {node.quantity != null && <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>×{node.quantity}</span>}
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={() => onEdit(node)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 4 }}>✏️</button>
        <button onClick={() => onMove(node)} title="Move" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 4 }}>📂</button>
        <button onClick={() => onDelete(node.id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 14, padding: 4 }}>✕</button>
      </div>
    </div>
  );
}

function LocationCard({ node, onClick, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const count = countItems(node);
  const color = TYPE_COLORS[node.type] || "#64748b";
  const isDeletable = node.type === "container";

  if (editing) {
    return (
      <div style={{
        background: "#fff", borderRadius: 10, padding: "10px 16px",
        border: "1.5px solid " + color + "88", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: color + "15",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
        }}>{TYPE_ICONS[node.type] || "📁"}</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => {
            if (e.key === "Enter" && name.trim()) { onRename(node.id, name.trim()); setEditing(false); }
            if (e.key === "Escape") { setName(node.name); setEditing(false); }
          }}
          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600, outline: "none" }}
        />
        <button onClick={() => { if (name.trim()) { onRename(node.id, name.trim()); setEditing(false); } }}
          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
        <button onClick={() => { setName(node.name); setEditing(false); }}
          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "12px 16px",
      border: "1.5px solid " + (count > 0 ? color + "33" : "#e5e7eb"),
      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div onClick={() => onClick(node.id)} style={{
        width: 40, height: 40, borderRadius: 10, background: color + "15",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
      }}>{TYPE_ICONS[node.type] || "📁"}</div>
      <div onClick={() => onClick(node.id)} style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{node.name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {count > 0 ? count + " item" + (count !== 1 ? "s" : "") : "empty"}
          {(node.children || []).filter(c => c.type !== "item").length > 0 &&
            " · " + (node.children || []).filter(c => c.type !== "item").length + " sub-locations"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Rename"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 4 }}>✏️</button>
        {isDeletable && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} title="Delete container"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 13, padding: 4 }}>✕</button>
        )}
        <div onClick={() => onClick(node.id)} style={{ color: "#cbd5e1", fontSize: 18, padding: "0 2px", cursor: "pointer" }}>›</div>
      </div>
    </div>
  );
}

function EditItemModal({ item, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity != null ? item.quantity : "");
  const [cat, setCat] = useState(item.category || "misc");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Edit Item</div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Quantity</label>
        <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" placeholder="Unknown" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Category</label>
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave({ name: name.trim() || item.name, quantity: qty === "" ? null : Number(qty), category: cat })} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Move "{item.name}"</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Select a new location</div>
        <div style={{ flex: 1, overflow: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          {locations.filter(l => l.type !== "house").map(loc => (
            <button key={loc.id} onClick={() => { if (loc.id !== currentParentId) onMove(loc.id); }}
              disabled={loc.id === currentParentId}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                paddingLeft: 12 + (loc.depth - 1) * 16, border: "none", borderBottom: "1px solid #f1f5f9",
                background: loc.id === currentParentId ? "#f0fdf4" : "#fff", cursor: loc.id === currentParentId ? "default" : "pointer",
                fontSize: 13, color: loc.id === currentParentId ? "#059669" : "#334155",
                fontWeight: loc.id === currentParentId ? 600 : 400,
              }}>
              {TYPE_ICONS[loc.type]} {loc.name} {loc.id === currentParentId && <span style={{ fontSize: 11 }}>(current)</span>}
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ marginTop: 12, padding: "9px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}

function RenameModal({ node, onSave, onCancel }) {
  const [name, setName] = useState(node.name);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Rename {node.type === "floor" ? "Floor" : node.type === "room" ? "Room" : "Container"}</div>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (name.trim()) onSave(name.trim()); }} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: TYPE_COLORS[node.type] || "#2563eb", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function QuickAddItem({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("misc");
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0", marginBottom: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name"
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim(), cat); }}
        autoFocus style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }} />
      <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => { if (name.trim()) onAdd(name.trim(), cat); }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}>✕</button>
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
        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
      <button onClick={() => { if (name.trim()) onAdd(name.trim()); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={onCancel} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>
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
  const [renamingLocation, setRenamingLocation] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const speech = useSpeech();

  const treeRef = useRef(tree);
  const inputRef = useRef(input);
  const modeRef = useRef(mode);
  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => { const d = loadData(); if (d) setTree(d); setReady(true); }, []);
  useEffect(() => { if (ready) debouncedSave(tree); }, [tree, ready]);
  useEffect(() => { if (speech.transcript) setInput(speech.transcript); }, [speech.transcript]);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text) return;
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
            if (match) updated = removeFromTree(updated, match.id);
          }
          setTree(updated);
          setMessage({ type: "success", text: "Removed: " + parsed.items.map(i => i.name).join(", ") });
        } else {
          setUndoStack(prev => [...prev.slice(-9), { tree: treeRef.current, label: "store" }]);
          let updated = treeRef.current;
          const stored = [];
          for (const item of parsed.items) {
            const pathNames = item.path || [];
            const types = pathNames.map((_, i) => i === 0 ? "floor" : i === 1 ? "room" : "container");
            const { tree: t, leafId } = findOrCreatePath(updated, pathNames, types);
            updated = t;
            const itemNode = { id: uid(), name: item.name, type: "item", quantity: item.quantity, category: item.category || "misc", children: [] };
            const parent = findNode(updated, leafId);
            const existing = (parent.children || []).find(c => c.type === "item" && c.name === item.name);
            if (existing) updated = removeFromTree(updated, existing.id);
            updated = addToTree(updated, leafId, itemNode);
            const chain = findParentChain(updated, itemNode.id);
            stored.push(chain ? chain.map(n => n.name).join(" > ") : item.name);
          }
          setTree(updated);
          setMessage({ type: "success", text: "Stored: " + stored.join("; ") });
        }
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "Something went wrong. Try again." });
    }
    setInput(""); speech.setTranscript(""); setLoading(false);
  }, [speech]);

  const prevListening = useRef(false);
  useEffect(() => {
    if (prevListening.current && !speech.listening && inputRef.current.trim()) handleSubmit();
    prevListening.current = speech.listening;
  }, [speech.listening, handleSubmit]);

  const handleDelete = (id) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "delete" }]);
    setTree(t => removeFromTree(t, id));
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
    setTree(t => updateInTree(t, editingItem.id, updates));
    setEditingItem(null);
  };
  const handleRenameLocation = (id, newName) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "rename" }]);
    setTree(t => updateInTree(t, id, { name: newName }));
  };
  const handleMoveItem = (destId) => {
    if (!movingItem) return;
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "move" }]);
    const itemCopy = { ...findNode(tree, movingItem.id) };
    let updated = removeFromTree(tree, movingItem.id);
    updated = addToTree(updated, destId, itemCopy);
    setTree(updated);
    setMovingItem(null);
    const destChain = findParentChain(updated, destId);
    setMessage({ type: "success", text: 'Moved "' + itemCopy.name + '" to ' + (destChain ? destChain.map(n => n.name).join(" > ") : "new location") });
  };
  const handleAddContainer = (name) => {
    setTree(t => addToTree(t, currentId, { id: uid(), name, type: "container", children: [] }));
    setAdding(false);
  };
  const handleQuickAddItem = (name, cat) => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "add" }]);
    setTree(t => addToTree(t, currentId, { id: uid(), name, type: "item", quantity: null, category: cat, children: [] }));
    setAddingItem(false);
  };
  const handleLoadTestData = () => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "load test data" }]);
    setTree(buildTestData());
    setCurrentId("house");
    setShowDataMenu(false);
    setMessage({ type: "success", text: "Loaded test data — 60+ items across your house." });
  };
  const handleClearAll = () => {
    setUndoStack(prev => [...prev.slice(-9), { tree, label: "clear all" }]);
    setTree(JSON.parse(JSON.stringify(DEFAULT_STRUCTURE)));
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
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {editingItem && <EditItemModal item={editingItem} onSave={handleEditSave} onCancel={() => setEditingItem(null)} />}
      {movingItem && <MoveItemModal item={movingItem} tree={tree} onMove={handleMoveItem} onCancel={() => setMovingItem(null)} />}
      {renamingLocation && <RenameModal node={renamingLocation} onSave={(name) => { handleRenameLocation(renamingLocation.id, name); setRenamingLocation(null); }} onCancel={() => setRenamingLocation(null)} />}

      <div style={{ background: "linear-gradient(135deg,#1e293b,#334155)", padding: "20px 16px 14px", color: "#fff" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>🏠 Home Inventory</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{totalItems} items tracked</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {undoStack.length > 0 && (
              <button onClick={handleUndo} style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)",
                background: "rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>↩ Undo</button>
            )}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowDataMenu(!showDataMenu)} style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)",
                background: "rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: 14, cursor: "pointer",
              }}>⚙</button>
              {showDataMenu && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff",
                  borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.15)", overflow: "hidden", zIndex: 50, minWidth: 180,
                }}>
                  <button onClick={handleLoadTestData} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff",
                    fontSize: 13, color: "#334155", cursor: "pointer", fontWeight: 500,
                  }}>📋 Load Test Data</button>
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
        <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 12 }}>
          {[["browse","🏠 Browse"],["store","📦 Store"],["search","🔍 Find"]].map(([m,l]) => {
            const disabled = !nlpAvailable && m !== "browse";
            return (
              <button key={m} onClick={() => { if (!disabled) { setMode(m); setMessage(null); } }}
                title={disabled ? "Set up Cloudflare Worker proxy to enable NLP" : ""}
                style={{
                  flex: 1, padding: "9px 0", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13,
                  background: mode === m ? (m === "browse" ? "#0f172a" : m === "store" ? "#2563eb" : "#7c3aed") : "#fff",
                  color: mode === m ? "#fff" : disabled ? "#cbd5e1" : "#64748b",
                  opacity: disabled ? 0.6 : 1,
                }}>{l}</button>
            );
          })}
        </div>

        {!nlpAvailable && mode === "browse" && totalItems === 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 12, lineHeight: 1.5, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
            NLP features (Store & Find) require a Cloudflare Worker proxy. Browse mode and manual add work without it. Load test data from ⚙ to explore.
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
                  rows={2}
                  style={{
                    width: "100%", borderRadius: 10, border: "1px solid " + (speech.listening ? "#ef4444" : "#e2e8f0"),
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
                  background: speech.listening ? "#ef4444" : mode === "store" ? "#2563eb" : "#7c3aed",
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
              width: "100%", padding: "10px", borderRadius: 10, border: "none",
              fontWeight: 600, fontSize: 14, cursor: loading ? "wait" : "pointer",
              background: loading ? "#94a3b8" : mode === "store" ? "#2563eb" : "#7c3aed",
              color: "#fff", marginBottom: 12, marginTop: speech.listening ? 10 : 0,
              opacity: !input.trim() && !loading ? 0.5 : 1,
            }}>{loading ? "Thinking..." : mode === "store" ? "Store" : "Search"}</button>
          </>
        )}

        {message && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, lineHeight: 1.5,
            animation: "fadeIn .2s ease",
            background: message.type === "error" ? "#fef2f2" : message.type === "info" ? "#f0f4ff" : "#f0fdf4",
            color: message.type === "error" ? "#991b1b" : message.type === "info" ? "#1e40af" : "#166534",
            border: "1px solid " + (message.type === "error" ? "#fecaca" : message.type === "info" ? "#bfdbfe" : "#bbf7d0"),
            whiteSpace: "pre-wrap",
          }}>{message.text}</div>
        )}

        <Breadcrumb chain={breadcrumb} onNavigate={setCurrentId} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              {TYPE_ICONS[currentNode.type]} {currentNode.name}
            </span>
            {canRename && (
              <button onClick={() => setRenamingLocation(currentNode)} title="Rename"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: "2px 4px" }}>✏️</button>
            )}
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              {countItems(currentNode)} item{countItems(currentNode) !== 1 ? "s" : ""}
            </span>
          </div>
          {canAddItems && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setAddingItem(true)} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", color: "#059669", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+ Item</button>
              <button onClick={() => setAdding(true)} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+ Container</button>
            </div>
          )}
        </div>

        {adding && <AddContainerInline onAdd={handleAddContainer} onCancel={() => setAdding(false)} />}

        {containers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: items.length > 0 ? 14 : 0 }}>
            {containers.map(c => <LocationCard key={c.id} node={c} onClick={setCurrentId} onRename={handleRenameLocation} onDelete={handleDelete} />)}
          </div>
        )}

        {addingItem && canAddItems && <QuickAddItem onAdd={handleQuickAddItem} onCancel={() => setAddingItem(false)} />}

        {items.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 6px" }}>Items here</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map(i => <ItemCard key={i.id} node={i} onDelete={handleDelete} onEdit={setEditingItem} onMove={setMovingItem} />)}
            </div>
          </>
        )}

        {containers.length === 0 && items.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 16px", fontSize: 14 }}>
            {currentNode.type === "house"
              ? "Tap a floor to explore your house"
              : "Nothing here yet. Store items or add a container."}
          </div>
        )}
      </div>

      {showDataMenu && <div onClick={() => setShowDataMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
    </div>
  );
}
