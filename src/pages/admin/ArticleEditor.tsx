import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams, UNSAFE_NavigationContext } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';

import { useTiptapEditor } from './ArticleEditor/hooks/useTiptapEditor.ts';
import { replaceImageSource, removeImageBySrc } from './ArticleEditor/utils/editorImageUtils.ts';
import { EditorToolbar } from './EditorToolbar.tsx';
import { ArticleMetaForm } from './ArticleMetaForm.tsx';
import { ArticlePreview } from './ArticleEditor/ArticlePreview.tsx';

import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ArticleTOC } from '../../widgets/ArticleTOC.tsx';
import {
    createArticle,
    fetchArticleById,
    publishArticle,
    unpublishArticle,
    updateArticle,
    uploadArticleImage,
} from '../../entities/articles/api.ts';
import type {
    Article,
    ArticlePayload,
    ArticleStatus,
} from '../../entities/articles/types.ts';
import { useAuth } from '../../shared/model/auth.tsx';
import { slugify } from '../../shared/lib/slugify.ts';

import styles from './ArticleEditor.module.css';

interface ArticleEditorProps {
    readonly onEditorReady?: (editor: Editor) => void;
    readonly autoSaveDelayMs?: number;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Интерактивный редактор статей с автосохранением, загрузкой изображений и предпросмотром.
 *
 * @param onEditorReady Колбэк, вызываемый после инициализации редактора Tiptap.
 * @param autoSaveDelayMs Пользовательская задержка перед автосохранением (мс).
 * @returns Полноценная страница редактора с формой метаданных и предпросмотром.
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
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
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
    const navigationContext = useContext(UNSAFE_NavigationContext);
    const autoSaveDelay = autoSaveDelayMs ?? 1500;

