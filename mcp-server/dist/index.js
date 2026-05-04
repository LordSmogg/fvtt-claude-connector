#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/bridge.ts
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
var REQUEST_TIMEOUT_MS = 3e4;
var PID_FILE = join(tmpdir(), "foundry-mcp-bridge.pid");
function killStalePid() {
  if (!existsSync(PID_FILE)) return;
  try {
    const stalePid = parseInt(readFileSync(PID_FILE, "utf8").trim(), 10);
    if (stalePid && stalePid !== process.pid) {
      try {
        process.kill(stalePid, "SIGTERM");
        console.error(`[bridge] Killed stale instance (PID ${stalePid})`);
      } catch {
      }
    }
  } catch {
  }
  try {
    unlinkSync(PID_FILE);
  } catch {
  }
}
function writePid() {
  try {
    writeFileSync(PID_FILE, String(process.pid), "utf8");
  } catch {
  }
}
function cleanupPid() {
  try {
    if (existsSync(PID_FILE)) {
      const pid = parseInt(readFileSync(PID_FILE, "utf8").trim(), 10);
      if (pid === process.pid) unlinkSync(PID_FILE);
    }
  } catch {
  }
}
var FoundryBridge = class {
  wss = null;
  client = null;
  pending = /* @__PURE__ */ new Map();
  port;
  constructor(port) {
    this.port = port;
    killStalePid();
    setTimeout(() => {
      writePid();
      this.startServer();
    }, 500);
    process.on("exit", cleanupPid);
    process.on("SIGTERM", () => {
      cleanupPid();
      process.exit(0);
    });
    process.on("SIGINT", () => {
      cleanupPid();
      process.exit(0);
    });
  }
  startServer() {
    const wss = new WebSocketServer({ port: this.port });
    this.wss = wss;
    wss.on("connection", (ws) => {
      console.error(`[bridge] Foundry module connected`);
      this.client = ws;
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleResponse(msg);
        } catch {
          console.error("[bridge] Failed to parse message from Foundry");
        }
      });
      ws.on("close", () => {
        console.error("[bridge] Foundry module disconnected");
        if (this.client === ws) this.client = null;
      });
      ws.on("error", (err) => {
        console.error("[bridge] WebSocket error:", err.message);
      });
    });
    wss.on("listening", () => {
      console.error(`[bridge] Listening for Foundry module on port ${this.port}`);
    });
    wss.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[bridge] Port ${this.port} still in use \u2014 retrying in 5s...`
        );
        wss.close();
        this.wss = null;
        setTimeout(() => this.startServer(), 5e3);
      } else {
        console.error("[bridge] WebSocket server error:", err.message);
      }
    });
  }
  isConnected() {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }
  async call(method, params) {
    if (!this.isConnected()) {
      throw new Error(
        "Foundry module is not connected. Make sure the foundry-mcp-bridge module is enabled and Foundry is running."
      );
    }
    const id = randomUUID();
    const request = { id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve,
        reject,
        timeout
      });
      this.client.send(JSON.stringify(request));
    });
  }
  handleResponse(msg) {
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(msg.id);
    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.result);
    }
  }
  close() {
    cleanupPid();
    this.wss?.close();
  }
};

// src/tools/actors.ts
var actorTools = [
  {
    name: "actor-list",
    description: "List all actors in the world. Optionally filter by type or name.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by actor type (e.g. 'character', 'npc')" },
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" }
      }
    }
  },
  {
    name: "actor-get",
    description: "Get a single actor by ID, including all system data and embedded items.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The actor's ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "actor-create",
    description: "Create a new actor. Pass arbitrary system data for the active game system.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", description: "Actor type for the active game system (e.g. 'character', 'npc')" },
        system: { type: "object", description: "System-specific data \u2014 pass through whatever the game system uses" },
        img: { type: "string", description: "Image path" },
        folder: { type: "string", description: "Folder ID" },
        prototypeToken: { type: "object", description: "Token prototype settings" }
      },
      required: ["name", "type"]
    }
  },
  {
    name: "actor-update",
    description: "Update an existing actor. Only the fields you provide will be changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        system: { type: "object", description: "System-specific data to update (supports dot-notation keys)" },
        img: { type: "string" },
        folder: { type: "string", description: "Move to a different folder by ID (use folder-list to find IDs)" },
        prototypeToken: { type: "object" }
      },
      required: ["id"]
    }
  },
  {
    name: "actor-delete",
    description: "Delete an actor by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  }
];
async function handleActorTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/items.ts
var itemTools = [
  {
    name: "item-list",
    description: "List all world-level items (not embedded in actors). Optionally filter by type or name.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by item type" },
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" }
      }
    }
  },
  {
    name: "item-get",
    description: "Get a single world-level item by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "item-create",
    description: "Create a new world-level item. Always call system-info first to get valid item types and field names for the active game system. Use the dedicated system fields for structured data (availability, price, page, etc.) rather than duplicating them in the description HTML.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", description: "Item type for the active game system (e.g. 'mod', 'gear', 'spell')" },
        system: { type: "object", description: "System-specific item data. Use system-info to find valid fields." },
        img: { type: "string" },
        folder: { type: "string" }
      },
      required: ["name", "type"]
    }
  },
  {
    name: "item-update",
    description: "Update a world-level item.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        system: { type: "object" },
        img: { type: "string" },
        folder: { type: "string", description: "Move to a different folder by ID (use folder-list to find IDs)" }
      },
      required: ["id"]
    }
  },
  {
    name: "item-delete",
    description: "Delete a world-level item by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "actor-item-list",
    description: "List all items embedded in an actor (the actor's inventory/sheet items).",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        type: { type: "string", description: "Filter by item type" }
      },
      required: ["actorId"]
    }
  },
  {
    name: "actor-item-add",
    description: "Add an item to an actor. Either provide a worldItemId to copy a world item, or provide name+type+system to create a new embedded item directly. Use dedicated system fields for structured data rather than duplicating them in description HTML.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        worldItemId: { type: "string", description: "ID of an existing world item to copy onto the actor" },
        name: { type: "string", description: "Name of a new item to create (used when worldItemId is not provided)" },
        type: { type: "string" },
        system: { type: "object" },
        img: { type: "string" }
      },
      required: ["actorId"]
    }
  },
  {
    name: "actor-item-update",
    description: "Update an item embedded in an actor.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        itemId: { type: "string" },
        name: { type: "string" },
        system: { type: "object" },
        img: { type: "string" }
      },
      required: ["actorId", "itemId"]
    }
  },
  {
    name: "actor-item-remove",
    description: "Remove an embedded item from an actor.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        itemId: { type: "string" }
      },
      required: ["actorId", "itemId"]
    }
  }
];
async function handleItemTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/scenes.ts
var sceneTools = [
  {
    name: "scene-list",
    description: "List all scenes in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" }
      }
    }
  },
  {
    name: "scene-get",
    description: "Get a scene by ID, including its tokens, walls, and lights.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "scene-create",
    description: "Create a new scene.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        gridSize: { type: "number", description: "Grid size in pixels" },
        gridType: { type: "number", description: "0=gridless, 1=square, 2=hex rows, 3=hex columns" },
        background: { type: "object", description: "Background image settings" },
        folder: { type: "string" }
      },
      required: ["name"]
    }
  },
  {
    name: "scene-update",
    description: "Update an existing scene's settings.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        gridSize: { type: "number" },
        background: { type: "object" },
        darkness: { type: "number", description: "Darkness level 0-1" },
        tokenVision: { type: "boolean" },
        fogExploration: { type: "boolean" },
        folder: { type: "string", description: "Move to a different folder by ID (use folder-list to find IDs)" }
      },
      required: ["id"]
    }
  },
  {
    name: "token-place",
    description: "Place a token for an actor on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        actorId: { type: "string" },
        x: { type: "number", description: "X position in pixels" },
        y: { type: "number", description: "Y position in pixels" },
        name: { type: "string", description: "Override token name" },
        width: { type: "number", description: "Token width in grid units" },
        height: { type: "number", description: "Token height in grid units" },
        hidden: { type: "boolean" }
      },
      required: ["sceneId", "actorId", "x", "y"]
    }
  },
  {
    name: "wall-create",
    description: "Create one or more walls on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        walls: {
          type: "array",
          description: "Array of wall objects",
          items: {
            type: "object",
            properties: {
              c: {
                type: "array",
                description: "Coordinates [x0,y0,x1,y1]",
                items: { type: "number" }
              },
              move: { type: "number", description: "Movement restriction: 0=none, 1=normal, 2=limited" },
              sense: { type: "number", description: "Sight restriction: 0=none, 1=normal, 2=limited" },
              door: { type: "number", description: "Door type: 0=none, 1=door, 2=secret" }
            },
            required: ["c"]
          }
        }
      },
      required: ["sceneId", "walls"]
    }
  },
  {
    name: "light-create",
    description: "Create one or more light sources on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        lights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              config: {
                type: "object",
                description: "Light configuration (bright, dim, color, angle, etc.)"
              }
            },
            required: ["x", "y"]
          }
        }
      },
      required: ["sceneId", "lights"]
    }
  }
];
async function handleSceneTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/journal.ts
var journalTools = [
  {
    name: "journal-list",
    description: "List all journal entries in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" }
      }
    }
  },
  {
    name: "journal-get",
    description: "Get a journal entry by ID, including all its pages.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "journal-create",
    description: "Create a new journal entry, optionally with an initial page.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        folder: { type: "string" },
        initialPage: {
          type: "object",
          description: "Optional first page to create with the entry",
          properties: {
            name: { type: "string" },
            type: { type: "string", description: "Page type: 'text', 'image', 'pdf', 'video'" },
            text: { type: "object", description: "Text content object with 'content' (HTML) field" },
            src: { type: "string", description: "Image/PDF/video source path" }
          }
        }
      },
      required: ["name"]
    }
  },
  {
    name: "journal-update",
    description: "Update a journal entry's metadata (name, folder).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        folder: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "journal-page-create",
    description: "Add a new page to an existing journal entry.",
    inputSchema: {
      type: "object",
      properties: {
        journalId: { type: "string" },
        name: { type: "string" },
        type: { type: "string", description: "Page type: 'text', 'image', 'pdf', 'video'" },
        text: {
          type: "object",
          description: "For text pages: { content: '<p>HTML content</p>', format: 1 }"
        },
        src: { type: "string", description: "For image/pdf/video pages: file path or URL" },
        sort: { type: "number", description: "Sort order" }
      },
      required: ["journalId", "name", "type"]
    }
  },
  {
    name: "journal-page-update",
    description: "Update a page within a journal entry.",
    inputSchema: {
      type: "object",
      properties: {
        journalId: { type: "string" },
        pageId: { type: "string" },
        name: { type: "string" },
        text: { type: "object" },
        src: { type: "string" }
      },
      required: ["journalId", "pageId"]
    }
  }
];
async function handleJournalTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/compendium.ts
var compendiumTools = [
  {
    name: "compendium-list",
    description: "List all available compendium packs in the world.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Filter by document type: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro', 'Cards', 'Playlist'"
        }
      }
    }
  },
  {
    name: "compendium-search",
    description: "Search for documents within a compendium pack.",
    inputSchema: {
      type: "object",
      properties: {
        packId: { type: "string", description: "The compendium pack ID (e.g. 'dnd5e.heroes')" },
        query: { type: "string", description: "Name search (partial match)" },
        type: { type: "string", description: "Filter by document subtype" }
      },
      required: ["packId"]
    }
  },
  {
    name: "compendium-import",
    description: "Import a document from a compendium pack into the world.",
    inputSchema: {
      type: "object",
      properties: {
        packId: { type: "string", description: "The compendium pack ID" },
        documentId: { type: "string", description: "The document ID within the pack" },
        folder: { type: "string", description: "Destination folder ID" }
      },
      required: ["packId", "documentId"]
    }
  }
];
async function handleCompendiumTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/combat.ts
var combatTools = [
  {
    name: "combat-create",
    description: "Create a new combat encounter, optionally in a specific scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string", description: "Scene to create the encounter in (defaults to active scene)" }
      }
    }
  },
  {
    name: "combat-get",
    description: "Get the current or a specific combat encounter, including all combatants.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Combat ID (omit to get the active combat)" }
      }
    }
  },
  {
    name: "combat-add-combatant",
    description: "Add a token as a combatant to an encounter.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" },
        tokenId: { type: "string" },
        sceneId: { type: "string", description: "Scene the token is in (defaults to active scene)" },
        initiative: { type: "number", description: "Set initiative directly (optional)" }
      },
      required: ["tokenId"]
    }
  },
  {
    name: "combat-set-initiative",
    description: "Set the initiative value for a combatant.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string" },
        combatantId: { type: "string" },
        initiative: { type: "number" }
      },
      required: ["combatantId", "initiative"]
    }
  },
  {
    name: "combat-next-turn",
    description: "Advance the combat to the next turn.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" }
      }
    }
  },
  {
    name: "combat-start",
    description: "Start a combat encounter (rolls initiative order if not set).",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" }
      }
    }
  },
  {
    name: "combat-end",
    description: "End and delete a combat encounter.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" }
      }
    }
  }
];
async function handleCombatTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/rolltables.ts
var rolltableTools = [
  {
    name: "rolltable-list",
    description: "List all roll tables in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string" }
      }
    }
  },
  {
    name: "rolltable-get",
    description: "Get a roll table by ID, including all its results.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "rolltable-create",
    description: "Create a new roll table.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        formula: { type: "string", description: "Roll formula (e.g. '1d20')" },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              range: {
                type: "array",
                description: "Numeric range [min, max]",
                items: { type: "number" }
              },
              text: { type: "string", description: "Result text" },
              type: { type: "number", description: "0=text, 1=document, 2=compendium" }
            },
            required: ["range", "text"]
          }
        },
        folder: { type: "string" },
        replacement: { type: "boolean", description: "Draw with replacement (default true)" }
      },
      required: ["name", "results"]
    }
  },
  {
    name: "rolltable-roll",
    description: "Roll on a table and get the result.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        displayChat: { type: "boolean", description: "Show result in chat (default false)" }
      },
      required: ["id"]
    }
  }
];
async function handleRolltableTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/chat.ts
var chatTools = [
  {
    name: "chat-send",
    description: "Send a message to the Foundry chat.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Message content (supports HTML)" },
        type: {
          type: "string",
          enum: ["ooc", "ic", "emote", "whisper", "roll"],
          description: "Message type (default: 'ooc' = out of character)"
        },
        speaker: {
          type: "object",
          description: "Speaker identity",
          properties: {
            alias: { type: "string", description: "Display name" },
            actor: { type: "string", description: "Actor ID" },
            token: { type: "string", description: "Token ID" }
          }
        },
        whisperTo: {
          type: "array",
          description: "Array of user IDs to whisper to",
          items: { type: "string" }
        }
      },
      required: ["content"]
    }
  }
];
async function handleChatTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/folders.ts
var folderTools = [
  {
    name: "folder-list",
    description: "List folders, optionally filtered by the document type they contain.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Document type: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro', 'Cards', 'Playlist'"
        }
      }
    }
  },
  {
    name: "folder-create",
    description: "Create a new folder to organize documents.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: {
          type: "string",
          description: "Document type this folder contains: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro'"
        },
        parent: { type: "string", description: "Parent folder ID (for nested folders)" },
        color: { type: "string", description: "Hex color for the folder (e.g. '#ff0000')" }
      },
      required: ["name", "type"]
    }
  },
  {
    name: "folder-update",
    description: "Update an existing folder \u2014 rename it, move it to a different parent, or change its color.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Folder ID" },
        name: { type: "string", description: "New name" },
        parent: { type: "string", description: "New parent folder ID (use null to move to root)" },
        color: { type: "string", description: "Hex color (e.g. '#ff0000')" }
      },
      required: ["id"]
    }
  },
  {
    name: "folder-delete",
    description: "Delete a folder. By default contents are moved to root; set deleteContents to true to delete everything inside as well.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Folder ID" },
        deleteContents: { type: "boolean", description: "If true, also deletes all documents inside the folder. Defaults to false (contents moved to root)." }
      },
      required: ["id"]
    }
  }
];
async function handleFolderTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/world.ts
var worldTools = [
  {
    name: "world-info",
    description: "Get information about the current Foundry world: name, system, active users, active scene, and world settings.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];
async function handleWorldTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/tools/system.ts
var systemTools = [
  {
    name: "system-info",
    description: "Get information about the active game system: ID, title, version, supported actor/item types, and the full data model schema. Use this to understand what types and fields are valid for the current game system before creating or updating actors and items.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];
async function handleSystemTool(name, args, bridge) {
  return bridge.call(name, args);
}

// src/index.ts
var BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT ?? "4000", 10);
var allTools = [
  ...actorTools,
  ...itemTools,
  ...sceneTools,
  ...journalTools,
  ...compendiumTools,
  ...combatTools,
  ...rolltableTools,
  ...chatTools,
  ...folderTools,
  ...worldTools,
  ...systemTools
];
var toolHandlers = new Map([
  ...actorTools.map((t) => [t.name, handleActorTool]),
  ...itemTools.map((t) => [t.name, handleItemTool]),
  ...sceneTools.map((t) => [t.name, handleSceneTool]),
  ...journalTools.map((t) => [t.name, handleJournalTool]),
  ...compendiumTools.map((t) => [t.name, handleCompendiumTool]),
  ...combatTools.map((t) => [t.name, handleCombatTool]),
  ...rolltableTools.map((t) => [t.name, handleRolltableTool]),
  ...chatTools.map((t) => [t.name, handleChatTool]),
  ...folderTools.map((t) => [t.name, handleFolderTool]),
  ...worldTools.map((t) => [t.name, handleWorldTool]),
  ...systemTools.map((t) => [t.name, handleSystemTool])
]);
async function main() {
  const bridge = new FoundryBridge(BRIDGE_PORT);
  const server = new Server(
    { name: "fvtt-claude-connector", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers.get(name);
    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true
      };
    }
    try {
      const result = await handler(name, args ?? {}, bridge);
      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
      };
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp] FVTT Claude Connector running (Foundry bridge port: ${BRIDGE_PORT})`);
}
main().catch((err) => {
  console.error("[mcp] Fatal error:", err);
  process.exit(1);
});
