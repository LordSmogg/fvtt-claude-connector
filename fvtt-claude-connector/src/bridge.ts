import type { BridgeRequest, BridgeResponse, HandlerFn } from "./types.js";

const RECONNECT_DELAY_MS = 5_000;

export class FoundryBridgeClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, HandlerFn>();
  private url: string;
  private shouldReconnect = true;

  constructor(host: string, port: number) {
    this.url = `ws://${host}:${port}`;
  }

  register(method: string, handler: HandlerFn) {
    this.handlers.set(method, handler);
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    console.log(`[MCP Bridge] Connecting to ${this.url}...`);
    ui.notifications?.info(game.i18n.localize("FMCPB.Status.Connecting"));

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      console.log("[MCP Bridge] Connected to MCP server");
      ui.notifications?.info(game.i18n.localize("FMCPB.Status.Connected"));
    });

    ws.addEventListener("message", (event) => {
      this.handleMessage(event.data as string).catch((err) => {
        console.error("[MCP Bridge] Error handling message:", err);
      });
    });

    ws.addEventListener("close", () => {
      console.log(`[MCP Bridge] Disconnected from MCP server`);
      ui.notifications?.warn(game.i18n.localize("FMCPB.Status.Disconnected"));
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      }
    });

    ws.addEventListener("error", () => {
      console.error(
        `[MCP Bridge] Connection error. Is the MCP server running at ${this.url}?`
      );
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  private async handleMessage(raw: string) {
    let request: BridgeRequest;
    try {
      request = JSON.parse(raw) as BridgeRequest;
    } catch {
      console.error("[MCP Bridge] Received invalid JSON");
      return;
    }

    const handler = this.handlers.get(request.method);
    const response: BridgeResponse = { id: request.id };

    if (!handler) {
      response.error = `Unknown method: ${request.method}`;
    } else {
      try {
        response.result = await handler(request.params);
      } catch (err) {
        response.error = err instanceof Error ? err.message : String(err);
      }
    }

    this.ws?.send(JSON.stringify(response));
  }
}
