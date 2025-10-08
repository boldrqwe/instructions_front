import type {
  Article,
  ArticleListResponse,
  ArticlePayload,
  ArticleQuery,
  UploadImageResponse,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:8080/api/v1';

interface RequestOptions extends RequestInit {
  readonly authHeader?: string | null;
}

function withBase(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

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

export async function fetchArticles(
  query: ArticleQuery,
  authHeader: string,
): Promise<ArticleListResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.query) params.set('query', query.query);
  if (typeof query.page === 'number') params.set('page', String(query.page));
  if (typeof query.size === 'number') params.set('size', String(query.size));

  const search = params.toString();
  const path = search ? `/articles?${search}` : '/articles';
  return apiRequest<ArticleListResponse>(path, { authHeader });
}

export function fetchArticleById(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}`, { authHeader });
}

export function fetchArticleBySlug(slug: string): Promise<Article> {
  return apiRequest<Article>(`/articles/by-slug/${slug}`);
}

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

export function publishArticle(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}/publish`, {
    method: 'POST',
    authHeader,
  });
}

export function unpublishArticle(id: string, authHeader: string): Promise<Article> {
  return apiRequest<Article>(`/articles/${id}/unpublish`, {
    method: 'POST',
    authHeader,
  });
}

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
