/** TypeIcon -- Renders the correct lucide icon for a node type (house, floor, room, container, item) */

import { TYPE_ICON_COMPONENTS, TYPE_COLORS } from "../constants/nodeTypes.js";
import { Package } from "lucide-react";

export default function TypeIcon({ type, size = 18, color }) {
  const Icon = TYPE_ICON_COMPONENTS[type] || Package;
  return <Icon size={size} color={color || TYPE_COLORS[type] || "#666"} />;
}
