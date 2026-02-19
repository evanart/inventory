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

Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

**Required variables:**
```
# Frontend URL of Cloudflare Worker
VITE_API_PROXY_URL=http://localhost:8787

# API key for authentication (must match worker API_KEY)
VITE_API_KEY=dev-key-12345
```

**For worker (terminal 2):**
```bash
API_KEY=dev-key-12345 npx wrangler dev
```

**For frontend (terminal 1):**
```bash
npm run dev
```

⚠️ **Important:** Keep `VITE_API_KEY` and `API_KEY` synchronized between frontend and worker!

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

4. **Generate a strong API key:**
   ```bash
   openssl rand -base64 32
   # Output example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0==
   ```

5. **Set API_KEY secret in production:**
   ```bash
   wrangler secret put API_KEY --env production
   # Paste the generated key when prompted
   ```

6. **Deploy worker:**
   ```bash
   wrangler deploy --env production
   ```

7. **Add `VITE_API_KEY` as a GitHub Actions secret:**
   - Go to repo Settings → Secrets and variables → Actions → New repository secret
   - Name: `VITE_API_KEY`, Value: same key from step 4

8. **Deploy frontend** — pushes to `main` trigger GitHub Actions (build + SFTP deploy)

### Rotating API Keys

To change your API key in production:
```bash
wrangler secret put API_KEY --env production
# Enter the new key when prompted
```

Then update the `VITE_API_KEY` GitHub Actions secret and push to `main` to redeploy the frontend.

## 🔐 Security & Known Issues

### ✅ Security Features Implemented

1. **API Key Authentication** ✓ - All endpoints require valid Bearer token
   - Implementation: `Authorization: Bearer <API_KEY>` header on all requests
   - Keys stored as Cloudflare Worker secrets (not in code)
   - Easy key rotation without code redeployment
   - Setup: See [Deployment](#-deployment) section

2. **Strict CORS Origin Validation** ✓ - Exact origin match when `ALLOWED_ORIGIN` is set
   - Defaults to `*` (permissive) but exact-match comparison when configured
   - Set `ALLOWED_ORIGIN` to your frontend URL in wrangler environment

3. **Rate Limiting** ✓ - Per-IP request throttling
   - AI endpoint: 30 requests/minute per IP
   - Data endpoint: 60 requests/minute per IP
   - In-memory tracking with automatic cleanup

4. **Request Size Limits** ✓ - Prevents payload abuse
   - Data endpoint: 5MB max body size
   - AI endpoint: 10,000 character combined input limit
   - Frontend: 500 character max for user input

5. **Security Headers** ✓ - Defense-in-depth response headers
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`

6. **Input Validation** ✓ - Type checking and Content-Type enforcement
   - POST/PUT requests must send `application/json` Content-Type
   - AI fields validated as strings before processing
   - Sanitized error messages (no internal details leaked to clients)

### ⚠️ Remaining Security Concerns

1. **CORS Default is Permissive** - Defaults to `*` if `ALLOWED_ORIGIN` is not set
   - Mitigation: API key requirement prevents unauthenticated access
   - Fix: Set `ALLOWED_ORIGIN` to your production frontend URL

2. **Data Sync Conflicts** - Multiple browser tabs can overwrite each other
   - Workaround: Avoid editing same inventory in multiple tabs simultaneously
   - Planned: Implement conflict resolution with last-write-wins or collaborative editing

3. **Prompt Injection** - User input sent to AI system prompt
   - Mitigation: AI runs on Cloudflare infrastructure, limited risk; input length limited
   - Planned: Additional input validation and escaping

4. **API Key in Client Bundle** - `VITE_API_KEY` is embedded in the frontend JS
   - Mitigation: Key is required but the app is intended for personal/household use
   - Risk: Anyone who views source can extract the key

### Best Practices

- **Keep API_KEY secret** - Never commit to git or share publicly
- **Set ALLOWED_ORIGIN** - Configure to your production frontend URL
- **Rotate keys regularly** - Use `wrangler secret put API_KEY --env production` and update the `VITE_API_KEY` GitHub secret
- **Back up your inventory** regularly using the CSV Export feature
- **Review AI output** - check that parsed items are correct before storing
- **Test in development first** - use localhost before connecting to production
- **Generate strong keys** - Use `openssl rand -base64 32` for production keys

## 📝 Upcoming Features

### High Priority (Security & Data Quality)

- [x] **Authentication & Authorization** ✓
  - API key validation on all worker endpoints
  - Bearer token support
  - Future: JWT tokens for multi-user scenarios

- [x] **Data Export/Import** ✓
  - Export inventory as CSV for backup/sharing
  - Import from CSV to bulk-create items
  - Load sample data from built-in CSV
  - Immediate server persistence on import (no data loss on tab close)

- [ ] **Siri Shortcuts Integration**
  - Add `POST /shortcut` endpoint on the Worker that auto-loads inventory from KV, accepts natural language text, and returns a simple confirmation string
  - Support both "store" and "find" modes via query param or JSON field
  - Build Apple Shortcuts (shareable via iCloud link) that: activate mic dictation, POST to the Worker, and display the result
  - Provide step-by-step setup instructions in the app UI and/or an "Add to Siri" link
  - Two-step Siri flow: "Hey Siri, Home Inventory" → speak command → see result
  - No native iOS app required — Shortcuts calls the Worker API directly

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
  - ~~Siri Shortcuts~~ (moved to High Priority)
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

Use the ⚙️ menu → "Load Sample Data" to populate with sample items for testing.

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
