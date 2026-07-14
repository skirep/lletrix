import styles from './BadgesPage.module.css';
import { BadgeDisplay, PokemonCollection } from '../components/gamification';
import { useGamification, usePokemonCollection } from '../hooks';
import type { Profile } from '../models';

interface BadgesPageProps {
  profile: Profile;
}

export function BadgesPage({ profile }: BadgesPageProps) {
  const { badges, streak } = useGamification(profile.id);
  const { collection, loading } = usePokemonCollection(badges);
  const unlockedPokemon = collection.filter((pokemon) => pokemon.unlocked).length;

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Medalles i Pokémon</h1>

      {streak && (
        <div className={`card ${styles.streakCard}`}>
          <span className={styles.streakFire}>🔥</span>
          <div>
            <div className={styles.streakNum}>{streak.current} dies</div>
            <div className="text-muted">Ratxa actual</div>
          </div>
          <div className={styles.streakBest}>
            Millor ratxa: {streak.longest} dies
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Medalles guanyades ({badges.length})
        </h2>
        <BadgeDisplay earned={badges} showAll={false} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Totes les medalles</h2>
        <BadgeDisplay earned={badges} showAll />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Col·lecció Pokémon ({unlockedPokemon}/{collection.length || 0})
        </h2>
        <PokemonCollection collection={collection} loading={loading} />
      </section>
    </div>
  );
}
