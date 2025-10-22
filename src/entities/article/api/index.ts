import { apiClient } from '../../../shared/config/api';
import type {
  Article,
  ArticleStatus,
  ArticleSummary,
  Page,
  SearchResult,
  Toc,
} from '../model/types';

/**
 * Параметры запроса списка статей.
 */
export interface ListArticlesParams {
  readonly status?: ArticleStatus;
  readonly query?: string;
  readonly page?: number;
  readonly size?: number;
}

export interface ListArticlesOptions {
  readonly endpoint?: '/articles' | '/articles/list';
}

/**
 * Загружает список статей с сервера с учётом фильтров и пагинации.
 * @param params Параметры фильтрации и пагинации.
 */
export async function listArticles(
  params: ListArticlesParams = {},
  options: ListArticlesOptions = {},
) {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set('status', params.status);
  }
  if (params.query) {
    searchParams.set('query', params.query);
  }
  if (typeof params.page === 'number') {
    searchParams.set('page', String(params.page));
  }
  if (typeof params.size === 'number') {
    searchParams.set('size', String(params.size));
  }
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';
  const basePath = options.endpoint ?? '/articles';
  return apiClient<Page<ArticleSummary>>(`${basePath}${suffix}`);
}

/**
 * Получает статью по slug для отображения на странице чтения.
 */
export function getArticleBySlug(slug: string) {
  return apiClient<Article>(`/articles/by-slug/${slug}`);
}

/**
 * Загружает таблицу содержимого статьи по идентификатору.
 */
export function getToc(articleId: string) {
  return apiClient<Toc>(`/articles/${articleId}/toc`);
}

/**
 * Параметры запроса поиска по статьям.
 */
export interface SearchParams {
  readonly query: string;
  readonly page?: number;
  readonly size?: number;
}

/**
 * Выполняет поисковый запрос к API и возвращает страницу результатов.
 */
export function search(params: SearchParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('query', params.query);
  if (typeof params.page === 'number') {
    searchParams.set('page', String(params.page));
  }
  if (typeof params.size === 'number') {
    searchParams.set('size', String(params.size));
  }
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';
  return apiClient<Page<SearchResult>>(`/search${suffix}`);
}
