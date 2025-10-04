# Шаблоны промптов для Codex (frontend)

## 1) Страница чтения статьи
Роль: Senior Frontend (React/Vite/TS).  
Контекст: /docs/vision.md, /docs/architecture.md, /docs/state.md, /docs/api.md, /docs/ui/components.md.  
Задача: Реализовать `/articles/:slug` — контент + левый TOC.
Требования:
- Получить `Article` и `Toc` по API (см. /docs/state.md ключи).
- Рендер markdown через `react-markdown` + remark-gfm + rehype-slug + rehype-autolink-headings + rehype-sanitize.
- Автогенерация id у заголовков, TOC кликабелен, плавный скролл к секции, активная подсветка (IntersectionObserver).
- Состояния: загрузка, 404.
- Адаптив: TOC сворачивается < 1024px (offcanvas).
- Тесты: активный пункт при скролле, переход по якорю, 404.

## 2) Поиск
Роль: Senior Frontend (React/Vite/TS).  
Задача: `/search?q=...` + компонент SearchBar (в шапке).
Требования:
- Debounce 300ms, запрос `GET /search?query=...`, показ сниппетов.
- Клик по результату → /articles/:slug (и, если есть секция, прокрутить к ней).
- Пагинация (prev/next), состояние “ничего не найдено”.
- Тесты: debounce, переходы, разные типы результатов (article|section).

## 3) Каркас приложения
Роль: Senior Frontend (React/Vite/TS).  
Задача: Настроить проект (TypeScript strict), Router, QueryClient, дизайн-токены, базовые страницы.
Требования:
- `src/app/` с провайдерами, `src/shared/styles/tokens.css`, `globals.css`.
- Код-сплит страниц, lazy routes.
- Базовый layout: шапка (SearchBar), контейнер, правый контент, левый TOC (на ArticlePage).
- ESLint/Prettier, Vitest конфиг.
