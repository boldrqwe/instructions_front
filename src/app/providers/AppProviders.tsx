import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from './queryClient';
import { AppErrorBoundary } from './AppErrorBoundary';
import { ThemeProvider } from './ThemeProvider';

interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Собирает общие провайдеры приложения: обработку ошибок, React Query и тему оформления.
 * @param props.children Дочернее дерево, которое нужно обернуть провайдерами.
 * @returns JSX-обертка для глобальных контекстов.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
