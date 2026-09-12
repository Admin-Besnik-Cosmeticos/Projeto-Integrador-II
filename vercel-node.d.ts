declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string;
    body?: unknown;
    query?: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface VercelResponse {
    status(code: number): VercelResponse;
    json(payload: unknown): VercelResponse | void;
    setHeader(name: string, value: string): void;
  }
}