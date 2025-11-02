import type { HLJSApi } from 'highlight.js';

let highlightPromise: Promise<HLJSApi> | null = null;

export async function loadHighlight(): Promise<HLJSApi> {
  if (!highlightPromise) {
    highlightPromise = import('highlight.js/lib/common').then((module) => module.default);
  }

  return highlightPromise;
}
