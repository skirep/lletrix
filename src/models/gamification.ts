export type BadgeId =
  | 'first_exercise'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'perfect_10'
  | 'speed_reader'
  | 'syllable_master'
  | 'word_master'
  | 'sentence_master'
  | 'level_5'
  | 'level_10';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export interface ProfileBadge {
  profileId: string;
  badgeId: BadgeId;
  earnedAt: number;
}

export interface PokemonReward {
  pokemonId: number;
  fallbackName: string;
  requiredExercises: number;
}

export interface PokemonDetails {
  id: number;
  name: string;
  imageUrl: string | null;
}

export interface PokemonCollectionItem extends PokemonReward, PokemonDetails {
  unlocked: boolean;
  unlockCondition: string;
}

export interface DailyGoal {
  profileId: string;
  date: string;
  targetExercises: number;
  completedExercises: number;
  completed: boolean;
}

export interface Streak {
  profileId: string;
  current: number;
  longest: number;
  lastDate: string;
}

export const BADGES: Record<BadgeId, Badge> = {
  first_exercise: {
    id: 'first_exercise',
    name: 'Primer Pas',
    description: 'Has completat el teu primer exercici!',
    icon: '⭐',
    condition: 'Completa 1 exercici',
  },
  streak_3: {
    id: 'streak_3',
    name: 'Constant',
    description: '3 dies consecutius llegint!',
    icon: '🔥',
    condition: '3 dies de ratxa',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Setmana de Foc',
    description: '7 dies consecutius llegint!',
    icon: '🔥🔥',
    condition: '7 dies de ratxa',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Lector Imparable',
    description: '30 dies consecutius llegint!',
    icon: '🏆',
    condition: '30 dies de ratxa',
  },
  perfect_10: {
    id: 'perfect_10',
    name: 'Perfecte!',
    description: 'Has encertat 10 exercicis seguits!',
    icon: '💯',
    condition: '10 encerts seguits',
  },
  speed_reader: {
    id: 'speed_reader',
    name: 'Lector Ràpid',
    description: 'Has llegit 5 paraules en menys de 2 segons cadascuna!',
    icon: '⚡',
    condition: 'Llegeix 5 paraules ràpides',
  },
  syllable_master: {
    id: 'syllable_master',
    name: 'Mestre de Síl·labes',
    description: 'Has completat 20 exercicis de síl·labes!',
    icon: '🎯',
    condition: '20 exercicis de síl·labes',
  },
  word_master: {
    id: 'word_master',
    name: 'Mestre de Paraules',
    description: 'Has completat 20 exercicis de paraules!',
    icon: '📚',
    condition: '20 exercicis de paraules',
  },
  sentence_master: {
    id: 'sentence_master',
    name: 'Mestre de Frases',
    description: 'Has completat 10 exercicis de frases!',
    icon: '📖',
    condition: '10 exercicis de frases',
  },
  level_5: {
    id: 'level_5',
    name: 'Nivell 5',
    description: 'Has arribat al nivell 5!',
    icon: '🌟',
    condition: 'Arriba al nivell 5',
  },
  level_10: {
    id: 'level_10',
    name: 'Nivell 10',
    description: 'Has arribat al nivell 10!',
    icon: '👑',
    condition: 'Arriba al nivell 10',
  },
};

export const POKEMON_REWARDS: PokemonReward[] = Array.from({ length: 200 }, (_, idx) => {
  const pokemonId = idx + 1;
  return {
    pokemonId,
    fallbackName:
      pokemonId === 150
        ? 'Mewtwo'
        : pokemonId === 151
          ? 'Mew'
          : `Pokémon ${pokemonId}`,
    requiredExercises: pokemonId,
  };
});


export const DAILY_GOAL_TARGET = 5;
