import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

const DEFAULT_THEME = 'light';

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = DEFAULT_THEME;
  }, []);

  return <>{children}</>;
}
