import { useMemo } from 'react';
import type { ReactNode } from 'react';
import Editor from '@monaco-editor/react';

import styles from './CodeBlock.module.css';
import { DEFAULT_LANGUAGE, FONT_FAMILY, getLanguageLabel, normalizeLanguage } from './utils';

type CodeEditorProps = {
    code: string;
    language?: string;
    onChange?: (value: string) => void;
    headerExtras?: ReactNode;
    minHeight?: number;
};

export function CodeEditor({
    code,
    language,
    onChange,
    headerExtras,
    minHeight = 200,
}: CodeEditorProps) {
    const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language]);
    const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

    return (
        <div className={styles['code-block']}>
            <div className={styles['code-block-header']}>
                <span className={styles['code-block-language']}>{languageLabel || DEFAULT_LANGUAGE.toUpperCase()}</span>
                <div className={styles['code-block-actions']}>{headerExtras}</div>
            </div>
            <div className={styles['code-editor-container']} style={{ minHeight }}>
                <Editor
                    language={normalizedLanguage}
                    value={code}
                    onChange={(value) => onChange?.(value ?? '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'off',
                        fontFamily: FONT_FAMILY,
                        fontSize: 14,
                        automaticLayout: true,
                        lineNumbers: 'on',
                        renderLineHighlight: 'all',
                    }}
                    height="100%"
                />
            </div>
        </div>
    );
}
