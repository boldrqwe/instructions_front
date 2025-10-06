const NON_WORD_RE = /[^\p{Letter}\p{Number}]+/gu;
const TRIM_DASH_RE = /^-+|-+$/g;

export function slugify(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(NON_WORD_RE, '-')
    .replace(TRIM_DASH_RE, '')
    .slice(0, 96);
}
