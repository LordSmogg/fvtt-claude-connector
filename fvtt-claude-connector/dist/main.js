// src/bridge.ts
var RECONNECT_DELAY_MS = 5e3;
var FoundryBridgeClient = class {
  ws = null;
  handlers = /* @__PURE__ */ new Map();
  url;
  shouldReconnect = true;
  constructor(host, port) {
    this.url = `ws://${host}:${port}`;
  }
  register(method, handler) {
    this.handlers.set(method, handler);
  }
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    console.log(`[MCP Bridge] Connecting to ${this.url}...`);
    ui.notifications?.info(game.i18n.localize("FMCPB.Status.Connecting"));
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      console.log("[MCP Bridge] Connected to MCP server");
      ui.notifications?.info(game.i18n.localize("FMCPB.Status.Connected"));
    });
    ws.addEventListener("message", (event) => {
      this.handleMessage(event.data).catch((err) => {
        console.error("[MCP Bridge] Error handling message:", err);
      });
    });
    ws.addEventListener("close", () => {
      console.log(`[MCP Bridge] Disconnected from MCP server`);
      ui.notifications?.warn(game.i18n.localize("FMCPB.Status.Disconnected"));
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      }
    });
    ws.addEventListener("error", () => {
      console.error(
        `[MCP Bridge] Connection error. Is the MCP server running at ${this.url}?`
      );
    });
  }
  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }
  async handleMessage(raw) {
    let request;
    try {
      request = JSON.parse(raw);
    } catch {
      console.error("[MCP Bridge] Received invalid JSON");
      return;
    }
    const handler = this.handlers.get(request.method);
    const response = { id: request.id };
    if (!handler) {
      response.error = `Unknown method: ${request.method}`;
    } else {
      try {
        response.result = await handler(request.params);
      } catch (err) {
        response.error = err instanceof Error ? err.message : String(err);
      }
    }
    this.ws?.send(JSON.stringify(response));
  }
};

// src/handlers/actors.ts
function serializeActor(actor) {
  return {
    id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    folder: actor.folder?.id ?? null,
    system: actor.system,
    prototypeToken: actor.prototypeToken?.toObject() ?? null,
    items: actor.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    })),
    effects: actor.effects.map((e) => e.toObject())
  };
}
function registerActorHandlers(client) {
  client.register("actor-list", async (params) => {
    const { type, name, folder } = params ?? {};
    let actors = game.actors.contents;
    if (type) actors = actors.filter((a) => a.type === type);
    if (name) actors = actors.filter((a) => a.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) actors = actors.filter((a) => a.folder?.id === folder);
    return actors.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      img: a.img,
      folder: a.folder?.id ?? null
    }));
  });
  client.register("actor-get", async (params) => {
    const { id } = params;
    const actor = game.actors.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    return serializeActor(actor);
  });
  client.register("actor-create", async (params) => {
    const data = params;
    const actor = await Actor.create(data);
    if (!actor) throw new Error("Failed to create actor");
    return serializeActor(actor);
  });
  client.register("actor-update", async (params) => {
    const { id, ...data } = params;
    const actor = game.actors.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    await actor.update(data);
    return serializeActor(actor);
  });
  client.register("actor-delete", async (params) => {
    const { id } = params;
    const actor = game.actors.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    await actor.delete();
    return { success: true, id };
  });
}

