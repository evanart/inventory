/** api -- AI inference: sends natural language to Cloudflare Worker, parses store/remove/search responses */

import { API_PROXY, API_KEY } from "../constants/inventory.js";
import { CATEGORIES } from "../constants/categories.js";
import { flattenItems, findParentChain } from "../utils/tree.js";

export async function apiCall(systemPrompt, userMessage, mode, signal) {
  if (!API_PROXY) throw new Error("API proxy not configured. Set VITE_API_PROXY_URL.");
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  const res = await fetch(API_PROXY, {
    method: "POST",
    headers,
    body: JSON.stringify({ system: systemPrompt, message: userMessage, mode }),
    signal,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("API key invalid or missing. Check VITE_API_KEY environment variable.");
    }
    throw new Error("API error " + res.status + ": " + (errText || "Unknown error"));
  }
  const data = await res.json();
  return data.text;
}

export async function processWithAI(text, tree, signal) {
  const allNodes = [];
  function walk(n, path) {
    allNodes.push({ path: path.join(" > "), type: n.type, name: n.name });
    (n.children || []).forEach(c => walk(c, [...path, c.name]));
  }
  walk(tree, [tree.name]);
  const structureSummary = allNodes.filter(n => n.type !== "item").map(n => n.path).join("\n");

  const allItems = flattenItems(tree).map(item => {
    const chain = findParentChain(tree, item.id);
    return { name: item.name, quantity: item.quantity, category: item.category, fullPath: chain ? chain.map(n => n.name).join(" > ") : item.name };
  });
  let itemSummary = allItems.map(i =>
    i.name + (i.quantity != null ? " x" + i.quantity : "") + " (" + i.category + ") — " + i.fullPath
  ).join("\n");
  if (itemSummary.length > 3500) {
    itemSummary = itemSummary.substring(0, 3500) + "\n... (" + allItems.length + " total items)";
  }

  const systemPrompt = "You are a home inventory assistant. Determine if the user wants to STORE items, REMOVE items, or SEARCH/FIND items.\n\nCurrent house structure:\n" + structureSummary + "\n\nCurrent items in inventory:\n" + (itemSummary || "(empty)") + "\n\nReturn ONLY valid JSON with one of these formats:\n\nFor STORE:\n{\n  \"action\": \"store\",\n  \"items\": [{\"name\": \"item name (singular lowercase)\", \"quantity\": number or null, \"path\": [\"Floor Name\", \"Room Name\", \"Container (optional)\"], \"category\": one of: " + CATEGORIES.join(", ") + "}],\n  \"createLocations\": [{\"name\": \"location name\", \"type\": \"floor\" | \"room\", \"parentPath\": [\"Floor Name\"] or []}]\n}\n\nFor REMOVE:\n{\n  \"action\": \"remove\",\n  \"items\": [{\"name\": \"item name\", \"quantity\": null, \"path\": [], \"category\": \"misc\"}]\n}\n\nFor SEARCH/FIND:\n{\n  \"action\": \"search\",\n  \"searchResult\": \"Your helpful concise plain text answer about the items\"\n}\n\nRules:\n- Questions like \"where is...\", \"do I have...\", \"find my...\", \"how many...\" are SEARCH\n- Statements like \"put...\", \"store...\", \"add...\", \"I bought...\", \"there are...\" are STORE\n- Statements like \"remove...\", \"delete...\", \"I threw away...\", \"get rid of...\" are REMOVE\n- path = array from floor to most specific container\n- Match existing locations when clearly the same\n- New containers are created automatically in the path\n- If user mentions a room or floor that doesn't exist, add it to createLocations\n- quantity null = unknown amount\n- \"the garage\" -> [\"Main Floor\", \"Garage\"]\n- \"wood shelf in the garage\" -> [\"Main Floor\", \"Garage\", \"Wood Shelf\"]\n- For search: give a concise, helpful answer based on the inventory data. If nothing matches, say so.";

  const raw = await apiCall(systemPrompt, text, "parse", signal);
  if (typeof raw === "object" && raw !== null) return raw;
  return JSON.parse(String(raw).replace(/```json|```/g, "").trim());
}
