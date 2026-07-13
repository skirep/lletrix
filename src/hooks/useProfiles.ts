import { useState, useEffect } from 'react';
import { profileStorage, loadProfilesFromSupabase, loadRankings } from '../storage';
import type { Profile, ProfileStats } from '../models';
import type { RankingEntry } from '../storage';
import { generateId } from '../utils';

export function useProfiles(userId?: string) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (userId) {
        const cloud = await loadProfilesFromSupabase(userId);
        for (const p of cloud) {
          const existing = await profileStorage.getById(p.id);
          if (!existing) {
            await profileStorage.create(p);
          }
        }
        const local = await profileStorage.getAll(userId);
        setProfiles(local.length > 0 ? local : cloud);
      } else {
        const data = await profileStorage.getAll();
        setProfiles(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [userId]);

  const createProfile = async (name: string, avatar: string) => {
    const profile: Profile = {
      id: generateId(),
      userId,
      name,
      avatar,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await profileStorage.create(profile);
    await load();
    return profile;
  };

  const updateProfile = async (profile: Profile) => {
    await profileStorage.update(profile);
    setProfiles((prev) => prev.map((p) => p.id === profile.id ? profile : p));
  };

  const deleteProfile = async (id: string) => {
    await profileStorage.delete(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  return { profiles, loading, createProfile, updateProfile, deleteProfile, refresh: load };
}

export function useProfileStats(profileId: string | null) {
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!profileId) { setStats(null); return; }
    profileStorage.getStats(profileId).then((s) => setStats(s ?? null));
  }, [profileId]);

  return stats;
}

export function useRankings() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings().then((data) => {
      setRankings(data);
      setLoading(false);
    });
  }, []);

  return { rankings, loading };
}
