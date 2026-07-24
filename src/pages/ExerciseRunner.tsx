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

/**
 * ExerciseRunner – runs a single exercise set item by item using speech recognition.
 *
 * Item lifecycle (phase state machine):
 *  'ready'     → Speech recognition starts; a countdown timer is shown.
 *  'listening' → Microphone is open; the player reads the displayed text aloud.
 *                The item times out after `settings.speed` seconds if no speech
 *                is detected.
 *  'result'    → The recognised text is compared to the expected text and
 *                classified as correct / almost / incorrect.  Feedback is shown
 *                for RESULT_DISPLAY_MS milliseconds.
 *  'done'      → All items have been processed; the session is saved and
 *                gamification is processed (XP, badges, streak…).
 *
 * Special behaviour:
 *  - In **syllable-hard** mode the set is pre-expanded to HARD_SYLLABLE_BASE_ITEMS
 *    items; any item answered incorrectly is appended again to the queue so the
 *    player must eventually read every syllable correctly.
 */

interface ExerciseRunnerProps {
  profile: Profile;
  set: ExerciseSet;
  onFinish: () => void;
}

const RESULT_DISPLAY_MS = 1200;
const SYLLABLE_RESULT_DISPLAY_MS = 350;
const HARD_SYLLABLE_BASE_ITEMS = 50;

export function ExerciseRunner({ profile, set, onFinish }: ExerciseRunnerProps) {
  const isHardSyllableMode = set.type === 'syllables' && set.difficulty === 'hard';
  const [items, setItems] = useState(() => {
    const shuffled = shuffleItems(set.items);
    if (!isHardSyllableMode || shuffled.length === 0) {
      return shuffled;
    }
    return Array.from({ length: HARD_SYLLABLE_BASE_ITEMS }, (_, idx) => {
      const source = shuffled[idx % shuffled.length];
      return { ...source, id: `${source.id}-run-${idx + 1}` };
    });
  });
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [lastResult, setLastResult] = useState<{ result: ReadingResult; recognized: string; similarity: number } | null>(null);
  const [phase, setPhase] = useState<'ready' | 'listening' | 'result' | 'done'>('ready');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const itemDeadlineRef = useRef<number>(0);
  const timedOutRef = useRef(false);
  const readTimeoutRef = useRef<number | null>(null);
  const nextTimeoutRef = useRef<number | null>(null);
  const attemptsRef = useRef<ExerciseAttempt[]>([]);
  const completingRef = useRef(false);
  const phaseRef = useRef<'ready' | 'listening' | 'result' | 'done'>('ready');
  const transcriptRef = useRef('');
  const alternativesRef = useRef<Array<{ transcript: string; confidence: number }>>([]);

  const { settings } = useSettings(profile.id);
  const { transcript, alternatives, isListening, error, isSupported, start, stop, setTranscript } = useSpeechRecognition();

  const currentItem = items[index];

  const clearTimer = useCallback((timer: { current: number | null }) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const evaluateCurrentAttempt = useCallback((recognizedText: string) => {
    if (phaseRef.current !== 'listening' || timedOutRef.current || !currentItem) return;
    clearTimer(readTimeoutRef);
    const timeMs = Date.now() - startTimeRef.current;

    // Try all speech alternatives and pick the one that best matches the expected text.
    // This significantly improves recognition of short syllables that aren't real words,
    // since the speech engine's top result often misidentifies them.
    let bestText = recognizedText;
    let bestSimilarity = calculateSimilarity(currentItem.text, recognizedText);
    for (const alt of alternativesRef.current) {
      const sim = calculateSimilarity(currentItem.text, alt.transcript);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestText = alt.transcript;
      }
    }

    const similarity = bestSimilarity;
    const result = classifyResult(similarity);
    const errorTypes = detectErrors(currentItem.text, bestText);
    setLastResult({ result, recognized: bestText, similarity });
    const attempt: ExerciseAttempt = {
      itemId: currentItem.id,
      expected: currentItem.text,
      recognized: bestText,
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
    if (isHardSyllableMode && result !== 'correct') {
      setItems((prev) => [...prev, { ...currentItem, id: `${currentItem.id}-retry-${Date.now()}` }]);
    }
    setPhase('result');
  }, [currentItem, clearTimer, isHardSyllableMode]);

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
    try {
      await sessionStorage.save(session);
    } catch (err) {
      console.error('Error saving session:', err);
    }
    try {
      await gamificationService.processSession(session);
    } catch (err) {
      console.error('Error processing gamification:', err);
    }
    setPhase('done');
  }, [profile.id, set.id, set.type, set.difficulty]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    alternativesRef.current = alternatives;
  }, [alternatives]);

  useEffect(() => {
    if (items.length === 0) {
      setPhase('done');
      return;
    }
    if (phase !== 'ready') return;
    setTranscript('');
    transcriptRef.current = '';
    setLastResult(null);
    timedOutRef.current = false;
    const durationMs = Math.max(1000, Math.round(settings.speed * 1000));
    startTimeRef.current = Date.now();
    itemDeadlineRef.current = startTimeRef.current + durationMs;
    setTimeLeftMs(durationMs);
    setPhase('listening');
    start();
    readTimeoutRef.current = window.setTimeout(() => {
      timedOutRef.current = true;
      stop();
      setTimeLeftMs(0);
      if (index + 1 >= items.length) {
        void completeSession(attemptsRef.current);
      } else {
        setIndex((i) => i + 1);
        setPhase('ready');
      }
    }, durationMs);

    return () => {
      clearTimer(readTimeoutRef);
    };
  }, [phase, settings.speed, start, stop, setTranscript, clearTimer, evaluateCurrentAttempt, items.length]);

  useEffect(() => {
    if (phase !== 'listening') return;
    const intervalId = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, itemDeadlineRef.current - Date.now()));
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  // When recognition ends automatically, evaluate and transition to result phase
  useEffect(() => {
    if (!isListening && phase === 'listening' && !timedOutRef.current) {
      evaluateCurrentAttempt(transcriptRef.current);
    }
  }, [isListening, phase, evaluateCurrentAttempt]);

  useEffect(() => {
    if (phase !== 'result') return;
    const resultDisplayMs = set.type === 'syllables' ? SYLLABLE_RESULT_DISPLAY_MS : RESULT_DISPLAY_MS;
    nextTimeoutRef.current = window.setTimeout(() => {
      if (index + 1 >= items.length) {
        void completeSession(attemptsRef.current);
      } else {
        setIndex((i) => i + 1);
        setPhase('ready');
      }
    }, resultDisplayMs);
    return () => {
      clearTimer(nextTimeoutRef);
    };
  }, [phase, index, items.length, completeSession, clearTimer, set.type]);

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

  if (!currentItem) {
    return (
      <div className={`page ${styles.done}`}>
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

      {/* Instruction */}
      <p className={`text-muted ${styles.instruction}`}>🎤 Llegeix en veu alta el text que apareix a la pantalla</p>

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
          <p className="text-muted">⏱️ Temps restant: {Math.ceil(timeLeftMs / 1000)}s</p>
        )}
        {phase === 'result' && (
          <p className="text-muted">Preparant el següent element...</p>
        )}
      </div>
    </div>
  );
}
