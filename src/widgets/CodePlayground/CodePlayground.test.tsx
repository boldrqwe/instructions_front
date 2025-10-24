import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { CodePlayground } from './CodePlayground';

const COUNTER_SOURCE = `function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Нажми: {count}
    </button>
  );
}

export default Counter;`;

describe('CodePlayground', () => {
  test('renders preview for provided code', async () => {
    render(<CodePlayground code={COUNTER_SOURCE} />);

    const button = await screen.findByRole('button', { name: /Нажми: 0/i });
    expect(button).toBeVisible();

    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Нажми: 1/i })).toBeVisible();
    });
  });

  test('restores last working code after error', async () => {
    render(<CodePlayground code={COUNTER_SOURCE} />);

    const editor = await screen.findByRole('textbox', { name: /редактор кода/i });

    await userEvent.clear(editor);
    await userEvent.type(editor, 'export default {{}}');

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeVisible();
    });

    await userEvent.click(screen.getByRole('button', { name: /Вернуть рабочий код/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Нажми: 0/i })).toBeVisible();
    });
  });
});
