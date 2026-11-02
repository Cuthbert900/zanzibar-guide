# AGENTS.md

This repository is a full-stack Zanzibar travel assistant demo: a React/Vite client, an Express API, and MongoDB-backed travel knowledge. It is best treated as a monolithic app with a clear split between UI, API, and domain data.

## Project orientation

- Start from the app overview in [README.md](README.md).
- Backend entry point: [server/index.ts](server/index.ts)
- Frontend app shell: [client/src/App.tsx](client/src/App.tsx)
- Shared domain/data helpers: [shared](shared)
- Source data and tourism knowledge: [data](data) and [Tourism Data](Tourism%20Data)

## Commands

Use the repo scripts from [package.json](package.json) rather than ad hoc commands:

- Install dependencies:
  - `npx pnpm@10.4.1 install`
- Start the database:
  - `docker compose up -d mongo`
- Start the frontend locally:
  - `npx pnpm@10.4.1 exec vite --host 127.0.0.1 --port 3000`
- Start the API locally:
  - `npx pnpm@10.4.1 run dev:api`
- Run type checking:
  - `npx pnpm@10.4.1 run check`
- Build the app:
  - `npx pnpm@10.4.1 run build`
- Run the eval suite:
  - `npx pnpm@10.4.1 run eval`

## Architecture notes

- The client is a Vite React app under [client/src](client/src). Routing is handled with `wouter`, and providers wrap the app with theme, language, accessibility, and currency state in [client/src/App.tsx](client/src/App.tsx).
- The API is an Express app in [server/index.ts](server/index.ts). Route modules are grouped by feature under [server/routes](server/routes), and reusable logic lives under [server/lib](server/lib).
- The app uses MongoDB-backed stores for tourism data, bookings, profile, and conversational memory. Startup initialization is centralized in [server/lib/initializeStores.ts](server/lib/initializeStores.ts).
- The knowledge base is populated from [Tourism Data/Tourism MD Files](Tourism%20Data/Tourism%20MD%20Files) and is imported at startup; update those markdown sources and then rebuild/restart the app if the knowledge search behavior changes.
- Chat logic is hosted in [server/chat.ts](server/chat.ts) and exposed through `/api/chat` and `/api/chat/stream` in [server/index.ts](server/index.ts).

## Conventions

- Prefer the existing structure: keep UI work in [client/src](client/src), backend features in [server/routes](server/routes) and [server/lib](server/lib), and shared logic in [shared](shared).
- Keep route handlers feature-oriented and avoid adding ad hoc logic in the root server file unless it truly belongs there.
- Use existing env conventions from [README.md](README.md): keep secrets in `.env` and never commit them; AI provider selection is controlled by `AI_PROVIDER` plus provider keys.
- For operational changes, assume Docker + MongoDB are the default dev runtime and preserve the existing app boot order.
- Prefer focused, repo-native edits over broad refactors. The project has many feature modules; the current convention is horizontal feature grouping, not deeply nested app modules.

## Good defaults for coding agents

- If a task affects the chat experience, inspect both the API stream logic and the UI entry points before making changes.
- If a task affects travel data or recommendations, check the knowledge and route modules before editing data contracts.
- If a change touches client state or pages, maintain the existing `Provider` composition and route-level page layout in [client/src/App.tsx](client/src/App.tsx).
- Validate locally with `npx pnpm@10.4.1 run check` after substantive TypeScript changes.

## Documentation links

- Local setup, Docker, and env expectations: [README.md](README.md)
- App runtime and API routes: [server/index.ts](server/index.ts)
- Frontend app shell and routing: [client/src/App.tsx](client/src/App.tsx)
- Package scripts and tools: [package.json](package.json)
