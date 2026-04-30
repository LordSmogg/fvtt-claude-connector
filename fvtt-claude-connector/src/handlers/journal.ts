import type { FoundryBridgeClient } from "../bridge.js";

function serializeJournalEntry(entry: JournalEntry, includePages = true) {
  return {
    id: entry.id,
    name: entry.name,
    folder: entry.folder?.id ?? null,
    pages: includePages
      ? entry.pages.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          sort: p.sort,
          text: (p as unknown as Record<string, unknown>).text,
          src: (p as unknown as Record<string, unknown>).src,
        }))
      : undefined,
  };
}

export function registerJournalHandlers(client: FoundryBridgeClient) {
  client.register("journal-list", async (params) => {
    const { name, folder } = (params ?? {}) as Record<string, string | undefined>;
    let entries = game.journal!.contents;
    if (name) entries = entries.filter((e) => e.name?.toLowerCase().includes(name.toLowerCase()));
    if (folder) entries = entries.filter((e) => e.folder?.id === folder);
    return entries.map((e) => serializeJournalEntry(e, false));
  });

  client.register("journal-get", async (params) => {
    const { id } = params as { id: string };
    const entry = game.journal!.get(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    return serializeJournalEntry(entry, true);
  });

  client.register("journal-create", async (params) => {
    const { name, folder, initialPage } = params as {
      name: string;
      folder?: string;
      initialPage?: Record<string, unknown>;
    };

    const entryData: Record<string, unknown> = { name, folder };
    if (initialPage) {
      entryData.pages = [{ ...initialPage, sort: 100 }];
    }

    const entry = await JournalEntry.create(
      entryData as Parameters<typeof JournalEntry.create>[0]
    );
    if (!entry) throw new Error("Failed to create journal entry");
    return serializeJournalEntry(entry);
  });

  client.register("journal-update", async (params) => {
    const { id, ...data } = params as { id: string } & Record<string, unknown>;
    const entry = game.journal!.get(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    await entry.update(data as Parameters<typeof entry.update>[0]);
    return serializeJournalEntry(entry, false);
  });

  client.register("journal-page-create", async (params) => {
    const { journalId, ...pageData } = params as {
      journalId: string;
    } & Record<string, unknown>;

    const entry = game.journal!.get(journalId);
    if (!entry) throw new Error(`Journal entry not found: ${journalId}`);

    const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [
      pageData as Parameters<typeof entry.createEmbeddedDocuments>[1][0],
    ]);
    if (!page) throw new Error("Failed to create journal page");

    return {
      id: page.id,
      name: (page as JournalEntryPage).name,
      type: (page as JournalEntryPage).type,
    };
  });

  client.register("journal-page-update", async (params) => {
    const { journalId, pageId, ...data } = params as {
      journalId: string;
      pageId: string;
    } & Record<string, unknown>;

    const entry = game.journal!.get(journalId);
    if (!entry) throw new Error(`Journal entry not found: ${journalId}`);

    await entry.updateEmbeddedDocuments("JournalEntryPage", [
      { _id: pageId, ...data } as Parameters<typeof entry.updateEmbeddedDocuments>[1][0],
    ]);

    const page = entry.pages.get(pageId);
    return {
      id: page?.id,
      name: (page as JournalEntryPage | undefined)?.name,
      type: (page as JournalEntryPage | undefined)?.type,
    };
  });
}
