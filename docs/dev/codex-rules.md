# Правила для Codex (frontend)

1) Не менять контракт API — он задаётся бэком; типы фронта согласовать с /docs/api.md.
2) Любой сетевой вызов идёт через общий `apiClient` (baseURL = VITE_API_BASE_URL).
3) Запросы и кэш — через TanStack Query (см. /docs/state.md).
4) Markdown рендер — только через `react-markdown` + sanitize.
5) TOC должен ссылаться на заголовки с id (rehype-slug) и подсвечивать активную секцию (IntersectionObserver).
6) Навигация — через React Router, поддержка `#anchors`.
7) Никаких inline-стилей с цветами — только дизайн-токены.
8) Тесты: Vitest + Testing Library; минимум — навигация TOC, якоря, парс markdown, 404.
9) Код-сплит по страницам; не тянуть админские модули в MVP.
