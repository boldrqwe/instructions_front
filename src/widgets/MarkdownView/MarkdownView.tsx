import type { ComponentPropsWithoutRef } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
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

const components: Components = {
    code({ inline, className, children, ...props }: CodeProps) {
        const languageMatch = /language-([\w-]+)/.exec(className || '');
        const lang = languageMatch?.[1];
        const isInline = inline || !lang;

        if (!isInline) {
            return (
                <CodeBlock
                    code={String(children).replace(/\n$/, '')}
                    language={lang}
                    editable={false}
                    showLineNumbers
                />
            );
        }

        const inlineClassName = [className, 'inline-code'].filter(Boolean).join(' ').trim();

        return (
            <code className={inlineClassName} spellCheck={false} {...props}>
                {children}
            </code>
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
                    rehypeRaw, // Разрешает HTML внутри Markdown
                    rehypeSlug, // Проставляет id для заголовков
                    [rehypeAutolinkHeadings, { behavior: 'append' }], // Делает заголовки ссылками
                    [rehypeSanitize, schema], // Безопасная очистка
                ]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
