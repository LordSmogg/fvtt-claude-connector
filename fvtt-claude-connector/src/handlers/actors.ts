import type { FoundryBridgeClient } from "../bridge.js";

function serializeActor(actor: Actor) {
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
      system: item.system,
    })),
    effects: actor.effects.map((e) => e.toObject()),
  };
}

export function registerActorHandlers(client: FoundryBridgeClient) {
  client.register("actor-list", async (params) => {
    const { type, name, folder } = (params ?? {}) as Record<string, string | undefined>;
    let actors = game.actors!.contents;
    if (type) actors = actors.filter((a) => a.type === type);
    if (name) actors = actors.filter((a) => a.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) actors = actors.filter((a) => a.folder?.id === folder);
    return actors.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      img: a.img,
      folder: a.folder?.id ?? null,
    }));
  });

  client.register("actor-get", async (params) => {
    const { id } = params as { id: string };
    const actor = game.actors!.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    return serializeActor(actor);
  });

  client.register("actor-create", async (params) => {
    const data = params as Record<string, unknown>;
    const actor = await Actor.create(data as Parameters<typeof Actor.create>[0]);
    if (!actor) throw new Error("Failed to create actor");
    return serializeActor(actor);
  });

  client.register("actor-update", async (params) => {
    const { id, ...data } = params as { id: string } & Record<string, unknown>;
    const actor = game.actors!.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    await actor.update(data as Parameters<typeof actor.update>[0]);
    return serializeActor(actor);
  });

  client.register("actor-delete", async (params) => {
    const { id } = params as { id: string };
    const actor = game.actors!.get(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    await actor.delete();
    return { success: true, id };
  });
}
