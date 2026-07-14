import { useEffect, useState } from 'react';
import { POKEMON_REWARDS, type PokemonCollectionItem } from '../models';
import { pokeApiService } from '../services/pokeApiService';
import { profileStorage } from '../storage';

export function usePokemonCollection(profileId: string | null) {
  const [collection, setCollection] = useState<PokemonCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    const load = async () => {
      const stats = profileId ? await profileStorage.getStats(profileId) : null;
      const totalProgress = Math.max(
        stats?.totalCorrect ?? 0,
        stats?.totalExercises ?? 0,
      );

      const nextCollection = await Promise.all(
        POKEMON_REWARDS.map(async (reward) => {
          const pokemon = await pokeApiService.getPokemon(reward.pokemonId, reward.fallbackName);
          return {
            ...reward,
            ...pokemon,
            unlocked: totalProgress >= reward.requiredExercises,
            unlockCondition: `${reward.requiredExercises} avenç${reward.requiredExercises === 1 ? '' : 'os'}`,
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
