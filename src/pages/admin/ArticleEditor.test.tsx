import type { ComponentProps } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { ArticleEditor } from './ArticleEditor';

vi.mock('../../shared/model/auth', () => ({
  useAuth: () => ({ authHeader: 'Bearer token', isAdmin: true, login: vi.fn(), logout: vi.fn() }),
}));

const createArticleMock = vi.fn();
const updateArticleMock = vi.fn();
const uploadImageMock = vi.fn();
const fetchArticleMock = vi.fn();

vi.mock('../../entities/articles/api', () => ({
  createArticle: (...args: unknown[]) => createArticleMock(...args),
  updateArticle: (...args: unknown[]) => updateArticleMock(...args),
  uploadArticleImage: (...args: unknown[]) => uploadImageMock(...args),
  fetchArticleById: (...args: unknown[]) => fetchArticleMock(...args),
  publishArticle: vi.fn(),
  unpublishArticle: vi.fn(),
  fetchArticles: vi.fn(),
}));

function renderWithRouter(path: string, editorProps?: ComponentProps<typeof ArticleEditor>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/articles/new" element={<ArticleEditor {...editorProps} />} />
        <Route path="/admin/articles/:id/edit" element={<ArticleEditor {...editorProps} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArticleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('создаёт оглавление после вставки заголовка', async () => {
    const editorRef: { current: TiptapEditor | null } = { current: null };
    renderWithRouter('/admin/articles/new', {
      onEditorReady: editor => {
        editorRef.current = editor;
      },
    });

    await waitFor(() => expect(editorRef.current).not.toBeNull());

    act(() => {
      editorRef.current!
        .chain()
        .focus()
        .clearContent()
        .setHeading({ level: 2 })
        .insertContent('Раздел 1')
        .run();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Раздел 1' })).toBeInTheDocument();
    });
  });

  it('загружает изображение при вставке изображения', async () => {
    uploadImageMock.mockResolvedValue({ url: 'https://cdn/img.png' });
    const editorRef: { current: TiptapEditor | null } = { current: null };
    renderWithRouter('/admin/articles/new', {
      onEditorReady: editor => {
        editorRef.current = editor;
      },
    });

    await waitFor(() => expect(editorRef.current).not.toBeNull());

    const file = new File(['hello'], 'pic.png', { type: 'image/png' });
    const files = {
      0: file,
      length: 1,
      item: () => file,
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;
    const editorArea = document.querySelector('[contenteditable="true"]') as HTMLElement;
    editorArea.focus();

    fireEvent.paste(editorArea, {
      clipboardData: {
        files,
        types: ['Files'],
        getData: () => '',
      },
    });

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalledWith(file, 'Bearer token');
    });
  });

  it('выполняет автосохранение через 1500 мс', async () => {
    const article = {
      id: 'a1',
      title: 'Старый заголовок',
      slug: 'staryj-zagolovok',
      status: 'DRAFT' as const,
      summary: 'Описание',
      tags: ['tag'],
      coverImageUrl: null,
      contentHtml: '<p>Текст</p>',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Текст',
              },
            ],
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fetchArticleMock.mockResolvedValue(article);
    updateArticleMock.mockResolvedValue({ ...article, title: 'Новый заголовок' });

    renderWithRouter('/admin/articles/a1/edit', { autoSaveDelayMs: 30 });

    await waitFor(() => expect(fetchArticleMock).toHaveBeenCalled());

    const titleInput = await screen.findByPlaceholderText('Введите заголовок');
    await waitFor(() => expect(titleInput).toHaveValue('Старый заголовок'));
    fireEvent.change(titleInput, { target: { value: 'Новый заголовок' } });

    expect(updateArticleMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(updateArticleMock).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ title: 'Новый заголовок' }),
        'Bearer token',
      );
    }, { timeout: 500 });

    await screen.findByText(/Сохранено/);
  });
});
