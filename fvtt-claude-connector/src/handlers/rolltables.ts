import type { FoundryBridgeClient } from "../bridge.js";

function serializeTable(table: RollTable) {
  return {
    id: table.id,
    name: table.name,
    formula: table.formula,
    folder: table.folder?.id ?? null,
    replacement: table.replacement,
    results: table.results.map((r) => r.toObject()),
  };
}

export function registerRolltableHandlers(client: FoundryBridgeClient) {
  client.register("rolltable-list", async (params) => {
    const { name, folder } = (params ?? {}) as Record<string, string | undefined>;
    let tables = game.tables!.contents;
    if (name) tables = tables.filter((t) => t.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) tables = tables.filter((t) => t.folder?.id === folder);
    return tables.map((t) => ({ id: t.id, name: t.name, formula: t.formula }));
  });

  client.register("rolltable-get", async (params) => {
    const { id } = params as { id: string };
    const table = game.tables!.get(id);
    if (!table) throw new Error(`Roll table not found: ${id}`);
    return serializeTable(table);
  });

  client.register("rolltable-create", async (params) => {
    const data = params as Record<string, unknown>;
    const table = await RollTable.create(data as Parameters<typeof RollTable.create>[0]);
    if (!table) throw new Error("Failed to create roll table");
    return serializeTable(table);
  });

  client.register("rolltable-roll", async (params) => {
    const { id, displayChat = false } = params as { id: string; displayChat?: boolean };
    const table = game.tables!.get(id);
    if (!table) throw new Error(`Roll table not found: ${id}`);
    const result = await table.draw({ displayChat });
    return {
      roll: result.roll?.total,
      results: result.results.map((r) => ({
        text: r.text,
        type: r.type,
      })),
    };
  });
}
