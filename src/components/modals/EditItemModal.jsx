/** EditItemModal -- Modal form to edit an item's name, quantity, and category */

import { useState } from "react";
import { CATEGORIES } from "../../constants/categories.js";

export default function EditItemModal({ item, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity != null ? item.quantity : "");
  const [cat, setCat] = useState(item.category || "misc");
  return (
    <div data-component="EditItemModal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 360 }}>
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
