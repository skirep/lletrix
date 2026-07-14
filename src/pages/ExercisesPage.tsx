import { useState } from 'react';
import styles from './ExercisesPage.module.css';
import { Button } from '../components/common';
import { ExerciseRunner } from './ExerciseRunner';
import { EndlessRunner } from './EndlessRunner';
import { getAllSets, getSetsByType, getSetsByTypeAndDifficulty } from '../exercises';
import type { ExerciseType, Difficulty, ExerciseSet, ExerciseItem, Profile } from '../models';

/**
 * ExercisesPage – exercise catalogue and launcher.
 *
 * The player follows three optional filter steps before starting:
 *  1. **Type**       – syllables / words / pseudowords / sentences.
 *  2. **Difficulty** – easy / medium / hard.
 *  3. **Set**        – one of the available exercise sets matching the filters.
 *
 * Once a set is selected the player can either:
 *  - Start a **standard run** (fixed number of items, shuffled).
 *  - Start an **endless run** (all items from the current filter, looping
 *    until the player exits or makes an error in syllable-hard mode).
 *
 * Rendering ExerciseRunner or EndlessRunner is handled inline: when `running`
 * or `endlessRunning` is true the corresponding component replaces this page.
 */

const TYPE_LABELS: Record<ExerciseType, string> = {
  syllables: '🔤 Síl·labes',
  words: '📝 Paraules',
  pseudowords: '🔮 Pseudoparaules',
  sentences: '📖 Frases',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '🟢 Fàcil',
  medium: '🟡 Mitjà',
  hard: '🔴 Difícil',
};

interface ExercisesPageProps {
  profile: Profile;
}

export function ExercisesPage({ profile }: ExercisesPageProps) {
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedSet, setSelectedSet] = useState<ExerciseSet | null>(null);
  const [running, setRunning] = useState(false);
  const [endlessRunning, setEndlessRunning] = useState(false);
  const [endlessPool, setEndlessPool] = useState<ExerciseItem[]>([]);
  const [endlessLabel, setEndlessLabel] = useState('');

  const allTypes: ExerciseType[] = ['syllables', 'words', 'pseudowords', 'sentences'];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  const availableSets = selectedType && selectedDifficulty
    ? getSetsByTypeAndDifficulty(selectedType, selectedDifficulty)
    : selectedType
    ? getSetsByType(selectedType)
    : getAllSets();

  if (running && selectedSet) {
    return (
      <ExerciseRunner
        profile={profile}
        set={selectedSet}
        onFinish={() => {
          setRunning(false);
          setSelectedSet(null);
        }}
      />
    );
  }

  if (endlessRunning && endlessPool.length > 0) {
    return (
      <EndlessRunner
        profile={profile}
        itemPool={endlessPool}
        label={endlessLabel}
        sessionType={selectedType ?? endlessPool[0].type}
        sessionDifficulty={selectedDifficulty ?? endlessPool[0].difficulty}
        onFinish={() => setEndlessRunning(false)}
      />
    );
  }

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Exercicis</h1>

      <details className="info-box">
        <summary>ℹ️ Com funciona aquesta pantalla?</summary>
        <div className="info-box-content">
          <p>Aquí pots triar i llançar exercicis de lectura en veu alta:</p>
          <ul>
            <li><strong>Tipus:</strong> tria entre síl·labes, paraules, pseudoparaules o frases.</li>
            <li><strong>Dificultat:</strong> fàcil, mitjà o difícil.</li>
            <li><strong>Conjunt:</strong> selecciona un grup d'exercicis concret i prem <strong>▶ Comença!</strong></li>
          </ul>
          <p>El micròfon s'obrirà automàticament per escoltar la teva lectura i et dirà si has llegit bé.</p>
          <p><strong>Mode sense fi:</strong> llegeix elements un darrere l'altre fins que cometis un error. Intenta fer la ratxa més llarga possible!</p>
        </div>
      </details>

      {/* Type selection */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tipus</h2>
        <div className={styles.typeGrid}>
          {allTypes.map((type) => (
            <button
              key={type}
              className={`${styles.typeBtn} ${selectedType === type ? styles.typeSelected : ''}`}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </section>

      {/* Difficulty selection */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dificultat</h2>
        <div className={styles.diffGrid}>
          {difficulties.map((d) => (
            <button
              key={d}
              className={`${styles.diffBtn} ${selectedDifficulty === d ? styles.diffSelected : ''}`}
              onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </section>

      {/* Exercise sets */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Exercicis disponibles ({availableSets.length})
        </h2>
        <div className={styles.setList}>
          {availableSets.map((set) => (
            <button
              key={set.id}
              className={`${styles.setCard} ${selectedSet?.id === set.id ? styles.setSelected : ''}`}
              onClick={() => setSelectedSet(selectedSet?.id === set.id ? null : set)}
            >
              <div className={styles.setTitle}>{set.title}</div>
              <div className={styles.setMeta}>
                <span>{TYPE_LABELS[set.type]}</span>
                <span>{DIFFICULTY_LABELS[set.difficulty]}</span>
                <span>{set.items.length} elements</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedSet && (
        <div className={styles.startBar}>
          <div className={styles.selectedInfo}>
            <strong>{selectedSet.title}</strong>
            <span>{selectedSet.items.length} elements</span>
          </div>
          <Button size="lg" onClick={() => setRunning(true)}>
            ▶ Comença!
          </Button>
        </div>
      )}

      {/* Endless mode */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔄 Mode sense fi</h2>
        <p className={styles.endlessDesc}>
          Llegeix elements sense parar fins que cometis un error.
          {selectedType && <> ({TYPE_LABELS[selectedType]})</>}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            const pool = availableSets.flatMap((s) => s.items);
            if (pool.length === 0) return;
            const label = selectedType ? TYPE_LABELS[selectedType] : 'Tots els elements';
            setEndlessPool(pool);
            setEndlessLabel(label);
            setEndlessRunning(true);
          }}
          disabled={availableSets.flatMap((s) => s.items).length === 0}
        >
          🚀 Jugar en mode sense fi
        </Button>
      </section>
    </div>
  );
}
