import { useMemo } from 'react';
import GithubSlugger from 'github-slugger';

/**
 * Элемент оглавления (ToC) для статьи.
 *
 * @property id     - Идентификатор заголовка (используется как якорь при прокрутке)
 * @property text   - Текст заголовка
 * @property level  - Уровень заголовка (число от 1 до 6, соответствует <h1>–<h6>)
 */
export type TocItem = {
    id: string;
    text: string;
    level: number;
};

/**
 * Хук для автоматического построения оглавления (ToC) из HTML-разметки.
 *
 * @param html - Строка HTML, полученная из статьи (`article.body`)
 * @returns Массив элементов оглавления с полями {id, text, level}
 *
 * @remarks
 * - Парсит HTML в память через `DOMParser`.
 * - Ищет все теги `<h1>–<h6>`.
 * - Если у заголовка нет `id`, создаёт его через `github-slugger`, как это делает rehype-slug.
 * - Используется для генерации ToC на клиенте без отдельного запроса к API.
 *
 * @example
 * ```ts
 * const tocItems = useHtmlToc(article.body);
 * ```
 */
export function useHtmlToc(html: string): TocItem[] {
    return useMemo(() => {
        if (!html) return [];

        const container = document.createElement('div');
        container.innerHTML = html;

        const slugger = new GithubSlugger();

        const headings = Array.from(
            container.querySelectorAll('h1, h2, h3, h4, h5, h6')
        ) as HTMLElement[];

        if (headings.length > 0) {
            return headings
                .map((el) => {
                    const text = el.textContent?.trim();
                    if (!text) return null;

                    const id = el.id?.trim() || slugger.slug(text);

                    return {
                        id,
                        text,
                        level: Number(el.tagName.slice(1)), // h2 → 2
                    };
                })
                .filter((item): item is TocItem => item !== null);
        }

        const markdownHeadingPattern = /^(#{1,6})\s+(.+?)\s*#*$/gm;

        return Array.from(html.matchAll(markdownHeadingPattern)).map((match) => {
            const level = match[1].length;
            const rawText = match[2].trim();
            const text = rawText.replace(/<[^>]+>/g, '').trim();
            const id = slugger.slug(text);

            return {
                id,
                text,
                level,
            };
        });
    }, [html]);
}
