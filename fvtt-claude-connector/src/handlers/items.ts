import type { FoundryBridgeClient } from "../bridge.js";

function serializeItem(item: Item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    img: item.img,
    folder: item.folder?.id ?? null,
    system: item.system,
    effects: item.effects.map((e) => e.toObject()),
  };
}

export function registerItemHandlers(client: FoundryBridgeClient) {
  client.register("item-list", async (params) => {
    const { type, name, folder } = (params ?? {}) as Record<string, string | undefined>;
    let items = game.items!.contents;
    if (type) items = items.filter((i) => i.type === type);
    if (name) items = items.filter((i) => i.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) items = items.filter((i) => i.folder?.id === folder);
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      img: i.img,
      folder: i.folder?.id ?? null,
    }));
  });

  client.register("item-get", async (params) => {
    const { id } = params as { id: string };
    const item = game.items!.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    return serializeItem(item);
  });

  client.register("item-create", async (params) => {
    const data = params as Record<string, unknown>;
    const item = await Item.create(data as Parameters<typeof Item.create>[0]);
    if (!item) throw new Error("Failed to create item");
    return serializeItem(item);
  });

  client.register("item-update", async (params) => {
    const { id, ...data } = params as { id: string } & Record<string, unknown>;
    const item = game.items!.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    await item.update(data as Parameters<typeof item.update>[0]);
    return serializeItem(item);
  });

  client.register("item-delete", async (params) => {
    const { id } = params as { id: string };
    const item = game.items!.get(id);
    if (!item) throw new Error(`Item not found: ${id}`);
    await item.delete();
    return { success: true, id };
  });

  client.register("actor-item-list", async (params) => {
    const { actorId, type } = params as { actorId: string; type?: string };
    const actor = game.actors!.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    let items = actor.items.contents;
    if (type) items = items.filter((i) => i.type === type);
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      img: i.img,
      system: i.system,
    }));
  });

  client.register("actor-item-add", async (params) => {
    const { actorId, worldItemId, ...itemData } = params as {
      actorId: string;
      worldItemId?: string;
    } & Record<string, unknown>;

    const actor = game.actors!.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);

    let dataToCreate: Record<string, unknown>;
    if (worldItemId) {
      const worldItem = game.items!.get(worldItemId);
      if (!worldItem) throw new Error(`World item not found: ${worldItemId}`);
      dataToCreate = worldItem.toObject() as Record<string, unknown>;
    } else {
      dataToCreate = itemData;
    }

    const [created] = await actor.createEmbeddedDocuments("Item", [
      dataToCreate as Parameters<typeof actor.createEmbeddedDocuments>[1][0],
    ]);
    if (!created) throw new Error("Failed to add item to actor");
    return {
      id: created.id,
      name: (created as Item).name,
      type: (created as Item).type,
      system: (created as Item).system,
    };
  });

  client.register("actor-item-update", async (params) => {
    const { actorId, itemId, ...data } = params as {
      actorId: string;
      itemId: string;
    } & Record<string, unknown>;

    const actor = game.actors!.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    const item = actor.items.get(itemId);
    if (!item) throw new Error(`Item not found on actor: ${itemId}`);

    await actor.updateEmbeddedDocuments("Item", [
      { _id: itemId, ...data } as Parameters<typeof actor.updateEmbeddedDocuments>[1][0],
    ]);

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      system: item.system,
    };
  });

  client.register("actor-item-remove", async (params) => {
    const { actorId, itemId } = params as { actorId: string; itemId: string };
    const actor = game.actors!.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);
    if (!actor.items.has(itemId)) throw new Error(`Item not found on actor: ${itemId}`);
    await actor.deleteEmbeddedDocuments("Item", [itemId]);
    return { success: true, actorId, itemId };
  });
}
