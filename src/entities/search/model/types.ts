/**
 * Результат поиска по статьям или конкретным разделам.
 */
export interface SearchResult {
  id: string;
  type: 'article' | 'section';
  title: string;
  snippet: string;
  articleId: string;
  /**
   * Slug статьи; поле приходит в нижнем регистре (slug).
   */
  slug: string;
  sectionId?: string;
  sectionAnchor?: string;
}

/**
 * Универсальный тип страницы результатов с пагинацией.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
