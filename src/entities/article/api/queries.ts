import { useQuery } from '@tanstack/react-query';
import type { ListArticlesOptions, ListArticlesParams, SearchParams } from './index';
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
interface UseArticlesQueryOptions extends ListArticlesOptions {
  readonly enabled?: boolean;
}

/**
 * Получает список статей с параметрами пагинации через React Query.
 * @param params Параметры запроса к API.
 * @param options Дополнительные настройки (например, альтернативный эндпоинт или включение запроса).
 */
export function useArticlesQuery(
  params: ListArticlesParams,
  options: UseArticlesQueryOptions = {},
) {
  const { endpoint, enabled = true } = options;
  return useQuery({
    queryKey: ['articles', params, endpoint] as const,
    queryFn: () => listArticles(params, { endpoint }),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** ======================= Одна статья ======================= */
/**
 * Загружает данные одной статьи по slug.
 * @param slug ЧПУ идентификатор статьи.
 * @param enabled Флаг для отключения запроса (например, пока slug пустой).
 */
export function useArticleQuery(slug: string, enabled = true) {
  return useQuery<Article>({
    queryKey: ['article', slug] as const,
    queryFn: () => getArticleBySlug(slug),
    enabled: Boolean(slug) && enabled,
  });
}

/** ======================= Оглавление ======================= */
/**
 * Загружает таблицу содержимого для указанной статьи.
 * @param articleId Идентификатор статьи, для которой нужно оглавление.
 */
export function useTocQuery(articleId: string | undefined) {
  return useQuery<Toc>({
    queryKey: ['toc', articleId] as const,
    queryFn: () => getToc(articleId as string),
    enabled: Boolean(articleId),
  });
}

/** ======================= Поиск ======================= */
/**
 * Выполняет поиск по статьям и нормализует ответ сервера.
 * @param params Параметры поискового запроса.
 * @param enabled Управляет включением запроса (например, при пустой строке).
 */
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
