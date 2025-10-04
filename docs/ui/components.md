
# Библиотека компонентов (минимум)

## Toc
- Пропсы: `items: Toc['items']`, `activeId: string`, `onClick(id:string)`
- Особенности: virtual scroll для больших списков; автоскрытие на мобильном

## MarkdownView
- Базируется на `react-markdown` с `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-sanitize`.
- Поддержка таблиц, списков, кода. Картинки — `loading="lazy"`.
- Внешние ссылки с `rel="noopener noreferrer"` и `target="_blank"`.

## SearchBar
- Управляемый инпут с debounce (300ms) и переходом на `/search?q=...`

## CodeBlock (позже)
- Ленивая подсветка (dynamic import prism/highlight.js), копирование в буфер.
