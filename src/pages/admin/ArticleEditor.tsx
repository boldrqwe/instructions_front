import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import { createLowlight, common } from 'lowlight';
import type { Editor } from '@tiptap/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../shared/model/auth';
import { Input } from '../../shared/ui/Input/Input';
import { Textarea } from '../../shared/ui/Textarea/Textarea';
import { Button } from '../../shared/ui/Button/Button';
import { Toolbar, ToolbarButton, ToolbarSeparator } from '../../shared/ui/Toolbar/Toolbar';
import { Card } from '../../shared/ui/Card/Card';
import { slugify } from '../../shared/lib/slugify';
import {
  createArticle,
  getArticleById,
  publishArticle,
  unpublishArticle,
  updateArticle,
  uploadImage,
} from '../../entities/articles/api';
import type { ArticlePayload, ArticleStatus } from '../../entities/articles/types';
import { ArticleTOC, type TocHeading } from '../../widgets/ArticleTOC';
import styles from './ArticleEditor.module.css';

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => ({
          ...(attributes.id ? { id: attributes.id } : {}),
        }),
      },
    };
  },
}).configure({ levels: [1, 2, 3, 4] });

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      'data-upload-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-id'),
        renderHTML: (attrs) => (attrs['data-upload-id'] ? { 'data-upload-id': attrs['data-upload-id'] } : {}),
      },
    };
  },
});

type EditorMode = 'create' | 'edit';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UploadState {
  readonly id: string;
  readonly name: string;
  readonly status: 'uploading' | 'success' | 'error';
  readonly error?: string;
}

interface EditorSnapshot {
  readonly title: string;
  readonly slug: string;
  readonly summary: string;
  readonly tags: string;
  readonly coverImageUrl: string | null;
  readonly contentHtml: string;
  readonly contentJson: unknown;
}

const EMPTY_SNAPSHOT: EditorSnapshot = {
  title: '',
  slug: '',
  summary: '',
  tags: '',
  coverImageUrl: null,
  contentHtml: '<p></p>',
  contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
};

function toPayload(snapshot: EditorSnapshot): ArticlePayload {
  return {
    title: snapshot.title.trim() || undefined,
    slug: snapshot.slug.trim() || undefined,
    summary: snapshot.summary.trim() || undefined,
    coverImageUrl: snapshot.coverImageUrl || undefined,
    tags: snapshot.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    contentHtml: snapshot.contentHtml,
    contentJson: snapshot.contentJson,
  };
}

function diffPayload(prev: EditorSnapshot | null, next: EditorSnapshot): ArticlePayload {
  if (!prev) return toPayload(next);
  const payload: ArticlePayload = {};

  if (prev.title !== next.title) payload.title = next.title.trim() || undefined;
  if (prev.slug !== next.slug) payload.slug = next.slug.trim() || undefined;
  if (prev.summary !== next.summary) payload.summary = next.summary.trim() || undefined;
  if (prev.coverImageUrl !== next.coverImageUrl) payload.coverImageUrl = next.coverImageUrl || undefined;

  const prevTags = prev.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const nextTags = next.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (JSON.stringify(prevTags) !== JSON.stringify(nextTags)) {
    payload.tags = nextTags;
  }

  if (JSON.stringify(prev.contentJson) !== JSON.stringify(next.contentJson)) {
    payload.contentHtml = next.contentHtml;
    payload.contentJson = next.contentJson;
  }

  return payload;
}

function getInitialSnapshot(article?: {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly summary?: string | null;
  readonly tags?: string[] | null;
  readonly coverImageUrl?: string | null;
  readonly contentHtml: string;
  readonly contentJson: unknown;
  readonly status: ArticleStatus;
}): EditorSnapshot {
  if (!article) return EMPTY_SNAPSHOT;
  return {
    title: article.title,
    slug: article.slug,
    summary: article.summary ?? '',
    tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
    coverImageUrl: article.coverImageUrl ?? null,
    contentHtml: article.contentHtml,
    contentJson: article.contentJson,
  };
}

