import { isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { HLJSApi } from 'highlight.js';

import styles from './MarkdownView.module.css';
import { loadHighlight } from '../../shared/lib/loadHighlight';

/**
 * Безопасная схема для `rehype-sanitize`, разрешающая нужные HTML-теги.
 * Это защищает от XSS и оставляет нужные элементы (заголовки, таблицы, изображения и т.д.).
 */
const baseTagNames = (defaultSchema.tagNames || []).filter((tag) => tag !== 'div');

const schema = {
  ...defaultSchema,
  tagNames: [
    ...baseTagNames,
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'span',
  ],
  attributes: {
    ...(defaultSchema.attributes || {}),
    '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
    pre: [...(defaultSchema.attributes?.pre || []), 'data-language'],
    code: [...(defaultSchema.attributes?.code || []), 'className', 'data-language'],
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

type CodeBlockRendererProps = {
  codeElement: ReactElement<CodeElementProps>;
  preProps: PreProps;
};

function CodeBlockRenderer({ codeElement, preProps }: CodeBlockRendererProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copiedLineIndex, setCopiedLineIndex] = useState<number | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[] | null>(null);
  const [highlighter, setHighlighter] = useState<HLJSApi | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const lineResetTimerRef = useRef<number | null>(null);

  const { children: rawChildren, className, ...restCodeProps } = codeElement.props;
  const languageMatch = useMemo(() => /language-([\w-]+)/.exec(className || ''), [className]);
  const language = languageMatch?.[1];
  const normalizedLanguage = language?.toLowerCase();
  const codeContent = useMemo(() => extractText(rawChildren).replace(/\n$/, ''), [rawChildren]);
  const lines = useMemo(() => (codeContent ? codeContent.split('\n') : ['']), [codeContent]);
  const combinedClassName = useMemo(
    () => [className, styles.code, 'hljs'].filter(Boolean).join(' '),
    [className],
  );
  const languageLabel = (language || detectedLanguage || 'text').toUpperCase();

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

  useEffect(() => {
    setHighlightedLines(null);
    setDetectedLanguage(null);

    let isMounted = true;

    loadHighlight()
      .then((instance) => {
        if (!isMounted) {
          return;
        }

        setHighlighter(instance);
      })
      .catch((error) => {
        console.error('Failed to load highlighter', error);
      });

    return () => {
      isMounted = false;
    };
  }, [codeContent, normalizedLanguage]);

  useEffect(() => {
    if (!highlighter) {
      return;
    }

    try {
      const shouldHighlight = normalizedLanguage && highlighter.getLanguage(normalizedLanguage);
      const result = shouldHighlight
        ? highlighter.highlight(codeContent, { language: normalizedLanguage })
        : highlighter.highlightAuto(codeContent);
      const highlighted = result.value.split('\n');
      setHighlightedLines(highlighted);
      setDetectedLanguage(result.language || null);
    } catch (error) {
      console.error('Failed to highlight code block', error);
      setHighlightedLines(null);
    }
  }, [codeContent, highlighter, normalizedLanguage]);

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
    copyStatus === 'copied' ? 'Скопировано!' : copyStatus === 'error' ? 'Ошибка' : 'Скопировать';

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.languageBadge}>{languageLabel}</span>
        <button type="button" className={styles.copyButton} onClick={handleCopy} aria-live="polite">
          {copyLabel}
        </button>
      </div>
      <pre data-language={languageLabel} className={styles.pre} {...preProps}>
        <code className={combinedClassName} data-language={languageLabel} {...restCodeProps}>
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
              {highlightedLines ? (
                <span
                  className={`${styles.lineContent} ${styles.lineContentHighlighted}`}
                  dangerouslySetInnerHTML={{
                    __html: highlightedLines[index]?.length ? highlightedLines[index] : '&nbsp;',
                  }}
                />
              ) : (
                <span className={styles.lineContent}>{line === '' ? '\u00A0' : line}</span>
              )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const components: Components = {
  code({ inline, className, children, ...props }: CodeProps) {
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
  pre({ children, ...props }: PreProps) {
    const childArray = Array.isArray(children) ? children : [children];
    const firstChild = childArray[0];

    if (isValidElement<CodeElementProps>(firstChild)) {
      return <CodeBlockRenderer codeElement={firstChild} preProps={props} />;
    }

    return <pre {...props}>{children}</pre>;
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
