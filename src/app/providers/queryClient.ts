import { QueryClient } from '@tanstack/react-query';

/**
 * Общий экземпляр QueryClient с настройками кэширования для запросов React Query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});
