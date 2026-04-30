export interface BridgeRequest {
  id: string;
  method: string;
  params: unknown;
}

export interface BridgeResponse {
  id: string;
  result?: unknown;
  error?: string;
}

export type HandlerFn = (params: unknown) => Promise<unknown>;