// src/handlers/items.ts
function serializeItem(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    img: item.img,
    folder: item.folder?.id ?? null,
    system: item.system,
    effects: item.effects.map((e) => e.toObject())
  };
}
function registerItemHandlers(client) {
  client.register("item-list", async (params) => {
    const { type, name, folder } = params ?? {};
    let items = game.items.contents;
    if (type) items = items.filter((i) => i.type === type);
    if (name) items = items.filter((i) => i.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) items = items.filter((i) => i.folder?.id === folder);
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      img: i.img,
      folder: i.folder?.id ?? null
    }));
  });
  client.register("item-get", async (params) => {
    const { id } = params;
    const item = game.items.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    return serializeItem(item);
  });
  client.register("item-create", async (params) => {
    const data = params;
    const item = await Item.create(data);
    if (!item) throw new Error("Failed to create item");
    return serializeItem(item);
  });
  client.register("item-update", async (params) => {
    const { id, ...data } = params;
    const item = game.items.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    await item.update(data);
    return serializeItem(item);
  });
  client.register("item-delete", async (params) => {
    const { id } = params;
    const item = game.items.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    await item.delete();
    return { success: true, id };
  });
  client.register("actor-item-list", async (params) => {
    const { actorId, type } = params;
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    let items = actor.items.contents;
    if (type) items = items.filter((i) => i.type === type);
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      img: i.img,
      system: i.system
    }));
  });
  client.register("actor-item-add", async (params) => {
    const { actorId, worldItemId, ...itemData } = params;
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    let dataToCreate;
    if (worldItemId) {
      const worldItem = game.items.get(worldItemId);
      if (!worldItem) throw new Error(`World item not found: ${worldItemId}`);
      dataToCreate = worldItem.toObject();
    } else {
      dataToCreate = itemData;
    }
    const [created] = await actor.createEmbeddedDocuments("Item", [
      dataToCreate
    ]);
    if (!created) throw new Error("Failed to add item to actor");
    return {
      id: created.id,
      name: created.name,
      type: created.type,
      system: created.system
    };
  });
  client.register("actor-item-update", async (params) => {
    const { actorId, itemId, ...data } = params;
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    const item = actor.items.get(itemId);
    if (!item) throw new Error(`Item not found on actor: ${itemId}`);
    await actor.updateEmbeddedDocuments("Item", [
      { _id: itemId, ...data }
    ]);
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      system: item.system
    };
  });
  client.register("actor-item-remove", async (params) => {
    const { actorId, itemId } = params;
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    if (!actor.items.has(itemId)) throw new Error(`Item not found on actor: ${itemId}`);
    await actor.deleteEmbeddedDocuments("Item", [itemId]);
    return { success: true, actorId, itemId };
  });
}

// src/handlers/scenes.ts
function serializeScene(scene, full = false) {
  const base = {
    id: scene.id,
    name: scene.name,
    active: scene.active,
    folder: scene.folder?.id ?? null,
    width: scene.width,
    height: scene.height,
    gridSize: scene.grid.size,
    gridType: scene.grid.type,
    darkness: scene.environment.darknessLevel,
    tokenVision: scene.tokenVision,
    fogExploration: scene.fogExploration,
    background: scene.background
  };
  if (!full) return base;
  return {
    ...base,
    tokens: scene.tokens.map((t) => ({
      id: t.id,
      name: t.name,
      actorId: t.actorId,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      hidden: t.hidden
    })),
    walls: scene.walls.map((w) => w.toObject()),
    lights: scene.lights.map((l) => l.toObject())
  };
}
function registerSceneHandlers(client) {
  client.register("scene-list", async (params) => {
    const { name } = params ?? {};
    let scenes = game.scenes.contents;
    if (name) scenes = scenes.filter((s) => s.name?.toLowerCase().includes(name.toLowerCase()));
    return scenes.map((s) => serializeScene(s));
  });
  client.register("scene-get", async (params) => {
    const { id } = params;
    const scene = game.scenes.get(id);
    if (!scene) throw new Error(`Scene not found: ${id}`);
    return serializeScene(scene, true);
  });
  client.register("scene-create", async (params) => {
    const data = params;
    const scene = await Scene.create(data);
    if (!scene) throw new Error("Failed to create scene");
    return serializeScene(scene);
  });
  client.register("scene-update", async (params) => {
    const { id, ...data } = params;
    const scene = game.scenes.get(id);
    if (!scene) throw new Error(`Scene not found: ${id}`);
    await scene.update(data);
    return serializeScene(scene);
  });
  client.register("token-place", async (params) => {
    const { sceneId, actorId, x, y, ...rest } = params;
    const scene = game.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    const tokenData = {
      ...actor.prototypeToken?.toObject(),
      actorId,
      x,
      y,
      ...rest
    };
    const [token] = await scene.createEmbeddedDocuments("Token", [
      tokenData
    ]);
    if (!token) throw new Error("Failed to place token");
    return {
      id: token.id,
      name: token.name,
      x: token.x,
      y: token.y
    };
  });
  client.register("wall-create", async (params) => {
    const { sceneId, walls } = params;
    const scene = game.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const created = await scene.createEmbeddedDocuments(
      "Wall",
      walls
    );
    return created.map((w) => w.toObject());
  });
  client.register("light-create", async (params) => {
    const { sceneId, lights } = params;
    const scene = game.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const created = await scene.createEmbeddedDocuments(
      "AmbientLight",
      lights
    );
    return created.map((l) => l.toObject());
  });
}

