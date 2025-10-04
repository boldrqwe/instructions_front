# Дизайн-токены (CSS variables)

Объявить в `src/shared/styles/tokens.css`:
```css
:root {
  --bg: #0f1115;
  --bg-elev: #151821;
  --text: #e6e9ef;
  --muted: #a7b0c0;
  --primary: #5cc8ff;
  --link: #7fd1ff;
  --border: #2a3142;
  --shadow: 0 4px 20px rgba(0,0,0,.3);

  --font-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New";
}
Рекомендации:

Не хардкодить цвета в компонентах — только переменные.

Подсветку кода делать своей темой (позже).
