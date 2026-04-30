import type { FoundryBridgeClient } from "../bridge.js";

export function registerCompendiumHandlers(client: FoundryBridgeClient) {
  client.register("compendium-list", async (params) => {
    const { type } = (params ?? {}) as { type?: string };
    let packs = game.packs.contents;
    if (type) packs = packs.filter((p) => p.documentName === type);
    return packs.map((p) => ({
      id: p.collection,
      title: p.title,
      documentType: p.documentName,
      packageName: p.metadata.packageName,
      size: p.index.size,
    }));
  });

  client.register("compendium-search", async (params) => {
    const { packId, query, type } = params as {
      packId: string;
      query?: string;
      type?: string;
    };

    const pack = game.packs.get(packId);
    if (!pack) throw new Error(`Compendium pack not found: ${packId}`);

    await pack.getIndex();
    let entries = pack.index.contents as Array<{ _id: string; name: string; type?: string; img?: string }>;

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
      packId,
    }));
  });

  client.register("compendium-import", async (params) => {
    const { packId, documentId, folder } = params as {
      packId: string;
      documentId: string;
      folder?: string;
    };

    const pack = game.packs.get(packId);
    if (!pack) throw new Error(`Compendium pack not found: ${packId}`);

    const doc = await pack.getDocument(documentId);
    if (!doc) throw new Error(`Document not found in pack: ${documentId}`);

    const imported = await (doc.constructor as typeof Actor | typeof Item).create(
      { ...doc.toObject(), folder } as Parameters<typeof Actor.create>[0]
    );

    if (!imported) throw new Error("Failed to import document");

    return {
      id: imported.id,
      name: (imported as Actor | Item).name,
      type: (imported as Actor | Item).type,
    };
  });
}
