import styles from './BadgesPage.module.css';
import { PokemonCollection } from '../components/gamification';
import { usePokemonCollection } from '../hooks';
import type { Profile } from '../models';

interface BadgesPageProps {
  profile: Profile;
}

export function BadgesPage({ profile }: BadgesPageProps) {
  const { collection, loading } = usePokemonCollection(profile.id);
  const unlockedPokemon = collection.filter((pokemon) => pokemon.unlocked).length;

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Col·lecció Pokémon</h1>

      <details className="info-box">
        <summary>ℹ️ Com funciona aquesta pantalla?</summary>
        <div className="info-box-content">
          <p>Completa exercicis per desbloquejar Pokémon!</p>
          <ul>
            <li><strong>Pokémon #1–100:</strong> s'obtenen progressant al joc (completant sessions i pujant de nivell).</li>
            <li><strong>Pokémon #101–200:</strong> s'obtenen assolint fites de punts d'experiència (XP).</li>
          </ul>
          <p>Els Pokémon bloquejats es mostren com a siluetes. Practica per descobrir-los tots!</p>
        </div>
      </details>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Pokémon desbloquejats ({unlockedPokemon}/{collection.length || 0})
        </h2>
        <PokemonCollection collection={collection} loading={loading} />
      </section>
    </div>
  );
}
