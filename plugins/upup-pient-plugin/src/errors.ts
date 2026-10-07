export type UpupErrorCode =
  | "invalid_input"
  | "configuration"
  | "network"
  | "provider"
  | "cancelled"
  | "calculation";

export class UpupError extends Error {
  readonly code: UpupErrorCode;
  readonly capability: string;
  readonly retryable: boolean;

  constructor(options: {
    code: UpupErrorCode;
    capability: string;
    message: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "UpupError";
    this.code = options.code;
    this.capability = options.capability;
    this.retryable = options.retryable ?? false;
  }
}

export function redactSecret(message: string, secret?: string): string {
  if (!secret || secret.length < 4) return message;
  return message.split(secret).join("[redacted]");
}

export function toSafeError(error: unknown, capability: string, secret?: string): UpupError {
  if (error instanceof UpupError) {
    return new UpupError({
      code: error.code,
      capability,
      message: redactSecret(error.message, secret),
      retryable: error.retryable,
      cause: error.cause,
    });
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new UpupError({
      code: "cancelled",
      capability,
      message: "The request was cancelled before completion.",
      cause: error,
    });
  }
  return new UpupError({
    code: "provider",
    capability,
    message: "The provider failed before returning valid data. Check network access and provider status.",
    retryable: true,
    cause: error,
  });
}
