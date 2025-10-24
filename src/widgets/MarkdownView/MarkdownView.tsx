import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Element, Text } from 'hast';

import styles from './MarkdownView.module.css';
import { CodePlayground } from '../CodePlayground/CodePlayground';

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
        'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'span', 'codeplayground',
    ],
    attributes: {
        ...(defaultSchema.attributes || {}),
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
        a:  [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
        img:[...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
        pre:[...(defaultSchema.attributes?.pre || []), 'data-language'],
        code:[...(defaultSchema.attributes?.code || []), 'className', 'data-language'],
        codeplayground: ['data-code'],
    },
};

type CodeProps = ComponentPropsWithoutRef<'code'> &
    ExtraProps & {
        inline?: boolean;
    };

type PreProps = ComponentPropsWithoutRef<'pre'> & ExtraProps;
type ParagraphProps = ComponentPropsWithoutRef<'p'> & ExtraProps;

type CodeElementProps = {
    className?: string;
    children?: ReactNode;
    'data-language'?: string;
};

type CodePlaygroundNode = Element & {
    properties: Element['properties'] & {
        'data-code'?: string | string[];
    };
};

const components: Components = {
    p({ node, children, ...props }: ParagraphProps) {
        const paragraphNode = node as Element | undefined;
        const firstChild = paragraphNode?.children?.[0];

        if (
            paragraphNode?.children?.length === 1 &&
            firstChild?.type === 'element' &&
            firstChild.tagName === 'codeplayground'
        ) {
            return <>{children}</>;
        }

        return <p {...props}>{children}</p>;
    },
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
            const codeContent =
                typeof rawCode === 'string'
                    ? rawCode.replace(/\n$/, '')
                    : String(rawCode).replace(/\n$/, '');

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
    codeplayground({ node }) {
        const playgroundNode = node as CodePlaygroundNode | undefined;
        const rawValue = playgroundNode?.properties?.['data-code'];
        const attributeValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
        const textValue = extractTextContent(playgroundNode);
        const encoded = typeof attributeValue === 'string' && attributeValue.length > 0 ? attributeValue : textValue;
        const decoded = encoded ? decodeURIComponent(encoded) : '';

        return <CodePlayground code={decoded} />;
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
    const preparedContent = useMemo(() => preprocessPlaygrounds(content), [content]);

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
                {preparedContent}
            </ReactMarkdown>
        </div>
    );
}

const playgroundPattern = /<CodePlayground\s+code={`([\s\S]*?)`}\s*\/>/g;

function preprocessPlaygrounds(text: string): string {
    return text.replace(playgroundPattern, (_match, rawCode: string) => {
        const encoded = encodeURIComponent(rawCode);
        const escaped = escapeHtml(encoded);
        return `\n\n<codeplayground data-code="${encoded}">${escaped}</codeplayground>\n\n`;
    });
}

function extractTextContent(node?: CodePlaygroundNode): string {
    if (!node?.children) {
        return '';
    }

    return node.children
        .map((child) => (child.type === 'text' ? (child as Text).value : ''))
        .join('')
        .trim();
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