export function ArticleEditor() {
  const lowlight = useMemo(() => createLowlight(common), []);
  const { id } = useParams<{ id: string }>();
  const mode: EditorMode = id ? 'edit' : 'create';
  const navigate = useNavigate();
  const { authHeader } = useAuth();
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(EMPTY_SNAPSHOT);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [articleId, setArticleId] = useState<string | null>(id ?? null);
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>('DRAFT');
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [isReady, setIsReady] = useState(false);
  const lastSavedRef = useRef<EditorSnapshot | null>(null);
  const latestRef = useRef<EditorSnapshot>(EMPTY_SNAPSHOT);
  const unsavedRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);

  const { data: articleData } = useQuery({
    queryKey: ['article-admin', id, authHeader],
    queryFn: () => getArticleById(id as string, authHeader ?? undefined),
    enabled: mode === 'edit' && Boolean(id) && Boolean(authHeader),
  });

  useEffect(() => {
    if (!articleData) return;
    const initial = getInitialSnapshot(articleData);
    setSnapshot(initial);
    setArticleStatus(articleData.status);
    latestRef.current = initial;
    lastSavedRef.current = initial;
    setIsReady(true);
  }, [articleData]);

  useEffect(() => {
    if (mode === 'create') {
      setIsReady(true);
    }
  }, [mode]);

  useEffect(() => {
    latestRef.current = snapshot;
    unsavedRef.current = JSON.stringify(lastSavedRef.current) !== JSON.stringify(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (unsavedRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const updateHeadings = useCallback((editor: Editor) => {
    const headings: TocHeading[] = [];
    const slugMap = new Map<string, number>();
    let tr = editor.state.tr;
    let changed = false;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'heading') return true;
      const text = node.textContent.trim();
      if (!text) return true;
      const base = slugify(text);
      const count = (slugMap.get(base) ?? 0) + 1;
      slugMap.set(base, count);
      const idValue = count > 1 ? `${base}-${count}` : base;
      headings.push({ id: idValue, text, level: node.attrs.level });
      if (node.attrs.id !== idValue) {
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: idValue });
        changed = true;
      }
      return true;
    });

    if (changed) {
      tr.setMeta('addToHistory', false);
      editor.view.dispatch(tr);
    }

    setTocHeadings(headings);
  }, []);

  const handleSnapshotChange = useCallback(
    (update: Partial<EditorSnapshot>) => {
      setSnapshot((prev) => {
        const next = { ...prev, ...update };
        return next;
      });
    },
    [],
  );

  const handleImageInsertion = useCallback(
    async (file: File, editor: Editor) => {
      const uploadId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const objectUrl = URL.createObjectURL(file);
      setUploads((prev) => [...prev, { id: uploadId, name: file.name, status: 'uploading' }]);
      editor.chain().focus().setImage({ src: objectUrl, alt: file.name, 'data-upload-id': uploadId }).run();

      try {
        const { url } = await uploadImage(file, authHeader ?? undefined);
        editor.commands.command(({ tr, state }) => {
          let found = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs['data-upload-id'] === uploadId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                src: url,
                alt: node.attrs.alt ?? file.name,
                'data-upload-id': null,
              });
              found = true;
              return false;
            }
            return true;
          });
          if (!found) return false;
          tr.setMeta('addToHistory', false);
          editor.view.dispatch(tr);
          return true;
        });
        setUploads((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, status: 'success' } : item)),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки';
        editor.commands.command(({ tr, state }) => {
          let removed = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs['data-upload-id'] === uploadId) {
              tr.delete(pos, pos + node.nodeSize);
              removed = true;
              return false;
            }
            return true;
          });
          if (!removed) {
            return false;
          }
          tr.setMeta('addToHistory', false);
          editor.view.dispatch(tr);
          return true;
        });
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, status: 'error', error: message } : item,
          ),
        );
      } finally {
        URL.revokeObjectURL(objectUrl);
        setTimeout(() => {
          setUploads((prev) => prev.filter((item) => item.id !== uploadId));
        }, 2500);
      }
    },
    [authHeader],
  );

