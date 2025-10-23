import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../shared/ui/Layout/Layout';
import { PageSpinner } from '../../shared/ui/PageSpinner/PageSpinner';
import { AuthProvider } from '../../shared/model/auth';
import { RequireAuth } from '../../shared/ui/RequireAuth';

// ВАЖНО: во всех страницах должны быть именованные экспорты:
// export function HomePage() { ... } и т.п.
/**
 * Лениво загружает домашнюю страницу, чтобы не тянуть лишний код при первом открытии.
 */
const HomePage = lazy(() =>
  import('../../pages/HomePage/HomePage').then(m => ({ default: m.HomePage }))
);
/**
 * Лениво подключает страницу поиска; подставляет именованный экспорт по умолчанию.
 */
const SearchPage = lazy(() =>
  import('../../pages/SearchPage/SearchPage').then(m => ({ default: m.SearchPage }))
);
/**
 * Загружает страницу статьи по требованию, уменьшая стартовый бандл.
 */
const ArticlePage = lazy(() =>
  import('../../pages/ArticlePage/ArticlePage').then(m => ({ default: m.ArticlePage }))
);
/**
 * Импортирует страницу 404 только при необходимости.
 */
const NotFoundPage = lazy(() =>
  import('../../pages/NotFoundPage/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
);
/**
 * Импортирует страницу авторизации администратора лениво.
 */
const LoginPage = lazy(() =>
  import('../../pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage }))
);
/**
 * Динамическая загрузка списка черновиков для административного раздела.
 */
const DraftsPage = lazy(() =>
  import('../../pages/admin/DraftsPage').then(m => ({ default: m.DraftsPage }))
);
/**
 * Ленивая загрузка страницы опубликованных статей для администрирования.
 */
const PublishedArticlesPage = lazy(() =>
  import('../../pages/admin/PublishedArticlesPage').then(m => ({ default: m.PublishedArticlesPage }))
);
/**
 * Ленивый импорт редактора статей, чтобы не грузить тяжелые зависимости заранее.
 */
const ArticleEditorPage = lazy(() =>
  import('../../pages/admin/ArticleEditor').then(m => ({ default: m.ArticleEditor }))
);

/**
 * Настраивает корневую маршрутизацию приложения, оборачивая страницы в провайдер авторизации,
 * макет и обработку ленивых загрузок.
 * @returns JSX с деревом `<BrowserRouter />` и определенными маршрутами.
 */
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
                    <DraftsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/articles/published"
                element={
                  <RequireAuth>
                    <PublishedArticlesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/articles/new"
                element={
                  <RequireAuth>
                    <ArticleEditorPage key="new" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/articles/:id/edit"
                element={
                  <RequireAuth>
                    <ArticleEditorPage />
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
