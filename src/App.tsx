import { useState, useEffect } from 'react';
import { AppProvider, useAppContext, AuthProvider, useAuth } from './services';
import { ProfilesPage } from './pages/ProfilesPage';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { ExercisesPage } from './pages/ExercisesPage';
import { StatsPage } from './pages/StatsPage';
import { BadgesPage } from './pages/BadgesPage';
import { SettingsPage } from './pages/SettingsPage';
import { BottomNav } from './components/layout';
import { LoadingSpinner } from './components/common';
import { useSettings, useProfiles } from './hooks';
import type { Profile } from './models';

type Page = 'home' | 'exercises' | 'stats' | 'badges' | 'settings';

function AppSettings({ profileId }: { profileId: string }) {
  const { settings } = useSettings(profileId);

  useEffect(() => {
    document.documentElement.dataset.scheme = settings.colorScheme;
    document.documentElement.dataset.dyslexia = String(settings.dyslexiaMode);
    document.documentElement.dataset.fontSize = settings.fontSize;
  }, [settings]);

  return null;
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentProfile, setCurrentProfile } = useAppContext();
  const { profiles, loading: profilesLoading, createProfile } = useProfiles(user?.id);
  const [page, setPage] = useState<Page>('home');
  const [autoHandling, setAutoHandling] = useState(false);

  useEffect(() => {
    if (!user) {
      setCurrentProfile(null);
    }
  }, [user, setCurrentProfile]);

  useEffect(() => {
    if (!user || profilesLoading || currentProfile || autoHandling) return;

    if (profiles.length === 1) {
      setCurrentProfile(profiles[0]);
    } else if (profiles.length === 0) {
      setAutoHandling(true);
      const rawName = user.email?.split('@')[0] ?? 'Jugador';
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      createProfile(name, 'cat').then((p) => {
        setCurrentProfile(p);
        setAutoHandling(false);
      });
    }
  }, [profiles, profilesLoading, user, currentProfile, autoHandling, createProfile, setCurrentProfile]);

  if (authLoading || (user && profilesLoading) || autoHandling) return <LoadingSpinner />;

  if (!user) return <AuthPage />;

  if (!currentProfile) {
    return (
      <ProfilesPage onSelect={(p: Profile) => {
        setCurrentProfile(p);
        setPage('home');
      }} />
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage profile={currentProfile} onNavigate={(p) => setPage(p as Page)} onSwitchProfile={() => setCurrentProfile(null)} />;
      case 'exercises': return <ExercisesPage profile={currentProfile} />;
      case 'stats': return <StatsPage profile={currentProfile} />;
      case 'badges': return <BadgesPage profile={currentProfile} />;
      case 'settings': return <SettingsPage profile={currentProfile} />;
    }
  };

  return (
    <>
      <AppSettings profileId={currentProfile.id} />
      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>
      <BottomNav currentPage={page} onNavigate={(p) => setPage(p as Page)} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
