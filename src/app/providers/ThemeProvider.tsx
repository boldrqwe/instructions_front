import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * Имя темы, применяемой по умолчанию при загрузке приложения.
 */
const DEFAULT_THEME = 'light';

/**
 * Проставляет атрибут темы на корневом элементе документа и возвращает дочерние элементы без изменений.
 * @param props.children Компоненты, которым требуется доступ к установленной теме.
 * @returns JSX-фрагмент с потомками.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = DEFAULT_THEME;
  }, []);

  return <>{children}</>;
}
