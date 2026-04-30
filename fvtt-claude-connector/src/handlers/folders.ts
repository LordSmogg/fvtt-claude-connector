import type { FoundryBridgeClient } from "../bridge.js";

export function registerFolderHandlers(client: FoundryBridgeClient) {
  client.register("folder-list", async (params) => {
    const { type } = (params ?? {}) as { type?: string };
    let folders = game.folders!.contents;
    if (type) folders = folders.filter((f) => f.type === type);
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      parent: f.folder?.id ?? null,
      color: f.color,
      depth: f.depth,
    }));
  });

  client.register("folder-create", async (params) => {
    const { name, type, parent, color } = params as {
      name: string;
      type: string;
      parent?: string;
      color?: string;
    };

    const folder = await Folder.create({
      name,
      type,
      folder: parent ?? null,
      color: color ?? null,
    } as Parameters<typeof Folder.create>[0]);

    if (!folder) throw new Error("Failed to create folder");

    return {
      id: folder.id,
      name: folder.name,
      type: folder.type,
      parent: folder.folder?.id ?? null,
    };
  });
}
