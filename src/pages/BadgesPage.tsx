import { useState } from 'react';
import styles from './BadgesPage.module.css';
import { PokemonCollection } from '../components/gamification';
import { usePokemonCollection } from '../hooks';
import type { Profile, PokemonCollectionItem } from '../models';

const POKEDEX_SECTIONS = [
  {
    id: 'starter-route',
    title: 'Ruta inicial',
    description: 'Els primers Pokémon que arriben amb els primers avenços de lectura.',
    match: (pokemon: PokemonCollectionItem) => pokemon.unlockRequirement.type === 'progress' && pokemon.pokemonId <= 25,
  },
  {
    id: 'adventure-route',
    title: 'Aventura lectora',
    description: 'Pokémon per a qui ja manté una bona progressió diària.',
    match: (pokemon: PokemonCollectionItem) => pokemon.unlockRequirement.type === 'progress' && pokemon.pokemonId > 25 && pokemon.pokemonId <= 60,
  },
  {
    id: 'master-route',
    title: 'Mestres del progrés',
    description: 'Criatures reservades per als lectors més constants.',
    match: (pokemon: PokemonCollectionItem) => pokemon.unlockRequirement.type === 'progress' && pokemon.pokemonId > 60,
  },
  {
    id: 'milestone-route',
    title: 'Fites especials',
    description: 'Desbloquejos per punts de fita, insígnies i constància acumulada.',
    match: (pokemon: PokemonCollectionItem) => pokemon.unlockRequirement.type === 'milestones' && pokemon.pokemonId <= 150,
  },
  {
    id: 'legend-route',
    title: 'Llegendes finals',
    description: 'Els Pokémon més difícils d’aconseguir, reservats a grans assoliments.',
    match: (pokemon: PokemonCollectionItem) => pokemon.unlockRequirement.type === 'milestones' && pokemon.pokemonId > 150,
  },
] as const;

function getBattlePower(pokemon: PokemonCollectionItem): number {
  const requirementBonus = pokemon.unlockRequirement.target * (pokemon.unlockRequirement.type === 'progress' ? 2 : 3);
  return pokemon.pokemonId + requirementBonus + pokemon.name.length;
}

interface BadgesPageProps {
  profile: Profile;
}

