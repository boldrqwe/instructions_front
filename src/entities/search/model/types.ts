export interface SearchResult {
  id: string;
  type: 'article' | 'section';
  title: string;
  snippet: string;
  articleId: string;
  slug: string;            // 👈 вместо Slug (с маленькой буквы)
  sectionId?: string;
  sectionAnchor?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
