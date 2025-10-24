import { Component, isValidElement, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import * as React from 'react';
import * as Babel from '@babel/standalone';

import styles from './CodePlayground.module.css';

interface CodePlaygroundProps {
  code: string;
}

type CompileResult = {
  Component: ComponentType | null;
  error: string | null;
};

type PreviewErrorBoundaryProps = {
  resetKey: string;
  onError?: (error: Error) => void;
  onReset?: () => void;
  children: ReactNode;
};

type PreviewErrorBoundaryState = {
  hasError: boolean;
};

class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  state: PreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: PreviewErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
      this.props.onReset?.();
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function CodePlayground({ code }: CodePlaygroundProps) {
  const normalizedInitialCode = useMemo(() => normalizeCode(code), [code]);
  const [userCode, setUserCode] = useState<string>(normalizedInitialCode);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setUserCode(normalizedInitialCode);
  }, [normalizedInitialCode]);

  const compileResult = useMemo<CompileResult>(() => {
    if (!userCode.trim()) {
      return {
        Component: null,
        error: 'Пример пустой. Добавьте код React-компонента.',
      };
    }

    try {
      const Component = compileUserCode(userCode);
      return { Component, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить пример.';
      return { Component: null, error: message };
    }
  }, [userCode]);

  useEffect(() => {
    setRuntimeError(null);
  }, [userCode]);

  const errorMessage = compileResult.error ?? runtimeError;

  const handleReset = () => {
    setUserCode(normalizedInitialCode);
    setRuntimeError(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Интерактивный пример</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={handleReset}
            disabled={userCode === normalizedInitialCode}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.preview}>
          <div className={styles.previewInner}>
            {compileResult.Component && !compileResult.error ? (
              <PreviewErrorBoundary
                resetKey={userCode}
                onReset={() => {
                  setRuntimeError(null);
                }}
                onError={(error) => {
                  setRuntimeError(error.message || 'Ошибка выполнения примера.');
                }}
              >
                <compileResult.Component />
              </PreviewErrorBoundary>
            ) : (
              <p className={styles.previewPlaceholder}>
                Изменяйте код ниже и мгновенно смотрите результат в этом блоке.
              </p>
            )}
          </div>
        </div>

        <div className={styles.editorWrapper}>
          <textarea
            className={styles.textarea}
            value={userCode}
            onChange={(event) => {
              setUserCode(event.target.value);
            }}
            spellCheck={false}
            aria-label="Редактор кода"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className={styles.error} role="alert">
          <strong>Ошибка:</strong>
          <span>{errorMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

function normalizeCode(raw: string): string {
  const withoutBackticks = raw.replace(/^\n+/, '').replace(/\n+$/, '');
  const lines = withoutBackticks.split('\n');
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  if (minIndent === 0) {
    return withoutBackticks;
  }

  return lines.map((line) => line.slice(minIndent)).join('\n');
}

function compileUserCode(source: string): ComponentType {
  const { code } = Babel.transform(source, {
    filename: 'Playground.tsx',
    presets: [
      ['react', { runtime: 'classic', development: false }],
      'typescript',
    ],
    plugins: ['transform-modules-commonjs'],
  });

  if (!code) {
    throw new Error('Не удалось преобразовать пример в JavaScript.');
  }

  const runner = new Function(
    'React',
    `"use strict";
const module = { exports: {} };
const exports = module.exports;
const require = (name) => {
  if (name === 'react') {
    return React;
  }

  throw new Error('Неизвестный импорт: ' + name);
};
const { useState, useEffect, useMemo, useCallback, useRef, useReducer, useContext, useLayoutEffect, useTransition, useDeferredValue } = React;
${code}
return module.exports.default ?? module.exports;
`
  );

  const evaluationResult = runner(React);
  const component = resolveComponent(evaluationResult);

  if (!component) {
    throw new Error('Пример должен экспортировать React-компонент по умолчанию.');
  }

  return component;
}

function resolveComponent(candidate: unknown): ComponentType | null {
  if (typeof candidate === 'function') {
    return candidate as ComponentType;
  }

  if (isValidElement(candidate)) {
    const element = candidate;
    return function RenderElement() {
      return element;
    };
  }

  if (candidate && typeof candidate === 'object' && 'default' in (candidate as Record<string, unknown>)) {
    return resolveComponent((candidate as Record<string, unknown>).default);
  }

  return null;
}
