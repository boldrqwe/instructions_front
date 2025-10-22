import { Children, type ReactElement, type ReactNode, useMemo } from 'react';
import { MarkdownHooks } from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import type { Options } from 'rehype-pretty-code';
import styles from './MarkdownView.module.css';
import { CopyButton } from './CopyButton';

const prettyCodeOptions: Options = {
  theme: {
    dark: 'dracula',
    light: 'github-light',
  },
  keepBackground: false,
  defaultLang: 'text',
  aliases: {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    sh: 'bash',
    bash: 'bash',
    kt: 'kotlin',
    kotlin: 'kotlin',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'html',
    html: 'html',
    sql: 'sql',
    json: 'json',
    java: 'java',
    properties: 'properties',
    dockerfile: 'dockerfile',
    gradle: 'gradle',
    groovy: 'groovy',
  },
};

const schema = (() => {
  const tagNames = new Set([...(defaultSchema.tagNames || [])]);
  ['span', 'pre', 'code'].forEach((tag) => tagNames.add(tag));

  const attributes = {
    ...(defaultSchema.attributes || {}),
    '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
    code: [
      ...(defaultSchema.attributes?.code || []),
      'className',
      'data-language',
      'data-theme',
      'data-raw',
      'style',
    ],
    pre: [
      ...(defaultSchema.attributes?.pre || []),
      'className',
      'data-language',
      'data-theme',
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      'className',
      'style',
      'data-line',
      'data-highlighted',
      'data-theme',
    ],
  } as typeof defaultSchema.attributes;

  return {
    ...defaultSchema,
    tagNames: Array.from(tagNames),
    attributes,
  };
})();

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  bash: 'Bash',
  kotlin: 'Kotlin',
  yaml: 'YAML',
  html: 'HTML',
  sql: 'SQL',
  json: 'JSON',
  java: 'Java',
  properties: 'Properties',
  dockerfile: 'Dockerfile',
  gradle: 'Gradle',
  groovy: 'Groovy',
};

type HastElement = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastElement[] | Array<{ value?: unknown } & HastElement>;
  value?: unknown;
};

function rehypeCaptureRawCode() {
  return (tree: HastElement) => {
    const stack: HastElement[] = [tree];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;

      if (node.type === 'element' && node.tagName === 'code') {
        const raw = (node.children ?? [])
          .map((child) => {
            if (child && typeof child === 'object' && 'value' in child) {
              return typeof child.value === 'string' ? child.value : '';
            }
            return '';
          })
          .join('');

        node.properties = node.properties || {};
        if (typeof raw === 'string') {
          node.properties['data-raw'] = raw;
        }
      }

      const children = node.children;
      if (Array.isArray(children)) {
        for (let index = children.length - 1; index >= 0; index -= 1) {
          const child = children[index];
          if (child && typeof child === 'object') {
            stack.push(child as HastElement);
          }
        }
      }
    }
  };
}

function resolveLanguageLabel(language?: string) {
  if (!language) {
    return 'Plain text';
  }

  const key = language.toLowerCase();
  if (LANGUAGE_LABELS[key]) {
    return LANGUAGE_LABELS[key];
  }

  return 'Plain text';
}

type PreProps = React.ComponentProps<'pre'> & { node?: { properties?: Record<string, unknown> } };

type CodeElement = ReactElement<{ [key: string]: unknown }> | undefined;

function findCodeElement(children: ReactNode): CodeElement {
  return Children.toArray(children).find(
    (child): child is ReactElement =>
      Boolean(child) && typeof child === 'object' && 'type' in child && child.type === 'code',
  );
}

function extractPlainText(node: ReactNode): string {
  if (node === null || node === undefined) {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('');
  }

  if (typeof node === 'object' && 'props' in node) {
    return extractPlainText((node as ReactElement).props?.children);
  }

  return '';
}

function PreWithCopy({ node, children, ...props }: PreProps) {
  const codeElement = findCodeElement(children);
  const languageFromCode =
    (codeElement?.props['data-language'] as string | undefined) ||
    (typeof node?.properties?.['data-language'] === 'string'
      ? (node?.properties?.['data-language'] as string)
      : undefined);
  const raw = (codeElement?.props['data-raw'] as string | undefined) ?? '';
  const copyText = raw || extractPlainText(codeElement?.props?.children);
  const languageLabel = resolveLanguageLabel(languageFromCode);

  return (
    <div className="md-code__block">
      <span className="md-code__lang" aria-hidden="true">
        {languageLabel}
      </span>
      <CopyButton text={copyText} langLabel={languageLabel} />
      <pre {...props}>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: PreWithCopy,
};

export function MarkdownView({ content }: { content: string }) {
  const rehypePlugins = useMemo(
    () => [
      rehypeRaw,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['anchor'] } }],
      rehypeCaptureRawCode,
      [rehypePrettyCode, prettyCodeOptions],
      [rehypeSanitize, schema],
    ],
    [],
  );

  return (
    <div className={`${styles.root} md-code`}>
      <MarkdownHooks remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </MarkdownHooks>
    </div>
  );
}
