# Cribl btool — Configuration Inspector

A Cribl App Platform application that lets you browse, search, and inspect effective configuration across a Cribl Stream deployment — similar to Splunk's `btool` utility, but fully UI-driven with no CLI required.

Use it to answer questions like: *What is the effective value of this setting? Where is it defined — leader default or a specific worker group?* Which pipelines, routes, inputs, or outputs exist in a given scope?

## What it shows

The app loads configuration from your connected Cribl Stream instance and presents it as searchable, browsable entries. Each entry includes:

- **ID and type** — the config object name (e.g. a pipeline or input ID)
- **All settings** — flattened into dot-notation keys (e.g. `throttleRatePerSec`, `disabled`)
- **Source layer** — where the config comes from (leader default, a worker group, or system-level info)

## Installation

### From a release package (recommended)

1. Download the latest `cc-config-inspector-*.tgz` from [GitHub Releases](https://github.com/Cribl-Community/CC-config-inspector/releases).
2. In Cribl, go to **Apps → View All → Add App → Upload**.
3. Select the downloaded archive and click **Import**.

### From Git

1. Log in to Cribl and go to **Apps → View All → Add App → Import from Git**.
2. Paste the repository URL and select a release tag (for example `v1.0.0`).
3. Click **Import**.

### Local development

```bash
npm install
npm run dev
```

The dev server supports live reload when you edit `config/policies.yml`, `config/proxies.yml`, or `package.json`. Use `npm run package` to build a distributable `.tgz` archive.

### Config categories

The sidebar lists nine config types. Select one to load and browse its entries:

| Category | What it covers |
|---|---|
| **Pipelines** | Processing pipelines and their settings |
| **Routes** | Routing table rules |
| **Inputs** | Data sources and collectors |
| **Outputs** | Destinations and sinks |
| **Functions** | Built-in and custom functions |
| **Lookups** | Lookup tables |
| **Parsers** | Event parsers and schemas |
| **System Info** | Platform and version information |
| **Groups** | Config groups and fleets |

Item counts appear next to each category after it loads.

## Choosing a scope

Use the **Scope** dropdown in the header to control which configuration layers are included:

- **Leader (all groups)** — leader-level defaults and system info
- **All Worker Groups** — configuration from every worker group in the deployment
- **Individual worker group** — configuration for one specific group (worker count shown in the dropdown)

Changing scope reloads the active category. Previously loaded data is cached within the session, so switching back to a scope you have already viewed is faster.

## Searching

The global search box filters the current view across keys, values, IDs, types, labels, and source layers. Examples:

- `throttleRatePerSec` — find settings with that key name
- `true` or `false` — find boolean values
- `prod` — match against IDs, labels, or source scope names

Search is case-insensitive. Matching text is highlighted in the results. Clear the search with the **×** button on the right side of the input.

## Viewing configuration

Three view modes are available in the toolbar above the results:

### Flat (default)

A scrollable list of config items. Each row shows the ID, source badge, and a preview of its key-value fields (up to 12 fields, or only matching fields when a search is active).

Click a row to open the **detail panel** at the bottom, which shows every setting for that item in a grid. Use **Copy JSON** in the detail panel to copy the full config object, or **×** to close it.

### Tree

A collapsible tree view of each item's config object. Nested objects and arrays can be expanded in place. Search matches are highlighted.

### JSON

A formatted JSON dump of all items in the current filtered set. Use **Copy** to copy the entire output to your clipboard.

The toolbar also shows the item count (and how many match the current filter), plus **Copy All JSON** and **Export** shortcuts for the current view.

## Understanding source badges

Each config entry displays a colored badge indicating where it is defined:

| Badge | Meaning |
|---|---|
| **Blue** — `Worker Group: …` | Defined in a specific worker group |
| **Orange** — `Leader …` | Leader-level default configuration |
| **Purple** — `Leader (System) …` | System-level information |

This makes it easy to see whether a setting comes from the leader or from a worker group's own config.

## Exporting

Click **Export** in the header (or in the config viewer toolbar) to open the export dialog.

### Format

Choose one of three output formats:

- **JSON** — structured export with metadata, a flat `items` array, and a `byCategory` index
- **CSV** — flat table with dot-notation columns, one row per config item
- **TXT** — plain-text, btool-style output with aligned `key = value` blocks per item

### Scope

- **Current View** — exports the already-loaded entries for the active category (instant)
- **All Categories** — loads each selected category on demand and combines them into one file (shows progress while loading)

When exporting all categories, use the category checkboxes to include or exclude specific types. At least one category must remain selected.

Exported files download automatically with names like `cribl-btool-{scope}-{category}-{timestamp}.{ext}`.

## Tips

- Start with **Leader (all groups)** to see deployment-wide defaults, then drill into a specific worker group to compare overrides.
- Use **Flat** view and the detail panel when you need to inspect every field on a single object.
- Use **All Categories** export before a migration or audit to capture a full snapshot of your deployment's configuration.
- The breadcrumb bar below the header shows your current path: `cribl btool › {category} › {scope}` (and the active search term, if any).
