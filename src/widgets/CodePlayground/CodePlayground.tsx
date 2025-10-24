import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ChangeEvent } from 'react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';

import styles from './CodePlayground.module.css';

type CodePlaygroundProps = {
  code: string;
};

type RuntimeModules = Record<string, unknown>;

type BabelModule = typeof import('@babel/standalone');

/**
 * Мини-«песочница» для запуска React-кода прямо в статье.
 *
 * @example
 * ```tsx
 * <CodePlayground code={`export default function Counter() {\n  return <button>hi</button>;\n}`}/>
 * ```
 */
export function CodePlayground({ code }: CodePlaygroundProps) {
  const [source, setSource] = useState(() => code.trimStart());
  const [lastValidSource, setLastValidSource] = useState(() => code.trimStart());
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const babelPromiseRef = useRef<Promise<BabelModule> | null>(null);

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, []);

  const runtimeModules = useMemo<RuntimeModules>(() => ({
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'react/jsx-dev-runtime': jsxDevRuntime,
  }), []);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      const container = previewRef.current;
      if (!container) return;

      if (!babelPromiseRef.current) {
        babelPromiseRef.current = import('@babel/standalone');
      }

      try {
        const babel = await babelPromiseRef.current;
        if (cancelled) return;

        const transformed = babel.transform(source, {
          filename: 'Playground.tsx',
          presets: [
            ['env', { modules: 'commonjs' }],
            ['react', { runtime: 'automatic' }],
            'typescript',
          ],
          sourceMaps: false,
          compact: false,
        }).code;

        if (!transformed) {
          throw new Error('Не удалось скомпилировать код');
        }

        const exports: Record<string, unknown> = {};
        const module = { exports };

        const requireModule = (request: string) => {
          if (request in runtimeModules) {
            return runtimeModules[request];
          }
          throw new Error(`Импорт "${request}" недоступен в песочнице`);
        };

        const evaluator = new Function(
          'exports',
          'module',
          'require',
          'React',
          `${transformed};\nreturn module.exports.default ?? exports.default ?? module.exports;`
        );

        const result = evaluator(exports, module, requireModule, React);

        let element: React.ReactElement;
        if (React.isValidElement(result)) {
          element = result;
        } else if (typeof result === 'function') {
          element = React.createElement(result as React.ComponentType);
        } else if (result && typeof result === 'object' && 'default' in (result as Record<string, unknown>)) {
          const maybeComponent = (result as { default: unknown }).default;
          if (typeof maybeComponent === 'function') {
            element = React.createElement(maybeComponent as React.ComponentType);
          } else if (React.isValidElement(maybeComponent)) {
            element = maybeComponent as React.ReactElement;
          } else {
            throw new Error('Экспортируйте компонент через `export default`.');
          }
        } else {
          throw new Error('Экспортируйте компонент через `export default`.');
        }

        if (cancelled) return;

        setError(null);
        setLastValidSource(source);

        if (!rootRef.current) {
          rootRef.current = createRoot(container);
        }

        rootRef.current.render(element);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);

        if (!rootRef.current && previewRef.current) {
          rootRef.current = createRoot(previewRef.current);
        }

        rootRef.current?.render(
          <div className={styles.previewError} role="status">
            Ошибка: {message}
          </div>,
        );
      }
    }

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [runtimeModules, source]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setSource(event.target.value);
  };

  const handleReset = () => {
    setSource(code.trimStart());
  };

  const handleRestoreLastWorking = () => {
    setSource(lastValidSource);
  };

  return (
    <section className={styles.root} aria-live="polite">
      <div className={styles.header}>
        <span>Интерактивный пример</span>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={handleReset}>
            Сбросить
          </button>
          <button type="button" className={styles.button} onClick={handleRestoreLastWorking}>
            Вернуть рабочий код
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.editor}>
          <label>
            <span className={styles.srOnly}>Редактор кода</span>
            <textarea
              className={styles.textarea}
              value={source}
              onChange={handleChange}
              spellCheck={false}
              aria-label="Редактор кода"
            />
          </label>
        </div>

        <div className={styles.preview}>
          <div ref={previewRef} aria-label="Результат выполнения" />
        </div>
      </div>

      {error ? <p className={styles.errorMessage}>Ошибка: {error}</p> : null}
    </section>
  );
}
