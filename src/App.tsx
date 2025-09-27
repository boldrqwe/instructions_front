import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./App.css";
import type { Article } from "./types";
import {
  createArticle,
  deleteArticle,
  listArticles,
  updateArticle,
} from "./services/articles";
import { ArticleList } from "./components/ArticleList";

function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    ["link", "image", "video"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "script",
  "list",
  "indent",
  "align",
  "blockquote",
  "code-block",
  "link",
  "image",
  "video",
];

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoadingList(true);
      try {
        const fetchedArticles = await listArticles();
        setArticles(sortArticles(fetchedArticles));
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoadingList(false);
      }
    }

    bootstrap();
  }, []);

  const isEditing = selectedId !== null;
  const canDelete = isEditing && !isSaving;

  async function refreshArticles() {
    setLoadingList(true);
    try {
      const fetchedArticles = await listArticles();
      const ordered = sortArticles(fetchedArticles);
      setArticles(ordered);

      if (selectedId !== null) {
        const current = ordered.find((article) => article.id === selectedId);
        if (current) {
          setTitle(current.title);
          setContent(current.content);
        } else {
          resetForm();
        }
      }
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setLoadingList(false);
    }
  }

  function resetForm() {
    setSelectedId(null);
    setTitle("");
    setContent("");
  }

  function handleNewArticle() {
    resetForm();
    setMessage(null);
    setError(null);
  }

  function handleSelectArticle(article: Article) {
    setSelectedId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setMessage(null);
    setError(null);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const plainContent = stripHtml(content);

    if (!trimmedTitle.length) {
      setError("Введите заголовок статьи.");
      return;
    }

    if (!plainContent.length) {
      setError("Введите содержимое статьи.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = { title: trimmedTitle, content };
      let saved: Article;

      if (selectedId === null) {
        saved = await createArticle(payload);
      } else {
        saved = await updateArticle(selectedId, payload);
      }

      setArticles((prev) =>
        sortArticles([saved, ...prev.filter((article) => article.id !== saved.id)]),
      );
      setSelectedId(saved.id);
      setTitle(saved.title);
      setContent(saved.content);
      setMessage(selectedId === null ? "Статья создана" : "Статья обновлена");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      setMessage(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (selectedId === null) {
      return;
    }

    if (!window.confirm("Удалить выбранную статью?")) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteArticle(selectedId);
      setArticles((prev) => prev.filter((article) => article.id !== selectedId));
      resetForm();
      setMessage("Статья удалена");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setMessage(null);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave();
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Конструктор инструкций</h1>
        <p className="app__subtitle">
          Создавайте, редактируйте и публикуйте статьи с богатыми форматами.
        </p>
      </header>
      <main className="app__content">
        <ArticleList
          articles={articles}
          selectedId={selectedId}
          loading={loadingList}
          onSelect={handleSelectArticle}
          onCreate={handleNewArticle}
          onRefresh={() => {
            void refreshArticles();
          }}
        />
        <section className="editor">
          <div className="editor__header">
            <h2>{isEditing ? "Редактирование статьи" : "Новая статья"}</h2>
            {message && (
              <span className="editor__status editor__status--success">{message}</span>
            )}
            {error && (
              <span className="editor__status editor__status--error">{error}</span>
            )}
          </div>
          <form className="editor__form" onSubmit={handleSubmit}>
            <label className="editor__field">
              <span>Заголовок</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, как развернуть приложение"
                disabled={isSaving}
                required
              />
            </label>
            <label className="editor__field">
              <span>Содержимое</span>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                placeholder="Опишите шаги, добавьте изображения и ссылки..."
              />
            </label>
            <div className="editor__actions">
              <button type="submit" className="primary" disabled={isSaving}>
                {isSaving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={handleNewArticle}
                className="secondary"
                disabled={isSaving}
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                className="danger"
                disabled={!canDelete}
              >
                Удалить
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
