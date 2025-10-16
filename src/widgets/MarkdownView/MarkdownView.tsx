import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import type { Options as AutolinkOptions } from 'rehype-autolink-headings';
import styles from './MarkdownView.module.css';

/**
 * Настройки автоссылок для заголовков markdown.
 */
const autolinkOptions: AutolinkOptions = {
  behavior: 'wrap',
  properties: {
    className: styles.anchor,
  },
};

/**
 * Безопасная схема очистки HTML: дополняет дефолтную схему разрешёнными атрибутами.
 */
const sanitizeSchema = (() => {
  const schema = JSON.parse(JSON.stringify(defaultSchema));
  schema.attributes ??= {};
  const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  for (const tag of headingTags) {
    schema.attributes[tag] = [...(schema.attributes[tag] ?? []), 'id', 'className'];
  }
  schema.attributes.a = [...(schema.attributes.a ?? []), 'target', 'rel'];
  schema.attributes.code = [...(schema.attributes.code ?? []), 'className'];
  schema.attributes.pre = [...(schema.attributes.pre ?? []), 'className'];
  schema.tagNames = Array.from(new Set([...(schema.tagNames ?? []), 'figure', 'figcaption']));
  return schema;
})();

interface MarkdownViewProps {
  readonly content: string;
}

/**
 * Рендерит markdown-контент с поддержкой GFM, автоссылок и безопасной очистки HTML.
 */
export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, autolinkOptions],
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: (props) => <img loading="lazy" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
