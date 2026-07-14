import { db } from './database';
import type { AppSettings } from '../models';
import { DEFAULT_SETTINGS } from '../models';
import { supabase } from '../lib/supabase';

const ALLOWED_SPEEDS = [1, 2, 4, 6];
const ALLOWED_SKINS = ['original', 'pokemon', 'pikachu-ash', 'team-rocket'] as const;

function normalizeSpeed(speed: number): number {
  if (ALLOWED_SPEEDS.includes(speed)) return speed;
  if (speed >= 6) return 6;
  if (speed >= 4) return 4;
  if (speed >= 2) return 2;
  return 1;
}

function normalizeSkin(skin: AppSettings['skin'] | undefined): AppSettings['skin'] {
  return ALLOWED_SKINS.includes(skin ?? 'original') ? (skin ?? 'original') : 'original';
}

export async function loadSettingsFromSupabase(profileId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('profile_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !data) return;
  const cloudSettings: AppSettings = {
    profileId,
    speed: data.speed as number,
    fontSize: data.font_size as AppSettings['fontSize'],
    fontFamily: data.font_family as AppSettings['fontFamily'],
    colorScheme: data.color_scheme as AppSettings['colorScheme'],
    skin: data.skin as AppSettings['skin'],
    dyslexiaMode: data.dyslexia_mode as boolean,
    timeBetweenWords: data.time_between_words as number,
    fullscreen: data.fullscreen as boolean,
  };
  const local = await db.settings.get(profileId);
  if (!local) {
    await db.settings.put(cloudSettings);
  }
}

async function syncSettingsToSupabase(settings: AppSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profile_settings').upsert({
    profile_id: settings.profileId,
    speed: settings.speed,
    font_size: settings.fontSize,
    font_family: settings.fontFamily,
    color_scheme: settings.colorScheme,
    skin: settings.skin,
    dyslexia_mode: settings.dyslexiaMode,
    time_between_words: settings.timeBetweenWords,
    fullscreen: settings.fullscreen,
  }, { onConflict: 'profile_id' });
  if (error) {
    console.error('Failed to sync settings to Supabase:', error.message);
  }
}


export const settingsStorage = {
  async get(profileId: string): Promise<AppSettings> {
    const settings = await db.settings.get(profileId);
    if (!settings) {
      const defaults: AppSettings = { ...DEFAULT_SETTINGS, profileId };
      await db.settings.add(defaults);
      return defaults;
    }

    const updated: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      profileId,
      speed: normalizeSpeed(settings.speed),
      skin: normalizeSkin(settings.skin),
    };

    if (JSON.stringify(updated) !== JSON.stringify(settings)) {
      await db.settings.put(updated);
      return updated;
    }

    return updated;
  },

  async save(settings: AppSettings): Promise<void> {
    await db.settings.put(settings);
    void syncSettingsToSupabase(settings);
  },

  async update(profileId: string, partial: Partial<Omit<AppSettings, 'profileId'>>): Promise<AppSettings> {
    const current = await this.get(profileId);
    const updated = { ...current, ...partial };
    await db.settings.put(updated);
    void syncSettingsToSupabase(updated);
    return updated;
  },
};