// src/handlers/journal.ts
function serializeJournalEntry(entry, includePages = true) {
  return {
    id: entry.id,
    name: entry.name,
    folder: entry.folder?.id ?? null,
    pages: includePages ? entry.pages.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      sort: p.sort,
      text: p.text,
      src: p.src
    })) : void 0
  };
}
function registerJournalHandlers(client) {
  client.register("journal-list", async (params) => {
    const { name, folder } = params ?? {};
    let entries = game.journal.contents;
    if (name) entries = entries.filter((e) => e.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) entries = entries.filter((e) => e.folder?.id === folder);
    return entries.map((e) => serializeJournalEntry(e, false));
  });
  client.register("journal-get", async (params) => {
    const { id } = params;
    const entry = game.journal.get(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    return serializeJournalEntry(entry, true);
  });
  client.register("journal-create", async (params) => {
    const { name, folder, initialPage } = params;
    const entryData = { name, folder };
    if (initialPage) {
      entryData.pages = [{ ...initialPage, sort: 100 }];
    }
    const entry = await JournalEntry.create(
      entryData
    );
    if (!entry) throw new Error("Failed to create journal entry");
    return serializeJournalEntry(entry);
  });
  client.register("journal-update", async (params) => {
    const { id, ...data } = params;
    const entry = game.journal.get(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    await entry.update(data);
    return serializeJournalEntry(entry, false);
  });
  client.register("journal-page-create", async (params) => {
    const { journalId, ...pageData } = params;
    const entry = game.journal.get(journalId);
    if (!entry) throw new Error(`Journal entry not found: ${journalId}`);
    const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [
      pageData
    ]);
    if (!page) throw new Error("Failed to create journal page");
    return {
      id: page.id,
      name: page.name,
      type: page.type
    };
  });
  client.register("journal-page-update", async (params) => {
    const { journalId, pageId, ...data } = params;
    const entry = game.journal.get(journalId);
    if (!entry) throw new Error(`Journal entry not found: ${journalId}`);
    await entry.updateEmbeddedDocuments("JournalEntryPage", [
      { _id: pageId, ...data }
    ]);
    const page = entry.pages.get(pageId);
    return {
      id: page?.id,
      name: page?.name,
      type: page?.type
    };
  });
}

// src/handlers/compendium.ts
function registerCompendiumHandlers(client) {
  client.register("compendium-list", async (params) => {
    const { type } = params ?? {};
    let packs = game.packs.contents;
    if (type) packs = packs.filter((p) => p.documentName === type);
    return packs.map((p) => ({
      id: p.collection,
      title: p.title,
      documentType: p.documentName,
      packageName: p.metadata.packageName,
      size: p.index.size
    }));
  });
  client.register("compendium-search", async (params) => {
    const { packId, query, type } = params;
    const pack = game.packs.get(packId);
    if (!pack) throw new Error(`Compendium pack not found: ${packId}`);
    await pack.getIndex();
    let entries = pack.index.contents;
    if (query) {
      const q = query.toLowerCase();
      entries = entries.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (type) {
      entries = entries.filter((e) => e.type === type);
    }
    return entries.slice(0, 100).map((e) => ({
      id: e._id,
      name: e.name,
      type: e.type,
      img: e.img,
      packId
    }));
  });
  client.register("compendium-import", async (params) => {
    const { packId, documentId, folder } = params;
    const pack = game.packs.get(packId);
    if (!pack) throw new Error(`Compendium pack not found: ${packId}`);
    const doc = await pack.getDocument(documentId);
    if (!doc) throw new Error(`Document not found in pack: ${documentId}`);
    const imported = await doc.constructor.create(
      { ...doc.toObject(), folder }
    );
    if (!imported) throw new Error("Failed to import document");
    return {
      id: imported.id,
      name: imported.name,
      type: imported.type
    };
  });
}

// src/handlers/combat.ts
function serializeCombat(combat) {
  return {
    id: combat.id,
    scene: combat.scene?.id ?? null,
    round: combat.round,
    turn: combat.turn,
    started: combat.started,
    combatants: combat.combatants.map((c) => ({
      id: c.id,
      name: c.name,
      tokenId: c.tokenId,
      actorId: c.actorId,
      initiative: c.initiative,
      hidden: c.hidden,
      defeated: c.isDefeated
    }))
  };
}
function getActiveCombat(id) {
  if (id) {
    const combat = game.combats.get(id);
    if (!combat) throw new Error(`Combat not found: ${id}`);
    return combat;
  }
  const active = game.combat;
  if (!active) throw new Error("No active combat encounter");
  return active;
}
function registerCombatHandlers(client) {
  client.register("combat-create", async (params) => {
    const { sceneId } = params ?? {};
    const scene = sceneId ? game.scenes.get(sceneId) : game.scenes.active;
    const combat = await Combat.create({ scene: scene?.id });
    if (!combat) throw new Error("Failed to create combat");
    return serializeCombat(combat);
  });
  client.register("combat-get", async (params) => {
    const { id } = params ?? {};
    return serializeCombat(getActiveCombat(id));
  });
  client.register("combat-add-combatant", async (params) => {
    const { combatId, tokenId, sceneId, initiative } = params;
    const combat = getActiveCombat(combatId);
    const scene = sceneId ? game.scenes.get(sceneId) : game.scenes.active;
    const token = scene?.tokens.get(tokenId);
    if (!token) throw new Error(`Token not found: ${tokenId}`);
    const combatantData = {
      tokenId,
      sceneId: scene?.id,
      actorId: token.actorId
    };
    if (initiative !== void 0) combatantData.initiative = initiative;
    const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
      combatantData
    ]);
    return {
      id: combatant.id,
      name: combatant.name,
      initiative: combatant.initiative
    };
  });
  client.register("combat-set-initiative", async (params) => {
    const { combatId, combatantId, initiative } = params;
    const combat = getActiveCombat(combatId);
    await combat.setInitiative(combatantId, initiative);
    return serializeCombat(combat);
  });
  client.register("combat-next-turn", async (params) => {
    const { combatId } = params ?? {};
    const combat = getActiveCombat(combatId);
    await combat.nextTurn();
    return serializeCombat(combat);
  });
  client.register("combat-start", async (params) => {
    const { combatId } = params ?? {};
    const combat = getActiveCombat(combatId);
    await combat.startCombat();
    return serializeCombat(combat);
  });
  client.register("combat-end", async (params) => {
    const { combatId } = params ?? {};
    const combat = getActiveCombat(combatId);
    const id = combat.id;
    await combat.delete();
    return { success: true, id };
  });
}

