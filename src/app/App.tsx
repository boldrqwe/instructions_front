import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './providers/AppRouter';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
