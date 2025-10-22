import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SearchPage } from './SearchPage';
import type { Page } from '../../entities/article/model/types';
import type { ArticleSummary } from '../../entities/article/model/types';

vi.mock('../../entities/article/api/queries', () => ({
  useArticlesQuery: vi.fn(),
}));

const { useArticlesQuery } = await import('../../entities/article/api/queries');

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Проверяет, что список результатов корректно отображается при успешном ответе API.
   */
  test('renders search results correctly', async () => {
    const mockData: Page<ArticleSummary> = {
      content: [
        {
          id: '1',
          slug: 'kak-varit-pastu',
          title: 'Как варить пасту',
          description: 'Подробное руководство',
          status: 'PUBLISHED',
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          slug: 'sousy-dlya-pasty',
          title: 'Тонкости соусов',
          description: 'Советы по приготовлению',
          status: 'PUBLISHED',
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 2,
      page: 0,
      size: 10,
    };

    vi.mocked(useArticlesQuery).mockReturnValue({
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
      <MemoryRouter initialEntries={["/search?q=pasta"]}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Как варить пасту')).toBeVisible();
    expect(await screen.findByText('Тонкости соусов')).toBeVisible();
  });

  /**
   * Убеждаемся, что при отсутствии результатов выводится соответствующее сообщение.
   */
  test('handles empty results', async () => {
    vi.mocked(useArticlesQuery).mockReturnValue({
      data: { content: [], total: 0, page: 0, size: 10 },
      isError: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    render(
      <MemoryRouter initialEntries={["/search?q=empty"]}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/ничего не найдено/i)).toBeVisible();
  });

  /**
   * Проверяем отображение состояния ошибки.
   */
  test('handles error state', async () => {
    vi.mocked(useArticlesQuery).mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      error: new Error('Ошибка запроса'),
      refetch: vi.fn(),
      status: 'error',
    } as any);

    render(
      <MemoryRouter initialEntries={["/search?q=fail"]}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/ошибка запроса/i)).toBeVisible();
  });
});