// src/handlers/rolltables.ts
function serializeTable(table) {
  return {
    id: table.id,
    name: table.name,
    formula: table.formula,
    folder: table.folder?.id ?? null,
    replacement: table.replacement,
    results: table.results.map((r) => r.toObject())
  };
}
function registerRolltableHandlers(client) {
  client.register("rolltable-list", async (params) => {
    const { name, folder } = params ?? {};
    let tables = game.tables.contents;
    if (name) tables = tables.filter((t) => t.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) tables = tables.filter((t) => t.folder?.id === folder);
    return tables.map((t) => ({ id: t.id, name: t.name, formula: t.formula }));
  });
  client.register("rolltable-get", async (params) => {
    const { id } = params;
    const table = game.tables.get(id);
    if (!table) throw new Error(`Roll table not found: ${id}`);
    return serializeTable(table);
  });
  client.register("rolltable-create", async (params) => {
    const data = params;
    const table = await RollTable.create(data);
    if (!table) throw new Error("Failed to create roll table");
    return serializeTable(table);
  });
  client.register("rolltable-roll", async (params) => {
    const { id, displayChat = false } = params;
    const table = game.tables.get(id);
    if (!table) throw new Error(`Roll table not found: ${id}`);
    const result = await table.draw({ displayChat });
    return {
      roll: result.roll?.total,
      results: result.results.map((r) => ({
        text: r.text,
        type: r.type
      }))
    };
  });
}

