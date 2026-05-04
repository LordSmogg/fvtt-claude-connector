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

  client.register("folder-update", async (params) => {
    const { id, name, parent, color } = params as {
      id: string;
      name?: string;
      parent?: string | null;
      color?: string;
    };

    const folder = game.folders!.get(id);
    if (!folder) throw new Error(`Folder not found: ${id}`);

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (parent !== undefined) updates.folder = parent ?? null;
    if (color !== undefined) updates.color = color;

    await folder.update(updates);

    return {
      id: folder.id,
      name: folder.name,
      type: folder.type,
      parent: folder.folder?.id ?? null,
      color: folder.color,
    };
  });

  client.register("folder-delete", async (params) => {
    const { id, deleteContents = false } = params as {
      id: string;
      deleteContents?: boolean;
    };

    const folder = game.folders!.get(id);
    if (!folder) throw new Error(`Folder not found: ${id}`);

    await folder.delete({ deleteSubfolders: deleteContents, deleteContents });

    return { deleted: id };
  });
}
