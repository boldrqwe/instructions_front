import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SearchParams as QueryParams } from '../../entities/article/api';
import { SearchPage } from './SearchPage';

vi.mock('../../entities/article/api/queries', () => ({
  useSearchQuery: vi.fn(),
}));

const { useSearchQuery } = await import('../../entities/article/api/queries');

const results = {
  items: [
    {
      id: 'a-1',
      type: 'article' as const,
      title: 'API дизайн',
      snippet: 'Статья о проектировании API',
      articleId: 'article-1',
      articleSlug: 'api-design',
    },
    {
      id: 's-1',
      type: 'section' as const,
      title: 'Авторизация',
      snippet: 'Секция про токены.',
      articleId: 'article-2',
      articleSlug: 'security-guide',
      sectionId: 'section-45',
      sectionAnchor: 'auth-section',
    },
  ],
  total: 12,
};

describe('SearchPage', () => {
  const paramsHistory: QueryParams[] = [];

  beforeEach(() => {
    paramsHistory.length = 0;
    vi.useRealTimers();
    vi.mocked(useSearchQuery).mockImplementation((params) => {
      paramsHistory.push(params);
      if (!params.query.trim()) {
        return {
          data: { items: [], total: 0, page: params.page ?? 0, size: params.size ?? 10 },
          isFetching: false,
        };
      }
      return {
        data: {
          items: results.items,
          total: results.total,
          page: params.page ?? 0,
          size: params.size ?? 10,
        },
        isFetching: false,
      };
    });
  });

  test('debounces search input and paginates results', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Введите запрос');
    await user.type(input, 'api');

    expect(paramsHistory.some((params) => params.query === '')).toBe(true);

    await waitFor(() => expect(paramsHistory.at(-1)?.query).toBe('api'));

    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute('href', '/articles/security-guide#auth-section');

    const nextButton = screen.getByRole('button', { name: 'Вперёд' });
    await user.click(nextButton);

    expect(paramsHistory.at(-1)?.page).toBe(1);

  });
});