// src/handlers/chat.ts
var CHAT_TYPE_MAP = {
  ooc: CONST.CHAT_MESSAGE_STYLES.OOC,
  ic: CONST.CHAT_MESSAGE_STYLES.IC,
  emote: CONST.CHAT_MESSAGE_STYLES.EMOTE,
  whisper: CONST.CHAT_MESSAGE_STYLES.OTHER,
  roll: CONST.CHAT_MESSAGE_STYLES.ROLL
};
function registerChatHandlers(client) {
  client.register("chat-send", async (params) => {
    const {
      content,
      type = "ooc",
      speaker,
      whisperTo
    } = params;
    const messageData = {
      content,
      style: CHAT_TYPE_MAP[type] ?? CONST.CHAT_MESSAGE_STYLES.OOC
    };
    if (speaker) {
      messageData.speaker = {
        alias: speaker.alias,
        actor: speaker.actor,
        token: speaker.token,
        scene: game.scenes?.active?.id
      };
    }
    if (whisperTo?.length) {
      messageData.whisper = whisperTo;
    }
    const message = await ChatMessage.create(
      messageData
    );
    if (!message) throw new Error("Failed to send chat message");
    return { id: message.id, content: message.content };
  });
}

// src/handlers/folders.ts
function registerFolderHandlers(client) {
  client.register("folder-list", async (params) => {
    const { type } = params ?? {};
    let folders = game.folders.contents;
    if (type) folders = folders.filter((f) => f.type === type);
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      parent: f.folder?.id ?? null,
      color: f.color,
      depth: f.depth
    }));
  });
  client.register("folder-create", async (params) => {
    const { name, type, parent, color } = params;
    const folder = await Folder.create({
      name,
      type,
      folder: parent ?? null,
      color: color ?? null
    });
    if (!folder) throw new Error("Failed to create folder");
    return {
      id: folder.id,
      name: folder.name,
      type: folder.type,
      parent: folder.folder?.id ?? null
    };
  });
}

// src/handlers/world.ts
function registerWorldHandlers(client) {
  client.register("world-info", async () => {
    const world = game.world;
    const activeScene = game.scenes?.active;
    return {
      id: world.id,
      title: world.title,
      description: world.description,
      system: world.system,
      coreVersion: game.version,
      worldVersion: world.version,
      activeScene: activeScene ? { id: activeScene.id, name: activeScene.name } : null,
      users: game.users?.contents.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        active: u.active,
        isGM: u.isGM
      })) ?? [],
      actors: game.actors?.size ?? 0,
      scenes: game.scenes?.size ?? 0,
      items: game.items?.size ?? 0,
      journal: game.journal?.size ?? 0,
      tables: game.tables?.size ?? 0
    };
  });
}

// src/handlers/system.ts
function registerSystemHandlers(client) {
  client.register("system-info", async () => {
    const system = game.system;
    const documentTypes = {};
    const model = {};
    for (const docType of ["Actor", "Item"]) {
      const types = game.documentTypes?.[docType] ?? [];
      documentTypes[docType] = types.filter((t) => t !== "base");
      const typeModels = {};
      for (const typeName of documentTypes[docType]) {
        try {
          const cls = CONFIG[docType]?.dataModels?.[typeName];
          if (cls?.schema) {
            typeModels[typeName] = cls.schema.toObject?.() ?? {};
          }
        } catch {
        }
      }
      if (Object.keys(typeModels).length) {
        model[docType] = typeModels;
      }
    }
    return {
      id: system.id,
      title: system.title,
      version: system.version,
      documentTypes,
      model,
      // Include the raw template data which describes the data structure
      template: game.system.template ?? null
    };
  });
}

