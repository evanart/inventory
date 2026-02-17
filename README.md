# 🏠 Home Inventory

A modern web app for tracking household items across rooms and containers. Use natural language to store and find items, with AI-powered parsing powered by Cloudflare Workers and Llama 3.3.

## 🎯 Quick Start

### Prerequisites
- Node.js 18+
- Wrangler CLI for Cloudflare Workers (`npm install -g wrangler`)
- A Cloudflare account (for production deployment)

### Local Development

**Terminal 1 - Frontend Dev Server:**
```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`

**Terminal 2 - Cloudflare Worker (for AI features):**
```bash
npx wrangler dev
```
Runs at `http://localhost:8787`

### Environment Variables

Create a `.env` file in the project root:
```
VITE_API_PROXY_URL=http://localhost:8787
```

Or set when running:
```bash
VITE_API_PROXY_URL=http://localhost:8787 npm run dev
```

## 📖 Project Overview

### Architecture

```
┌─────────────────────────────────────┐
│     React Frontend (Vite)           │
│  - Browse mode (local only)         │
│  - Store mode (uses AI)             │
│  - Search mode (uses AI)            │
└────────────┬────────────────────────┘
             │ HTTP (JSON)
             ↓
┌─────────────────────────────────────┐
│  Cloudflare Worker (proxy.js)       │
│  - AI API proxy (Llama 3.3)         │
│  - KV data storage (/data endpoint) │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
   Llama AI    Cloudflare KV
```

### Core Features

**Browse Mode** (Local)
- Navigate hierarchy: House → Floors → Rooms → Containers → Items
- Rename/delete locations (rooms, floors, containers)
- Move locations between parents
- Add items and containers manually
- Full undo support

**Store Mode** (AI-Powered)
- Natural language input: "Store 3 boxes of batteries in the kitchen drawer"
- AI intelligently parses location and category
- Auto-creates missing rooms/floors on demand
- Support for nested containers
- Deduplicates items with same name

**Find Mode** (AI-Powered)
- Natural language search: "Do I have any lightbulbs?"
- Searches across all items with full paths
- Returns relevant results with locations

**Voice Input** (All Modes)
- Speech recognition for hands-free input
- Works on all browsers supporting Web Speech API

### Data Structure

The inventory is stored as a hierarchical tree:

```javascript
{
  id: "house",
  name: "House",
  type: "house",
  children: [
    {
      id: "f1",
      name: "Main Floor",
      type: "floor",
      children: [
        {
          id: "kitchen",
          name: "Kitchen",
          type: "room",
          children: [
            {
              id: "k_cab",
              name: "Upper Cabinets",
              type: "container",
              children: [
                {
                  id: "item_123",
                  name: "coffee mugs",
                  type: "item",
                  quantity: 8,
                  category: "kitchen",
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Node Types:**
- `house` - Root node (exactly 1)
- `floor` - Organizational level (e.g., "Main Floor", "Basement")
- `room` - Location within floor (e.g., "Kitchen", "Garage")
- `container` - Storage within room (e.g., "Wood Shelf", "Drawer")
- `item` - Actual inventory item

**Item Fields:**
- `name` - Item name (lowercase, singular)
- `quantity` - Number stored (or null if unknown)
- `category` - One of: `tools`, `cleaning`, `electronics`, `holiday`, `clothing`, `kitchen`, `bathroom`, `office`, `sports`, `crafts`, `baby`, `storage`, `misc`

### File Structure

```
inventory/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Main component + all logic
│   └── index.css         # Styles
├── worker/
│   └── proxy.js          # Cloudflare Worker (AI + KV storage)
├── public/               # Static assets
├── vite.config.js        # Vite build config
├── wrangler.jsonc        # Cloudflare Worker config
├── package.json          # Dependencies
└── README.md             # This file
```

### Key Functions (App.jsx)

**Tree Utilities**
- `findNode(tree, id)` - Find node by ID
- `findParentChain(tree, id)` - Get path from root to node
- `addToTree(tree, parentId, node)` - Add child node
- `removeFromTree(tree, id)` - Delete node and children
- `updateInTree(tree, id, updates)` - Modify node properties
- `moveNode(tree, nodeId, newParentId)` - Relocate node
- `deleteNodeCascade(tree, id)` - Delete with all contents
- `deleteNodePreserveChildren(tree, id)` - Delete but promote children

**Path Creation**
- `findOrCreatePath(tree, pathNames, types)` - Create path from root, creating missing nodes
- `findOrCreateLocation(tree, name, type, parentPath)` - Create single room/floor at specific parent

**AI Integration**
- `parseWithClaude(text, tree)` - Parse natural language into store/remove actions
- `searchWithClaude(query, tree)` - Search items with natural language
- `apiCall(systemPrompt, message, mode)` - Generic AI API proxy

## 🚀 Deployment

### Deploy to Production

1. **Set up Cloudflare:**
   ```bash
   wrangler login
   ```

2. **Update wrangler.jsonc** with your account settings

3. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create "INVENTORY_KV"
   ```
   Copy the namespace ID into `wrangler.jsonc`

