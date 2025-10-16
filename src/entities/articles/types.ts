/**
 * Возможные статусы статьи в административной панели.
 */
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

/**
 * Полное описание статьи, возвращаемое API.
 */
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

/**
 * Ответ API со списком статей и параметрами пагинации.
 */
export interface ArticleListResponse {
  readonly items: Article[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}

/**
 * Параметры фильтрации и пагинации списка статей.
 */
export interface ArticleQuery {
  readonly status?: ArticleStatus | 'ALL';
  readonly query?: string;
  readonly page?: number;
  readonly size?: number;
}

/**
 * Набор полей, необходимых для создания или обновления статьи.
 */
export interface ArticlePayload {
  readonly title: string;
  readonly slug: string;
  readonly summary?: string;
  readonly tags?: string[];
  readonly coverImageUrl?: string | null;
  readonly contentHtml: string;
  readonly contentJson: unknown;
}

/**
 * Ответ сервера при загрузке изображения.
 */
export interface UploadImageResponse {
  readonly url: string;
}
