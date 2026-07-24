import styles from './PokemonCollection.module.css';
import type { PokemonCollectionItem } from '../../models';

interface PokemonCollectionProps {
  collection: PokemonCollectionItem[];
  loading?: boolean;
  selectedIds?: number[];
  onSelectPokemon?: (pokemon: PokemonCollectionItem) => void;
  emptyMessage?: string;
}

export function PokemonCollection({
  collection,
  loading = false,
  selectedIds = [],
  onSelectPokemon,
  emptyMessage = 'Encara no tens Pokémon en aquesta categoria.',
}: PokemonCollectionProps) {
  if (loading) {
    return <p className="text-muted text-center">Carregant col·lecció Pokémon...</p>;
  }

  if (collection.length === 0) {
    return <p className="text-muted text-center">{emptyMessage}</p>;
  }

  return (
    <div className={styles.grid}>
      {collection.map((pokemon) => {
        const isSelected = selectedIds.includes(pokemon.pokemonId);
        const cardClassName = `${styles.card} ${pokemon.unlocked ? styles.unlocked : styles.locked} ${isSelected ? styles.selected : ''}`;

        if (onSelectPokemon) {
          return (
            <button
              key={pokemon.pokemonId}
              type="button"
              className={cardClassName}
              title={pokemon.unlocked ? `${pokemon.name} desbloquejat` : pokemon.unlockCondition}
              onClick={() => onSelectPokemon(pokemon)}
              disabled={!pokemon.unlocked}
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
              <div className={styles.power}>Força {pokemon.power}</div>
              {pokemon.specialAttackUnlocked && pokemon.specialAttackName && (
                <div className={styles.specialAttack}>{pokemon.specialAttackName}</div>
              )}
              <div className={styles.progressBlock}>
                <div className={styles.progressHeader}>
                  <span>Progrés</span>
                  <span>{Math.round(pokemon.progressPercent * 100)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.round(pokemon.progressPercent * 100)}%` }} />
                </div>
              </div>
              <div className={styles.meta}>{pokemon.description}</div>
              <div className={styles.meta}>{pokemon.unlockCondition}</div>
              <div className={styles.exerciseList}>{pokemon.assignedExerciseTitles.join(' · ')}</div>
            </button>
          );
        }

        return (
          <article
            key={pokemon.pokemonId}
            className={cardClassName}
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
            <div className={styles.power}>Força {pokemon.power}</div>
            {pokemon.specialAttackUnlocked && pokemon.specialAttackName && (
              <div className={styles.specialAttack}>{pokemon.specialAttackName}</div>
            )}
            <div className={styles.progressBlock}>
              <div className={styles.progressHeader}>
                <span>Progrés</span>
                <span>{Math.round(pokemon.progressPercent * 100)}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${Math.round(pokemon.progressPercent * 100)}%` }} />
              </div>
            </div>
            <div className={styles.meta}>{pokemon.description}</div>
            <div className={styles.meta}>{pokemon.unlockCondition}</div>
            <div className={styles.exerciseList}>{pokemon.assignedExerciseTitles.join(' · ')}</div>
          </article>
        );
      })}
    </div>
  );
}