4. **Deploy worker:**
   ```bash
   wrangler deploy
   ```

5. **Deploy frontend to any static host** (Vercel, Netlify, GitHub Pages):
   ```bash
   npm run build
   # Upload dist/ folder
   ```

6. **Update frontend env** to point to deployed worker URL

## 🔐 Security & Known Issues

### ⚠️ Current Security Concerns

1. **No Authentication** - Anyone with the worker URL can read/write all data
   - Solution: Implement API key or JWT auth (see Upcoming Features)

2. **CORS Too Permissive** - Defaults to allow all origins (`*`)
   - Workaround: Set `ALLOWED_ORIGIN` in wrangler environment

3. **No Rate Limiting** - AI calls are unmetered
   - Risk: Cost abuse, DoS attacks
   - Planned: Add rate limiting by IP/API key

4. **Data Sync Conflicts** - Multiple browser tabs can overwrite each other
   - Workaround: Avoid editing same inventory in multiple tabs
   - Planned: Implement conflict resolution with last-write-wins or collaborative editing

5. **Prompt Injection** - User input sent directly to AI system prompt
   - Mitigation: AI runs locally on Cloudflare, but still risky
   - Planned: Input validation and escaping

### Best Practices

- **Never share the worker URL** publicly until authentication is added
- **Back up your inventory** regularly using Export feature (when available)
- **Review AI output** - check that parsed items are correct before storing
- **Test in development first** - use localhost before connecting to production

## 📝 Upcoming Features

### High Priority (Security & Data Quality)

- [ ] **Authentication & Authorization**
  - Add API key validation to worker endpoints
  - Support JWT tokens for multi-user scenarios
  - Environment: Set `ALLOWED_API_KEYS` in wrangler.toml

- [ ] **Data Export/Import**
  - Export inventory as JSON or CSV for backup/sharing
  - Import from CSV to bulk-create items
  - UI: Add "Export" and "Import" buttons in settings menu

- [ ] **Duplicate Detection**
  - AI-powered deduplication when storing items
  - Manual merge interface for combining similar items
  - Suggestion popup: "Found 'batteries AA' in garage, add here too?"

- [ ] **Conflict Resolution**
  - Detect and resolve multi-tab data conflicts
  - Last-write-wins with user notification
  - Option to restore from backup/undo

### Medium Priority (Usability)

- [ ] **Extended Item Fields**
  - Add optional: expiration date, purchase price, SKU/barcode, notes/tags
  - UI: Extend EditItemModal with new fields
  - Search: Filter by expiration date, price range

- [ ] **Bulk Operations**
  - Multi-select items/containers with checkboxes
  - Bulk delete, move, or tag operations
  - Speeds up inventory cleanup significantly

- [ ] **Advanced Search & Filters**
  - Filter by category, location, quantity, date stored
  - Sort by date added, quantity, category
  - Save search queries for quick access

- [ ] **Statistics Dashboard**
  - Inventory stats: item count by category, room, floor
  - Storage utilization: % full by room
  - Recently stored/accessed items
  - Low stock alerts

- [ ] **Mobile Optimization**
  - Touch-friendly button sizes (min 48px)
  - Swipe gestures for delete/move/edit
  - Responsive layout for small screens
  - Simplified modals for mobile

