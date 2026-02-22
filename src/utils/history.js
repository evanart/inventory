/** history -- Time formatting, tree migration, history entries, and deleted-item snapshots */

import { findNode, updateInTree, findParentChain } from "./tree.js";
import { nowISO } from "./uid.js";

export function formatRelativeTime(iso) {
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
export function migrateTree(node) {
  return {
    ...node,
    history: node.history || [],
    ...(node.type === "house" ? { deletedLog: node.deletedLog || [] } : {}),
    children: (node.children || []).map(migrateTree),
  };
}
export function addHistoryEntry(tree, nodeId, entry) {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  return updateInTree(tree, nodeId, {
    history: [...(node.history || []), { ...entry, timestamp: nowISO() }],
  });
}
export function snapshotToDeletedLog(tree, nodeId) {
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const parentChain = findParentChain(tree, nodeId);
  const parentPath = parentChain ? parentChain.slice(0, -1).map(n => n.name) : [];
  const entry = { node, deletedAt: nowISO(), parentPath };
  return { ...tree, deletedLog: [...(tree.deletedLog || []), entry].slice(-100) };
}
