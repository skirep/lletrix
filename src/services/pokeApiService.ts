import type { PokemonDetails } from '../models';

interface PokemonApiResponse {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    other?: {
      ['official-artwork']?: {
        front_default: string | null;
      };
    };
  };
}

const pokemonCache = new Map<number, Promise<PokemonDetails>>();

function formatPokemonName(name: string) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchPokemon(pokemonId: number): Promise<PokemonDetails> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch pokemon ${pokemonId}`);
  }

  const data = await response.json() as PokemonApiResponse;
  return {
    id: data.id,
    name: formatPokemonName(data.name),
    imageUrl: data.sprites.other?.['official-artwork']?.front_default ?? data.sprites.front_default,
  };
}

export const pokeApiService = {
  getPokemon(pokemonId: number, fallbackName: string): Promise<PokemonDetails> {
    const cached = pokemonCache.get(pokemonId);
    if (cached) return cached;

    const request = fetchPokemon(pokemonId)
      .catch(() => ({
        id: pokemonId,
        name: fallbackName,
        imageUrl: null,
      }));

    pokemonCache.set(pokemonId, request);
    return request;
  },
};
