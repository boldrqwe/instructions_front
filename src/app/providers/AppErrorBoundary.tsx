import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly hasError: boolean;
  readonly error?: Error;
}

/**
 * Класс-компонент, перехватывающий необработанные ошибки в дереве React и отображающий резервный экран.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  /**
   * Текущее состояние обработки ошибок: флаг наличия ошибки и сам объект ошибки.
   */
  public state: AppErrorBoundaryState = { hasError: false };

  /**
   * React вызывает метод при возникновении ошибки в дочерних компонентах; обновляем состояние для показа заглушки.
   * @param error Ошибка, возникшая в любом дочернем компоненте.
   * @returns Новое состояние с информацией об ошибке.
   */
  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Логируем информацию об ошибке для последующей диагностики.
   * @param error Объект ошибки, выброшенный в компоненте.
   * @param errorInfo Стек и дополнительная информация от React.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo);
  }

  /**
   * Отрисовывает fallback-интерфейс при возникновении ошибки или дочерние элементы в нормальном режиме.
   * @returns JSX с сообщением об ошибке или исходными детьми.
   */
  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: '2rem' }}>
          <h1>Что-то пошло не так.</h1>
          <p>{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
