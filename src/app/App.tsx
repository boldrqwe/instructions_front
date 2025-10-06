import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './providers/AppRouter';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
