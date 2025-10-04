# Архитектура приложения (frontend)

## Стек и принципы
- React + Router для маршрутизации.
- TanStack Query для запроса данных и кэширования.
- Компонентная структура feature-first (страницы -> виджеты -> компоненты).
- Типизация: строгий TypeScript.
- Стили: CSS Modules + дизайн-токены (CSS variables).

## Директории
src/
app/ # инициализация (router, query client, провайдеры)
pages/
ArticlePage/ # /articles/:slug
SearchPage/ # /search
HomePage/ # /
widgets/
Toc/ # левое дерево оглавления
MarkdownView/ # безопасный рендер Markdown
SearchBar/
entities/
article/
api/ # запросы к API
model/ # типы, мапперы
shared/
ui/ # переиспользуемые UI-компоненты
lib/ # utils (slugify, scroll, highlight)
config/ # env, константы
styles/ # tokens.css, globals.css


## Ключевые решения
- Заголовки секций получают id (rehype-slug) → TOC ссылается на них.
- Активный пункт TOC определяется через IntersectionObserver.
- Кэширование: article по slug и toc по articleId.
- Код-сплит по страницам: динамический импорт.
