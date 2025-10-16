/**
 * Структура ошибки, возвращаемой API.
 */
export interface ApiErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
}

/**
 * Кастомная ошибка, описывающая результат неудачного HTTP-запроса.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;

  /**
   * @param payload Данные об ошибке, полученные от сервера.
   */
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

/**
 * Таймаут по умолчанию для запросов (10 секунд).
 */
const DEFAULT_TIMEOUT = 10_000;

/**
 * Приводит тело ответа с ошибкой к экземпляру `ApiError`.
 * @param status HTTP-статус ответа.
 * @param body Распарсенное тело ответа.
 */
function normalizeError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const maybeCode = 'code' in body ? String((body as Record<string, unknown>).code) : 'UNKNOWN';
    const maybeMessage =
      'message' in body ? String((body as Record<string, unknown>).message) : 'Неизвестная ошибка';
    return new ApiError({ code: maybeCode, message: maybeMessage, status });
  }

  return new ApiError({ code: 'UNKNOWN', message: 'Неизвестная ошибка', status });
}

/**
 * Создаёт функцию для выполнения API-запросов с учётом базового URL и таймаутов.
 * @param fetchFn Реализация функции `fetch`, которую нужно использовать.
 * @param options Дополнительные параметры: базовый URL и значение таймаута.
 * @returns Асинхронную функцию запроса, автоматически обрабатывающую ошибки и таймауты.
 */
export function createApiClient(fetchFn: FetchFn, options?: CreateApiClientOptions) {
  const baseUrl =
      options?.baseUrl ??
      import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
      'http://localhost:8080/api/v1';
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

/**
 * Клиент API, использующий глобальный `fetch` браузера.
 */
export const apiClient = createApiClient(fetch);
