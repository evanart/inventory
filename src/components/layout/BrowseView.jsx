/** BrowseView -- Main content area: breadcrumb, location header, container list, item list */

import { Pencil } from "lucide-react";
import TypeIcon from "../TypeIcon.jsx";
import Breadcrumb from "../Breadcrumb.jsx";
import LocationCard from "../cards/LocationCard.jsx";
import ItemCard from "../cards/ItemCard.jsx";
import AddContainerInline from "../forms/AddContainerInline.jsx";
import QuickAddItem from "../forms/QuickAddItem.jsx";
import { countItems } from "../../utils/tree.js";

export default function BrowseView({
  currentNode, breadcrumb, containers, items,
  canAddItems, canRename, adding, addingItem,
  onNavigate, onRename, onDelete, onMoveLocation, onHistory,
  onEditItem, onMoveItem, onSetAdding, onSetAddingItem,
  onAddContainer, onQuickAddItem, onRenameLocation,
}) {
  return (
    <>
      <Breadcrumb chain={breadcrumb} onNavigate={onNavigate} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: 19, fontWeight: 600, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
            <TypeIcon type={currentNode.type} size={20} /> {currentNode.name}
          </span>
          {canRename && (
            <button onClick={() => onRenameLocation(currentNode)} title="Rename"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: "4px 6px", display: "flex", alignItems: "center" }}><Pencil size={13} /></button>
          )}
          <span style={{ fontSize: 13, color: "#999" }}>
            {countItems(currentNode)} item{countItems(currentNode) !== 1 ? "s" : ""}
          </span>
        </div>
        {canAddItems && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onSetAddingItem(true)} style={{
              padding: "7px 14px", borderRadius: 6, border: "2px solid #0e7490",
              background: "#fff", color: "#0e7490", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif",
            }}>+ Item</button>
            <button onClick={() => onSetAdding(true)} style={{
              padding: "7px 14px", borderRadius: 6, border: "2px solid #111",
              background: "#fff", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif",
            }}>+ Container</button>
          </div>
        )}
      </div>

      {adding && <AddContainerInline onAdd={onAddContainer} onCancel={() => onSetAdding(false)} />}

      {containers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: items.length > 0 ? 14 : 0 }}>
          {containers.map(c => <LocationCard key={c.id} node={c} onClick={onNavigate} onRename={onRename} onDelete={onDelete} onMove={onMoveLocation} onHistory={onHistory} />)}
        </div>
      )}

      {addingItem && canAddItems && <QuickAddItem onAdd={onQuickAddItem} onCancel={() => onSetAddingItem(false)} />}

      {items.length > 0 && (
        <>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontSize: 12, fontWeight: 500, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 8px" }}>Items here</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map(i => <ItemCard key={i.id} node={i} onDelete={onDelete} onEdit={onEditItem} onMove={onMoveItem} onHistory={onHistory} />)}
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
    </>
  );
}
