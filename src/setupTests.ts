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
