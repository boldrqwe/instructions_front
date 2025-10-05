import { useQuery } from '@tanstack/react-query';
import type { Page, SearchResult } from '../model/types';

export function useSearchQuery(
  params: Record<string, unknown>,
  enabled = true,
) {
  return useQuery<Page<SearchResult>, Error>({
    queryKey: ['search', params],
    queryFn: async () => ({ items: [], total: 0, page: 1, size: 10 }),
    enabled,
  });
}
