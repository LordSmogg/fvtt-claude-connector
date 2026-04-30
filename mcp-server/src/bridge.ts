import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { BridgeRequest, BridgeResponse, PendingRequest } from "./types.js";

const REQUEST_TIMEOUT_MS = 30_000;

export class FoundryBridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.startServer();
  }

  private startServer() {
    const wss = new WebSocketServer({ port: this.port });
    this.wss = wss;

    wss.on("connection", (ws) => {
      console.error(`[bridge] Foundry module connected`);
      this.client = ws;

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString()) as BridgeResponse;
          this.handleResponse(msg);
        } catch {
          console.error("[bridge] Failed to parse message from Foundry");
        }
      });

      ws.on("close", () => {
        console.error("[bridge] Foundry module disconnected");
        if (this.client === ws) this.client = null;
      });

      ws.on("error", (err) => {
        console.error("[bridge] WebSocket error:", err.message);
      });
    });

    wss.on("listening", () => {
      console.error(`[bridge] Listening for Foundry module on port ${this.port}`);
    });

    wss.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[bridge] Port ${this.port} is in use — another instance may still be shutting down. Retrying in 5s...`
        );
        wss.close();
        this.wss = null;
        setTimeout(() => this.startServer(), 5_000);
      } else {
        console.error("[bridge] WebSocket server error:", err.message);
      }
    });
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    if (!this.isConnected()) {
      throw new Error(
        "Foundry module is not connected. Make sure the foundry-mcp-bridge module is enabled and Foundry is running."
      );
    }

    const id = randomUUID();
    const request: BridgeRequest = { id, method, params };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${method}`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.client!.send(JSON.stringify(request));
    });
  }

  private handleResponse(msg: BridgeResponse) {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pending.delete(msg.id);

    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.result);
    }
  }

  close() {
    this.wss.close();
  }
}
