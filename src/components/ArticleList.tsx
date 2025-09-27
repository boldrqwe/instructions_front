import type { Article } from "../types";

interface ArticleListProps {
  articles: Article[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (article: Article) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(dateIso: string): string {
  try {
    return dateFormatter.format(new Date(dateIso));
  } catch (error) {
    console.error("Не удалось отформатировать дату", error);
    return dateIso;
  }
}

export function ArticleList({
  articles,
  selectedId,
  loading,
  onSelect,
  onCreate,
  onRefresh,
}: ArticleListProps) {
  return (
    <aside className="article-list">
      <div className="article-list__header">
        <h2>Статьи</h2>
        <button
          type="button"
          className="article-list__refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Обновить список"
        >
          ⟳
        </button>
      </div>
      <button type="button" className="article-list__new" onClick={onCreate}>
        + Новая статья
      </button>
      {loading ? (
        <p className="article-list__status">Загрузка…</p>
      ) : articles.length === 0 ? (
        <p className="article-list__status">Статей пока нет. Создайте первую!</p>
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <button
                type="button"
                className={`article-list__item${
                  selectedId === article.id ? " article-list__item--active" : ""
                }`}
                onClick={() => onSelect(article)}
              >
                <span className="article-list__item-title">{article.title}</span>
                <span className="article-list__item-date">
                  {formatDate(article.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
