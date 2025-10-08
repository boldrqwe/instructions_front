import { useQuery } from '@tanstack/react-query';
import type { Page, SearchResult } from '../model/types';

export function useSearchQuery(
  params: Record<string, unknown>,
  enabled = true,
) {
  return useQuery<Page<SearchResult>, Error>({
    queryKey: ['search', params],
    enabled,
  });
}
