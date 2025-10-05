import { useQuery } from '@tanstack/react-query';
import type { ListArticlesParams, SearchParams } from './index';
import { getArticleBySlug, getToc, listArticles, search } from './index';
import type { Article, SearchResult, Toc } from '../model/types';

/**
 * Тип страницы, которую возвращает бэкенд.
 * Пример: {"content": [...], "page": 0, "size": 20, "totalElements": 123}
 */
interface BackendPage<T> {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
}

/**
 * Тип нормализованных данных для фронта.
 */
interface FrontendPage<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/** ======================= Список статей ======================= */
export function useArticlesQuery(params: ListArticlesParams) {
  return useQuery({
    queryKey: ['articles', params] as const,
    queryFn: () => listArticles(params),
    staleTime: 5 * 60_000,
  });
}

/** ======================= Одна статья ======================= */
export function useArticleQuery(slug: string, enabled = true) {
  return useQuery<Article>({
    queryKey: ['article', slug] as const,
    queryFn: () => getArticleBySlug(slug),
    enabled: Boolean(slug) && enabled,
  });
}

/** ======================= Оглавление ======================= */
export function useTocQuery(articleId: string | undefined) {
  return useQuery<Toc>({
    queryKey: ['toc', articleId] as const,
    queryFn: () => getToc(articleId as string),
    enabled: Boolean(articleId),
  });
}

/** ======================= Поиск ======================= */
export function useSearchQuery(params: SearchParams, enabled = true) {
  return useQuery<FrontendPage<SearchResult>>({
    queryKey: ['search', params],
    queryFn: async () => {
      const res: BackendPage<SearchResult> = await search(params);

      // безопасная нормализация
      return {
        items: res.content ?? [],
        page: res.page ?? 0,
        size: res.size ?? 20,
        total: res.totalElements ?? 0,
      };
    },
    enabled: params.query.trim().length > 0 && enabled,
  });
}
