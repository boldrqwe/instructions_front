import type { Language } from 'prism-react-renderer';

export const DEFAULT_LANGUAGE = 'bash';
export const FONT_FAMILY =
    "ui-monospace, SFMono-Regular, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export function normalizeLanguage(language?: string | Language): Language {
    if (!language) {
        return DEFAULT_LANGUAGE as Language;
    }

    const normalized = `${language}`.trim().toLowerCase();

    if (!normalized) {
        return DEFAULT_LANGUAGE as Language;
    }

    return (normalized as Language) || (DEFAULT_LANGUAGE as Language);
}

export function getLanguageLabel(language?: string | Language): string {
    const normalized = normalizeLanguage(language);
    return normalized.toUpperCase();
}
