import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SearchPage } from './SearchPage';
import type { Page, SearchResult } from '../../entities/search/model/types';

vi.mock('../../entities/article/api/queries', () => ({
  useSearchQuery: vi.fn(),
}));

const { useSearchQuery } = await import('../../entities/article/api/queries');

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders search results correctly', async () => {
    const mockData: Page<SearchResult> = {
      items: [
        {
          id: '1',
          type: 'article',
          title: 'Как варить пасту',
          snippet: 'Подробное руководство',
          articleId: 'a1',
          articleSlug: 'kak-varit-pastu',
        },
        {
          id: '2',
          type: 'section',
          title: 'Тонкости соусов',
          snippet: 'Советы по приготовлению',
          articleId: 'a1',
          articleSlug: 'kak-varit-pastu',
          sectionId: 's1',
          sectionAnchor: 'sousy',
        },
      ],
      total: 2,
      page: 1,
      size: 10,
    };

    vi.mocked(useSearchQuery).mockReturnValue({
      data: mockData,
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetchError: false,
      isStale: false,
      isSuccess: true,
    } as any);

    render(
      <MemoryRouter initialEntries={['/search?q=паста']}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Как варить пасту')).toBeVisible();
    expect(await screen.findByText('Тонкости соусов')).toBeVisible();
  });

  test('handles empty results', async () => {
    vi.mocked(useSearchQuery).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 10 },
      isError: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    render(
      <MemoryRouter initialEntries={['/search?q=паста']}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/ничего не найдено/i)).toBeVisible();
  });

  test('handles error state', async () => {
    vi.mocked(useSearchQuery).mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      error: new Error('Ошибка запроса'),
      refetch: vi.fn(),
      status: 'error',
    } as any);

    render(
      <MemoryRouter initialEntries={['/search?q=паста']}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/ошибка запроса/i)).toBeVisible();
  });
});
