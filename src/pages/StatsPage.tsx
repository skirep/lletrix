import { useState, useEffect } from 'react';
import styles from './StatsPage.module.css';
import { sessionStorage } from '../storage';
import { formatDate, formatTime, percentageStr } from '../utils';
import { useRankings } from '../hooks';
import type { Profile, ExerciseSession } from '../models';

interface StatsPageProps {
  profile: Profile;
}

type StatsTab = 'personal' | 'rankings';

function RankingsTab({ currentProfileId }: { currentProfileId: string }) {
  const { rankings, loading } = useRankings();

  if (loading) {
    return <p className="text-muted text-center">Carregant rànquing...</p>;
  }

  if (rankings.length === 0) {
    return (
      <div className={styles.rankingsEmpty}>
        <span>🏆</span>
        <p className="text-muted">El rànquing encara no té entrades. Completa exercicis per aparèixer-hi!</p>
      </div>
    );
  }

  return (
    <div className={styles.rankingsList}>
      {rankings.map((entry, index) => {
        const isMe = entry.profileId === currentProfileId;
        return (
          <div
            key={entry.profileId}
            className={`card ${styles.rankingCard} ${isMe ? styles.rankingCardMe : ''}`}
          >
            <span className={styles.rankingPos}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <div className={styles.rankingInfo}>
              <span className={styles.rankingName}>
                {entry.displayName}
                {isMe && <span className={styles.rankingMeTag}> (tu)</span>}
              </span>
              {(entry.school || entry.location) && (
                <span className={styles.rankingMeta}>
                  {[entry.school, entry.location].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <div className={styles.rankingStats}>
              <span className={styles.rankingLevel}>Niv. {entry.level}</span>
              <span className={styles.rankingXp}>{entry.experience} XP</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatsPage({ profile }: StatsPageProps) {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatsTab>('personal');

  useEffect(() => {
    sessionStorage.getRecentByProfile(profile.id, 30).then((s) => {
      setSessions(s.filter((x) => x.completedAt !== undefined).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)));
      setLoading(false);
    });
  }, [profile.id]);

  if (loading) {
    return <div className="page"><p className="text-muted text-center">Carregant...</p></div>;
  }

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="page-title">Estadístiques</h1>

      <details className="info-box">
        <summary>ℹ️ Com funciona aquesta pantalla?</summary>
        <div className="info-box-content">
          <p>Aquí pots seguir el teu progrés:</p>
          <ul>
            <li><strong>📊 Les meves:</strong> veu el total d'exercicis, la puntuació mitjana, el millor resultat, el temps total practicat i els errors més freqüents que has comès.</li>
            <li><strong>🏆 Rànquing:</strong> compara el teu nivell i XP amb els d'altres jugadors de tot arreu.</li>
          </ul>
          <p>Com més exercicis facis, millor reflectiran les estadístiques el teu progrés real.</p>
        </div>
      </details>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'personal' ? styles.tabActive : ''}`}
          onClick={() => setTab('personal')}
        >
          📊 Les meves
        </button>
        <button
          className={`${styles.tab} ${tab === 'rankings' ? styles.tabActive : ''}`}
          onClick={() => setTab('rankings')}
        >
          🏆 Rànquing
        </button>
      </div>

      {tab === 'rankings' && <RankingsTab currentProfileId={profile.id} />}

      {tab === 'personal' && (
        <>
          {sessions.length === 0 ? (
            <div className={styles.emptyPersonal}>
              <span className={styles.emptyIcon}>📊</span>
              <p className="text-muted">Encara no tens cap exercici completat. Practica per veure les estadístiques!</p>
            </div>
          ) : (
            <>
              {(() => {
                const totalExercises = sessions.length;
                const avgScore = Math.round(sessions.reduce((s, x) => s + x.score, 0) / sessions.length);
                const totalTime = sessions.reduce((s, x) => s + ((x.completedAt ?? 0) - x.startedAt), 0);
                const bestScore = Math.max(...sessions.map((s) => s.score));
                const errorMap: Record<string, number> = {};
                for (const session of sessions) {
                  for (const attempt of session.attempts) {
                    for (const err of attempt.errorTypes) {
                      errorMap[err] = (errorMap[err] ?? 0) + 1;
                    }
                  }
                }
                const topErrors = Object.entries(errorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const ERROR_LABELS: Record<string, string> = {
                  b_d_confusion: 'Confusió b/d',
                  p_q_confusion: 'Confusió p/q',
                  omission: 'Omissió de lletres',
                  inversion: 'Inversió',
                  repetition: 'Repetició',
                  substitution: 'Substitució',
                  addition: 'Addició de síl·labes',
                };
                return (
                  <>
                    <div className={styles.summaryGrid}>
                      <div className={`card ${styles.statCard}`}>
                        <span className={styles.statValue}>{totalExercises}</span>
                        <span className={styles.statLabel}>Exercicis</span>
                      </div>
                      <div className={`card ${styles.statCard}`}>
                        <span className={styles.statValue}>{avgScore}%</span>
                        <span className={styles.statLabel}>Mitjana</span>
                      </div>
                      <div className={`card ${styles.statCard}`}>
                        <span className={styles.statValue}>{bestScore}%</span>
                        <span className={styles.statLabel}>Millor</span>
                      </div>
                      <div className={`card ${styles.statCard}`}>
                        <span className={styles.statValue}>{formatTime(Math.round(totalTime / 60000))}m</span>
                        <span className={styles.statLabel}>Temps total</span>
                      </div>
                    </div>

                    {topErrors.length > 0 && (
                      <section className={`card ${styles.errorSection}`}>
                        <h2 className={styles.sectionTitle}>Errors més freqüents</h2>
                        <div className={styles.errorList}>
                          {topErrors.map(([err, count]) => (
                            <div key={err} className={styles.errorRow}>
                              <span className={styles.errorName}>{ERROR_LABELS[err] ?? err}</span>
                              <span className={styles.errorCount}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className={styles.sessionSection}>
                      <h2 className={styles.sectionTitle}>Sessions recents</h2>
                      <div className={styles.sessionList}>
                        {sessions.slice(0, 15).map((session) => (
                          <div key={session.id} className={`card ${styles.sessionCard}`}>
                            <div className={styles.sessionScore} style={{
                              color: session.score >= 80 ? 'var(--color-success)' : session.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)'
                            }}>
                              {session.score}%
                            </div>
                            <div className={styles.sessionInfo}>
                              <div className={styles.sessionType}>{session.type}</div>
                              <div className={styles.sessionMeta}>
                                {percentageStr(session.correctItems, session.totalItems)} correctes
                                · {formatTime(Math.round(session.averageTimeMs))} per element
                              </div>
                            </div>
                            <div className={styles.sessionDate}>
                              {formatDate(session.completedAt ?? session.startedAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}
