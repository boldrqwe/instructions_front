import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './shared/styles/globals.css';

/**
 * Точка входа фронтенд-приложения: подключает глобальные стили и монтирует React-приложение в DOM.
 */
const container = document.getElementById('root')!;

/**
 * Корневой экземпляр React 18, который управляет всем деревом компонентов приложения.
 */
const root = createRoot(container);

/**
 * Монтируем приложение в строгом режиме, чтобы отлавливать потенциальные проблемы в разработке.
 */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
