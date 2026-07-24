import { useCallback, useEffect, useState } from 'react';
import { getAllSets } from '../exercises';
import { sessionStorage } from '../storage';
import type { ExerciseSet, ExerciseSession } from '../models';

export interface RecommendedMission {
  set: ExerciseSet;
  bestScore: number;
  targetScore: number;
  attempts: number;
  reason: string;
}

const TARGET_SCORES = [60, 80, 95, 100] as const;

function getNextTarget(bestScore: number): number {
  return TARGET_SCORES.find((target) => target > bestScore) ?? 100;
}

function buildMission(sessions: ExerciseSession[]): RecommendedMission | null {
  const availableSets = getAllSets().filter((set) => set.type !== 'pseudowords');
  if (availableSets.length === 0) return null;

  const sessionsBySet = new Map<string, ExerciseSession[]>();
  for (const session of sessions) {
    const setSessions = sessionsBySet.get(session.setId) ?? [];
    setSessions.push(session);
    sessionsBySet.set(session.setId, setSessions);
  }

  const attemptedSets = availableSets
    .map((set) => {
      const setSessions = sessionsBySet.get(set.id) ?? [];
      const bestScore = setSessions.length > 0 ? Math.max(...setSessions.map((session) => session.score)) : 0;
      return { set, setSessions, bestScore };
    })
    .filter(({ setSessions, bestScore }) => setSessions.length > 0 && bestScore < 100)
    .sort((left, right) => left.bestScore - right.bestScore || left.setSessions.length - right.setSessions.length);

  const weakestAttempt = attemptedSets[0];
  if (weakestAttempt) {
    return {
      set: weakestAttempt.set,
      bestScore: weakestAttempt.bestScore,
      targetScore: getNextTarget(weakestAttempt.bestScore),
      attempts: weakestAttempt.setSessions.length,
      reason: weakestAttempt.bestScore < 60
        ? 'És el repte on tens més marge per reforçar la lectura.'
        : 'Estàs a prop de la següent fita i d’un nou desbloqueig Pokémon.',
    };
  }

  const untriedSet = availableSets.find((set) => !sessionsBySet.has(set.id));
  if (untriedSet) {
    return {
      set: untriedSet,
      bestScore: 0,
      targetScore: 60,
      attempts: 0,
      reason: 'És un repte nou pensat per ampliar el teu recorregut lector.',
    };
  }

  const replaySet = availableSets
    .map((set) => ({ set, sessions: sessionsBySet.get(set.id) ?? [] }))
    .sort((left, right) => left.sessions.length - right.sessions.length)[0];

  return replaySet ? {
    set: replaySet.set,
    bestScore: 100,
    targetScore: 100,
    attempts: replaySet.sessions.length,
    reason: 'Ja ho has dominat tot. Mantén la forma repetint el repte menys practicat.',
  } : null;
}

export function useRecommendedMission(profileId: string) {
  const [mission, setMission] = useState<RecommendedMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const sessions = await sessionStorage.getAllByProfile(profileId);
      if (!cancelled) {
        setMission(buildMission(sessions));
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profileId, revision]);

  return { mission, loading, refresh };
}