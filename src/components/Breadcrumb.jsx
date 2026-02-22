/** Breadcrumb -- Horizontal navigation trail showing the path from house to current location */

import { ChevronRight } from "lucide-react";
import TypeIcon from "./TypeIcon.jsx";

export default function Breadcrumb({ chain, onNavigate }) {
  return (
    <div data-component="Breadcrumb" style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", marginBottom: 14, fontSize: 13 }}>
      {chain.map((node, i) => (
        <span key={node.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <ChevronRight size={12} color="#ccc" style={{ margin: "0 1px" }} />}
          <button onClick={() => onNavigate(node.id)} style={{
            background: i === chain.length - 1 ? "#111" : "none", border: "none", cursor: "pointer",
            padding: "3px 10px", borderRadius: 4, fontWeight: i === chain.length - 1 ? 600 : 400,
            color: i === chain.length - 1 ? "#fff" : "#666", fontSize: 13,
            fontFamily: "'Rubik', sans-serif", display: "flex", alignItems: "center", gap: 4,
          }}><TypeIcon type={node.type} size={13} color={i === chain.length - 1 ? "#fff" : undefined} /> {node.name}</button>
        </span>
      ))}
    </div>
  );
}
