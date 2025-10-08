export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface Article {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly summary?: string;
  readonly tags?: string[];
  readonly coverImageUrl?: string;
  readonly contentHtml: string;
  readonly contentJson: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArticleListResponse {
  readonly items: Article[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}

export interface ArticleQuery {
  readonly status?: ArticleStatus | 'ALL';
  readonly query?: string;
  readonly page?: number;
  readonly size?: number;
}

export interface ArticlePayload {
  readonly title: string;
  readonly slug: string;
  readonly summary?: string;
  readonly tags?: string[];
  readonly coverImageUrl?: string | null;
  readonly contentHtml: string;
  readonly contentJson: unknown;
}

export interface UploadImageResponse {
  readonly url: string;
}
