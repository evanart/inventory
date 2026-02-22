/** App -- Root component: owns all state, event handlers, and composes layout + modals */

import { useState, useEffect, useRef, useCallback } from "react";

import { STORAGE_KEY, API_PROXY, API_KEY, DEFAULT_STRUCTURE, MAX_INPUT_LENGTH } from "./constants/inventory.js";
import { uid, nowISO } from "./utils/uid.js";
import { findNode, findParentChain, addToTree, removeFromTree, updateInTree, flattenItems, findOrCreatePath, findOrCreateLocation, moveNode } from "./utils/tree.js";
import { findSimilarItems, findAllDuplicateGroups } from "./utils/similarity.js";
import { migrateTree, addHistoryEntry, snapshotToDeletedLog } from "./utils/history.js";
import { exportTreeToCSV, importCSVToTree } from "./utils/csv.js";
import { processWithAI } from "./services/api.js";
import { loadDataLocal, loadDataFromServer, saveTimeout, debouncedSave, flushSave } from "./services/storage.js";
import { useSpeech } from "./hooks/useSpeech.js";

import EditItemModal from "./components/modals/EditItemModal.jsx";
import MoveItemModal from "./components/modals/MoveItemModal.jsx";
import MoveLocationModal from "./components/modals/MoveLocationModal.jsx";
import RenameModal from "./components/modals/RenameModal.jsx";
import DuplicateSuggestionModal from "./components/modals/DuplicateSuggestionModal.jsx";
import DuplicateScanModal from "./components/modals/DuplicateScanModal.jsx";
import HistoryModal from "./components/modals/HistoryModal.jsx";
import DeletedLogModal from "./components/modals/DeletedLogModal.jsx";
import ResultCard from "./components/ResultCard.jsx";
import HeaderBar from "./components/layout/HeaderBar.jsx";
import NlpInputArea from "./components/layout/NlpInputArea.jsx";
import LoadingIndicator from "./components/layout/LoadingIndicator.jsx";
import BrowseView from "./components/layout/BrowseView.jsx";

export default function App() {
  const [tree, setTree] = useState(DEFAULT_STRUCTURE);
  const [currentId, setCurrentId] = useState("house");
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
  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { inputRef.current = input; }, [input]);

  useEffect(() => {
    let cancelled = false;
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

  const abortRef = useRef(null);

  const handleCancel = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text) return;
    if (text.length > MAX_INPUT_LENGTH) {
      setMessage({ type: "error", text: "Input too long (max " + MAX_INPUT_LENGTH + " characters)." });
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setMessage(null);
    try {
      const parsed = await processWithAI(text, treeRef.current, controller.signal);

      if (parsed.action === "search") {
        setMessage({ type: "search", text: parsed.searchResult || "No results found." });
      } else if (parsed.action === "remove") {
        setUndoStack(prev => [...prev.slice(-9), { tree: treeRef.current, label: "remove" }]);
        let updated = treeRef.current;
        for (const item of (parsed.items || [])) {
          const all = flattenItems(updated);
          const match = all.find(n => n.name === item.name);
          if (match) { updated = snapshotToDeletedLog(updated, match.id); updated = removeFromTree(updated, match.id); }
        }
        setTree(updated);
        setMessage({ type: "success", text: "Removed: " + (parsed.items || []).map(i => i.name).join(", ") });
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
        for (const item of (parsed.items || [])) {
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
    } catch (e) {
      if (e.name === "AbortError") { setLoading(false); return; }
      console.error(e);
      setMessage({ type: "error", text: e.message || "Something went wrong. Try again." });
    }
    abortRef.current = null;
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

  useEffect(() => {
    if (speech.settled && inputRef.current.trim()) {
      speech.setSettled(false);
      handleSubmit();
    }
  }, [speech.settled, handleSubmit]);

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
        setMessage({ type: "success", text: "Loaded sample data \u2014 " + count + " items across your house." });
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
    <div data-component="App" style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Catamaran',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {editingItem && <EditItemModal item={editingItem} onSave={handleEditSave} onCancel={() => setEditingItem(null)} />}
      {movingItem && <MoveItemModal item={movingItem} tree={tree} onMove={handleMoveItem} onCancel={() => setMovingItem(null)} />}
      {movingLocation && <MoveLocationModal node={movingLocation} tree={tree} onMove={handleMoveLocation} onCancel={() => setMovingLocation(null)} />}
      {renamingLocation && <RenameModal node={renamingLocation} onSave={(name) => { handleRenameLocation(renamingLocation.id, name); setRenamingLocation(null); }} onCancel={() => setRenamingLocation(null)} />}
      {pendingStore && <DuplicateSuggestionModal pendingStore={pendingStore} onResolve={handleResolveDuplicates} onCancel={() => setPendingStore(null)} />}
      {duplicateScanResults && <DuplicateScanModal groups={duplicateScanResults} onMerge={handleMergeDuplicates} onClose={() => setDuplicateScanResults(null)} />}
      {historyNode && <HistoryModal node={historyNode} onClose={() => setHistoryNode(null)} />}
      {showDeletedLog && <DeletedLogModal deletedLog={tree.deletedLog || []} onClose={() => setShowDeletedLog(false)} />}

      <HeaderBar
        totalItems={totalItems}
        undoStack={undoStack}
        onUndo={handleUndo}
        showDataMenu={showDataMenu}
        onToggleDataMenu={() => setShowDataMenu(!showDataMenu)}
        onExportCSV={handleExportCSV}
        onImportCSV={handleImportCSV}
        onLoadSample={handleLoadSampleData}
        onDuplicateScan={handleDuplicateScan}
        onShowDeleted={() => { setShowDeletedLog(true); setShowDataMenu(false); }}
        onClearAll={handleClearAll}
      />

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 16px" }}>
        {nlpAvailable && (
          <NlpInputArea
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            loading={loading}
            speech={speech}
          />
        )}

        {!nlpAvailable && totalItems === 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 12, lineHeight: 1.5, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
            AI features require a Cloudflare Worker proxy. Manual add and browse work without it. Load sample data from the settings menu to explore.
          </div>
        )}

        {loading && <LoadingIndicator onCancel={handleCancel} />}

        {message && <ResultCard message={message} onDismiss={() => setMessage(null)} />}

        <BrowseView
          currentNode={currentNode}
          breadcrumb={breadcrumb}
          containers={containers}
          items={items}
          canAddItems={canAddItems}
          canRename={canRename}
          adding={adding}
          addingItem={addingItem}
          onNavigate={setCurrentId}
          onRename={handleRenameLocation}
          onDelete={handleDelete}
          onMoveLocation={setMovingLocation}
          onHistory={setHistoryNode}
          onEditItem={setEditingItem}
          onMoveItem={setMovingItem}
          onSetAdding={setAdding}
          onSetAddingItem={setAddingItem}
          onAddContainer={handleAddContainer}
          onQuickAddItem={handleQuickAddItem}
          onRenameLocation={setRenamingLocation}
        />
      </div>

      {showDataMenu && <div onClick={() => setShowDataMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileSelected} style={{ display: "none" }} />
    </div>
  );
}