### Lower Priority (Nice to Have)

- [ ] **Photo Attachments**
  - Attach photos to containers/items
  - QR codes for quick container lookup via mobile
  - Storage: Use Cloudflare R2 or similar

- [ ] **Collaborative Features**
  - Multi-user access (family members, roommates)
  - Read-only vs edit permissions
  - Activity log: "John stored batteries in garage at 2:30pm"
  - Real-time sync with WebSocket

- [ ] **Smart Alerts & Suggestions**
  - "You haven't checked the garage in 3 months"
  - Seasonal reminders: "Holiday decorations are in the attic"
  - Low supply alerts: Less than 2 items of common things
  - Expiration warnings for food/medicine

- [ ] **Integrations**
  - Google Home / Alexa skill for voice control
  - IFTTT recipe support
  - Sync with shopping apps (add to cart from inventory)

- [ ] **Dark Mode**
  - Toggle between light/dark themes
  - Persist preference in localStorage
  - Auto-detect system preference

## 🛠️ Development Tips

### Adding a New Feature

1. **Plan it out** - Is it a UI change, data model change, or API change?
2. **Update data structure if needed** - Remember to keep backward compatibility
3. **Add tests** - Test in browser with test data (use ⚙️ → Load Test Data)
4. **Test edge cases** - Empty containers, deeply nested items, special characters in names
5. **Document changes** - Update this README and code comments

### Debugging

**Frontend Debug Tips:**
- Use browser DevTools console for tree inspection
- Log the full tree with `console.log(JSON.stringify(tree, null, 2))`
- Test tree operations with: `findNode()`, `findParentChain()`, etc.

**Worker Debug Tips:**
- Run locally with `wrangler dev`
- Check Cloudflare dashboard for deployed worker logs
- Test AI responses with `curl`:
  ```bash
  curl -X POST http://localhost:8787 \
    -H "Content-Type: application/json" \
    -d '{"system":"...", "message":"store batteries", "mode":"parse"}'
  ```

**Data Debugging:**
- LocalStorage: Open DevTools → Application → Local Storage
- KV (prod): Use Cloudflare dashboard → Workers → KV Namespaces
- Download data with "Load Test Data" then inspect in browser

### Common Patterns

**Finding and modifying a node:**
```javascript
const node = findNode(tree, nodeId);
const updated = updateInTree(tree, nodeId, { name: "New Name" });
setTree(updated);
```

**Creating a path and storing an item:**
```javascript
const { tree: t, leafId } = findOrCreatePath(updated, ["Main Floor", "Kitchen", "Drawer"], ["floor", "room", "container"]);
const item = { id: uid(), name: "batteries", type: "item", quantity: 10, category: "electronics", children: [] };
const final = addToTree(t, leafId, item);
setTree(final);
```

**Deleting with undo:**
```javascript
setUndoStack(prev => [...prev.slice(-9), { tree, label: "delete" }]);
setTree(t => removeFromTree(t, nodeId));
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Browse mode
  - [ ] Navigate to each floor/room/container
  - [ ] Rename a location
  - [ ] Delete an empty container
  - [ ] Delete a room with items (confirm warning)
  - [ ] Move a container to different room
  - [ ] Undo last action

- [ ] Store mode (requires worker)
  - [ ] Store item in existing room
  - [ ] Store item with new container name
  - [ ] Store item in new room (auto-created)
  - [ ] Store multiple items in one command
  - [ ] Verify items appear in correct location

- [ ] Search mode (requires worker)
  - [ ] Find item by name
  - [ ] Find items in specific location
  - [ ] Search with typos (AI should handle)

- [ ] Voice input
  - [ ] Enable microphone permission
  - [ ] Speak command and verify recognition
  - [ ] Test with background noise

### Loading Test Data

Use the ⚙️ menu → "Load Test Data" to populate with 60+ items for testing.

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Llama 3.3 Model Card](https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_3/)
- [React 18 Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

## 📄 License

MIT

## 🤝 Contributing

Found a bug? Have a feature idea? Feel free to open an issue or submit a PR!

Quick tips:
- Follow the existing code style
- Keep components in App.jsx (single file for now)
- Add undo support for any data mutations
- Test with test data before committing
