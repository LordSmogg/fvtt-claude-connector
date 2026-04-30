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

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
