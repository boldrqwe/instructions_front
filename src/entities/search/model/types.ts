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
  content: T[];           // ← исправлено под реальный JSON
  page: number;
  size: number;
  totalElements: number;
}
