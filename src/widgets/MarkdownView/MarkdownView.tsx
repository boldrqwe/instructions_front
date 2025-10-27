import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
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
        const resetTimerRef = useRef<number | null>(null);
        const childArray = Array.isArray(children) ? children : [children];
        const firstChild = childArray[0];

        useEffect(() => {
            return () => {
                if (resetTimerRef.current) {
                    window.clearTimeout(resetTimerRef.current);
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

        if (isValidElement<CodeElementProps>(firstChild)) {
            const className: string | undefined = firstChild.props.className;
            const languageMatch = /language-([\w-]+)/.exec(className || '');
            const language = languageMatch?.[1]?.toUpperCase();
            const rawCode = firstChild.props.children;
            const codeContent = extractText(rawCode).replace(/\n$/, '');

            const handleCopy = async () => {
                if (!codeContent) {
                    return;
                }

                try {
                    if (navigator?.clipboard?.writeText) {
                        await navigator.clipboard.writeText(codeContent);
                    } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = codeContent;
                        textarea.setAttribute('readonly', '');
                        textarea.style.position = 'absolute';
                        textarea.style.left = '-9999px';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    }

                    setCopyStatus('copied');
                } catch (error) {
                    console.error('Failed to copy code', error);
                    setCopyStatus('error');
                } finally {
                    scheduleReset();
                }
            };

            const copyLabel =
                copyStatus === 'copied'
                    ? 'Скопировано!'
                    : copyStatus === 'error'
                        ? 'Ошибка'
                        : 'Скопировать';

            return (
                <pre data-language={language} {...props}>
                    <button
                        type="button"
                        className={styles.copyButton}
                        onClick={handleCopy}
                        aria-live="polite"
                    >
                        {copyLabel}
                    </button>
                    {cloneElement<CodeElementProps>(firstChild, {
                        'data-language': language,
                        children: codeContent,
                    })}
                </pre>
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
