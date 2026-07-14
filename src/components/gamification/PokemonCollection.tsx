import styles from './PokemonCollection.module.css';
import type { PokemonCollectionItem } from '../../models';

interface PokemonCollectionProps {
  collection: PokemonCollectionItem[];
  loading?: boolean;
}

function formatUnlockedAt(unlockedAt: number | null) {
  if (!unlockedAt) return null;
  return new Date(unlockedAt).toLocaleDateString('ca-ES');
}

export function PokemonCollection({ collection, loading = false }: PokemonCollectionProps) {
  if (loading) {
    return <p className="text-muted text-center">Carregant col·lecció Pokémon...</p>;
  }

  return (
    <div className={styles.grid}>
      {collection.map((pokemon) => {
        const unlockedAt = formatUnlockedAt(pokemon.unlockedAt);
        return (
          <article
            key={pokemon.badgeId}
            className={`${styles.card} ${pokemon.unlocked ? styles.unlocked : styles.locked}`}
            title={pokemon.unlocked ? `${pokemon.name} desbloquejat` : pokemon.unlockCondition}
          >
            {pokemon.imageUrl ? (
              <img
                className={styles.art}
                src={pokemon.imageUrl}
                alt={pokemon.name}
                loading="lazy"
              />
            ) : (
              <div className={styles.placeholder} aria-hidden="true">
                {pokemon.unlocked ? '⚡' : '🔒'}
              </div>
            )}
            <div className={styles.name}>{pokemon.name}</div>
            <div className={styles.meta}>{pokemon.unlockCondition}</div>
            {unlockedAt && <div className={styles.date}>Desbloquejat el {unlockedAt}</div>}
          </article>
        );
      })}
    </div>
  );
}
