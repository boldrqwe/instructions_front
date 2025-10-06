export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface Article {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly coverImageUrl?: string | null;
  readonly summary?: string | null;
  readonly tags?: string[] | null;
  readonly status: ArticleStatus;
  readonly contentHtml: string;
  readonly contentJson: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArticleListItem {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly updatedAt: string;
  readonly summary?: string | null;
}

export interface ArticlePayload {
  readonly title?: string;
  readonly slug?: string;
  readonly coverImageUrl?: string | null;
  readonly summary?: string | null;
  readonly tags?: string[] | null;
  readonly contentHtml?: string;
  readonly contentJson?: unknown;
}

export interface PagedResponse<T> {
  readonly content?: T[];
  readonly page?: number;
  readonly size?: number;
  readonly totalElements?: number;
}

export interface UploadImageResponse {
  readonly url: string;
}
