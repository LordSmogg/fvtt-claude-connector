import type { FoundryBridgeClient } from "../bridge.js";

function serializeCombat(combat: Combat) {
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
      defeated: c.isDefeated,
    })),
  };
}

function getActiveCombat(id?: string): Combat {
  if (id) {
    const combat = game.combats!.get(id);
    if (!combat) throw new Error(`Combat not found: ${id}`);
    return combat;
  }
  const active = game.combat;
  if (!active) throw new Error("No active combat encounter");
  return active;
}

export function registerCombatHandlers(client: FoundryBridgeClient) {
  client.register("combat-create", async (params) => {
    const { sceneId } = (params ?? {}) as { sceneId?: string };
    const scene = sceneId ? game.scenes!.get(sceneId) : game.scenes!.active;
    const combat = await Combat.create({ scene: scene?.id });
    if (!combat) throw new Error("Failed to create combat");
    return serializeCombat(combat);
  });

  client.register("combat-get", async (params) => {
    const { id } = (params ?? {}) as { id?: string };
    return serializeCombat(getActiveCombat(id));
  });

  client.register("combat-add-combatant", async (params) => {
    const { combatId, tokenId, sceneId, initiative } = params as {
      combatId?: string;
      tokenId: string;
      sceneId?: string;
      initiative?: number;
    };

    const combat = getActiveCombat(combatId);
    const scene = sceneId ? game.scenes!.get(sceneId) : game.scenes!.active;
    const token = scene?.tokens.get(tokenId);
    if (!token) throw new Error(`Token not found: ${tokenId}`);

    const combatantData: Record<string, unknown> = {
      tokenId,
      sceneId: scene?.id,
      actorId: token.actorId,
    };
    if (initiative !== undefined) combatantData.initiative = initiative;

    const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
      combatantData as Parameters<typeof combat.createEmbeddedDocuments>[1][0],
    ]);

    return {
      id: combatant.id,
      name: (combatant as Combatant).name,
      initiative: (combatant as Combatant).initiative,
    };
  });

  client.register("combat-set-initiative", async (params) => {
    const { combatId, combatantId, initiative } = params as {
      combatId?: string;
      combatantId: string;
      initiative: number;
    };

    const combat = getActiveCombat(combatId);
    await combat.setInitiative(combatantId, initiative);
    return serializeCombat(combat);
  });

  client.register("combat-next-turn", async (params) => {
    const { combatId } = (params ?? {}) as { combatId?: string };
    const combat = getActiveCombat(combatId);
    await combat.nextTurn();
    return serializeCombat(combat);
  });

  client.register("combat-start", async (params) => {
    const { combatId } = (params ?? {}) as { combatId?: string };
    const combat = getActiveCombat(combatId);
    await combat.startCombat();
    return serializeCombat(combat);
  });

  client.register("combat-end", async (params) => {
    const { combatId } = (params ?? {}) as { combatId?: string };
    const combat = getActiveCombat(combatId);
    const id = combat.id;
    await combat.delete();
    return { success: true, id };
  });
}
