import { ApiError } from '../../shared/config/api';
import type {
  Article,
  ArticleListItem,
  ArticlePayload,
  ArticleStatus,
  PagedResponse,
  UploadImageResponse,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080/api/v1';

type RequestOptions = RequestInit & { authHeader?: string; parseJson?: boolean };

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { authHeader, parseJson = true, headers, body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(parseJson ? { 'Content-Type': 'application/json' } : {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new ApiError({
      code: 'REQUEST_FAILED',
      message: errorBody && typeof errorBody === 'object' && 'message' in errorBody
        ? String((errorBody as Record<string, unknown>).message)
        : `Ошибка ${response.status}`,
      status: response.status,
    });
  }

  if (!parseJson || response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

function toJson(payload: ArticlePayload) {
  return JSON.stringify(payload);
}

export interface ListArticlesParams {
  readonly status?: ArticleStatus | 'ALL';
  readonly query?: string;
  readonly page?: number;
  readonly size?: number;
  readonly authHeader?: string;
}

export async function listArticles({ authHeader, ...params }: ListArticlesParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.query) searchParams.set('query', params.query);
  if (typeof params.page === 'number') searchParams.set('page', String(params.page));
  if (typeof params.size === 'number') searchParams.set('size', String(params.size));
  const suffix = searchParams.toString();
  return request<PagedResponse<ArticleListItem>>(`/articles${suffix ? `?${suffix}` : ''}`, {
    authHeader,
  });
}

export function getArticleById(id: string, authHeader?: string) {
  return request<Article>(`/articles/${id}`, { authHeader });
}

export function getArticleBySlug(slug: string) {
  return request<Article>(`/articles/by-slug/${slug}`);
}

export async function createArticle(payload: ArticlePayload, authHeader?: string) {
  return request<Article>(`/articles`, {
    method: 'POST',
    body: toJson(payload),
    authHeader,
  });
}

export async function updateArticle(id: string, payload: ArticlePayload, authHeader?: string) {
  return request<Article>(`/articles/${id}`, {
    method: 'PUT',
    body: toJson(payload),
    authHeader,
  });
}

export function publishArticle(id: string, authHeader?: string) {
  return request<Article>(`/articles/${id}/publish`, {
    method: 'POST',
    authHeader,
  });
}

export function unpublishArticle(id: string, authHeader?: string) {
  return request<Article>(`/articles/${id}/unpublish`, {
    method: 'POST',
    authHeader,
  });
}

export async function uploadImage(file: File, authHeader?: string, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/uploads/images`, {
    method: 'POST',
    body: formData,
    headers: authHeader ? { Authorization: authHeader } : undefined,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Не удалось загрузить изображение');
    throw new ApiError({ code: 'UPLOAD_FAILED', message: errorText, status: response.status });
  }

  const data = (await response.json()) as UploadImageResponse;
  return data;
}
