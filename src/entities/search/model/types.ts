export interface SearchResult {
  id: string;
  type: 'article' | 'section';
  title: string;
  snippet: string;
  articleId: string;
  articleSlug: string;
  sectionId?: string;
  sectionAnchor?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
