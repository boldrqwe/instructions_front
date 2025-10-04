# instructions_front

Фронтенд для чтения длинных инструкций «как книга»: слева оглавление, справа контент с якорями, поиск по опубликованным материалам. Внешне — структура как у Netdata Academy (левое TOC), но свой стиль/цвета.

## Технологии
- Vite + React + TypeScript
- React Router
- TanStack Query (fetch-кэш)
- react-markdown + remark-gfm + rehype-slug + rehype-autolink-headings + rehype-sanitize
- Vitest + Testing Library
- CSS Modules (или PostCSS), дизайн-токены через CSS variables

## Конфигурация
- API-база: `VITE_API_BASE_URL` (например: `https://site.X.sslip.io/api/v1`)
- CORS на бэке должен разрешать фронт-домен.

## Скрипты
- `pnpm dev` — локальная разработка
- `pnpm test` — тесты
- `pnpm build` — сборка
- `pnpm preview` — предпросмотр

Подробнее см. `/docs/*`.
