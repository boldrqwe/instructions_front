import type { Article, ArticleRequest } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const ARTICLES_ENDPOINT = `${API_BASE_URL}/api/articles`;

async function parseError(response: Response): Promise<never> {
  try {
    const data = await response.json();
    const message =
      typeof data === "string"
        ? data
        : data?.message || data?.error || data?.detail;
    throw new Error(message || `Не удалось выполнить запрос (${response.status})`);
  } catch (error) {
    if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
      throw error;
    }
    const fallback = await response.text();
    throw new Error(
      fallback?.length
        ? fallback
        : `Не удалось выполнить запрос (${response.status})`
    );
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listArticles(): Promise<Article[]> {
  const response = await fetch(ARTICLES_ENDPOINT);
  return handleResponse<Article[]>(response);
}

export async function createArticle(payload: ArticleRequest): Promise<Article> {
  const response = await fetch(ARTICLES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<Article>(response);
}

export async function updateArticle(
  id: number,
  payload: ArticleRequest,
): Promise<Article> {
  const response = await fetch(`${ARTICLES_ENDPOINT}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<Article>(response);
}

export async function deleteArticle(id: number): Promise<void> {
  const response = await fetch(`${ARTICLES_ENDPOINT}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseError(response);
  }
}