// src/setup-guide.ts
var SNIPPET = JSON.stringify(
  { foundry: { command: "npx", args: ["-y", "foundry-mcp-bridge"] } },
  null,
  2
);
var FULL_FILE = JSON.stringify(
  { mcpServers: { foundry: { command: "npx", args: ["-y", "foundry-mcp-bridge"] } } },
  null,
  2
);
function buildHTML() {
  return `
<div style="font-size:13px;line-height:1.6;">

  <p>To let Claude talk to this Foundry world you need to add one entry to Claude's config file on your computer. Follow the three steps below.</p>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 1 \u2014 Find the Claude config file</h3>
  <p>Open the file at this path in a text editor (e.g. Notepad):</p>
  <ul>
    <li><strong>Windows:</strong> <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
    <li><strong>Mac:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
  </ul>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 2 \u2014 Add the Foundry entry</h3>

  <p><strong>If the file already has other connectors</strong>, find the <code>"mcpServers"</code> section and add this block inside it (with a comma after the previous entry):</p>
  <div style="position:relative;">
    <pre id="fmcpb-snippet" style="background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:4px;overflow-x:auto;font-size:12px;">${escapeHtml(SNIPPET)}</pre>
    <button class="fmcpb-copy" data-target="fmcpb-snippet" style="position:absolute;top:6px;right:6px;font-size:11px;padding:2px 8px;">Copy</button>
  </div>

  <p style="margin-top:12px;"><strong>If the file is empty or doesn't exist yet</strong>, paste this as the entire contents:</p>
  <div style="position:relative;">
    <pre id="fmcpb-full" style="background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:4px;overflow-x:auto;font-size:12px;">${escapeHtml(FULL_FILE)}</pre>
    <button class="fmcpb-copy" data-target="fmcpb-full" style="position:absolute;top:6px;right:6px;font-size:11px;padding:2px 8px;">Copy</button>
  </div>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 3 \u2014 Restart Claude</h3>
  <p>Fully quit and reopen the Claude app. The bridge will connect automatically the next time you open a world.</p>

  <hr/>

  <p style="color:#888;font-size:11px;">You can reopen this guide any time from the module settings.</p>

</div>`;
}
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var SetupGuideApp = class extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fmcpb-setup-guide",
      title: "Claude Connector \u2014 Setup Guide",
      width: 600,
      height: "auto",
      resizable: false
    });
  }
  async _renderInner(_data) {
    return $(buildHTML());
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".fmcpb-copy").on("click", (e) => {
      const targetId = e.currentTarget.dataset.target;
      const text = html.find(`#${targetId}`).text();
      navigator.clipboard.writeText(text).then(() => {
        ui.notifications.info("Copied to clipboard!");
      }).catch(() => {
        ui.notifications.warn("Could not copy \u2014 please select and copy the text manually.");
      });
    });
  }
};

// src/main.ts
var MODULE_ID = "fvtt-claude-connector";
var bridgeClient = null;
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "bridgeHost", {
    name: "FMCPB.Settings.BridgeHost.Name",
    hint: "FMCPB.Settings.BridgeHost.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "localhost"
  });
  game.settings.register(MODULE_ID, "bridgePort", {
    name: "FMCPB.Settings.BridgePort.Name",
    hint: "FMCPB.Settings.BridgePort.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 4e3
  });
  game.settings.register(MODULE_ID, "setupShown", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.registerMenu(MODULE_ID, "setupGuide", {
    name: "FMCPB.Settings.SetupGuide.Name",
    label: "FMCPB.Settings.SetupGuide.Label",
    hint: "FMCPB.Settings.SetupGuide.Hint",
    icon: "fas fa-book",
    type: SetupGuideApp,
    restricted: true
  });
});
Hooks.once("ready", () => {
  if (!game.user.isGM) {
    console.log(`[MCP Bridge] Skipping \u2014 not a GM user`);
    return;
  }
  const host = game.settings.get(MODULE_ID, "bridgeHost");
  const port = game.settings.get(MODULE_ID, "bridgePort");
  bridgeClient = new FoundryBridgeClient(host, port);
  registerActorHandlers(bridgeClient);
  registerItemHandlers(bridgeClient);
  registerSceneHandlers(bridgeClient);
  registerJournalHandlers(bridgeClient);
  registerCompendiumHandlers(bridgeClient);
  registerCombatHandlers(bridgeClient);
  registerRolltableHandlers(bridgeClient);
  registerChatHandlers(bridgeClient);
  registerFolderHandlers(bridgeClient);
  registerWorldHandlers(bridgeClient);
  registerSystemHandlers(bridgeClient);
  bridgeClient.connect();
  const setupShown = game.settings.get(MODULE_ID, "setupShown");
  if (!setupShown) {
    game.settings.set(MODULE_ID, "setupShown", true);
    setTimeout(() => new SetupGuideApp().render(true), 1500);
  }
});