    // блок выхода при несохранённых изменениях
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const nav = (navigationContext?.navigator as unknown) as { block: (cb: (tx: { retry: () => void }) => void) => () => void };
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
            if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
            pendingObjectUrls.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const persistDraft = useCallback(async (): Promise<Article | null> => {
        if (!authHeader) return null;
        setSaveStatus('saving');
        setError(null);
        const payload: ArticlePayload = {
            title: title.trim(),
            slug: slug.trim() || slugify(title),
            summary: summary.trim() ? summary.trim() : undefined,
            tags: tags.length ? tags : undefined,
            coverImageUrl: coverImageUrl || null,
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
            setUpdatedAt(result.updatedAt);
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

    const scheduleAutoSave = useCallback(() => {
        if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
        setHasUnsavedChanges(true);
        autoSaveTimer.current = window.setTimeout(() => {
            autoSaveTimer.current = undefined;
            void latestPersistDraft.current();
        }, autoSaveDelay);
    }, [autoSaveDelay]);

    // ==== редактор tiptap (починенные extensions, без дублей) ====
    const editor = useTiptapEditor({
        editorClassName: styles.editorContent,
        onUpdate: (ed) => {
            if (skipNextEditorUpdate.current) {
                skipNextEditorUpdate.current = false;
                return;
            }
            setContentHtml(ed.getHTML());
            setContentJson(ed.getJSON());
            scheduleAutoSave();
        },
        onFiles: async (ed, files) => {
            if (!authHeader) return;
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    setUploadError('Можно загрузить только изображения');
                    continue;
                }
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
    });

    // смена режима (новая/существующая)
    useEffect(() => {
        if (id) {
            setArticleId(id);
            setError(null);
            setHasUnsavedChanges(false);
            setSaveStatus('idle');
            return;
        }
        // сброс под новую статью
        setArticleId(null);
        setStatus('DRAFT');
        setTitle('');
        setSlug('');
        setSummary('');
        setTags([]);
        setCoverImageUrl('');
        setContentHtml('');
        setContentJson({});
        setUpdatedAt(null);
        setSaveStatus('idle');
        setHasUnsavedChanges(false);
        setUploadError(null);
        skipNextEditorUpdate.current = true;
        editor?.commands.clearContent(true);
    }, [editor, id]);

    // загрузка существующей статьи
    useEffect(() => {
        if (!id || !authHeader) return;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const article = await fetchArticleById(id, authHeader);
                if (cancelled) return;
                applyArticle(article);
            } catch (err) {
                if (!cancelled) setError((err as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authHeader, id]);

    const applyArticle = useCallback((article: Article) => {
        setArticleId(article.id);
        setStatus(article.status);
        setTitle(article.title);
        setSlug(article.slug);
        setSummary(article.summary ?? '');
        setTags(article.tags ?? []);
        setCoverImageUrl(article.coverImageUrl ?? '');
        setContentHtml(article.contentHtml);
        setContentJson(article.contentJson);
        setUpdatedAt(article.updatedAt);
        setUploadError(null);
        skipNextEditorUpdate.current = true;
        editor?.commands.setContent(article.contentJson ?? article.contentHtml ?? '<p></p>');
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
    }, [editor]);

    useEffect(() => {
        if (editor && onEditorReady) onEditorReady(editor);
    }, [editor, onEditorReady]);

    const isNewArticle = useMemo(() => !articleId, [articleId]);

    async function handleSaveButton() {
        const result = await persistDraft();
        if (result && isNewArticle) navigate(`/admin/articles/${result.id}/edit`, { replace: true });
    }

    async function handlePublish() {
        const saved = await persistDraft();
        if (!saved || !authHeader) return;
        try {
            const result = await publishArticle(saved.id, authHeader);
            setStatus(result.status);
            setHasUnsavedChanges(false);
            setSaveStatus('saved');
            setUpdatedAt(result.updatedAt);
        } catch (err) {
            setError((err as Error).message);
        }
    }

    async function handleUnpublish() {
        if (!articleId || !authHeader) return;
        try {
            const result = await unpublishArticle(articleId, authHeader);
            setStatus(result.status);
            setHasUnsavedChanges(false);
            setSaveStatus('saved');
            setUpdatedAt(result.updatedAt);
        } catch (err) {
            setError((err as Error).message);
        }
    }

    async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
        if (!authHeader || !event.target.files?.[0]) return;
        const file = event.target.files[0];
        if (!file.type.startsWith('image/')) { setUploadError('Можно загрузить только изображения'); return; }
        if (file.size > MAX_IMAGE_SIZE) { setUploadError('Размер изображения не должен превышать 10 МБ'); return; }
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

    if (!authHeader) return <p className={styles.hint}>Требуется авторизация</p>;

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
                        <Button variant="secondary" onClick={() => setPreviewOpen(p => !p)}>
                            {isPreviewOpen ? 'Скрыть предпросмотр' : 'Предпросмотр'}
                        </Button>
                        <Button onClick={handleSaveButton}>Сохранить черновик</Button>
                        {status === 'PUBLISHED'
                            ? <Button variant="secondary" onClick={handleUnpublish}>Снять с публикации</Button>
                            : <Button onClick={handlePublish}>Опубликовать</Button>}
                    </div>
                </div>

                {error ? <p className={styles.error}>Ошибка: {error}</p> : null}
                {isLoading ? <p className={styles.hint}>Загрузка статьи…</p> : null}

                <ArticleMetaForm
                    title={title}
                    slug={slug}
                    summary={summary}
                    tags={tags}
                    coverImageUrl={coverImageUrl}
                    isCoverUploading={isCoverUploading}
                    uploadError={uploadError}
                    onTitleChange={(v) => { setTitle(v); if (!slugManuallyEdited) setSlug(slugify(v)); scheduleAutoSave(); }}
                    onSlugChange={(v) => { setSlug(v); setSlugManuallyEdited(true); scheduleAutoSave(); }}
                    onSummaryChange={(v) => { setSummary(v); scheduleAutoSave(); }}
                    onTagsChange={(v) => { setTags(v); scheduleAutoSave(); }}
                    onCoverChange={handleCoverChange}
                    onCoverRemove={() => { setCoverImageUrl(''); scheduleAutoSave(); }}
                />

                <Card className={styles.editorCard}>
                    <EditorToolbar editor={editor} />
                    <div className={styles.editorContainer}>
                        <EditorContent editor={editor} />
                    </div>
                    {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
                </Card>

                {isPreviewOpen ? (
                    <Card className={styles.previewCard}>
                        <h2>Предпросмотр</h2>
                        <ArticlePreview
                            title={title}
                            summary={summary}
                            contentHtml={contentHtml}
                            updatedAt={updatedAt}
                        />
                    </Card>
                ) : null}
            </div>

            <div className={styles.sidebar}>
                <ArticleTOC editor={editor} />
            </div>
        </div>
    );
}
