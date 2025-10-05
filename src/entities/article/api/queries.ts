import { useQuery } from '@tanstack/react-query';
import type { ListArticlesParams, SearchParams } from './index';
import { getArticleBySlug, getToc, listArticles, search } from './index';
import type { Article, Page, SearchResult, Toc } from '../model/types';

export function useArticlesQuery(params: ListArticlesParams) {
  return useQuery({
    queryKey: ['articles', params] as const,
    queryFn: () => listArticles(params),
    staleTime: 5 * 60_000,
  });
}

export function useArticleQuery(slug: string, enabled = true) {
  return useQuery<Article>({
    queryKey: ['article', slug] as const,
    queryFn: () => getArticleBySlug(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function useTocQuery(articleId: string | undefined) {
  return useQuery<Toc>({
    queryKey: ['toc', articleId] as const,
    queryFn: () => getToc(articleId as string),
    enabled: Boolean(articleId),
  });
}

export function useSearchQuery(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: async () => {
      const res = await search(params);
      // 🔽 Нормализуем структуру под фронт
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

