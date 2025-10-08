import { apiClient } from '../../../shared/config/api';
import type {
  Article,
  ArticleStatus,
  ArticleSummary,
  Page,
  SearchResult,
  Toc,
} from '../model/types';

export interface ListArticlesParams {
  readonly status?: ArticleStatus;
  readonly query?: string;
  readonly page?: number;
  readonly size?: number;
}

export async function listArticles(params: ListArticlesParams = {}) {
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
  return apiClient<Page<ArticleSummary>>(`/articles${suffix}`);
}

export function getArticleBySlug(slug: string) {
  return apiClient<Article>(`/articles/by-slug/${slug}`);
}

export function getToc(articleId: string) {
  return apiClient<Toc>(`/articles/${articleId}/toc`);
}

export interface SearchParams {
  readonly query: string;
  readonly page?: number;
  readonly size?: number;
}

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
