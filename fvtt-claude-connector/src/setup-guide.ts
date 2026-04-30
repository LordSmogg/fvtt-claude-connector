const SNIPPET = JSON.stringify(
  { foundry: { command: "npx", args: ["-y", "foundry-mcp-bridge"] } },
  null,
  2
);

const FULL_FILE = JSON.stringify(
  { mcpServers: { foundry: { command: "npx", args: ["-y", "foundry-mcp-bridge"] } } },
  null,
  2
);

function buildHTML(): string {
  return `
<div style="font-size:13px;line-height:1.6;">

  <p>To let Claude talk to this Foundry world you need to add one entry to Claude's config file on your computer. Follow the three steps below.</p>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 1 — Find the Claude config file</h3>
  <p>Open the file at this path in a text editor (e.g. Notepad):</p>
  <ul>
    <li><strong>Windows:</strong> <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
    <li><strong>Mac:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
  </ul>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 2 — Add the Foundry entry</h3>

  <p><strong>If the file already has other connectors</strong>, find the <code>"mcpServers"</code> section and add this block inside it (with a comma after the previous entry):</p>
  <div style="position:relative;">
    <pre id="fmcpb-snippet" style="background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:4px;overflow-x:auto;font-size:12px;">${escapeHtml(SNIPPET)}</pre>
    <button class="fmcpb-copy" data-target="fmcpb-snippet" style="position:absolute;top:6px;right:6px;font-size:11px;padding:2px 8px;">Copy</button>
  </div>

  <p style="margin-top:12px;"><strong>If the file is empty or doesn't exist yet</strong>, paste this as the entire contents:</p>
  <div style="position:relative;">
    <pre id="fmcpb-full" style="background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:4px;overflow-x:auto;font-size:12px;">${escapeHtml(FULL_FILE)}</pre>
    <button class="fmcpb-copy" data-target="fmcpb-full" style="position:absolute;top:6px;right:6px;font-size:11px;padding:2px 8px;">Copy</button>
  </div>

  <hr/>

  <h3 style="margin-bottom:4px;">Step 3 — Restart Claude</h3>
  <p>Fully quit and reopen the Claude app. The bridge will connect automatically the next time you open a world.</p>

  <hr/>

  <p style="color:#888;font-size:11px;">You can reopen this guide any time from the module settings.</p>

</div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class SetupGuideApp extends Application {
  static get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fmcpb-setup-guide",
      title: "Claude Connector — Setup Guide",
      width: 600,
      height: "auto",
      resizable: false,
    }) as ApplicationOptions;
  }

  async _renderInner(_data: object): Promise<JQuery> {
    return $(buildHTML());
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find(".fmcpb-copy").on("click", (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target!;
      const text = html.find(`#${targetId}`).text();
      navigator.clipboard.writeText(text).then(() => {
        ui.notifications!.info("Copied to clipboard!");
      }).catch(() => {
        ui.notifications!.warn("Could not copy — please select and copy the text manually.");
      });
    });
  }
}
