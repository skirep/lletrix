import styles from './SettingsPage.module.css';
import { useSettings } from '../hooks';
import type { Profile, FontSize, ColorScheme } from '../models';

interface SettingsPageProps {
  profile: Profile;
}

const FONT_SIZES: { id: FontSize; label: string }[] = [
  { id: 'small', label: 'Petit' },
  { id: 'medium', label: 'Mitjà' },
  { id: 'large', label: 'Gran' },
  { id: 'xlarge', label: 'Molt gran' },
];

const COLOR_SCHEMES: { id: ColorScheme; label: string; emoji: string }[] = [
  { id: 'default', label: 'Per defecte', emoji: '🎨' },
  { id: 'high-contrast', label: 'Alt contrast', emoji: '⚫' },
  { id: 'warm', label: 'Calentet', emoji: '🟡' },
  { id: 'cool', label: 'Fresquet', emoji: '🔵' },
];

const READING_SPEEDS: { id: number; label: string }[] = [
  { id: 2, label: 'Ràpida (2s)' },
  { id: 4, label: 'Normal (4s)' },
  { id: 6, label: 'Tranquil·la (6s)' },
  { id: 8, label: 'Molt tranquil·la (8s)' },
];

export function SettingsPage({ profile }: SettingsPageProps) {
  const { settings, update } = useSettings(profile.id);

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Ajustos</h1>

      {/* Font size */}
      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Mida de la lletra</h2>
        <div className={styles.optionGrid}>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.id}
              className={`${styles.optBtn} ${settings.fontSize === fs.id ? styles.optSelected : ''}`}
              onClick={() => void update({ fontSize: fs.id })}
            >
              {fs.label}
            </button>
          ))}
        </div>
      </section>

      {/* Color scheme */}
      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Colors</h2>
        <div className={styles.optionGrid}>
          {COLOR_SCHEMES.map((cs) => (
            <button
              key={cs.id}
              className={`${styles.optBtn} ${settings.colorScheme === cs.id ? styles.optSelected : ''}`}
              onClick={() => void update({ colorScheme: cs.id })}
            >
              {cs.emoji} {cs.label}
            </button>
          ))}
        </div>
      </section>

      {/* Font type */}
      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Tipus de lletra</h2>
        <div className={styles.optionGrid}>
          <button
            className={`${styles.optBtn} ${settings.fontFamily === 'standard' ? styles.optSelected : ''}`}
            onClick={() => void update({ fontFamily: 'standard' })}
          >
            Estàndard
          </button>
          <button
            className={`${styles.optBtn} ${styles.dyslexiaBtn} ${settings.fontFamily === 'dyslexia' ? styles.optSelected : ''}`}
            onClick={() => void update({ fontFamily: 'dyslexia' })}
          >
            Dislèxia
          </button>
        </div>
      </section>

      {/* Reading speed */}
      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Velocitat de lectura</h2>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Temps per llegir cada síl·laba, paraula o frase
        </p>
        <div className={styles.optionGrid}>
          {READING_SPEEDS.map((speed) => (
            <button
              key={speed.id}
              className={`${styles.optBtn} ${settings.speed === speed.id ? styles.optSelected : ''}`}
              onClick={() => void update({ speed: speed.id })}
            >
              {speed.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dyslexia mode */}
      <section className={`card ${styles.section}`}>
        <div className={styles.toggleRow}>
          <div>
            <h2 className={styles.sectionTitle}>Mode dislèxia</h2>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              Espaiament i tipus de lletra especials
            </p>
          </div>
          <button
            className={`${styles.toggle} ${settings.dyslexiaMode ? styles.toggleOn : ''}`}
            onClick={() => void update({ dyslexiaMode: !settings.dyslexiaMode })}
            aria-label="Mode dislèxia"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </section>

      {/* Info */}
      <p className="text-muted text-center" style={{ fontSize: '14px' }}>
        Tots els ajustos es guarden automàticament en el dispositiu
      </p>
    </div>
  );
}
