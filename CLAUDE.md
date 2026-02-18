# CLAUDE.md

## Project Overview

Home inventory management app with AI-powered natural language input and voice support. React frontend deployed to shared hosting via SFTP; Cloudflare Worker backend providing AI inference (Llama 3.3 70B) and KV persistence.

## Tech Stack

- **Frontend**: React 18, Vite 6, vanilla CSS (no TypeScript)
- **Backend**: Cloudflare Worker (`worker/proxy.js`)
- **Storage**: Cloudflare KV + localStorage (hybrid, dual-write)
- **AI**: Cloudflare Workers AI (Llama 3.3 70B Instruct FP8)
- **Deploy**: GitHub Actions → SFTP (frontend), `wrangler deploy` (worker)

## Commands

```bash
# Frontend dev server (localhost:5173)
npm run dev

# Worker dev server (localhost:8787)
API_KEY=dev-key-12345 npx wrangler dev

# Production build
npm run build

# Deploy worker to production
wrangler deploy --env production

# Set worker secrets
wrangler secret put API_KEY --env production
```

Both terminals needed for full local development.

## Project Structure

```
src/App.jsx          # Monolithic React app (~950 lines, all components)
src/main.jsx         # React entry point
src/index.css        # Global styles and animations
worker/proxy.js      # Cloudflare Worker (AI proxy + KV storage)
wrangler.jsonc       # Worker configuration
.github/workflows/   # CI/CD pipeline
```

## Architecture

- **Data model**: Hierarchical tree (house → floor → room → container → item)
- **Modes**: Browse (navigate tree), Store (AI parse natural language), Find (AI search)
- **API endpoints**: `POST /` (AI inference), `GET /data` (fetch), `PUT /data` (save)
- **Auth**: Bearer token on all endpoints, key in `API_KEY` env var

## Code Conventions

- All vanilla JavaScript with JSX — no TypeScript
- PascalCase for components, camelCase for functions/variables, UPPERCASE for constants
- Functional components with hooks (useState, useEffect, useRef, useCallback)
- Immutable tree operations (return new objects, don't mutate)
- Inline styles via object syntax
- Minimal comments; prefer descriptive function names

## Environment Variables

```bash
# Frontend (.env)
VITE_API_PROXY_URL=http://localhost:8787
VITE_API_KEY=dev-key-12345

# Worker (secrets)
API_KEY=<secret>
ALLOWED_ORIGIN=*  # optional, restricts CORS
```

## Key Patterns

- Tree utilities are pure functions at the top of App.jsx (findNode, findParentChain, findOrCreatePath)
- Debounced saves (500ms) to both localStorage and server
- Undo stack (last 10 actions with labels)
- AI responses use JSON schema validation for store/remove parsing
- Auto-creates missing rooms/floors from natural language input
