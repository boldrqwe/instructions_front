import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Highlight, { defaultProps } from 'prism-react-renderer';
import theme from 'prism-react-renderer/themes/vsDark';

import { CodeEditor } from './CodeEditor';
import styles from './CodeBlock.module.css';
import { DEFAULT_LANGUAGE, FONT_FAMILY, getLanguageLabel, normalizeLanguage } from './utils';

type CodeBlockProps = {
    code: string;
    language?: string;
    editable?: boolean;
    showLineNumbers?: boolean;
    headerExtras?: ReactNode;
    onChange?: (value: string) => void;
};

export function CodeBlock({
    code,
    language,
    editable = false,
    showLineNumbers = true,
    headerExtras,
    onChange,
}: CodeBlockProps) {
    const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
    const [activeLine, setActiveLine] = useState<number | null>(null);

    const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language]);
    const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

    const handleCopy = useCallback(async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = code;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopyState('success');
        } catch (error) {
            console.error('Failed to copy code block', error);
            setCopyState('error');
        } finally {
            window.setTimeout(() => setCopyState('idle'), 2000);
        }
    }, [code]);

    const copyLabel =
        copyState === 'success' ? 'Скопировано' : copyState === 'error' ? 'Ошибка копирования' : 'Скопировать';

    if (editable) {
        return (
            <CodeEditor
                code={code}
                language={normalizedLanguage}
                onChange={onChange}
                headerExtras={
                    <button type="button" className={styles['copy-button']} onClick={handleCopy}>
                        {copyLabel}
                    </button>
                }
            />
        );
    }

    return (
        <div className={styles['code-block']}>
            <div className={styles['code-block-header']}>
                <span className={styles['code-block-language']}>{languageLabel}</span>
                <div className={styles['code-block-actions']}>
                    {headerExtras}
                    <button type="button" className={styles['copy-button']} onClick={handleCopy}>
                        <svg
                            aria-hidden
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M4.5 4.5V3.25C4.5 2.00736 5.50736 1 6.75 1H12.75C13.9926 1 15 2.00736 15 3.25V9.25C15 10.4926 13.9926 11.5 12.75 11.5H11.5"
                                stroke="#C5C5C5"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                            />
                            <rect
                                x="1"
                                y="4.5"
                                width="10.5"
                                height="10.5"
                                rx="2"
                                stroke="#C5C5C5"
                                strokeWidth="1.2"
                            />
                        </svg>
                        <span>{copyLabel}</span>
                    </button>
                </div>
            </div>
            <Highlight
                {...defaultProps}
                code={code}
                language={normalizedLanguage}
                theme={theme}
            >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre
                        className={`${className} ${styles.pre}`}
                        style={{
                            ...style,
                            margin: 0,
                            padding: '14px 16px',
                            overflowX: 'auto',
                            background: '#1e1e1e',
                            borderRadius: 12,
                            fontFamily: FONT_FAMILY,
                            width: '100%',
                        }}
                    >
                        {tokens.map((line, lineIndex) => {
                            const lineNumber = lineIndex + 1;
                            const lineProps = getLineProps({ line, key: lineIndex });
                            const combinedLineClassName = [
                                lineProps.className,
                                styles['code-line'],
                                activeLine === lineIndex ? styles['code-line-active'] : '',
                            ]
                                .filter(Boolean)
                                .join(' ');

                            return (
                                <div
                                    key={`code-line-${lineIndex}`}
                                    {...lineProps}
                                    className={combinedLineClassName}
                                    onMouseEnter={() => setActiveLine(lineIndex)}
                                    onMouseLeave={() => setActiveLine((prev) => (prev === lineIndex ? null : prev))}
                                >
                                    {showLineNumbers ? (
                                        <span className={styles['code-line-number']}>{lineNumber}</span>
                                    ) : null}
                                    <span className={styles['code-line-content']}>
                                        {line.map((token, tokenIndex) => (
                                            <span
                                                key={`token-${lineIndex}-${tokenIndex}`}
                                                {...getTokenProps({ token, key: tokenIndex })}
                                            />
                                        ))}
                                    </span>
                                </div>
                            );
                        })}
                    </pre>
                )}
            </Highlight>
        </div>
    );
}

