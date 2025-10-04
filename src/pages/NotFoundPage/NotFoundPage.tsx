import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <section className={styles.root} aria-labelledby="not-found-title">
      <h1 id="not-found-title" className={styles.title}>
        Страница не найдена
      </h1>
      <p className={styles.text}>
        Возможно, ссылка устарела или была удалена. Вернитесь на главную и попробуйте найти нужную
        инструкцию через поиск.
      </p>
      <Link className={styles.link} to="/">
        На главную
      </Link>
    </section>
  );
}

export default NotFoundPage;