const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        link: false,
      }),
      CustomHeading,
      Underline,
      Link.configure({ autolink: true, openOnClick: false }),
      CustomImage,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      BulletList,
      OrderedList,
    ],
    editorProps: {
      attributes: {
        class: styles.editorContent,
        'aria-label': 'Редактор статьи',
      },
      handleDrop: (view, event) => {
        if (!event.dataTransfer?.files?.length) return false;
        const images = Array.from(event.dataTransfer.files).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (!images.length) return false;
        event.preventDefault();
        const instance = editorRef.current;
        if (!instance) return true;
        images.forEach((file) => {
          void handleImageInsertion(file, instance);
        });
        return true;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.files ?? []).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (!items.length) return false;
        event.preventDefault();
        const instance = editorRef.current;
        if (!instance) return true;
        items.forEach((file) => {
          void handleImageInsertion(file, instance);
        });
        return true;
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'h' && event.shiftKey && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          const instance = editorRef.current;
          if (!instance) return true;
          const currentLevel = [1, 2, 3, 4].find((level) => instance.isActive('heading', { level }));
          const nextLevel = currentLevel ? ((currentLevel % 4) + 1) : 1;
          instance.chain().focus().toggleHeading({ level: nextLevel }).run();
          return true;
        }
        return false;
      },
      handleTextInput: (view, from, to, text) => {
        if (text !== '`') return false;
        const instance = editorRef.current;
        if (!instance) return false;
        const state = view.state;
        const start = Math.max(0, from - 2);
        const textBefore = state.doc.textBetween(start, to, '\n', '\n') + text;
        if (textBefore.endsWith('```')) {
          view.dispatch(state.tr.deleteRange(from - 2, to));
          instance.chain().focus().toggleCodeBlock().run();
          return true;
        }
        return false;
      },
    },
    autofocus: true,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
      setTimeout(() => updateHeadings(editor), 0);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      handleSnapshotChange({ contentHtml: html, contentJson: json });
      updateHeadings(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateHeadings(editor);
    },
    content: EMPTY_SNAPSHOT.contentJson as Record<string, unknown>,
  });

  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor || !isReady) return;
    editor.commands.setContent(snapshot.contentJson as Record<string, unknown>, false);
    updateHeadings(editor);
  }, [editor, isReady, updateHeadings]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(true);
  }, [editor]);

  const performSave = useCallback(
    async (manual = false) => {
      if (!authHeader) return;
      const latest = latestRef.current;
      const lastSaved = lastSavedRef.current;
      if (
        !articleId &&
        !latest.title.trim() &&
        !latest.summary.trim() &&
        !latest.tags.trim() &&
        latest.contentHtml.replace(/<[^>]+>/g, '').trim().length === 0
      ) {
        return;
      }

      const diff = diffPayload(lastSaved, latest);
      if (!Object.keys(diff).length) {
        if (manual) setSaveStatus('saved');
        return;
      }

      setSaveStatus('saving');
      try {
        const response = articleId
          ? await updateArticle(articleId, diff, authHeader)
          : await createArticle(diff, authHeader);
        setArticleId(response.id);
        setArticleStatus(response.status);
        const nextSnapshot = getInitialSnapshot(response);
        const mergedSnapshot: EditorSnapshot = {
          ...latest,
          ...nextSnapshot,
        };
        lastSavedRef.current = mergedSnapshot;
        latestRef.current = mergedSnapshot;
        setSnapshot(mergedSnapshot);
        setSaveStatus('saved');
        unsavedRef.current = false;
      } catch (error) {
        console.error('Не удалось сохранить черновик', error);
        setSaveStatus('error');
      }
    },
    [articleId, authHeader],
  );

  useEffect(() => {
    if (!authHeader || !isReady) return;
    const timer = window.setInterval(() => {
      void performSave(false);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [authHeader, isReady, performSave]);

  const handlePublish = useCallback(async () => {
    if (!articleId || !authHeader) return;
    await performSave(true);
    const updated = await publishArticle(articleId, authHeader);
    setArticleStatus(updated.status);
    const fromServer = getInitialSnapshot(updated);
    const merged = { ...snapshot, ...fromServer };
    setSnapshot(merged);
    lastSavedRef.current = merged;
    latestRef.current = merged;
    setSaveStatus('saved');
    unsavedRef.current = false;
  }, [articleId, authHeader, performSave, snapshot]);

  const handleUnpublish = useCallback(async () => {
    if (!articleId || !authHeader) return;
    await performSave(true);
    const updated = await unpublishArticle(articleId, authHeader);
    setArticleStatus(updated.status);
    const fromServer = getInitialSnapshot(updated);
    const merged = { ...snapshot, ...fromServer };
    setSnapshot(merged);
    lastSavedRef.current = merged;
    latestRef.current = merged;
    setSaveStatus('saved');
    unsavedRef.current = false;
  }, [articleId, authHeader, performSave, snapshot]);

  const saveDraft = useCallback(() => {
    void performSave(true);
  }, [performSave]);

  const handleCoverUpload = useCallback(
    async (file: File) => {
      setSaveStatus('saving');
      try {
        const { url } = await uploadImage(file, authHeader ?? undefined);
        handleSnapshotChange({ coverImageUrl: url });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Cover upload failed', error);
        setSaveStatus('error');
      }
    },
    [authHeader, handleSnapshotChange],
  );

  const saveMessage = useMemo(() => {
    switch (saveStatus) {
      case 'saving':
        return 'Сохранение…';
      case 'saved':
        return 'Сохранено';
      case 'error':
        return 'Не удалось сохранить';
      default:
        return 'Готово к сохранению';
    }
  }, [saveStatus]);

  const disablePublish = !articleId || saveStatus === 'saving';

  const formattedStatus = articleStatus === 'PUBLISHED' ? 'Опубликована' : 'Черновик';

  return (
    <div className={styles.root}>
      <div className={styles.editorColumn}>
        <Card
          title="Основная информация"
          meta={`Статус: ${formattedStatus}`}
          actions={<span className={styles.status}>{saveMessage}</span>}
        >
          <div className={styles.formCard}>
            <Input
              value={snapshot.title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                handleSnapshotChange({ title: nextTitle });
                if (!slugTouched) {
                  handleSnapshotChange({ slug: slugify(nextTitle) });
                }
              }}
              placeholder="Введите заголовок"
              label="Title"
            />
            <div className={styles.row}>
              <Input
                value={snapshot.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  handleSnapshotChange({ slug: slugify(event.target.value) });
                }}
                placeholder="slug-stati"
                label="Slug"
                pattern="^[a-z0-9-]+$"
                title="Используйте латиницу, цифры и дефис"
                required
              />
              <Input
                value={snapshot.tags}
                onChange={(event) => handleSnapshotChange({ tags: event.target.value })}
                placeholder="tiptap, редактор"
                label="Tags"
                hint="Через запятую"
              />
            </div>
            <Textarea
              value={snapshot.summary}
              onChange={(event) => handleSnapshotChange({ summary: event.target.value })}
              placeholder="Краткое описание статьи"
            />
            <div>
              <div className={styles.coverActions}>
                <Input
                  label="Cover image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleCoverUpload(file);
                    }
                  }}
                />
                {snapshot.coverImageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSnapshotChange({ coverImageUrl: '' })}
                  >
                    Удалить обложку
                  </Button>
                ) : null}
              </div>
              <div className={styles.coverPreview}>
                {snapshot.coverImageUrl ? (
                  <img src={snapshot.coverImageUrl} alt="Обложка статьи" />
                ) : (
                  <span>Загрузите изображение для обложки</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.toolbarWrapper}>
          <Toolbar>
            <ToolbarButton
              aria-label="Жирный"
              pressed={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              aria-label="Курсив"
              pressed={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor}
            >
              I
            </ToolbarButton>
            <ToolbarButton
              aria-label="Подчёркнутый"
              pressed={editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={!editor}
            >
              U
            </ToolbarButton>
            <ToolbarButton
              aria-label="Зачёркнутый"
              pressed={editor?.isActive('strike')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              disabled={!editor}
            >
              S
            </ToolbarButton>
            <ToolbarSeparator />
            {[1, 2, 3, 4].map((level) => (
              <ToolbarButton
                key={level}
                aria-label={`Заголовок h${level}`}
                pressed={editor?.isActive('heading', { level })}
                onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
                disabled={!editor}
              >
                H{level}
              </ToolbarButton>
            ))}
            <ToolbarSeparator />
            <ToolbarButton
              aria-label="Список"
              pressed={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor}
            >
              •
            </ToolbarButton>
            <ToolbarButton
              aria-label="Нумерованный список"
              pressed={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={!editor}
            >
              1.
            </ToolbarButton>
            <ToolbarButton
              aria-label="Задача"
              pressed={editor?.isActive('taskList')}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              disabled={!editor}
            >
              ☑
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton
              aria-label="Цитата"
              pressed={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              disabled={!editor}
            >
              “ ”
            </ToolbarButton>
            <ToolbarButton
              aria-label="Код"
              pressed={editor?.isActive('codeBlock')}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              disabled={!editor}
            >
              {'</>'}
            </ToolbarButton>
            <ToolbarButton
              aria-label="Горизонтальная линия"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              disabled={!editor}
            >
              —
            </ToolbarButton>
            <ToolbarButton
              aria-label="Таблица"
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={!editor}
            >
              ⌗
            </ToolbarButton>
          </Toolbar>
        </div>

        <div className={styles.editorSurface}>
          <EditorContent editor={editor} />
        </div>

        {uploads.length ? (
          <Card title="Загрузки">
            <div className={styles.uploadList}>
              {uploads.map((item) => (
                <div key={item.id} className={styles.uploadItem}>
                  <span>{item.name}</span>
                  <span className={item.status === 'error' ? styles.uploadError : undefined}>
                    {item.status === 'uploading'
                      ? 'Загрузка…'
                      : item.status === 'success'
                        ? 'Готово'
                        : item.error ?? 'Ошибка'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <div className={styles.actions}>
          <Button onClick={saveDraft} disabled={!authHeader || saveStatus === 'saving'}>
            Сохранить черновик
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!snapshot.contentHtml.trim()) return;
              navigate('/articles/preview', {
                state: {
                  title: snapshot.title,
                  summary: snapshot.summary,
                  coverImageUrl: snapshot.coverImageUrl,
                  contentHtml: snapshot.contentHtml,
                },
              });
            }}
          >
            Превью
          </Button>
          <Button onClick={handlePublish} disabled={disablePublish}>
            Опубликовать
          </Button>
          {articleStatus === 'PUBLISHED' ? (
            <Button variant="danger" onClick={handleUnpublish} disabled={disablePublish}>
              Снять с публикации
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.sidebar}>
        <ArticleTOC headings={tocHeadings} />
      </div>
    </div>
  );
}
