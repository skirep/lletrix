import styles from './HomePage.module.css';
import { Avatar, ProgressBar } from '../components/common';
import { StreakDisplay } from '../components/gamification';
import { Button } from '../components/common';
import { useProfileStats, useGamification } from '../hooks';
import { getXpToNextLevel } from '../models';
import type { Profile } from '../models';

interface HomePageProps {
  profile: Profile;
  onNavigate: (page: string) => void;
  onSwitchProfile: () => void;
}

export function HomePage({ profile, onNavigate, onSwitchProfile }: HomePageProps) {
  const stats = useProfileStats(profile.id);
  const { streak, dailyGoal } = useGamification(profile.id);
  const xpInfo = stats ? getXpToNextLevel(stats.experience) : null;

  return (
    <div className={`page ${styles.page}`}>
      {/* Profile header */}
      <div className={styles.profileHeader}>
        <button className={styles.avatarBtn} onClick={onSwitchProfile} title="Canviar de perfil">
          <Avatar avatarId={profile.avatar} size="md" name={profile.name} />
        </button>
        <div className={styles.profileInfo}>
          <h1 className={styles.greeting}>Hola, {profile.name}! 👋</h1>
          {stats && <span className={styles.level}>Nivell {stats.level}</span>}
        </div>
      </div>

      {/* XP Bar */}
      {xpInfo && (
        <div className={`card ${styles.xpCard}`}>
          <div className={styles.xpHeader}>
            <span>⭐ Experiència</span>
            <span className="text-muted">{xpInfo.current} / {xpInfo.needed} XP</span>
          </div>
          <ProgressBar value={xpInfo.current} max={xpInfo.needed} color="var(--color-secondary)" />
        </div>
      )}

      {/* Daily goal */}
      {dailyGoal && (
        <div className={`card ${styles.goalCard}`}>
          <div className={styles.goalHeader}>
            <span>🎯 Objectiu diari</span>
            <span className="text-muted">{dailyGoal.completedExercises} / {dailyGoal.targetExercises}</span>
          </div>
          <ProgressBar
            value={dailyGoal.completedExercises}
            max={dailyGoal.targetExercises}
            color={dailyGoal.completed ? 'var(--color-success)' : 'var(--color-primary)'}
          />
          {dailyGoal.completed && (
            <p className={`text-success ${styles.goalDone}`}>✅ Objectiu d&apos;avui assolit!</p>
          )}
        </div>
      )}

      {/* Streak */}
      {streak && <StreakDisplay streak={streak} />}

      {/* Quick actions */}
      <details className="info-box">
        <summary>ℹ️ Com funciona aquesta pantalla?</summary>
        <div className="info-box-content">
          <p>Aquesta és la teva pantalla d'inici. Aquí pots veure:</p>
          <ul>
            <li><strong>Barra d'experiència (XP):</strong> mostra quant has progressat cap al nivell següent.</li>
            <li><strong>Objectiu diari:</strong> quants exercicis has de fer avui per assolir la teva meta.</li>
            <li><strong>Ratxa:</strong> quants dies seguits has practicat. No la trencis!</li>
          </ul>
          <p>Prem <strong>🚀 Practicar ara!</strong> per començar un exercici de lectura.</p>
        </div>
      </details>

      {/* Quick actions */}
      <div className={styles.actions}>
        <Button
          className={styles.actionBtn}
          variant="primary"
          size="lg"
          onClick={() => onNavigate('exercises')}
        >
          🚀 Practicar ara!
        </Button>
        <div className={styles.grid2}>
          <Button variant="secondary" onClick={() => onNavigate('stats')}>
            📊 Estadístiques
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('badges')}>
            🐾 Pokémon
          </Button>
        </div>
      </div>
    </div>
  );
}
