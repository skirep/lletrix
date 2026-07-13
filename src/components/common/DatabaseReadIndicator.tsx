import styles from './DatabaseReadIndicator.module.css';

type DatabaseReadIndicatorStatus = 'loading' | 'success' | 'error';

interface DatabaseReadIndicatorProps {
  status: DatabaseReadIndicatorStatus;
  errorMessage?: string | null;
}

export function DatabaseReadIndicator({ status, errorMessage }: DatabaseReadIndicatorProps) {
  const title = status === 'error'
    ? `No s'han pogut llegir bé les dades de la base de dades. ${errorMessage ?? ''}`.trim()
    : status === 'success'
      ? 'Les dades de la base de dades s’han llegit correctament.'
      : 'S’estan llegint les dades de la base de dades.';

  return (
    <span className={styles.indicator} title={title} aria-label={title}>
      <span className={`${styles.dot} ${styles[status]}`} />
      <span className={styles.label}>Base de dades</span>
    </span>
  );
}
