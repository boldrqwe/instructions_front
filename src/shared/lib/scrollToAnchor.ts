interface ScrollToAnchorOptions {
  readonly smooth?: boolean;
}

export function scrollToAnchor(anchor: string, options: ScrollToAnchorOptions = {}) {
  const id = anchor.startsWith('#') ? anchor.slice(1) : anchor;
  const element =
    document.getElementById(id) ?? document.getElementById(`user-content-${id}`) ?? null;
  if (!element) {
    return false;
  }

  element.scrollIntoView({
    behavior: options.smooth === false ? 'auto' : 'smooth',
    block: 'start',
  });

  if (element instanceof HTMLElement) {
    const previousTabIndex = element.getAttribute('tabindex');
    if (previousTabIndex === null) {
      element.setAttribute('tabindex', '-1');
      element.addEventListener(
        'blur',
        () => {
          element.removeAttribute('tabindex');
        },
        { once: true },
      );
    }
    element.focus({ preventScroll: true });
  }

  return true;
}
