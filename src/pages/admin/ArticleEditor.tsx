import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams, UNSAFE_NavigationContext } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { createLowlight, common } from 'lowlight';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { TagInput } from '../../shared/ui/TagInput';
import { Toolbar } from '../../shared/ui/Toolbar';
import { ArticleTOC } from '../../widgets/ArticleTOC';
import {
  createArticle,
  fetchArticleById,
  publishArticle,
  unpublishArticle,
  updateArticle,
  uploadArticleImage,
} from '../../entities/articles/api';
import type { Article, ArticlePayload, ArticleStatus } from '../../entities/articles/types';
import { useAuth } from '../../shared/model/auth';
import { slugify } from '../../shared/lib/slugify';
import styles from './ArticleEditor.module.css';

/**
 * Свойства редактора статьи: колбэк готовности и задержка авто-сохранения.
 */
interface ArticleEditorProps {
  readonly onEditorReady?: (editor: Editor) => void;
  readonly autoSaveDelayMs?: number;
}

/**
 * Максимальный размер изображения обложки или вставляемых картинок (10 МБ).
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Полнофункциональный редактор статей с автосохранением, загрузкой изображений и предпросмотром.
 */
export function ArticleEditor({ onEditorReady, autoSaveDelayMs }: ArticleEditorProps) {
  const { id } = useParams();
  const { authHeader } = useAuth();
  const navigate = useNavigate();

  const [articleId, setArticleId] = useState<string | null>(id ?? null);
  const [status, setStatus] = useState<ArticleStatus>('DRAFT');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentJson, setContentJson] = useState<unknown>({});
  const [isLoading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [isCoverUploading, setCoverUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const autoSaveTimer = useRef<number>();
  const latestPersistDraft = useRef<() => Promise<Article | null>>(() => Promise.resolve(null));
  const skipNextEditorUpdate = useRef(false);
  const pendingObjectUrls = useRef(new Set<string>());
  const editorRef = useRef<Editor | null>(null);
  const navigationContext = useContext(UNSAFE_NavigationContext);
  const autoSaveDelay = autoSaveDelayMs ?? 1500;

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // ↓ даём явный тип «есть block(...)»
    const nav = (navigationContext?.navigator as unknown) as {
      block: (cb: (tx: { retry: () => void }) => void) => () => void;
    };

    if (!nav || typeof nav.block !== 'function') return;

    const unblock = nav.block((tx) => {
      const shouldLeave = window.confirm('У вас есть несохранённые изменения. Выйти со страницы?');
      if (shouldLeave) {
        unblock();
        tx.retry();
      }
    });

    return unblock;
  }, [hasUnsavedChanges, navigationContext]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
      pendingObjectUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  /**
   * Сохраняет черновик статьи на сервере и обновляет локальное состояние.
   */
  const persistDraft = useCallback(async (): Promise<Article | null> => {
    if (!authHeader) return null;
    setSaveStatus('saving');
    setError(null);
    const payload: ArticlePayload = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      summary: summary.trim() ? summary.trim() : undefined,
      tags: tags.length ? tags : undefined,
      coverImageUrl: coverImageUrl ? coverImageUrl : null,
      contentHtml,
      contentJson,
    };

    try {
      const result = articleId
        ? await updateArticle(articleId, payload, authHeader)
        : await createArticle(payload, authHeader);
      setArticleId(result.id);
      setStatus(result.status);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      return result;
    } catch (err) {
      setSaveStatus('idle');
      setError((err as Error).message);
      return null;
    }
  }, [articleId, authHeader, contentHtml, contentJson, coverImageUrl, slug, summary, tags, title]);

  useEffect(() => {
    latestPersistDraft.current = persistDraft;
  }, [persistDraft]);

  /**
   * Планирует отложенное автосохранение и помечает форму как изменённую.
   */
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }
    setHasUnsavedChanges(true);
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = undefined;
      void latestPersistDraft.current();
    }, autoSaveDelay);
  }, [autoSaveDelay]);

  /**
   * Базовая подсветка синтаксиса для блоков кода.
   */
  const baseLowlight = createLowlight(common);

  // Защита от отсутствия метода highlight в окружении.
  const safeLowlight =
    typeof (baseLowlight as { highlight?: unknown }).highlight === 'function'
      ? baseLowlight
      : {
          highlight: () => ({ value: [], relevance: 0 }),
          listLanguages: () => [],
          registerLanguage: () => undefined,
        };

  /**
   * Конфигурация расширения таблиц, если оно доступно в окружении.
   */
  const tableExtension = Table?.configure
    ? Table.configure({ resizable: true })
    : null;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          bulletList: false,
          orderedList: false,
          link: false,
        }),
        Heading.configure({ levels: [1, 2, 3, 4] }),
        BulletList,
        OrderedList,
        Underline,
        Link.configure({ openOnClick: false }),
        Image.configure({ inline: false, allowBase64: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        CodeBlockLowlight.configure({ lowlight: safeLowlight }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        ...(tableExtension ? [tableExtension] : []),
      ],
      editorProps: {
        attributes: {
          class: styles.editorContent,
          'aria-label': 'Редактор содержимого',
        },
        handleDrop: (_view, event) => {
          if (!event.dataTransfer?.files?.length) return false;
          const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
          if (files.length === 0) return false;
          event.preventDefault();
          const instance = editorRef.current;
          if (instance) {
            void handleImageFiles(instance, files);
          }
          return true;
        },
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.files;
          if (!items || items.length === 0) return false;
          const files = Array.from(items).filter(file => file.type.startsWith('image/'));
          if (files.length === 0) return false;
          event.preventDefault();
          const instance = editorRef.current;
          if (instance) {
            void handleImageFiles(instance, files);
          }
          return true;
        },
      },
      onUpdate({ editor }) {
        if (skipNextEditorUpdate.current) {
          skipNextEditorUpdate.current = false;
          return;
        }
        setContentHtml(editor.getHTML());
        setContentJson(editor.getJSON());
        scheduleAutoSave();
      },
    },
    [],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  /**
   * Заменяет временный src изображения на постоянный URL после загрузки.
   */
  const replaceImageSource = useCallback((ed: Editor, currentSrc: string, nextSrc: string) => {
    const { state, view } = ed;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.src === currentSrc) {
        const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: nextSrc });
        view.dispatch(tr);
        return false;
      }
      return true;
    });
  }, []);

  /**
   * Удаляет изображение из редактора по известному источнику.
   */
  const removeImageBySrc = useCallback((ed: Editor, targetSrc: string) => {
    const { state, view } = ed;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.src === targetSrc) {
        const tr = state.tr.delete(pos, pos + node.nodeSize);
        view.dispatch(tr);
        return false;
      }
      return true;
    });
  }, []);

  /**
   * Загружает вставленные изображения: добавляет превью и заменяет на URL после загрузки.
   */
  const handleImageFiles = useCallback(
    async (ed: Editor, files: File[]) => {
      if (!authHeader) return;
      for (const file of files) {
        if (file.size > MAX_IMAGE_SIZE) {
          setUploadError('Размер изображения не должен превышать 10 МБ');
          continue;
        }
        setUploadError(null);
        const placeholder = URL.createObjectURL(file);
        pendingObjectUrls.current.add(placeholder);
        ed.chain().focus().setImage({ src: placeholder, alt: file.name }).run();
        try {
          const { url } = await uploadArticleImage(file, authHeader);
          replaceImageSource(ed, placeholder, url);
          scheduleAutoSave();
        } catch (err) {
          removeImageBySrc(ed, placeholder);
          setUploadError((err as Error).message);
        } finally {
          URL.revokeObjectURL(placeholder);
          pendingObjectUrls.current.delete(placeholder);
        }
      }
    },
    [authHeader, scheduleAutoSave, replaceImageSource, removeImageBySrc],
  );

  useEffect(() => {
    if (id) {
      setArticleId(id);
      setError(null);
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      return;
    }

    setArticleId(null);
    setStatus('DRAFT');
    setTitle('');
    setSlug('');
    setSlugManuallyEdited(false);
    setSummary('');
    setTags([]);
    setCoverImageUrl('');
    setContentHtml('');
    setContentJson({});
    setSaveStatus('idle');
    setHasUnsavedChanges(false);
    setUploadError(null);
    skipNextEditorUpdate.current = true;
    editor?.commands.clearContent(true);
  }, [editor, id]);

  useEffect(() => {
    if (!id || !authHeader) return;
    let cancelled = false;
    async function loadArticle() {
      try {
        setLoading(true);
        if (!id) return;
        if (!authHeader) return;
        const article = await fetchArticleById(id, authHeader);
        if (cancelled) return;
        applyArticle(article);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadArticle();
    return () => {
      cancelled = true;
    };
  }, [authHeader, id]);

  /**
   * Заполняет форму редактора данными загруженной статьи.
   */
  const applyArticle = useCallback(
    (article: Article) => {
      setArticleId(article.id);
      setStatus(article.status);
      setTitle(article.title);
      setSlug(article.slug);
      setSlugManuallyEdited(true);
      setSummary(article.summary ?? '');
      setTags(article.tags ?? []);
      setCoverImageUrl(article.coverImageUrl ?? '');
      setContentHtml(article.contentHtml);
      setContentJson(article.contentJson);
      setUploadError(null);
      skipNextEditorUpdate.current = true;
      editor?.commands.setContent(article.contentJson ?? article.contentHtml ?? '<p></p>');
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    },
    [editor],
  );

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const isNewArticle = useMemo(() => !articleId, [articleId]);

  /**
   * Сохраняет черновик по кнопке и перенаправляет на страницу редактирования при создании.
   */
  async function handleSaveButton() {
    const result = await persistDraft();
    if (result && isNewArticle) {
      navigate(`/admin/articles/${result.id}/edit`, { replace: true });
    }
  }

  /**
   * Публикует текущую статью после сохранения черновика.
   */
  async function handlePublish() {
    const saved = await persistDraft();
    if (!saved || !authHeader) return;
    try {
      const result = await publishArticle(saved.id, authHeader);
      setStatus(result.status);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /**
   * Снимает публикацию статьи и возвращает её в черновики.
   */
  async function handleUnpublish() {
    if (!articleId || !authHeader) return;
    try {
      const result = await unpublishArticle(articleId, authHeader);
      setStatus(result.status);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /**
   * Обрабатывает выбор файла обложки: проверяет размер и загружает на сервер.
   */
  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    if (!authHeader || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      setUploadError('Можно загрузить только изображения');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('Размер изображения не должен превышать 10 МБ');
      return;
    }
    try {
      setCoverUploading(true);
      const { url } = await uploadArticleImage(file, authHeader);
      setCoverImageUrl(url);
      setUploadError(null);
      scheduleAutoSave();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  /**
   * Набор кнопок панели инструментов редактора с командами Tiptap.
   */
  const toolbarButtons = useMemo(
    () => [
      {
        command: () => editor?.chain().focus().toggleBold().run(),
        label: 'Полужирный',
        icon: 'B',
        isActive: () => editor?.isActive('bold'),
      },
      {
        command: () => editor?.chain().focus().toggleItalic().run(),
        label: 'Курсив',
        icon: 'I',
        isActive: () => editor?.isActive('italic'),
      },
      {
        command: () => editor?.chain().focus().toggleUnderline().run(),
        label: 'Подчёркивание',
        icon: 'U',
        isActive: () => editor?.isActive('underline'),
      },
      {
        command: () => editor?.chain().focus().toggleStrike().run(),
        label: 'Зачёркивание',
        icon: 'S',
        isActive: () => editor?.isActive('strike'),
      },
      {
        command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        label: 'Заголовок 1 уровня',
        icon: 'H1',
        isActive: () => editor?.isActive('heading', { level: 1 }),
      },
      {
        command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        label: 'Заголовок 2 уровня',
        icon: 'H2',
        isActive: () => editor?.isActive('heading', { level: 2 }),
      },
      {
        command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
        label: 'Заголовок 3 уровня',
        icon: 'H3',
        isActive: () => editor?.isActive('heading', { level: 3 }),
      },
      {
        command: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
        label: 'Заголовок 4 уровня',
        icon: 'H4',
        isActive: () => editor?.isActive('heading', { level: 4 }),
      },
      {
        command: () => editor?.chain().focus().toggleBulletList().run(),
        label: 'Маркированный список',
        icon: '•',
        isActive: () => editor?.isActive('bulletList'),
      },
      {
        command: () => editor?.chain().focus().toggleOrderedList().run(),
        label: 'Нумерованный список',
        icon: '1.',
        isActive: () => editor?.isActive('orderedList'),
      },
      {
        command: () => editor?.chain().focus().toggleTaskList().run(),
        label: 'Чек-лист',
        icon: '☑',
        isActive: () => editor?.isActive('taskList'),
      },
      {
        command: () => editor?.chain().focus().toggleBlockquote().run(),
        label: 'Цитата',
        icon: '❝',
        isActive: () => editor?.isActive('blockquote'),
      },
      {
        command: () => editor?.chain().focus().toggleCodeBlock().run(),
        label: 'Блок кода',
        icon: '</>',
        isActive: () => editor?.isActive('codeBlock'),
      },
      {
        command: () => editor?.chain().focus().setHorizontalRule().run(),
        label: 'Разделитель',
        icon: '―',
        isActive: () => false,
      },
      {
        command: () => {
          const url = window.prompt('Введите ссылку');
          if (!url) return;
          editor?.chain().focus().setLink({ href: url, target: '_blank' }).run();
        },
        label: 'Ссылка',
        icon: '🔗',
        isActive: () => editor?.isActive('link'),
      },
      {
        command: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
        label: 'Таблица',
        icon: '▦',
        isActive: () => editor?.isActive('table'),
      },
    ],
    [editor],
  );

  if (!authHeader) {
    return <p className={styles.hint}>Требуется авторизация</p>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{id ? 'Редактирование статьи' : 'Новая статья'}</h1>
            <p className={styles.statusLine}>
              Статус: {status === 'PUBLISHED' ? 'опубликовано' : 'черновик'} ·{' '}
              {saveStatus === 'saving' ? 'Сохранение…' : saveStatus === 'saved' ? 'Сохранено' : 'Есть несохранённые изменения'}
            </p>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setPreviewOpen(prev => !prev)}>
              {isPreviewOpen ? 'Скрыть предпросмотр' : 'Предпросмотр'}
            </Button>
            <Button onClick={handleSaveButton}>Сохранить черновик</Button>
            {status === 'PUBLISHED' ? (
              <Button variant="secondary" onClick={handleUnpublish}>
                Снять с публикации
              </Button>
            ) : (
              <Button onClick={handlePublish}>Опубликовать</Button>
            )}
          </div>
        </div>

        {error ? <p className={styles.error}>Ошибка: {error}</p> : null}
        {isLoading ? <p className={styles.hint}>Загрузка статьи…</p> : null}

        <Card className={styles.formCard}>
          <div className={styles.fieldGrid}>
            <Input
              label="Заголовок"
              value={title}
              onChange={event => {
                const next = event.target.value;
                setTitle(next);
                if (!slugManuallyEdited) {
                  setSlug(slugify(next));
                }
                scheduleAutoSave();
              }}
              placeholder="Введите заголовок"
              required
            />
            <Input
              label="Slug"
              value={slug}
              onChange={event => {
                setSlug(event.target.value);
                setSlugManuallyEdited(true);
                scheduleAutoSave();
              }}
              placeholder="avtosozdannyi-slug"
              required
            />
          </div>
          <label className={styles.textareaLabel}>
            <span>Краткое описание</span>
            <textarea
              className={styles.textarea}
              value={summary}
              onChange={event => {
                setSummary(event.target.value);
                scheduleAutoSave();
              }}
              rows={4}
              placeholder="Кратко опишите содержание статьи"
            />
          </label>
          <TagInput value={tags} onChange={next => { setTags(next); scheduleAutoSave(); }} label="Теги" />
          <div className={styles.coverSection}>
            <label className={styles.coverLabel}>
              Обложка
              <input type="file" accept="image/*" onChange={handleCoverChange} disabled={isCoverUploading} />
            </label>
            {isCoverUploading ? <span className={styles.hint}>Загрузка изображения…</span> : null}
            {coverImageUrl ? (
              <div className={styles.coverPreview}>
                <img src={coverImageUrl} alt="Обложка статьи" />
                <Button variant="ghost" onClick={() => { setCoverImageUrl(''); scheduleAutoSave(); }}>
                  Удалить
                </Button>
              </div>
            ) : null}
            {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
          </div>
        </Card>

        <Card className={styles.editorCard}>
          <Toolbar ariaLabel="Инструменты редактора" className={styles.toolbar}>
            {toolbarButtons.map(button => (
              <button
                key={button.label}
                type="button"
                className={`${styles.toolbarButton} ${button.isActive() ? styles.toolbarButtonActive : ''}`.trim()}
                onClick={button.command}
                aria-label={button.label}
                aria-pressed={Boolean(button.isActive())}
              >
                {button.icon}
              </button>
            ))}
          </Toolbar>
          <div className={styles.editorContainer}>
            <EditorContent editor={editor} />
          </div>
          {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
        </Card>

        {isPreviewOpen ? (
          <Card className={styles.previewCard}>
            <h2>Предпросмотр</h2>
            <div className={styles.previewBody} dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </Card>
        ) : null}
      </div>
      <div className={styles.sidebar}>
        <ArticleTOC editor={editor} />
      </div>
    </div>
  );
}
