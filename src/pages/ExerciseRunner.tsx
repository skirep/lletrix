import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './ExerciseRunner.module.css';
import { ExerciseText, ResultFeedback } from '../components/exercise';
import { Button } from '../components/common';
import { useSettings, useSpeechRecognition } from '../hooks';
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

const RESULT_DISPLAY_MS = 1200;

export function ExerciseRunner({ profile, set, onFinish }: ExerciseRunnerProps) {
  const [items] = useState(() => shuffleItems(set.items));
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [lastResult, setLastResult] = useState<{ result: ReadingResult; recognized: string; similarity: number } | null>(null);
  const [phase, setPhase] = useState<'ready' | 'listening' | 'result' | 'done'>('ready');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const itemDeadlineRef = useRef<number>(0);
  const readTimeoutRef = useRef<number | null>(null);
  const nextTimeoutRef = useRef<number | null>(null);
  const attemptsRef = useRef<ExerciseAttempt[]>([]);
  const completingRef = useRef(false);

  const { settings } = useSettings(profile.id);
  const { transcript, isListening, error, isSupported, start, stop, setTranscript } = useSpeechRecognition();

  const currentItem = items[index];

  const clearTimer = useCallback((timer: { current: number | null }) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const completeSession = useCallback(async (finalAttempts: ExerciseAttempt[]) => {
    if (completingRef.current) return;
    completingRef.current = true;
    const completedAt = Date.now();
    const correctItems = finalAttempts.filter((a) => a.result === 'correct').length;
    const totalItems = finalAttempts.length;
    const score = calculateScore(correctItems, totalItems);
    const avgTime = finalAttempts.length > 0
      ? finalAttempts.reduce((s, a) => s + a.timeMs, 0) / finalAttempts.length
      : 0;

    const session: ExerciseSession = {
      id: generateId(),
      profileId: profile.id,
      setId: set.id,
      type: set.type,
      difficulty: set.difficulty,
      attempts: finalAttempts,
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
  }, [profile.id, set.id, set.type, set.difficulty]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    if (phase !== 'ready') return;
    setTranscript('');
    setLastResult(null);
    const durationMs = Math.max(1000, Math.round(settings.speed * 1000));
    startTimeRef.current = Date.now();
    itemDeadlineRef.current = startTimeRef.current + durationMs;
    setTimeLeftMs(durationMs);
    setPhase('listening');
    start();
    readTimeoutRef.current = window.setTimeout(() => {
      stop();
      setTimeLeftMs(0);
    }, durationMs);

    return () => {
      clearTimer(readTimeoutRef);
    };
  }, [phase, settings.speed, start, stop, setTranscript, clearTimer]);

  useEffect(() => {
    if (phase !== 'listening') return;
    const intervalId = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, itemDeadlineRef.current - Date.now()));
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  // When recognition ends automatically, evaluate and transition to result phase
  useEffect(() => {
    if (!isListening && phase === 'listening') {
      clearTimer(readTimeoutRef);
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
      setAttempts((prev) => {
        const updated = [...prev, attempt];
        attemptsRef.current = updated;
        return updated;
      });
      setPhase('result');
    }
  }, [isListening, transcript, phase, currentItem, clearTimer]);

  useEffect(() => {
    if (phase !== 'result') return;
    nextTimeoutRef.current = window.setTimeout(() => {
      if (index + 1 >= items.length) {
        void completeSession(attemptsRef.current);
      } else {
        setIndex((i) => i + 1);
        setPhase('ready');
      }
    }, RESULT_DISPLAY_MS);
    return () => {
      clearTimer(nextTimeoutRef);
    };
  }, [phase, index, items.length, completeSession, clearTimer]);

  useEffect(() => () => {
    clearTimer(readTimeoutRef);
    clearTimer(nextTimeoutRef);
    stop();
  }, [clearTimer, stop]);

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
      {!isSupported && <p className="text-error text-center">🎤 Micròfon no disponible en aquest navegador</p>}

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
        {phase === 'listening' && (
          <p className="text-muted">⏱️ Temps restant: {(timeLeftMs / 1000).toFixed(1)}s</p>
        )}
        {phase === 'result' && (
          <p className="text-muted">Preparant el següent element...</p>
        )}
      </div>
    </div>
  );
}
