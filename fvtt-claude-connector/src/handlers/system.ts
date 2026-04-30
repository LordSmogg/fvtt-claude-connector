import type { FoundryBridgeClient } from "../bridge.js";

export function registerSystemHandlers(client: FoundryBridgeClient) {
  client.register("system-info", async () => {
    const system = game.system;

    // Collect document types from the system's data model
    const documentTypes: Record<string, string[]> = {};
    const model: Record<string, unknown> = {};

    for (const docType of ["Actor", "Item"] as const) {
      const types = game.documentTypes?.[docType] ?? [];
      documentTypes[docType] = types.filter((t: string) => t !== "base");

      // Extract the schema for each type from the system data models
      const typeModels: Record<string, unknown> = {};
      for (const typeName of documentTypes[docType]) {
        try {
          const cls = CONFIG[docType]?.dataModels?.[typeName];
          if (cls?.schema) {
            typeModels[typeName] = cls.schema.toObject?.() ?? {};
          }
        } catch {
          // Some systems may not expose schema this way
        }
      }
      if (Object.keys(typeModels).length) {
        model[docType] = typeModels;
      }
    }

    return {
      id: system.id,
      title: system.title,
      version: system.version,
      documentTypes,
      model,
      // Include the raw template data which describes the data structure
      template: (game.system as unknown as Record<string, unknown>).template ?? null,
    };
  });
}
