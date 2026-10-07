import { UpupError } from "./errors.ts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const ALLOWED_HTTPS_HOSTS = new Set([
  "qt.gtimg.cn",
  "np-anotice-stock.eastmoney.com",
  "api.tushare.pro",
]);

export interface HttpRequestOptions {
  fetch?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
  method?: string;
  body?: unknown;
}

export interface HttpResult<T> {
  data: T;
  bytes: number;
  host: string;
}

function linkedAbortController(signals: readonly AbortSignal[], timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const forward = (signal: AbortSignal) => () => {
    if (signal.aborted) controller.abort(signal.reason);
  };
  const listeners = signals.map((signal) => {
    const listener = forward(signal);
    signal.addEventListener("abort", listener, { once: true });
    return { signal, listener };
  });
  return {
    controller,
    cleanup: () => {
      clearTimeout(timeout);
      for (const { signal, listener } of listeners) {
        signal.removeEventListener("abort", listener);
      }
    },
  };
}

export async function requestJson<T>(url: string, options: HttpRequestOptions = {}): Promise<HttpResult<T>> {
  const text = await requestText(url, options);
  try {
    return { ...text, data: JSON.parse(text.data) as T };
  } catch (cause) {
    throw new UpupError({
      code: "provider",
      capability: "http-json",
      message: "The provider returned an invalid JSON response.",
      retryable: true,
      cause,
    });
  }
}

export async function requestText(url: string, options: HttpRequestOptions = {}): Promise<HttpResult<string>> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new UpupError({ code: "configuration", capability: "http", message: "Only HTTPS endpoints are allowed." });
  }
  if (!ALLOWED_HTTPS_HOSTS.has(parsed.hostname)) {
    throw new UpupError({
      code: "configuration",
      capability: "http",
      message: `Network host is not allowlisted: ${parsed.hostname}`,
    });
  }
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 8_000, 250), 15_000);
  const maxBytes = Math.min(Math.max(options.maxBytes ?? 1_000_000, 1_000), 3_000_000);
  if (options.signal?.aborted) {
    throw new UpupError({
      code: "cancelled",
      capability: parsed.hostname,
      message: "The request was cancelled before completion.",
    });
  }
  const signals = options.signal ? [options.signal] : [];
  const linked = linkedAbortController(signals, timeoutMs);
  try {
    const response = await (options.fetch ?? fetch)(url, {
      method: options.method ?? "GET",
      signal: linked.controller.signal,
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) {
      throw new UpupError({
        code: response.status >= 500 ? "network" : "provider",
        capability: parsed.hostname,
        message: `The provider returned HTTP ${response.status}.`,
        retryable: response.status >= 500 || response.status === 429,
      });
    }
    const declaredBytes = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new UpupError({
        code: "provider",
        capability: parsed.hostname,
        message: `The provider response exceeded ${maxBytes} bytes.`,
        retryable: false,
      });
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new UpupError({
        code: "provider",
        capability: parsed.hostname,
        message: `The provider response exceeded ${maxBytes} bytes.`,
        retryable: false,
      });
    }
    return {
      data: new TextDecoder().decode(buffer),
      bytes: buffer.byteLength,
      host: parsed.hostname,
    };
  } catch (error) {
    if (error instanceof UpupError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpupError({
        code: options.signal?.aborted ? "cancelled" : "network",
        capability: parsed.hostname,
        message: options.signal?.aborted
          ? "The request was cancelled before completion."
          : `The provider request timed out after ${timeoutMs}ms.`,
        retryable: options.signal?.aborted !== true,
        cause: error,
      });
    }
    throw new UpupError({
      code: "network",
      capability: parsed.hostname,
      message: "The provider network request failed.",
      retryable: true,
      cause: error,
    });
  } finally {
    linked.cleanup();
  }
}
