/**
 * Тип обёрнутой функции, дополненной методом `cancel` для отмены вызова.
 */
export type DebouncedFunction<Fn extends (...args: readonly unknown[]) => void> = Fn & {
  cancel: () => void;
};

/**
 * Возвращает debounced-версию функции: вызовы будут выполняться только после паузы.
 * @param fn Исходная функция, которую нужно «задержать».
 * @param wait Время ожидания между вызовами в миллисекундах.
 */
export function debounce<Fn extends (...args: readonly unknown[]) => void>(
  fn: Fn,
  wait: number,
): DebouncedFunction<Fn> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = ((...args: Parameters<Fn>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, wait);
  }) as DebouncedFunction<Fn>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}
