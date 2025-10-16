/**
 * Регулярное выражение для замены любых символов, кроме букв и цифр, на дефисы.
 */
const NON_WORD_RE = /[^\p{Letter}\p{Number}]+/gu;
/**
 * Регулярное выражение для обрезки ведущих и завершающих дефисов.
 */
const TRIM_DASH_RE = /^-+|-+$/g;

/**
 * Преобразует строку в slug: латинизирует, приводит к нижнему регистру и убирает лишние символы.
 * @param input Исходная строка, например заголовок статьи.
 * @returns Готовый slug длиной не более 96 символов.
 */
export function slugify(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(NON_WORD_RE, '-')
    .replace(TRIM_DASH_RE, '')
    .slice(0, 96);
}