export function BadgesPage({ profile }: BadgesPageProps) {
  const { collection, loading } = usePokemonCollection(profile.id);
  const unlockedPokemon = collection.filter((pokemon) => pokemon.unlocked).length;
  const unlockedCollection = collection.filter((pokemon) => pokemon.unlocked);
  const [selectedPokemonIds, setSelectedPokemonIds] = useState<number[]>([]);
  const [battleResult, setBattleResult] = useState<{
    winner: PokemonCollectionItem;
    loser: PokemonCollectionItem;
    winnerPower: number;
    loserPower: number;
    commentary: string;
  } | null>(null);

  const selectedPokemon = selectedPokemonIds
    .map((pokemonId) => unlockedCollection.find((pokemon) => pokemon.pokemonId === pokemonId) ?? null)
    .filter((pokemon): pokemon is PokemonCollectionItem => pokemon !== null);

  const toggleBattlePokemon = (pokemon: PokemonCollectionItem) => {
    if (!pokemon.unlocked) return;

    setBattleResult(null);
    setSelectedPokemonIds((prev) => {
      if (prev.includes(pokemon.pokemonId)) {
        return prev.filter((id) => id !== pokemon.pokemonId);
      }

      if (prev.length < 2) {
        return [...prev, pokemon.pokemonId];
      }

      return [prev[1], pokemon.pokemonId];
    });
  };

  const simulateBattle = () => {
    if (selectedPokemon.length !== 2) return;

    const [firstPokemon, secondPokemon] = selectedPokemon;
    const firstPower = getBattlePower(firstPokemon) + Math.floor(Math.random() * 18);
    const secondPower = getBattlePower(secondPokemon) + Math.floor(Math.random() * 18);
    const firstWins = firstPower >= secondPower;
    const winner = firstWins ? firstPokemon : secondPokemon;
    const loser = firstWins ? secondPokemon : firstPokemon;
    const winnerPower = firstWins ? firstPower : secondPower;
    const loserPower = firstWins ? secondPower : firstPower;
    const commentary = winnerPower - loserPower > 12
      ? `${winner.name} domina clarament el combat amb un atac espectacular.`
      : `${winner.name} guanya un duel molt ajustat després d’un intercanvi intens.`;

    setBattleResult({ winner, loser, winnerPower, loserPower, commentary });
  };

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Pokédex de logros</h1>

      <details className="info-box">
        <summary>ℹ️ Com funciona aquesta pantalla?</summary>
        <div className="info-box-content">
          <p>Completa exercicis per desbloquejar Pokémon i omplir la teva Pokédex de logros.</p>
          <ul>
            <li><strong>Ruta inicial, aventura i mestres:</strong> s'obtenen amb el progrés de lectura.</li>
            <li><strong>Fites especials i llegendes:</strong> s'obtenen amb punts de fita, constància i desbloquejos acumulats.</li>
            <li><strong>Arena Pokémon:</strong> quan tinguis Pokémon desbloquejats, pots seleccionar-ne dos i fer una mini-lluita amistosa.</li>
          </ul>
          <p>Els Pokémon bloquejats es mostren com a siluetes. Practica per descobrir-los tots.</p>
        </div>
      </details>

      <section className={`card ${styles.heroCard}`}>
        <div>
          <div className={styles.heroEyebrow}>Progrés general</div>
          <h2 className={styles.heroTitle}>Has desbloquejat {unlockedPokemon} Pokémon</h2>
          <p className={styles.heroText}>
            Cada categoria representa un tipus d’assoliment diferent. Obre-les per veure què et falta per completar-les.
          </p>
        </div>
        <div className={styles.heroCounter}>{unlockedPokemon}/{collection.length || 0}</div>
      </section>

      <section className={`card ${styles.battleCard}`}>
        <div className={styles.battleHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Arena Pokémon</h2>
            <p className={styles.sectionText}>Selecciona dos Pokémon desbloquejats de les categories de sota i fes-los lluitar.</p>
          </div>
          <button
            type="button"
            className={styles.battleBtn}
            onClick={simulateBattle}
            disabled={selectedPokemon.length !== 2}
          >
            ⚔ Simula la lluita
          </button>
        </div>

        <div className={styles.battleArena}>
          {selectedPokemon.map((pokemon) => (
            <article key={pokemon.pokemonId} className={styles.fighterCard}>
              {pokemon.imageUrl ? <img className={styles.fighterArt} src={pokemon.imageUrl} alt={pokemon.name} /> : <div className={styles.fighterPlaceholder}>⚡</div>}
              <div className={styles.fighterName}>{pokemon.name}</div>
              <div className={styles.fighterMeta}>{pokemon.unlockCondition}</div>
            </article>
          ))}
          {selectedPokemon.length < 2 && Array.from({ length: 2 - selectedPokemon.length }, (_, idx) => (
            <div key={`empty-${idx}`} className={styles.fighterEmpty}>Tria un Pokémon desbloquejat</div>
          ))}
        </div>

        {battleResult && (
          <div className={styles.battleResult}>
            <div className={styles.battleWinner}>{battleResult.winner.name} guanya!</div>
            <div className={styles.battleScores}>
              {battleResult.winner.name}: {battleResult.winnerPower} · {battleResult.loser.name}: {battleResult.loserPower}
            </div>
            <p className={styles.battleCommentary}>{battleResult.commentary}</p>
          </div>
        )}
      </section>

      {POKEDEX_SECTIONS.map((section) => {
        const sectionCollection = collection.filter(section.match);
        const sectionUnlocked = sectionCollection.filter((pokemon) => pokemon.unlocked).length;

        return (
          <section key={section.id} className={`card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <p className={styles.sectionText}>{section.description}</p>
              </div>
              <div className={styles.sectionCounter}>{sectionUnlocked}/{sectionCollection.length}</div>
            </div>
            <PokemonCollection
              collection={sectionCollection}
              loading={loading}
              selectedIds={selectedPokemonIds}
              onSelectPokemon={toggleBattlePokemon}
              emptyMessage="No hi ha Pokémon en aquesta categoria encara."
            />
          </section>
        );
      })}
    </div>
  );
}
