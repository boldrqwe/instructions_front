import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../shared/ui/Layout/Layout';
import { PageSpinner } from '../../shared/ui/PageSpinner/PageSpinner';
import { AuthProvider } from '../../shared/model/auth';
import { RequireAuth } from '../../shared/ui/RequireAuth';

// ВАЖНО: во всех страницах должны быть именованные экспорты:
// export function HomePage() { ... } и т.п.
const HomePage = lazy(() =>
  import('../../pages/HomePage/HomePage').then(m => ({ default: m.HomePage }))
);
const SearchPage = lazy(() =>
  import('../../pages/SearchPage/SearchPage').then(m => ({ default: m.SearchPage }))
);
const ArticlePage = lazy(() =>
  import('../../pages/ArticlePage/ArticlePage').then(m => ({ default: m.ArticlePage }))
);
const NotFoundPage = lazy(() =>
  import('../../pages/NotFoundPage/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
);
const LoginPage = lazy(() =>
  import('../../pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage }))
);
const ArticleForm = lazy(() =>
  import('../../pages/ArticleForm/ArticleForm').then(m => ({ default: m.ArticleForm }))
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/articles/:slug" element={<ArticlePage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route
                path="/admin/articles/new"
                element={
                  <RequireAuth>
                    <ArticleForm mode="create" />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
