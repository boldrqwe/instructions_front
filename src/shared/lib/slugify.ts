const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

const EXTRA_MAP: Record<string, string> = {
  æ: 'ae',
  ø: 'o',
  å: 'a',
  ä: 'a',
  ö: 'o',
  ü: 'u',
  ß: 'ss',
};

function transliterate(value: string) {
  return value
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      if (CYRILLIC_MAP[lower]) {
        const mapped = CYRILLIC_MAP[lower];
        return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      if (EXTRA_MAP[lower]) {
        const mapped = EXTRA_MAP[lower];
        return char === lower ? mapped : mapped.toUpperCase();
      }
      return char;
    })
    .join('');
}

export function slugify(value: string) {
  const transliterated = transliterate(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}+/gu, '');

  return transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
