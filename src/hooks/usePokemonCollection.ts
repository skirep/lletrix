import { useEffect, useState } from 'react';
import { BADGES, POKEMON_REWARDS, type PokemonCollectionItem, type ProfileBadge } from '../models';
import { pokeApiService } from '../services/pokeApiService';

export function usePokemonCollection(earnedBadges: ProfileBadge[]) {
  const [collection, setCollection] = useState<PokemonCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const earnedAtByBadgeId = new Map(earnedBadges.map((badge) => [badge.badgeId, badge.earnedAt]));

    setLoading(true);
    Promise.all(
      POKEMON_REWARDS.map(async (reward) => {
        const pokemon = await pokeApiService.getPokemon(reward.pokemonId, reward.fallbackName);
        const badge = BADGES[reward.badgeId];
        return {
          ...reward,
          ...pokemon,
          unlocked: earnedAtByBadgeId.has(reward.badgeId),
          unlockedAt: earnedAtByBadgeId.get(reward.badgeId) ?? null,
          unlockCondition: badge.condition,
        } satisfies PokemonCollectionItem;
      }),
    ).then((nextCollection) => {
      if (cancelled) return;
      setCollection(nextCollection);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [earnedBadges]);

  return { collection, loading };
}
