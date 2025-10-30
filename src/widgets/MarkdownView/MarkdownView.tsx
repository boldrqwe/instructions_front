import { isValidElement, useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import styles from './MarkdownView.module.css';
import { rehypeWrapStandaloneCode } from './lib/rehypeWrapStandaloneCode';

/**
 * Безопасная схема для `rehype-sanitize`, разрешающая нужные HTML-теги.
 * Это защищает от XSS и оставляет нужные элементы (заголовки, таблицы, изображения и т.д.).
 */
const baseTagNames = (defaultSchema.tagNames || []).filter((tag) => tag !== 'div');

const schema = {
    ...defaultSchema,
    tagNames: [
        ...baseTagNames,
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'span',
    ],
    attributes: {
        ...(defaultSchema.attributes || {}),
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
        a:  [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
        img:[...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
        pre:[...(defaultSchema.attributes?.pre || []), 'data-language'],
        code:[...(defaultSchema.attributes?.code || []), 'className', 'data-language'],
    },
};

type CodeProps = ComponentPropsWithoutRef<'code'> &
    ExtraProps & {
        inline?: boolean;
    };

type PreProps = ComponentPropsWithoutRef<'pre'> & ExtraProps;

type CodeElementProps = {
    className?: string;
    children?: ReactNode;
    'data-language'?: string;
};

function extractText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (!node) {
        return '';
    }

    if (Array.isArray(node)) {
        return node.map((child) => extractText(child)).join('');
    }

    if (isValidElement(node)) {
        return extractText(node.props.children);
    }

    return '';
}

const components: Components = {
    code({ inline, className, children, node: _node, ...props }: CodeProps) {
        if (inline) {
            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }

        return (
            <code className={className} {...props}>
                {String(children).replace(/\n$/, '')}
            </code>
        );
    },
    pre({ children, node: _node, ...props }: PreProps) {
        const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
        const [copiedLineIndex, setCopiedLineIndex] = useState<number | null>(null);
        const resetTimerRef = useRef<number | null>(null);
        const lineResetTimerRef = useRef<number | null>(null);
        const childArray = Array.isArray(children) ? children : [children];
        const firstChild = childArray[0];

        useEffect(() => {
            return () => {
                if (resetTimerRef.current) {
                    window.clearTimeout(resetTimerRef.current);
                }
                if (lineResetTimerRef.current) {
                    window.clearTimeout(lineResetTimerRef.current);
                }
            };
        }, []);

        const scheduleReset = () => {
            if (resetTimerRef.current) {
                window.clearTimeout(resetTimerRef.current);
            }

            resetTimerRef.current = window.setTimeout(() => {
                setCopyStatus('idle');
            }, 2000);
        };

        const scheduleLineReset = () => {
            if (lineResetTimerRef.current) {
                window.clearTimeout(lineResetTimerRef.current);
            }

            lineResetTimerRef.current = window.setTimeout(() => {
                setCopiedLineIndex(null);
            }, 1500);
        };

        const copyText = async (value: string) => {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                return;
            }

            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        };

        if (isValidElement<CodeElementProps>(firstChild)) {
            const { children: _ignoredChildren, className, ...restCodeProps } = firstChild.props;
            const languageMatch = /language-([\w-]+)/.exec(className || '');
            const language = languageMatch?.[1]?.toUpperCase();
            const rawCode = firstChild.props.children;
            const codeContent = extractText(rawCode).replace(/\n$/, '');
            const lines = codeContent.split('\n');
            const combinedClassName = [className, styles.code].filter(Boolean).join(' ');

            const handleCopy = async () => {
                try {
                    await copyText(codeContent);
                    setCopyStatus('copied');
                } catch (error) {
                    console.error('Failed to copy code', error);
                    setCopyStatus('error');
                } finally {
                    scheduleReset();
                }
            };

            const handleCopyLine = async (lineValue: string, index: number) => {
                try {
                    await copyText(lineValue);
                    setCopiedLineIndex(index);
                } catch (error) {
                    console.error('Failed to copy line', error);
                } finally {
                    scheduleLineReset();
                }
            };

            const copyLabel =
                copyStatus === 'copied'
                    ? 'Скопировано!'
                    : copyStatus === 'error'
                        ? 'Ошибка'
                        : 'Скопировать';

            return (
                <div className={styles.codeBlock}>
                    <div className={styles.codeHeader}>
                        <span className={styles.languageBadge}>
                            {language || 'TEXT'}
                        </span>
                        <button
                            type="button"
                            className={styles.copyButton}
                            onClick={handleCopy}
                            aria-live="polite"
                        >
                            {copyLabel}
                        </button>
                    </div>
                    <pre data-language={language} className={styles.pre} {...props}>
                        <code className={combinedClassName} data-language={language} {...restCodeProps}>
                            {lines.map((line, index) => (
                                <span
                                    key={`code-line-${index}`}
                                    className={
                                        index === copiedLineIndex
                                            ? `${styles.codeLine} ${styles.codeLineCopied}`
                                            : styles.codeLine
                                    }
                                >
                                    <button
                                        type="button"
                                        className={
                                            index === copiedLineIndex
                                                ? `${styles.lineNumberButton} ${styles.lineNumberButtonActive}`
                                                : styles.lineNumberButton
                                        }
                                        onClick={() => handleCopyLine(line, index)}
                                        aria-label={`Скопировать строку ${index + 1}`}
                                    >
                                        {index + 1}
                                    </button>
                                    <span className={styles.lineContent}>
                                        {line === '' ? '\u00A0' : line}
                                    </span>
                                </span>
                            ))}
                        </code>
                    </pre>
                </div>
            );
        }

        return (
            <pre {...props}>{children}</pre>
        );
    },
};

/**
 * Компонент безопасного рендеринга Markdown + HTML контента.
 *
 * @param content - Текст статьи в формате Markdown или HTML.
 *
 * @remarks
 * - Поддерживает HTML через `rehypeRaw`.
 * - Добавляет `id` ко всем заголовкам (`rehypeSlug`).
 * - Делает заголовки кликабельными для навигации (`rehypeAutolinkHeadings`).
 * - Очищает разметку от нежелательных тегов (`rehypeSanitize`).
 *
 * @example
 * ```tsx
 * <MarkdownView content={article.body} />
 * ```
 */
export function MarkdownView({ content }: { content: string }) {
    return (
        <div className={styles.root}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    rehypeRaw,                         // Разрешает HTML внутри Markdown
                    rehypeWrapStandaloneCode,          // Превращает одиночные <code> в полноценные блоки
                    rehypeSlug,                        // Проставляет id для заголовков
                    [rehypeAutolinkHeadings, { behavior: 'append' }], // Делает заголовки ссылками
                    [rehypeSanitize, schema],          // Безопасная очистка
                ]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
