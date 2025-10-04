# API и типы

Бэкенд — источник истины (OpenAPI).  
База URL: `VITE_API_BASE_URL` (пример: `https://site.X.sslip.io/api/v1`).

## Клиент
- Базовая обёртка над `fetch`:
    - Префикс URL
    - Таймаут
    - JSON parse + проверка ошибок (возвращать `{code, message}`)
- Типы TS: завести в `/entities/article/model/types.ts` вручную по контракту MVP:
    - ArticleStatus = 'DRAFT' | 'PUBLISHED'
    - ArticleSummary, Article, Chapter, Section, Toc, SearchResult, Page<T>
- Позже можно подключить генерацию по OpenAPI (openapi-typescript).
