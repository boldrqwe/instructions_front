import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError } from '../../shared/config/api';
import { MockIntersectionObserver } from '../../setupTests';
import { ArticlePage } from './ArticlePage';
import type { UseQueryResult } from '@tanstack/react-query'; // ✅ важно

// Мокаем API-хуки
vi.mock('../../entities/article/api/queries', () => {
  return {
    useArticleQuery: vi.fn(),
    useTocQuery: vi.fn(),
  };
});

vi.mock('../../shared/lib/scrollToAnchor', () => ({
  scrollToAnchor: vi.fn(() => true),
}));

const { useArticleQuery, useTocQuery } = await import('../../entities/article/api/queries');
const { scrollToAnchor } = await import('../../shared/lib/scrollToAnchor');

const baseArticle = {
  id: 'article-1',
  slug: 'test',
  title: 'Как готовить пасту',
  description: 'Подробное руководство.',
  status: 'PUBLISHED' as const,
  updatedAt: new Date().toISOString(),
  body: '# Введение\n\n## Первый шаг\nОписание шага.\n\n## Финальный шаг\nУспех.',
};

const baseToc = {
  articleId: 'article-1',
  items: [
    {
      id: 'chapter-1',
      title: 'Основы',
      sections: [
        { id: 'section-1', title: 'Первый шаг', anchor: 'первый-шаг', level: 2 },
        { id: 'section-2', title: 'Финальный шаг', anchor: 'финальный-шаг', level: 2 },
      ],
    },
  ],
};

describe('ArticlePage', () => {
  beforeEach(() => {
    vi.mocked(useArticleQuery).mockReturnValue({
      data: baseArticle,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as UseQueryResult<typeof baseArticle, Error>);

    vi.mocked(useTocQuery).mockReturnValue({
      data: baseToc,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as UseQueryResult<typeof baseToc, Error>);

    vi.mocked(scrollToAnchor).mockClear();
    MockIntersectionObserver.instances.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Проверяем переход по клику в оглавлении и подсветку активного раздела.
   */
  test('navigates to section via TOC click and marks it active', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/articles/test']}>
        <Routes>
          <Route path="/articles/:slug" element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const tocButton = await screen.findByRole('button', { name: 'Первый шаг' });
    await user.click(tocButton);

    expect(scrollToAnchor).toHaveBeenCalledWith('первый-шаг');

    const heading = await screen.findByRole('heading', { level: 2, name: 'Первый шаг' });
    const observer = MockIntersectionObserver.instances.at(-1);

    expect(observer).toBeDefined();

    await act(async () => {
      observer?.trigger([
        {
          target: heading,
          isIntersecting: true,
          intersectionRatio: 0.7,
          boundingClientRect: { top: 0 } as unknown as DOMRectReadOnly,
          intersectionRect: { top: 0 } as unknown as DOMRectReadOnly, // ✅ добавлено для TS5.8
          rootBounds: null,
          time: Date.now(),
        } as unknown as IntersectionObserverEntry, // ✅ безопасное приведение типов
      ]);
    });

    await waitFor(() => expect(tocButton).toHaveAttribute('aria-current', 'location'));
  });

  /**
   * Убеждаемся, что при переходе по хэшу выполняется прокрутка к нужному разделу.
   */
  test('scrolls to deep link anchor on initial load', async () => {
    render(
      <MemoryRouter initialEntries={['/articles/test#финальный-шаг']}>
        <Routes>
          <Route path="/articles/:slug" element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Финальный шаг' })).toBeVisible();

    await waitFor(() =>
      expect(scrollToAnchor).toHaveBeenCalledWith('финальный-шаг', { smooth: false }),
    );
  });

  /**
   * При ошибке 404 отображается страница «Не найдено».
   */
  test('renders not found page for missing article', async () => {
    vi.mocked(useArticleQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError({ code: 'NOT_FOUND', message: 'нет', status: 404 }),
    } as unknown as UseQueryResult<typeof baseArticle, Error>);

    render(
      <MemoryRouter initialEntries={['/articles/unknown']}>
        <Routes>
          <Route path="/articles/:slug" element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  });
});
