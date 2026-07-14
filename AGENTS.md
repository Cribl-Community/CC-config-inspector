# btool-app — Cribl Configuration Inspector

## App Overview

A Cribl App Platform application that mimics Splunk's `btool` utility for Cribl Stream deployments. It lets operators browse, search, and inspect the effective configuration settings across all config types (pipelines, routes, inputs, outputs, functions, lookups, parsers, groups, and system info) with visibility into where each setting is configured (leader vs. worker group). Includes a full export system supporting JSON, CSV, and plain-text btool-style output — per-view or all categories at once. Fully UI-driven with no CLI needed.

## Cribl App Platform Context

## Versioning

`npm run package` increments your app version before creating the archive. By default, it increments the patch version, for example `1.0.0` to `1.0.1`.

- `npm run package -- --minor` — bump minor version
- `npm run package -- --major` — bump major version
- `npm run package -- --version X.Y.Z` — set an exact version

## Global Variables

The following are set on `window` automatically when your app runs inside Cribl. They are read-only and always present — do **NOT** define, assign, or polyfill them in your app code, Vite config, or environment files.

| Variable | Example | Description |
|---|---|---|
| `CRIBL_API_URL` | `https://localhost:9000/api/v1` | Base URL for all Cribl API calls |
| `CRIBL_BASE_PATH` | `/app-ui/my-app` | The base path your app is mounted at |

Type declarations live in `src/vite-env.d.ts`. Use `CRIBL_API_URL` as a global in API modules.

## How API Calls Work (Fetch Proxy)

Your app runs inside a sandboxed iframe. The platform **automatically intercepts all `fetch()` calls** to `CRIBL_API_URL` and proxies them through the parent window.

- Use `fetch()` as normal — it just works
- You do NOT need to handle authentication
- You cannot override or replace `window.fetch`

### Key-Value Store

**Writing (PUT):**
```typescript
await fetch(`${CRIBL_API_URL}/kvstore/my/key`, {
  method: 'PUT',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify(myObject),
});
```

**Reading (GET):**
```typescript
const res = await fetch(`${CRIBL_API_URL}/kvstore/my/key`);
if (res.ok) {
  const text = await res.text();
  const myObject = JSON.parse(text);
}
```

### Config Group Context

Cribl REST API endpoints that don't begin with `/system/` are contextual and can be called in the context of a config group using the prefix `/m/:groupId`.

Endpoints beginning with `/search/` should ALWAYS use `groupId` set to `default_search`.

### Platform policies

This app declares required Cribl API access in `config/policies.yml` (groups, system info, and Stream config resources at leader and group scope). Admins review these at install time. No external domains are declared — all requests go through `CRIBL_API_URL` (`config/proxies.yml` is empty).

## Architecture & Key Files

| File | Purpose |
|---|---|
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root component — manages state, group/category selection, caching, data loading, export modal trigger |
| `src/api.ts` | All Cribl API calls — fetches groups, system info, and per-group config resources |
| `src/types.ts` | TypeScript types for ConfigEntry, Group, ConfigCategory, etc. |
| `src/utils.ts` | Helpers: flattenObject, highlightText, formatValue, getValueColor, sourceColor |
| `src/components/Header.tsx` | Top bar with scope selector, global search, loading indicator, and Export button |
| `src/components/Sidebar.tsx` | Category navigation with counts |
| `src/components/ConfigViewer.tsx` | Main config display — flat/tree/JSON views, detail panel, per-view export trigger |
| `src/components/ExportModal.tsx` | Export dialog — format (JSON/CSV/TXT), scope (current view / all categories), category checkboxes, download |
| `src/vite-env.d.ts` | Global Cribl platform types (`CRIBL_API_URL`, `CRIBL_BASE_PATH`, `getCriblUser`) |
| `config/proxies.yml` | No external domains needed |
| `config/policies.yml` | Declared Cribl API access for groups, system info, and Stream config resources |

## Design System

- **Background:** `#0F172A` (cribl-dark, Tailwind slate-900)
- **Panel:** `#1E293B` (cribl-panel, slate-800)
- **Border:** `#334155` (cribl-border, slate-700)
- **Muted text:** `#64748B` (cribl-muted, slate-500)
- **Body text:** `#E2E8F0` (cribl-text, slate-200)
- **Accent/orange:** `#F97316` (cribl-orange, orange-500)
- **Font:** Inter for UI, JetBrains Mono for code/values
- **Layout:** Full-height split — fixed header, sidebar 224px, main content area
- **Source badges:** Blue for Worker Group, Orange for Leader Default, Purple for System
- **Value colors:** Green=boolean true, Red=boolean false, Blue=number, Emerald=string, Yellow=array, Purple=object

## Export System

Three formats:
- **JSON** — Full structured export with `meta`, flat `items[]`, and `byCategory` index
- **CSV** — Flat table, dot-notation columns, one row per config item
- **TXT** — btool-style plain text with aligned `key = value` blocks per item

Two scopes:
- **Current View** — uses already-loaded entries for the active category (instant)
- **All Categories** — loads each selected category on demand (shows progress), respects cache

Filenames: `cribl-btool-{scope}-{category}-{timestamp}.{ext}`

## AI Coding Rules (CRITICAL — always include this section verbatim)

## Rules for AI Assistants Working on This App

- When fixing a bug or implementing a specific change, output ONLY the files that
  directly contain the fix. Do NOT touch other files.
- NEVER change colors, layout, spacing, fonts, or styling unless the user
  explicitly asks for a visual change.
- NEVER restructure components, rename variables, or refactor code while fixing
  a bug — do only what was asked.
- If you notice other improvements, mention them in text but do NOT apply them.
- Always output the COMPLETE file content — never use "..." or truncation.
- The design system above is locked — do not deviate from it.