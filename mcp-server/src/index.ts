import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FoundryBridge } from "./bridge.js";
import { actorTools, handleActorTool } from "./tools/actors.js";
import { itemTools, handleItemTool } from "./tools/items.js";
import { sceneTools, handleSceneTool } from "./tools/scenes.js";
import { journalTools, handleJournalTool } from "./tools/journal.js";
import { compendiumTools, handleCompendiumTool } from "./tools/compendium.js";
import { combatTools, handleCombatTool } from "./tools/combat.js";
import { rolltableTools, handleRolltableTool } from "./tools/rolltables.js";
import { chatTools, handleChatTool } from "./tools/chat.js";
import { folderTools, handleFolderTool } from "./tools/folders.js";
import { worldTools, handleWorldTool } from "./tools/world.js";
import { systemTools, handleSystemTool } from "./tools/system.js";

const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT ?? "4000", 10);

const allTools = [
  ...actorTools,
  ...itemTools,
  ...sceneTools,
  ...journalTools,
  ...compendiumTools,
  ...combatTools,
  ...rolltableTools,
  ...chatTools,
  ...folderTools,
  ...worldTools,
  ...systemTools,
];

const toolHandlers = new Map<
  string,
  (name: string, args: Record<string, unknown>, bridge: FoundryBridge) => Promise<unknown>
>([
  ...actorTools.map((t) => [t.name, handleActorTool] as const),
  ...itemTools.map((t) => [t.name, handleItemTool] as const),
  ...sceneTools.map((t) => [t.name, handleSceneTool] as const),
  ...journalTools.map((t) => [t.name, handleJournalTool] as const),
  ...compendiumTools.map((t) => [t.name, handleCompendiumTool] as const),
  ...combatTools.map((t) => [t.name, handleCombatTool] as const),
  ...rolltableTools.map((t) => [t.name, handleRolltableTool] as const),
  ...chatTools.map((t) => [t.name, handleChatTool] as const),
  ...folderTools.map((t) => [t.name, handleFolderTool] as const),
  ...worldTools.map((t) => [t.name, handleWorldTool] as const),
  ...systemTools.map((t) => [t.name, handleSystemTool] as const),
]);

async function main() {
  const bridge = new FoundryBridge(BRIDGE_PORT);

  const server = new Server(
    { name: "fvtt-claude-connector", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers.get(name);

    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const result = await handler(name, (args ?? {}) as Record<string, unknown>, bridge);
      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp] FVTT Claude Connector running (Foundry bridge port: ${BRIDGE_PORT})`);
}

main().catch((err) => {
  console.error("[mcp] Fatal error:", err);
  process.exit(1);
});
