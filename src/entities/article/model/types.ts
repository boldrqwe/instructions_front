/**
 * Статус статьи, используемый на клиенте для отображения и фильтрации.
 */
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

/**
 * Краткое описание статьи, используемое в списках.
 */
export interface ArticleSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: ArticleStatus;
  readonly updatedAt: string;
}

/**
 * Полное представление статьи для страницы чтения.
 */
export interface Article {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: ArticleStatus;
  readonly updatedAt: string;
  readonly body: string;
}

/**
 * Раздел статьи, представляющий конкретный заголовок в таблице содержимого.
 */
export interface Section {
  readonly id: string;
  readonly title: string;
  readonly anchor: string;
  readonly level: number;
}

/**
 * Глава статьи, объединяющая несколько разделов.
 */
export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly sections: Section[];
}

/**
 * Структура таблицы содержимого статьи.
 */
export interface Toc {
  readonly articleId: string;
  readonly items: Chapter[];
}

/**
 * Тип результата поиска: статья целиком или конкретный раздел.
 */
export type SearchResultType = 'article' | 'section';

/**
 * Результат поиска по статьям или разделам.
 */
export interface SearchResult {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly snippet: string;
  readonly articleId: string;
  readonly slug: string;
  readonly sectionId?: string;
  readonly sectionAnchor?: string;
}

/**
 * Обобщённый формат пагинации, возвращаемый API.
 */
export interface Page<TItem> {
  /**
   * Новый формат от API (Spring Data)
   */
  readonly content?: TItem[];
  readonly totalElements?: number;
  readonly total?: number;
  readonly page: number;
  readonly size: number;
}
