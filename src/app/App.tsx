import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { SearchPage } from './pages/SearchPage/SearchPage';
import { RequireAuth } from './shared/ui/RequireAuth';
import { Layout } from './shared/ui/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin/*"
          element={
            <RequireAuth>
              <div>Админка</div>
            </RequireAuth>
          }
        />
      </Routes>
    </Layout>
  );
}
