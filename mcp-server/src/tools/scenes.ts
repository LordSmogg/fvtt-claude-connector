import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const sceneTools: Tool[] = [
  {
    name: "scene-list",
    description: "List all scenes in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" },
      },
    },
  },
  {
    name: "scene-get",
    description: "Get a scene by ID, including its tokens, walls, and lights.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "scene-create",
    description: "Create a new scene.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        gridSize: { type: "number", description: "Grid size in pixels" },
        gridType: { type: "number", description: "0=gridless, 1=square, 2=hex rows, 3=hex columns" },
        background: { type: "object", description: "Background image settings" },
        folder: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "scene-update",
    description: "Update an existing scene's settings.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        gridSize: { type: "number" },
        background: { type: "object" },
        darkness: { type: "number", description: "Darkness level 0-1" },
        tokenVision: { type: "boolean" },
        fogExploration: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "token-place",
    description: "Place a token for an actor on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        actorId: { type: "string" },
        x: { type: "number", description: "X position in pixels" },
        y: { type: "number", description: "Y position in pixels" },
        name: { type: "string", description: "Override token name" },
        width: { type: "number", description: "Token width in grid units" },
        height: { type: "number", description: "Token height in grid units" },
        hidden: { type: "boolean" },
      },
      required: ["sceneId", "actorId", "x", "y"],
    },
  },
  {
    name: "wall-create",
    description: "Create one or more walls on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        walls: {
          type: "array",
          description: "Array of wall objects",
          items: {
            type: "object",
            properties: {
              c: {
                type: "array",
                description: "Coordinates [x0,y0,x1,y1]",
                items: { type: "number" },
              },
              move: { type: "number", description: "Movement restriction: 0=none, 1=normal, 2=limited" },
              sense: { type: "number", description: "Sight restriction: 0=none, 1=normal, 2=limited" },
              door: { type: "number", description: "Door type: 0=none, 1=door, 2=secret" },
            },
            required: ["c"],
          },
        },
      },
      required: ["sceneId", "walls"],
    },
  },
  {
    name: "light-create",
    description: "Create one or more light sources on a scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string" },
        lights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              config: {
                type: "object",
                description: "Light configuration (bright, dim, color, angle, etc.)",
              },
            },
            required: ["x", "y"],
          },
        },
      },
      required: ["sceneId", "lights"],
    },
  },
];

export async function handleSceneTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
