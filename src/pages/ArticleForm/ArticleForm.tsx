import { useState, type FormEvent } from 'react';
import { useAuth } from '../../shared/model/auth';

export type ArticleFormMode = 'create' | 'edit';

interface ArticleFormProps {
  mode: ArticleFormMode;
}

export function ArticleForm({ mode }: ArticleFormProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const { authHeader } = useAuth();

  const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
      'http://localhost:8080/api/v1';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = { title, slug, body };

    const res = await fetch(`${baseUrl}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      alert(`Ошибка сохранения: ${res.status} ${text}`);
      return;
    }

    alert(mode === 'create' ? 'Статья создана' : 'Статья сохранена');
    // TODO: navigate(`/articles/${slug}`)
  }

  return (
    <div style={{ maxWidth: 720, margin: '20px auto' }}>
      <h1>{mode === 'create' ? 'Создать статью' : 'Редактировать статью'}</h1>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Заголовок<br />
            <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Слаг (URL)<br />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="^[a-z0-9-]+$"
              title="только строчные латинские буквы, цифры и дефис"
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Текст<br />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} required style={{ width: '100%' }} />
          </label>
        </div>

        <button type="submit">{mode === 'create' ? 'Создать' : 'Сохранить'}</button>
      </form>
    </div>
  );
}
