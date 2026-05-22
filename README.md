# Foundry MCP Bridge

Connects a running Foundry VTT v13 world to Claude Code via the Model Context Protocol. System-agnostic — works with any game system.

## How it works

```
Claude Code  ──(MCP/stdio)──▶  MCP Server (Node.js)  ──(WebSocket)──▶  Foundry Module (browser)  ──▶  Foundry VTT API
```

- The **MCP server** (`foundry-mcp-bridge` on npm) runs on your machine and speaks to Claude Code over stdio.
- The **Foundry module** runs inside Foundry's browser context (GM only) and connects back to the MCP server over WebSocket.
- Claude Code can then call tools to create, read, update, and delete any Foundry document type.

---

## Setup

### 1. Install the Foundry module

In Foundry: **Settings → Add-on Modules → Install Module**, paste this manifest URL:

```
https://github.com/LordSmogg/fvtt-claude-connector/releases/latest/download/module.json
```

Then enable **"Foundry MCP Bridge"** in your world's module settings.

On first load, the module will show a setup guide dialog with copy-paste config snippets.

### 2. Add the MCP server to Claude Code

Add to `~/.claude/mcp.json` (global) or your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "foundry": {
      "command": "npx",
      "args": ["-y", "foundry-mcp-bridge"]
    }
  }
}
```

Or via the CLI:
```bash
claude mcp add foundry -- npx -y foundry-mcp-bridge
```

No install or build step needed — `npx` fetches and runs the server automatically.

### 3. Start a session

1. Start Foundry VTT and load your world as GM.
2. The module connects automatically to the MCP server on port 4000.
3. Open Claude Code — the `foundry` MCP tools will be available immediately.

**Port conflict?** Change the port in both places:
- Foundry: **Settings → Module Settings → Foundry MCP Bridge → Bridge Port**
- `mcp.json`: add `"env": { "BRIDGE_PORT": "4001" }` to the foundry entry

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
| **Folders** | `folder-list`, `folder-create`, `folder-update`, `folder-delete` |
| **World** | `world-info` |
| **Game System** | `system-info` |

---

## Development

To build from source (not needed for normal use):

```bash
git clone https://github.com/LordSmogg/fvtt-claude-connector.git
cd fvtt-claude-connector
npm install
npm run build          # builds both packages
```

Point Claude Code at the local build instead of npx:

```json
{
  "mcpServers": {
    "foundry": {
      "command": "node",
      "args": ["C:/path/to/fvtt-claude-connector/mcp-server/dist/index.js"]
    }
  }
}
```

Watch mode:
```bash
npm run dev --workspace=fvtt-claude-connector   # Foundry module
npm run dev --workspace=mcp-server              # MCP server
```

---

## Project structure

```
fvtt-claude-connector/
├── mcp-server/             Node.js MCP server (published to npm as foundry-mcp-bridge)
│   └── src/
│       ├── index.ts        Entry point — MCP stdio transport
│       ├── bridge.ts       WebSocket server, request/response correlation
│       └── tools/          One file per tool category
├── fvtt-claude-connector/  Foundry VTT module
│   ├── module.json         Foundry manifest
│   └── src/
│       ├── main.ts         Hooks, settings, setup guide
│       ├── bridge.ts       WebSocket client, message dispatch
│       └── handlers/       One file per document type
└── package.json            Workspace root
```
