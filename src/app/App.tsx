import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './providers/AppRouter';

/**
 * Главный компонент приложения, который оборачивает маршрутизацию в общие провайдеры.
 * @returns JSX-дерево с корневыми провайдерами и роутером.
 */
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
