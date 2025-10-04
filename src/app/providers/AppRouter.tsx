import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../shared/ui/Layout/Layout';
import { PageSpinner } from '../../shared/ui/PageSpinner/PageSpinner';

const HomePage = lazy(async () => {
  const module = await import('../../pages/HomePage/HomePage');
  return { default: module.HomePage };
});

const ArticlePage = lazy(async () => {
  const module = await import('../../pages/ArticlePage/ArticlePage');
  return { default: module.ArticlePage };
});

const SearchPage = lazy(async () => {
  const module = await import('../../pages/SearchPage/SearchPage');
  return { default: module.SearchPage };
});

const NotFoundPage = lazy(async () => {
  const module = await import('../../pages/NotFoundPage/NotFoundPage');
  return { default: module.NotFoundPage };
});

export function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles/:slug" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
