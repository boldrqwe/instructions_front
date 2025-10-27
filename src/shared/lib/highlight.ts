import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import shell from 'highlight.js/lib/languages/shell';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const registeredLanguages = new Set<string>();

function ensureLanguageRegistered(name: string, language: (hljs: typeof hljs) => void) {
    if (registeredLanguages.has(name)) {
        return;
    }

    hljs.registerLanguage(name, language);
    registeredLanguages.add(name);
}

ensureLanguageRegistered('bash', bash);
ensureLanguageRegistered('sh', shell);
ensureLanguageRegistered('shell', shell);
ensureLanguageRegistered('css', css);
ensureLanguageRegistered('diff', diff);
ensureLanguageRegistered('json', json);
ensureLanguageRegistered('plaintext', plaintext);
ensureLanguageRegistered('text', plaintext);
ensureLanguageRegistered('python', python);
ensureLanguageRegistered('py', python);
ensureLanguageRegistered('ts', typescript);
ensureLanguageRegistered('tsx', typescript);
ensureLanguageRegistered('js', typescript);
ensureLanguageRegistered('javascript', typescript);
ensureLanguageRegistered('typescript', typescript);
ensureLanguageRegistered('xml', xml);
ensureLanguageRegistered('html', xml);
ensureLanguageRegistered('yaml', yaml);
ensureLanguageRegistered('yml', yaml);

const LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    shell: 'bash',
    sh: 'bash',
    text: 'plaintext',
};

const DISPLAY_ALIASES: Record<string, string> = {
    bash: 'BASH',
    css: 'CSS',
    diff: 'DIFF',
    javascript: 'JS',
    json: 'JSON',
    plaintext: 'TEXT',
    python: 'PY',
    typescript: 'TS',
    xml: 'HTML',
    yaml: 'YAML',
};

function normalizeLanguage(language?: string): string | undefined {
    if (!language) {
        return undefined;
    }

    const lower = language.toLowerCase();

    return LANGUAGE_ALIASES[lower] || lower;
}

export function highlightCode(code: string, language?: string): string {
    const normalizedLanguage = normalizeLanguage(language);

    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
        return hljs.highlight(code, { language: normalizedLanguage }).value;
    }

    return hljs.highlightAuto(code).value;
}

export function getDisplayLanguage(language?: string): string | undefined {
    const normalized = normalizeLanguage(language);

    if (!normalized) {
        return undefined;
    }

    return DISPLAY_ALIASES[normalized] || normalized.toUpperCase();
}

