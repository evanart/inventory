/** similarity -- Functions to detect and group similar/duplicate inventory items */

import { flattenItems, findParentChain } from "./tree.js";

export function normalizeName(name) {
  let n = name.toLowerCase().trim();
  if (n.endsWith('ies') && n.length > 4) return n.slice(0, -3) + 'y';
  if (n.endsWith('ses') || n.endsWith('xes') || n.endsWith('zes')) return n.slice(0, -2);
  if (n.endsWith('ches') || n.endsWith('shes')) return n.slice(0, -2);
  if (n.endsWith('s') && !n.endsWith('ss') && n.length > 2) return n.slice(0, -1);
  return n;
}
export function itemsSimilar(name1, name2) {
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
export function findSimilarItems(tree, itemName, excludeIds) {
  return flattenItems(tree)
    .filter(item => !(excludeIds || []).includes(item.id) && itemsSimilar(item.name, itemName))
    .map(item => {
      const chain = findParentChain(tree, item.id);
      return { ...item, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
    });
}
export function findAllDuplicateGroups(tree) {
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
