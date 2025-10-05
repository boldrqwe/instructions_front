export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface ArticleSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: ArticleStatus;
  readonly updatedAt: string;
}

export interface Article {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: ArticleStatus;
  readonly updatedAt: string;
  readonly body: string;
}

export interface Section {
  readonly id: string;
  readonly title: string;
  readonly anchor: string;
  readonly level: number;
}

export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly sections: Section[];
}

export interface Toc {
  readonly articleId: string;
  readonly items: Chapter[];
}

export type SearchResultType = 'article' | 'section';

export interface SearchResult {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly snippet: string;
  readonly articleId: string;
  readonly articleSlug: string;
  readonly sectionId?: string;
  readonly sectionAnchor?: string;
}

export interface Page<TItem> {
  /** Новый формат от API (Spring Data) */
  readonly content?: TItem[];
  readonly totalElements?: number;
  readonly total?: number;
  readonly page: number;
  readonly size: number;
}

