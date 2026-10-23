export class UpstreamError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface HttpClientOptions {
  timeoutMs: number;
}

/** Thin fetch wrapper: enforces a timeout and normalises provider failures. */
export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async getJson<T>(provider: string, url: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        throw new UpstreamError(
          provider,
          response.status,
          `${provider} responded ${response.status}`,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      throw new UpstreamError(provider, 504, `${provider} request failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async postForm<T>(provider: string, url: string, body: string): Promise<T> {
    return this.getJson<T>(provider, url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }
}
