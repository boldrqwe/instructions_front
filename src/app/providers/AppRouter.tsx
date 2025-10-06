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
const AdminDraftsPage = lazy(() =>
  import('../../pages/admin/DraftsPage').then(m => ({ default: m.DraftsPage }))
);
const AdminArticleEditor = lazy(() =>
  import('../../pages/admin/ArticleEditor').then(m => ({ default: m.ArticleEditor }))
);
const ArticlePreviewPage = lazy(() =>
  import('../../pages/admin/ArticlePreviewPage').then(m => ({ default: m.ArticlePreviewPage }))
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
                path="/admin/articles/drafts"
                element={
                  <RequireAuth>
                    <AdminDraftsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/articles/new"
                element={
                  <RequireAuth>
                    <AdminArticleEditor />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/articles/:id/edit"
                element={
                  <RequireAuth>
                    <AdminArticleEditor />
                  </RequireAuth>
                }
              />
              <Route
                path="/articles/preview"
                element={
                  <RequireAuth>
                    <ArticlePreviewPage />
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
