import { useEffect, useState } from 'react';
import { POKEMON_PATHS, type PokemonCollectionItem } from '../models';
import { getSetById } from '../exercises';
import { pokeApiService } from '../services/pokeApiService';
import { sessionStorage } from '../storage';

export function usePokemonCollection(profileId: string | null) {
  const [collection, setCollection] = useState<PokemonCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    const load = async () => {
      const sessions = profileId ? await sessionStorage.getAllByProfile(profileId) : [];

      const nextCollection = await Promise.all(
        POKEMON_PATHS.map(async (path) => {
          const pokemon = await pokeApiService.getPokemon(path.pokemonId, path.fallbackName);
          const relevantSessions = sessions.filter((session) => path.setIds.includes(session.setId));
          const bestScore = relevantSessions.length > 0
            ? Math.max(...relevantSessions.map((session) => session.score))
            : 0;
          const unlocked = bestScore >= path.minScorePercent;
          const completedSetIds = unlocked ? [...path.setIds] : [];
          const assignedExerciseTitles = path.setIds.map((setId) => getSetById(setId)?.title ?? setId);
          const progressPercent = Math.min(1, bestScore / path.minScorePercent);
          const averageScore = relevantSessions.length > 0
            ? relevantSessions.reduce((sum, session) => sum + session.score, 0) / relevantSessions.length
            : 0;
          const power = path.basePower
            + Math.round(bestScore * 0.65)
            + Math.round(averageScore / 8)
            + (unlocked ? 14 : 0);
          const firstAssignedTitle = assignedExerciseTitles[0] ?? 'el primer exercici del camí';
          const specialAttackUnlocked = path.exerciseType === 'sentences' && bestScore === 100;
          const specialAttackName = specialAttackUnlocked ? `${pokemon.name} absolut` : null;
          const specialAttackCondition = specialAttackUnlocked ? 'Atac especial desbloquejat per fer 100% en frases' : null;
          const unlockCondition = unlocked
            ? `${bestScore}% sobre ${path.minScorePercent}% · ${path.tierLabel}`
            : `Aconsegueix ${path.minScorePercent}% a ${firstAssignedTitle}`;

          return {
            ...path,
            ...pokemon,
            unlocked,
            unlockCondition,
            assignedExerciseTitles,
            completedSetIds,
            completedSessions: relevantSessions.length,
            progressPercent,
            bestScore,
            power,
            specialAttackUnlocked,
            specialAttackName,
            specialAttackCondition,
          } satisfies PokemonCollectionItem;
        }),
      );

      if (!cancelled) {
        setCollection(nextCollection);
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { collection, loading };
}
