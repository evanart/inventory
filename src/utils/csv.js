/** csv -- CSV import/export: parse, escape, convert tree to/from CSV format */

import { findOrCreatePath, addToTree, findParentChain } from "./tree.js";
import { uid, nowISO } from "./uid.js";
import { CATEGORIES } from "../constants/categories.js";
import { DEFAULT_STRUCTURE } from "../constants/inventory.js";

export function escapeCSVField(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function parseCSV(text) {
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

export function exportTreeToCSV(tree) {
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

export function importCSVToTree(csvText) {
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
