/**
 * Дополнительные параметры прокрутки к якорю.
 */
interface ScrollToAnchorOptions {
  readonly smooth?: boolean;
}

/**
 * Прокручивает страницу к элементу с указанным якорем и устанавливает фокус для доступности.
 * @param anchor Идентификатор или якорь вида `#section`.
 * @param options Управляет плавностью прокрутки.
 * @returns `true`, если элемент найден и прокрутка выполнена, иначе `false`.
 */
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
