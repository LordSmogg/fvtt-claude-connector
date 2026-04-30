# Foundry MCP Bridge

Connects a running Foundry VTT v13 world to Claude Code via the Model Context Protocol. System-agnostic — works with any game system.

## How it works

```
Claude Code  ──(MCP/stdio)──▶  MCP Server (Node.js)  ──(WebSocket)──▶  Foundry Module (browser)  ──▶  Foundry VTT API
```

- The **MCP server** runs on your machine and speaks to Claude Code over stdio.
- The **Foundry module** runs inside Foundry's browser context (GM only) and connects back to the MCP server over WebSocket.
- Claude Code can then call tools to create, read, update, and delete any Foundry document type.

---

## Setup

### 1. Install the Foundry module

Copy (or symlink) the `fvtt-claude-connector` folder into your Foundry modules directory:

```
{Foundry userData}/Data/modules/fvtt-claude-connector/
```

The folder must be named exactly `fvtt-claude-connector`.

Then in Foundry: **Settings → Manage Modules → Enable "Foundry MCP Bridge"**.

### 2. Build and configure the MCP server

```bash
# From this repo root
npm install
npm run build
```

This produces `mcp-server/dist/index.js`.

### 3. Add the MCP server to Claude Code

Add to your project's `.mcp.json` (or `~/.claude/mcp.json` for global use):

```json
{
  "mcpServers": {
    "foundry": {
      "command": "node",
      "args": ["C:/path/to/fvtt-claude-connector/mcp-server/dist/index.js"],
      "env": {
        "BRIDGE_PORT": "4000"
      }
    }
  }
}
```

Or add it via the CLI:
```bash
claude mcp add foundry -- node /path/to/fvtt-claude-connector/mcp-server/dist/index.js
```

### 4. Start a session

1. Start Foundry VTT and load your world as GM.
2. The Foundry module will automatically connect to the MCP server on port 4000.
3. Start Claude Code in your project — the `foundry` MCP server will be available.

**Port mismatch?** Change the port in both:
- Foundry: **Settings → Module Settings → Foundry MCP Bridge → Bridge Port**
- `.mcp.json`: `"BRIDGE_PORT": "4000"`

---

## Available tools

| Category | Tools |
|---|---|
| **Actors** | `actor-list`, `actor-get`, `actor-create`, `actor-update`, `actor-delete` |
| **Items** | `item-list`, `item-get`, `item-create`, `item-update`, `item-delete` |
| **Actor Items** | `actor-item-list`, `actor-item-add`, `actor-item-update`, `actor-item-remove` |
| **Scenes** | `scene-list`, `scene-get`, `scene-create`, `scene-update`, `token-place`, `wall-create`, `light-create` |
| **Journal** | `journal-list`, `journal-get`, `journal-create`, `journal-update`, `journal-page-create`, `journal-page-update` |
| **Compendium** | `compendium-list`, `compendium-search`, `compendium-import` |
| **Combat** | `combat-create`, `combat-get`, `combat-add-combatant`, `combat-set-initiative`, `combat-next-turn`, `combat-start`, `combat-end` |
| **Roll Tables** | `rolltable-list`, `rolltable-get`, `rolltable-create`, `rolltable-roll` |
| **Chat** | `chat-send` |
| **Folders** | `folder-list`, `folder-create` |
| **World** | `world-info` |
| **Game System** | `system-info` |

---

## Development

```bash
# Watch mode for the Foundry module (rebuild on save)
cd foundry-module && npm run dev

# Watch mode for the MCP server
cd mcp-server && npm run dev
```

---

## Project structure

```
fvtt-claude-connector/
├── mcp-server/          Node.js MCP server (runs on your machine)
│   └── src/
│       ├── index.ts     Entry point — MCP stdio + WebSocket server
│       ├── bridge.ts    WebSocket server, request/response correlation
│       └── tools/       One file per tool category
├── fvtt-claude-connector/  Foundry VTT module (runs in browser)
│   ├── module.json      Foundry manifest
│   └── src/
│       ├── main.ts      Hooks, settings registration, startup
│       ├── bridge.ts    WebSocket client, message dispatch
│       └── handlers/    One file per document type
└── package.json         Workspace root
```
