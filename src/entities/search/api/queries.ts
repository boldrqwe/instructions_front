import { useQuery } from '@tanstack/react-query';
import type { Page, SearchResult } from '../model/types';

/**
 * Хук для выполнения поиска по API с помощью React Query.
 * @param params Набор параметров запроса, передаваемых в queryKey и функцию выборки.
 * @param enabled Управляет автоматическим запуском запроса.
 */
export function useSearchQuery(
  params: Record<string, unknown>,
  enabled = true,
) {
  return useQuery<Page<SearchResult>, Error>({
    queryKey: ['search', params],
    enabled,
  });
}
