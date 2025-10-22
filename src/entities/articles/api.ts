import type {
  Article,
  ArticleListResponse,
  ArticlePayload,
  ArticleQuery,
  UploadImageResponse,
} from './types';

/**
 * Базовый URL для всех запросов к API; берётся из окружения либо локального значения по умолчанию.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:8080/api/v1';

/**
 * Расширенные опции запроса с поддержкой заголовка авторизации.
 */
interface RequestOptions extends RequestInit {
  readonly authHeader?: string | null;
}

/**
 * Дополняет относительный путь до API абсолютным адресом.
 * @param path Относительный путь запроса.
 * @returns Абсолютный URL с учётом базового адреса.
 */
function withBase(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Выполняет HTTP-запрос к API и приводит ответ к нужному типу.
 * @param path Относительный путь запроса.
 * @param options Дополнительные опции запроса, включая заголовок авторизации.
 * @throws Ошибка, если сервер вернул статус, отличный от 2xx.
 */
async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authHeader, headers, ...rest } = options;
  const response = await fetch(withBase(path), {
    ...rest,
    headers: {
      ...(headers ?? {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

/**
 * Получает список статей с учётом фильтров и пагинации.
 * @param query Параметры фильтрации и пагинации.
 * @param authHeader Заголовок авторизации администратора.
 */
interface FetchArticlesOptions {
  readonly endpoint?: '/articles' | '/articles/list';
}

export async function fetchArticles(
  query: ArticleQuery,
  authHeader: string,
  options: FetchArticlesOptions = {},
): Promise<ArticleListResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.query) params.set('query', query.query);
  if (typeof query.page === 'number') params.set('page', String(query.page));
  if (typeof query.size === 'number') params.set('size', String(query.size));

  const search = params.toString();
  const basePath = options.endpoint ?? '/articles';
  const path = search ? `${basePath}?${search}` : basePath;
  return apiRequest<ArticleListResponse>(path, { authHeader });
}

/**
 * Загружает данные статьи по идентификатору для административного интерфейса.
 */
export function fetchArticleById(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}`, { authHeader });
}

/**
 * Получает опубликованную статью по её slug.
 */
export function fetchArticleBySlug(slug: string): Promise<Article> {
  return apiRequest<Article>(`/articles/by-slug/${slug}`);
}

/**
 * Создаёт новую статью через API.
 */
export function createArticle(
  payload: ArticlePayload,
  authHeader: string,
): Promise<Article> {
  return apiRequest<Article>('/articles', {
    method: 'POST',
    authHeader,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Обновляет существующую статью по идентификатору.
 */
export function updateArticle(
  id: string,
  payload: ArticlePayload,
  authHeader: string,
): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}`, {
    method: 'PUT',
    authHeader,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Переводит статью в опубликованный статус.
 */
export function publishArticle(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}/publish`, {
    method: 'POST',
    authHeader,
  });
}

/**
 * Снимает публикацию статьи, переводя её обратно в черновик.
 */
export function unpublishArticle(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}/unpublish`, {
    method: 'POST',
    authHeader,
  });
}

/**
 * Загружает изображение статьи и возвращает URL сохранённого файла.
 */
export function uploadArticleImage(
  file: File,
  authHeader: string,
): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<UploadImageResponse>('/uploads/images', {
    method: 'POST',
    body: formData,
    authHeader,
  });
}
