export interface Article {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRequest {
  title: string;
  content: string;
}
