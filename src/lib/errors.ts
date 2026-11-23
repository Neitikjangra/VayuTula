/** Why an external provider call failed. */
export type ProviderErrorKind = 'timeout' | 'network' | 'http' | 'parse' | 'incomplete';

/** Typed failure from an external provider. Never carries user data. */
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status: number | undefined;

  constructor(kind: ProviderErrorKind, status?: number) {
    super(status === undefined ? `provider ${kind}` : `provider ${kind} ${status}`);
    this.name = 'ProviderError';
    this.kind = kind;
    this.status = status;
  }
}

/** Type guard for ProviderError. */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}
