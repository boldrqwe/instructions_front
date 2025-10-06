import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

declare global {
  interface Window {
    __intersectionObservers?: MockIntersectionObserver[];
  }
}

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

export class MockIntersectionObserver implements IntersectionObserver {
  public static instances: MockIntersectionObserver[] = [];

  public readonly root: Element | Document | null = null;

  public readonly rootMargin: string = '';

  public readonly thresholds: ReadonlyArray<number> = [];

  private readonly elements = new Set<Element>();

  public constructor(private readonly callback: ObserverCallback) {
    MockIntersectionObserver.instances.push(this);
    window.__intersectionObservers = MockIntersectionObserver.instances;
  }

  public observe(element: Element): void {
    this.elements.add(element);
  }

  public unobserve(element: Element): void {
    this.elements.delete(element);
  }

  public disconnect(): void {
    this.elements.clear();
  }

  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  public trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this);
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

window.scrollTo = vi.fn();

const rect = {
  bottom: 0,
  top: 0,
  left: 0,
  right: 0,
  height: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => {},
};

Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
  writable: true,
  value: () => [rect],
});

if (typeof Element !== 'undefined') {
  Object.defineProperty(Element.prototype, 'getClientRects', {
    writable: true,
    value: () => [rect],
  });

  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    writable: true,
    value: () => rect,
  });
}

if (typeof Range !== 'undefined') {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    writable: true,
    value: () => rect,
  });
  Object.defineProperty(Range.prototype, 'getClientRects', {
    writable: true,
    value: () => [rect],
  });
}

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => document.body;
}
