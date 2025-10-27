import { useEffect, useMemo, useRef, useState } from 'react';

import { scrollToAnchor } from '../../../shared/lib/scrollToAnchor';
import { useHtmlToc } from '../../../shared/lib/useHtmlToc';
import { MarkdownView } from '../../../widgets/MarkdownView/MarkdownView';
import { Toc, type UiTocChapter } from '../../../widgets/Toc/Toc';
import { buildChaptersFromTocItems } from '../../../widgets/Toc/lib/buildChaptersFromTocItems';
import articleStyles from '../../ArticlePage/ArticlePage.module.css';
import styles from './ArticlePreview.module.css';

interface ArticlePreviewProps {
    readonly title: string;
    readonly summary: string;
    readonly contentHtml: string;
    readonly updatedAt?: string | null;
}

function normalizeId(id: string) {
    return id.startsWith('user-content-') ? id.replace('user-content-', '') : id;
}

export function ArticlePreview({ title, summary, contentHtml, updatedAt }: ArticlePreviewProps) {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string>();
    const [isDesktop, setIsDesktop] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(false);

    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 1024);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const tocFlat = useHtmlToc(contentHtml);
    const tocChapters: UiTocChapter[] = useMemo(
        () => buildChaptersFromTocItems(tocFlat),
        [tocFlat],
    );

    const contentRoot = contentRef.current;

    const headingElements = useMemo<HTMLElement[]>(() => {
        if (!contentRoot || tocFlat.length === 0) return [];
        const esc = (value: string) =>
            typeof window.CSS?.escape === 'function' ? window.CSS.escape(value) : value;

        return tocFlat
            .map((h) => {
                const id = esc(h.id);
                const selectors = [`#${id}`, `#user-content-${id}`];
                return selectors
                    .map((selector) => contentRoot.querySelector<HTMLElement>(selector))
                    .find((el): el is HTMLElement => Boolean(el));
            })
            .filter((el): el is HTMLElement => Boolean(el));
    }, [contentRoot, tocFlat]);

    useEffect(() => {
        if (headingElements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible.length > 0) {
                    const id = (visible[0].target as HTMLElement).id;
                    setActiveSectionId(normalizeId(id));
                    return;
                }

                const firstAbove = entries
                    .filter((entry) => entry.boundingClientRect.top < 0)
                    .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);

                if (firstAbove.length > 0) {
                    const id = (firstAbove[0].target as HTMLElement).id;
                    setActiveSectionId(normalizeId(id));
                }
            },
            {
                rootMargin: '-40% 0px -40% 0px',
                threshold: [0.1, 0.25, 0.5, 0.75],
            },
        );

        headingElements.forEach((el) => observer.observe(el));
        return () => {
            headingElements.forEach((el) => observer.unobserve(el));
            observer.disconnect();
        };
    }, [headingElements]);

    useEffect(() => {
        if (isDesktop) setIsTocOpen(false);
    }, [isDesktop]);

    const isTocVisible = isDesktop || isTocOpen;

    const formattedDate = useMemo(() => {
        if (!updatedAt) {
            return new Date().toLocaleDateString('ru-RU');
        }

        const date = new Date(updatedAt);
        if (Number.isNaN(date.getTime())) {
            return new Date().toLocaleDateString('ru-RU');
        }

        return date.toLocaleDateString('ru-RU');
    }, [updatedAt]);

    const hasContent = contentHtml.trim().length > 0;

    return (
        <article className={articleStyles.layout}>
            {tocChapters.length > 0 && (
                <Toc
                    items={tocChapters}
                    activeId={activeSectionId}
                    onNavigate={(id: string) => {
                        scrollToAnchor(id);
                        setActiveSectionId(id);
                        if (!isDesktop) setIsTocOpen(false);
                    }}
                    isOpen={isTocVisible}
                    onClose={!isDesktop ? () => setIsTocOpen(false) : undefined}
                />
            )}

            <div className={articleStyles.content}>
                {!isDesktop && tocChapters.length > 0 && (
                    <button
                        type="button"
                        className={articleStyles.tocToggle}
                        onClick={() => setIsTocOpen((value) => !value)}
                    >
                        {isTocOpen ? 'Скрыть оглавление' : 'Открыть оглавление'}
                    </button>
                )}

                <div className={articleStyles.article}>
                    <header className={articleStyles.header}>
                        <h1 className={articleStyles.title}>
                            {title.trim() || 'Без заголовка'}
                        </h1>
                        {summary.trim() ? (
                            <p className={articleStyles.description}>{summary}</p>
                        ) : null}
                        <span className={articleStyles.meta}>
                            Обновлено {formattedDate}
                        </span>
                    </header>

                    <div className={articleStyles.articleBody} ref={contentRef}>
                        {hasContent ? (
                            <MarkdownView content={contentHtml} />
                        ) : (
                            <p className={styles.placeholder}>
                                Добавьте текст статьи, чтобы увидеть предпросмотр.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
