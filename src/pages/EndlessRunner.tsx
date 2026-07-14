import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './EndlessRunner.module.css';
import { ExerciseText, ResultFeedback } from '../components/exercise';
import { Button } from '../components/common';
import { useSettings, useSpeechRecognition } from '../hooks';
import { calculateSimilarity, classifyResult, detectErrors, calculateScore } from '../scoring';
import { shuffleItems } from '../exercises';
import { sessionStorage } from '../storage';
import { gamificationService } from '../gamification';
import { generateId } from '../utils';
import type { ExerciseItem, Profile, ReadingResult, ExerciseAttempt, ExerciseSession, ExerciseType, Difficulty } from '../models';

interface EndlessRunnerProps {
  profile: Profile;
  itemPool: ExerciseItem[];
  label: string;
  sessionType: ExerciseType;
  sessionDifficulty: Difficulty;
  onFinish: () => void;
}

const CORRECT_DISPLAY_MS = 600;
const ERROR_DISPLAY_MS = 1500;

export function EndlessRunner({ profile, itemPool, sessionType, sessionDifficulty, onFinish }: EndlessRunnerProps) {
  const { settings } = useSettings(profile.id);
  const { transcript, isListening, error, isSupported, start, stop, setTranscript } = useSpeechRecognition();

  const shuffledPoolRef = useRef(shuffleItems(itemPool));
  const poolIndexRef = useRef(0);

  const firstItem = shuffledPoolRef.current[0] ?? itemPool[0];
  const [currentItem, setCurrentItem] = useState<ExerciseItem>(firstItem);
  const currentItemRef = useRef<ExerciseItem>(firstItem);

  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);

  const [phase, setPhase] = useState<'ready' | 'listening' | 'result' | 'done'>('ready');
  const phaseRef = useRef<'ready' | 'listening' | 'result' | 'done'>('ready');

  const [lastResult, setLastResult] = useState<{ result: ReadingResult; recognized: string; similarity: number } | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const transcriptRef = useRef('');
  const startTimeRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const itemDeadlineRef = useRef(0);
  const readTimeoutRef = useRef<number | null>(null);
  const nextTimeoutRef = useRef<number | null>(null);
  const attemptsRef = useRef<ExerciseAttempt[]>([]);
  const completingRef = useRef(false);

  const clearTimer = useCallback((timer: { current: number | null }) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const getNextItem = useCallback(() => {
    poolIndexRef.current++;
    if (poolIndexRef.current >= shuffledPoolRef.current.length) {
      shuffledPoolRef.current = shuffleItems(itemPool);
      poolIndexRef.current = 0;
    }
    const item = shuffledPoolRef.current[poolIndexRef.current];
    currentItemRef.current = item;
    setCurrentItem(item);
    return item;
  }, [itemPool]);

  const evaluateCurrentAttempt = useCallback((recognizedText: string) => {
    if (phaseRef.current !== 'listening') return;
    clearTimer(readTimeoutRef);
    const timeMs = Date.now() - startTimeRef.current;
    const similarity = calculateSimilarity(currentItemRef.current.text, recognizedText);
    const result = classifyResult(similarity);
    const attempt: ExerciseAttempt = {
      itemId: currentItemRef.current.id,
      expected: currentItemRef.current.text,
      recognized: recognizedText,
      result,
      similarity,
      errorTypes: detectErrors(currentItemRef.current.text, recognizedText),
      timeMs,
      timestamp: Date.now(),
    };
    attemptsRef.current = [...attemptsRef.current, attempt];
    setLastResult({ result, recognized: recognizedText, similarity });
    if (result === 'correct') {
      streakRef.current++;
      setStreak(streakRef.current);
    }
    setPhase('result');
  }, [clearTimer]);

  const completeSession = useCallback(async (finalAttempts: ExerciseAttempt[]) => {
    if (completingRef.current) return;
    completingRef.current = true;

    if (finalAttempts.length === 0) {
      return;
    }

    const completedAt = Date.now();
    const correctItems = finalAttempts.filter((attempt) => attempt.result === 'correct').length;
    const totalItems = finalAttempts.length;
    const score = calculateScore(correctItems, totalItems);
    const averageTimeMs = Math.round(
      finalAttempts.reduce((acc, attempt) => acc + attempt.timeMs, 0) / totalItems,
    );
    const session: ExerciseSession = {
      id: generateId(),
      profileId: profile.id,
      setId: `endless-${sessionType}-${sessionDifficulty}`,
      type: sessionType,
      difficulty: sessionDifficulty,
      attempts: finalAttempts,
      startedAt: sessionStartRef.current,
      completedAt,
      score,
      totalItems,
      correctItems,
      averageTimeMs,
    };

    try {
      await sessionStorage.save(session);
    } catch (err) {
      console.error('Error saving endless session:', err);
    }

    try {
      await gamificationService.processSession(session);
    } catch (err) {
      console.error('Error processing endless gamification:', err);
    }
  }, [profile.id, sessionDifficulty, sessionType]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // ready → listening
  useEffect(() => {
    if (phase !== 'ready') return;
    setTranscript('');
    transcriptRef.current = '';
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
      if (!transcriptRef.current.trim()) {
        setPhase('done');
      } else {
        evaluateCurrentAttempt(transcriptRef.current);
      }
    }, durationMs);
    return () => { clearTimer(readTimeoutRef); };
  }, [phase, settings.speed, start, stop, setTranscript, clearTimer, evaluateCurrentAttempt]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'listening') return;
    const intervalId = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, itemDeadlineRef.current - Date.now()));
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  // When recognition ends naturally
  useEffect(() => {
    if (!isListening && phase === 'listening') {
      evaluateCurrentAttempt(transcriptRef.current);
    }
  }, [isListening, phase, evaluateCurrentAttempt]);

  // result → next or done
  useEffect(() => {
    if (phase !== 'result' || !lastResult) return;
    const delay = lastResult.result === 'correct' ? CORRECT_DISPLAY_MS : ERROR_DISPLAY_MS;
    nextTimeoutRef.current = window.setTimeout(() => {
      if (lastResult.result === 'correct') {
        getNextItem();
        setPhase('ready');
      } else {
        setPhase('done');
      }
    }, delay);
    return () => { clearTimer(nextTimeoutRef); };
  }, [phase, lastResult, getNextItem, clearTimer]);

  useEffect(() => {
    if (phase === 'done') {
      void completeSession(attemptsRef.current);
    }
  }, [phase, completeSession]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimer(readTimeoutRef);
    clearTimer(nextTimeoutRef);
    stop();
  }, [clearTimer, stop]);

  const handlePlayAgain = useCallback(() => {
    shuffledPoolRef.current = shuffleItems(itemPool);
    poolIndexRef.current = 0;
    const item = shuffledPoolRef.current[0];
    currentItemRef.current = item;
    setCurrentItem(item);
    attemptsRef.current = [];
    sessionStartRef.current = Date.now();
    completingRef.current = false;
    streakRef.current = 0;
    setStreak(0);
    setLastResult(null);
    setPhase('ready');
  }, [itemPool]);

  if (phase === 'done') {
    const s = streakRef.current;
    const emoji = s >= 20 ? '🏆' : s >= 10 ? '🎉' : s >= 5 ? '👍' : '💪';
    return (
      <div className={`page ${styles.done}`}>
        <span className={styles.doneEmoji}>{emoji}</span>
        <h1 className={styles.doneTitle}>Fi del joc!</h1>
        <div className={`card ${styles.streakCard}`}>
          <div className={styles.streakValue}>{s}</div>
          <div className="text-muted">{s === 1 ? 'encert seguit' : 'encerts seguits'}</div>
          {lastResult && lastResult.result !== 'correct' && (
            <div className={styles.lastAttempt}>
              <div>Esperada: <strong>{currentItem.text}</strong></div>
              {lastResult.recognized && (
                <div>Reconegut: <em>{lastResult.recognized}</em></div>
              )}
            </div>
          )}
          {!lastResult && (
            <div className={styles.lastAttempt}>Temps esgotat!</div>
          )}
        </div>
        <Button size="lg" variant="primary" onClick={handlePlayAgain}>
          🔄 Tornar a jugar
        </Button>
        <Button size="lg" onClick={onFinish}>
          🏠 Tornar a l&apos;inici
        </Button>
      </div>
    );
  }

  return (
    <div className={`page ${styles.runner}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.streak}>🔥 {streak}</span>
        <button className={styles.closeBtn} onClick={onFinish} aria-label="Sortir">✕</button>
      </div>

      <ExerciseText text={currentItem.text} />

      {error && <p className="text-error text-center">{error}</p>}
      {!isSupported && <p className="text-error text-center">🎤 Micròfon no disponible en aquest navegador</p>}

      {lastResult && (
        <ResultFeedback
          result={lastResult.result}
          expected={currentItem.text}
          recognized={lastResult.recognized}
          similarity={lastResult.similarity}
        />
      )}

      <div className={styles.controls}>
        {phase === 'listening' && (
          <p className="text-muted">⏱️ {Math.ceil(timeLeftMs / 1000)}s</p>
        )}
        {phase === 'result' && lastResult?.result === 'correct' && (
          <p className="text-muted">Preparant el següent...</p>
        )}
      </div>
    </div>
  );
}
