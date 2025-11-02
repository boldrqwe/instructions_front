import { isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import styles from './MarkdownView.module.css';

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

function countIndentUnits(line: string): { units: number; endIndex: number } {
    let units = 0;
    let index = 0;

    while (index < line.length) {
        const char = line[index];
        if (char === ' ') {
            units += 1;
        } else if (char === '\t') {
            units += 4;
        } else {
            break;
        }
        index += 1;
    }

    return { units, endIndex: index };
}

function trimIndentUnits(line: string, unitsToRemove: number): string {
    if (unitsToRemove <= 0) {
        return line;
    }

    let removedUnits = 0;
    let index = 0;

    while (index < line.length && removedUnits < unitsToRemove) {
        const char = line[index];
        if (char === ' ') {
            removedUnits += 1;
        } else if (char === '\t') {
            removedUnits += 4;
        } else {
            break;
        }
        index += 1;
    }

    return line.slice(index);
}

function normalizeMarkdownContent(raw: string): string {
    if (!raw) {
        return '';
    }

    const normalizedNewlines = raw.replace(/\r\n?/g, '\n');
    const lines = normalizedNewlines.split('\n');
    const markdownPattern = /^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>+\s+|```|~~~)/;

    let minimalIndent = Infinity;
    let inFence = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
            continue;
        }

        const trimmedStart = line.trimStart();
        if (trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')) {
            inFence = !inFence;
            continue;
        }

        if (inFence) {
            continue;
        }

        if (trimmedStart.startsWith('<')) {
            continue;
        }

        const { units } = countIndentUnits(line);
        if (units === 0) {
            minimalIndent = 0;
            break;
        }

        if (units < minimalIndent) {
            minimalIndent = units;
        }
    }

    if (!Number.isFinite(minimalIndent)) {
        minimalIndent = 0;
    }

    const dedentedLines: string[] = [];
    inFence = false;

    for (const line of lines) {
        const trimmedStart = line.trimStart();
        const isFence = trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~');

        if (isFence) {
            dedentedLines.push(trimIndentUnits(line, minimalIndent));
            inFence = !inFence;
            continue;
        }

        if (inFence) {
            dedentedLines.push(line);
            continue;
        }

        dedentedLines.push(trimIndentUnits(line, minimalIndent));
    }

    const finalLines: string[] = [];
    inFence = false;

    for (const line of dedentedLines) {
        const trimmedStart = line.trimStart();
        const isFence = trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~');

        if (isFence) {
            finalLines.push(trimmedStart);
            inFence = !inFence;
            continue;
        }

        if (inFence) {
            finalLines.push(line);
            continue;
        }

        const { units, endIndex } = countIndentUnits(line);
        if (units <= 3) {
            finalLines.push(line);
            continue;
        }

        const afterIndent = line.slice(endIndex);
        if (!markdownPattern.test(afterIndent)) {
            finalLines.push(line);
            continue;
        }

        const toRemove = units - 3;
        finalLines.push(trimIndentUnits(line, toRemove));
    }

    return finalLines.join('\n');
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
    const normalizedContent = useMemo(() => normalizeMarkdownContent(content), [content]);

    return (
        <div className={styles.root}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    rehypeRaw,                         // Разрешает HTML внутри Markdown
                    rehypeSlug,                        // Проставляет id для заголовков
                    [rehypeAutolinkHeadings, { behavior: 'append' }], // Делает заголовки ссылками
                    [rehypeSanitize, schema],          // Безопасная очистка
                ]}
                components={components}
            >
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
}
