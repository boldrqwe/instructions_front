import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

/**
 * Безопасная схема для `rehype-sanitize`, разрешающая нужные HTML-теги.
 * Это защищает от XSS и оставляет нужные элементы (заголовки, таблицы, изображения и т.д.).
 */
const schema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
    ],
    attributes: {
        ...(defaultSchema.attributes || {}),
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
        a:  [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
        img:[...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
        code:[...(defaultSchema.attributes?.code || []), 'className'],
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
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
                rehypeRaw,                         // Разрешает HTML внутри Markdown
                rehypeSlug,                        // Проставляет id для заголовков
                [rehypeAutolinkHeadings, { behavior: 'append' }], // Делает заголовки ссылками
                [rehypeSanitize, schema],          // Безопасная очистка
            ]}
        >
            {content}
        </ReactMarkdown>
    );
}
