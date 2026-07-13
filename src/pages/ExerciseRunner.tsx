import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './ExerciseRunner.module.css';
import { ExerciseText, MicrophoneButton, ResultFeedback } from '../components/exercise';
import { Button } from '../components/common';
import { useSpeechRecognition } from '../hooks';
import { calculateSimilarity, classifyResult, detectErrors, calculateScore } from '../scoring';
import { sessionStorage } from '../storage';
import { gamificationService } from '../gamification';
import { shuffleItems } from '../exercises';
import { generateId } from '../utils';
import type { ExerciseSet, Profile, ExerciseAttempt, ExerciseSession, ReadingResult } from '../models';

interface ExerciseRunnerProps {
  profile: Profile;
  set: ExerciseSet;
  onFinish: () => void;
}

export function ExerciseRunner({ profile, set, onFinish }: ExerciseRunnerProps) {
  const [items] = useState(() => shuffleItems(set.items));
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [lastResult, setLastResult] = useState<{ result: ReadingResult; recognized: string; similarity: number } | null>(null);
  const [phase, setPhase] = useState<'ready' | 'listening' | 'result' | 'done'>('ready');
  const startTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());

  const { transcript, isListening, error, isSupported, start, stop, setTranscript } = useSpeechRecognition();

  const currentItem = items[index];

  const handleStartListening = useCallback(() => {
    setTranscript('');
    setLastResult(null);
    startTimeRef.current = Date.now();
    setPhase('listening');
    start();
  }, [start, setTranscript]);

  const handleStopListening = useCallback(() => {
    stop();
    setPhase('result');
  }, [stop]);

  // When recognition ends automatically, evaluate and transition to result phase
  useEffect(() => {
    if (!isListening && transcript && phase === 'listening') {
      const timeMs = Date.now() - startTimeRef.current;
      const similarity = calculateSimilarity(currentItem.text, transcript);
      const result = classifyResult(similarity);
      const errorTypes = detectErrors(currentItem.text, transcript);
      setLastResult({ result, recognized: transcript, similarity });
      const attempt: ExerciseAttempt = {
        itemId: currentItem.id,
        expected: currentItem.text,
        recognized: transcript,
        result,
        similarity,
        errorTypes,
        timeMs,
        timestamp: Date.now(),
      };
      setAttempts((prev) => [...prev, attempt]);
      setPhase('result');
    }
  }, [isListening, transcript, phase, currentItem]);

  const handleNext = async () => {
    if (index + 1 >= items.length) {
      // Finish session
      const completedAt = Date.now();
      const correctItems = attempts.filter((a) => a.result === 'correct').length;
      const totalItems = attempts.length;
      const score = calculateScore(correctItems, totalItems);
      const avgTime = attempts.length > 0
        ? attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length
        : 0;

      const session: ExerciseSession = {
        id: generateId(),
        profileId: profile.id,
        setId: set.id,
        type: set.type,
        difficulty: set.difficulty,
        attempts,
        startedAt: sessionStartRef.current,
        completedAt,
        score,
        totalItems,
        correctItems,
        averageTimeMs: avgTime,
      };
      await sessionStorage.save(session);
      await gamificationService.processSession(session);
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
      setLastResult(null);
      setTranscript('');
      setPhase('ready');
    }
  };

  if (phase === 'done') {
    const correctItems = attempts.filter((a) => a.result === 'correct').length;
    const score = calculateScore(correctItems, attempts.length);
    return (
      <div className={`page ${styles.done}`}>
        <span className={styles.doneEmoji}>{score >= 80 ? '🎉' : score >= 50 ? '👍' : '💪'}</span>
        <h1 className={styles.doneTitle}>Exercici completat!</h1>
        <div className={`card ${styles.scoreCard}`}>
          <div className={styles.scoreValue}>{score}%</div>
          <div className="text-muted">de respostes correctes</div>
          <div className={styles.scoreDetail}>
            {correctItems} de {attempts.length} paraules llegides bé
          </div>
        </div>
        <Button size="lg" onClick={onFinish}>
          🏠 Tornar a l&apos;inici
        </Button>
      </div>
    );
  }

  return (
    <div className={`page ${styles.runner}`}>
      {/* Progress */}
      <div className={styles.progress}>
        <span className="text-muted">{index + 1} / {items.length}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${((index) / items.length) * 100}%` }} />
        </div>
        <button className={styles.closeBtn} onClick={onFinish} aria-label="Sortir">✕</button>
      </div>

      {/* Text to read */}
      <ExerciseText text={currentItem.text} />

      {/* Error display */}
      {error && <p className="text-error text-center">{error}</p>}

      {/* Result */}
      {lastResult && (
        <ResultFeedback
          result={lastResult.result}
          expected={currentItem.text}
          recognized={lastResult.recognized}
          similarity={lastResult.similarity}
        />
      )}

      {/* Controls */}
      <div className={styles.controls}>
        {phase === 'result' ? (
          <Button size="lg" onClick={() => void handleNext()}>
            {index + 1 >= items.length ? '✅ Finalitzar' : '➡ Següent'}
          </Button>
        ) : (
          <div className={styles.micWrapper}>
            <MicrophoneButton
              isListening={isListening}
              isSupported={isSupported}
              onStart={handleStartListening}
              onStop={handleStopListening}
              disabled={false}
            />
          </div>
        )}

        {phase === 'ready' && !isListening && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleNext()}
          >
            Saltar
          </Button>
        )}
      </div>
    </div>
  );
}
