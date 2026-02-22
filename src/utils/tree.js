/** tree -- Pure functions for immutable tree operations (find, add, remove, update, move) */

import { uid, nowISO } from "./uid.js";

export function countItems(n) { return n.type === "item" ? 1 : (n.children || []).reduce((s, c) => s + countItems(c), 0); }
export function findNode(t, id) {
  if (t.id === id) return t;
  for (const c of (t.children || [])) { const f = findNode(c, id); if (f) return f; }
  return null;
}
export function findParentChain(t, id, chain = []) {
  if (t.id === id) return [...chain, t];
  for (const c of (t.children || [])) { const r = findParentChain(c, id, [...chain, t]); if (r) return r; }
  return null;
}
export function addToTree(t, pid, node) {
  if (t.id === pid) return { ...t, children: [...(t.children || []), node] };
  return { ...t, children: (t.children || []).map(c => addToTree(c, pid, node)) };
}
export function removeFromTree(t, id) {
  return { ...t, children: (t.children || []).filter(c => c.id !== id).map(c => removeFromTree(c, id)) };
}
export function updateInTree(t, id, updates) {
  if (t.id === id) return { ...t, ...updates };
  return { ...t, children: (t.children || []).map(c => updateInTree(c, id, updates)) };
}
export function flattenItems(n) { return n.type === "item" ? [n] : (n.children || []).flatMap(c => flattenItems(c)); }
export function findOrCreatePath(tree, pathNames, types, source = "manual") {
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
export function moveNode(tree, nodeId, newParentId) {
  const node = findNode(tree, nodeId);
  if (!node || node.id === newParentId) return tree;
  const newParent = findNode(tree, newParentId);
  if (!newParent) return tree;
  const nodeCopy = { ...node };
  let updated = removeFromTree(tree, nodeId);
  updated = addToTree(updated, newParentId, nodeCopy);
  return updated;
}
export function deleteNodeCascade(tree, nodeId) {
  return removeFromTree(tree, nodeId);
}
export function deleteNodePreserveChildren(tree, nodeId) {
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
export function findOrCreateLocation(tree, locationName, type, parentPath) {
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
