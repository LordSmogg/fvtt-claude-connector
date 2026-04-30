import type { FoundryBridgeClient } from "../bridge.js";

export function registerWorldHandlers(client: FoundryBridgeClient) {
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
      activeScene: activeScene
        ? { id: activeScene.id, name: activeScene.name }
        : null,
      users: game.users?.contents.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        active: u.active,
        isGM: u.isGM,
      })) ?? [],
      actors: game.actors?.size ?? 0,
      scenes: game.scenes?.size ?? 0,
      items: game.items?.size ?? 0,
      journal: game.journal?.size ?? 0,
      tables: game.tables?.size ?? 0,
    };
  });
}
