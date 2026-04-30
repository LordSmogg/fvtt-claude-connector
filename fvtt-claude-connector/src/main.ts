import { FoundryBridgeClient } from "./bridge.js";
import { registerActorHandlers } from "./handlers/actors.js";
import { registerItemHandlers } from "./handlers/items.js";
import { registerSceneHandlers } from "./handlers/scenes.js";
import { registerJournalHandlers } from "./handlers/journal.js";
import { registerCompendiumHandlers } from "./handlers/compendium.js";
import { registerCombatHandlers } from "./handlers/combat.js";
import { registerRolltableHandlers } from "./handlers/rolltables.js";
import { registerChatHandlers } from "./handlers/chat.js";
import { registerFolderHandlers } from "./handlers/folders.js";
import { registerWorldHandlers } from "./handlers/world.js";
import { registerSystemHandlers } from "./handlers/system.js";
import { SetupGuideApp } from "./setup-guide.js";

const MODULE_ID = "fvtt-claude-connector";

let bridgeClient: FoundryBridgeClient | null = null;

Hooks.once("init", () => {
  game.settings!.register(MODULE_ID, "bridgeHost", {
    name: "FMCPB.Settings.BridgeHost.Name",
    hint: "FMCPB.Settings.BridgeHost.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "localhost",
  });

  game.settings!.register(MODULE_ID, "bridgePort", {
    name: "FMCPB.Settings.BridgePort.Name",
    hint: "FMCPB.Settings.BridgePort.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 4000,
  });

  game.settings!.register(MODULE_ID, "setupShown", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings!.registerMenu(MODULE_ID, "setupGuide", {
    name: "FMCPB.Settings.SetupGuide.Name",
    label: "FMCPB.Settings.SetupGuide.Label",
    hint: "FMCPB.Settings.SetupGuide.Hint",
    icon: "fas fa-book",
    type: SetupGuideApp,
    restricted: true,
  });
});

Hooks.once("ready", () => {
  if (!game.user!.isGM) {
    console.log(`[MCP Bridge] Skipping — not a GM user`);
    return;
  }

  const host = game.settings!.get(MODULE_ID, "bridgeHost") as string;
  const port = game.settings!.get(MODULE_ID, "bridgePort") as number;

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

  // Show setup guide automatically on first install
  const setupShown = game.settings!.get(MODULE_ID, "setupShown") as boolean;
  if (!setupShown) {
    game.settings!.set(MODULE_ID, "setupShown", true);
    // Small delay so Foundry UI is fully ready
    setTimeout(() => new SetupGuideApp().render(true), 1500);
  }
});
