export interface ApiErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;

  public constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.code = payload.code;
    this.status = payload.status;
  }
}

interface CreateApiClientOptions {
  readonly baseUrl?: string;
  readonly timeout?: number;
}

type FetchFn = typeof fetch;

type RequestOptions = RequestInit & { timeout?: number };

const DEFAULT_TIMEOUT = 10_000;

function normalizeError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const maybeCode = 'code' in body ? String((body as Record<string, unknown>).code) : 'UNKNOWN';
    const maybeMessage =
      'message' in body ? String((body as Record<string, unknown>).message) : 'Неизвестная ошибка';
    return new ApiError({ code: maybeCode, message: maybeMessage, status });
  }

  return new ApiError({ code: 'UNKNOWN', message: 'Неизвестная ошибка', status });
}

export function createApiClient(fetchFn: FetchFn, options?: CreateApiClientOptions) {
  const baseUrl = options?.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '';
  const baseTimeout = options?.timeout ?? DEFAULT_TIMEOUT;

  return async function request<TResponse>(
    input: string,
    init?: RequestOptions,
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = init?.timeout ?? baseTimeout;
    const timer = window.setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetchFn(`${baseUrl}${input}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        throw normalizeError(response.status, errorBody);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ code: 'TIMEOUT', message: 'Превышено время ожидания запроса' });
      }
      if (error instanceof ApiError) {
        throw error;
      }
      const unknownError = error as Error;
      throw new ApiError({
        code: 'NETWORK',
        message: unknownError.message || 'Ошибка сети',
      });
    } finally {
      window.clearTimeout(timer);
    }
  };
}

export const apiClient = createApiClient(fetch);
