# Состояние и данные

## Источники API (см. backend OpenAPI)
- `GET /articles?status=PUBLISHED&query=&page=&size=`
- `GET /articles/{slug}` — опубликованная статья
- `GET /articles/{id}/toc` — оглавление
- `GET /search?query=&page=&size=`

## TanStack Query ключи
- `['articles', {status, query, page, size}]`
- `['article', slug]`
- `['toc', articleId]`
- `['search', {query, page, size}]`

## Ошибки/загрузка
- Для каждой страницы: skeleton/loader, понятный 404.
- Сетевые ошибки — компактный баннер с «повторить».
