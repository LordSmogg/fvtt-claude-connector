import type { FoundryBridgeClient } from "../bridge.js";

function serializeScene(scene: Scene, full = false) {
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
    background: (scene as unknown as Record<string, unknown>).background,
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
      hidden: t.hidden,
    })),
    walls: scene.walls.map((w) => w.toObject()),
    lights: scene.lights.map((l) => l.toObject()),
  };
}

export function registerSceneHandlers(client: FoundryBridgeClient) {
  client.register("scene-list", async (params) => {
    const { name } = (params ?? {}) as { name?: string };
    let scenes = game.scenes!.contents;
    if (name) scenes = scenes.filter((s) => s.name?.toLowerCase().includes(name.toLowerCase()));
    return scenes.map((s) => serializeScene(s));
  });

  client.register("scene-get", async (params) => {
    const { id } = params as { id: string };
    const scene = game.scenes!.get(id);
    if (!scene) throw new Error(`Scene not found: ${id}`);
    return serializeScene(scene, true);
  });

  client.register("scene-create", async (params) => {
    const data = params as Record<string, unknown>;
    const scene = await Scene.create(data as Parameters<typeof Scene.create>[0]);
    if (!scene) throw new Error("Failed to create scene");
    return serializeScene(scene);
  });

  client.register("scene-update", async (params) => {
    const { id, ...data } = params as { id: string } & Record<string, unknown>;
    const scene = game.scenes!.get(id);
    if (!scene) throw new Error(`Scene not found: ${id}`);
    await scene.update(data as Parameters<typeof scene.update>[0]);
    return serializeScene(scene);
  });

  client.register("token-place", async (params) => {
    const { sceneId, actorId, x, y, ...rest } = params as {
      sceneId: string;
      actorId: string;
      x: number;
      y: number;
    } & Record<string, unknown>;

    const scene = game.scenes!.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const actor = game.actors!.get(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);

    const tokenData = {
      ...actor.prototypeToken?.toObject(),
      actorId,
      x,
      y,
      ...rest,
    };

    const [token] = await scene.createEmbeddedDocuments("Token", [
      tokenData as Parameters<typeof scene.createEmbeddedDocuments>[1][0],
    ]);
    if (!token) throw new Error("Failed to place token");

    return {
      id: token.id,
      name: (token as TokenDocument).name,
      x: (token as TokenDocument).x,
      y: (token as TokenDocument).y,
    };
  });

  client.register("wall-create", async (params) => {
    const { sceneId, walls } = params as {
      sceneId: string;
      walls: Record<string, unknown>[];
    };
    const scene = game.scenes!.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const created = await scene.createEmbeddedDocuments(
      "Wall",
      walls as Parameters<typeof scene.createEmbeddedDocuments>[1]
    );
    return created.map((w) => (w as WallDocument).toObject());
  });

  client.register("light-create", async (params) => {
    const { sceneId, lights } = params as {
      sceneId: string;
      lights: Record<string, unknown>[];
    };
    const scene = game.scenes!.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const created = await scene.createEmbeddedDocuments(
      "AmbientLight",
      lights as Parameters<typeof scene.createEmbeddedDocuments>[1]
    );
    return created.map((l) => (l as AmbientLightDocument).toObject());
  });
}
