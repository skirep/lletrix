# Documentació tècnica de Lletrix

## 1) Stack tecnològic

- **Frontend**: React 19 + TypeScript
- **Bundler/Dev server**: Vite 8 (`@vitejs/plugin-react`)
- **Persistència local**: IndexedDB amb **Dexie**
- **Backend cloud (opcional)**: **Supabase** (Auth + taules de sincronització)
- **Reconeixement de veu**: Web Speech API del navegador
- **PWA**: `vite-plugin-pwa` (manifest + service worker Workbox)
- **Linting**: `oxlint`

## 2) Arquitectura del projecte

Estructura principal dins `src/`:

- `models/`: tipus i constants de domini (perfils, exercicis, gamificació, configuració)
- `storage/`: capa de dades (Dexie + sincronització amb Supabase)
- `speech/`: abstracció del motor de veu (`SpeechEngine`) i implementació web (`WebSpeechEngine`)
- `scoring/`: càlcul de similitud, classificació de resultats, detecció d’errors i XP
- `gamification/`: lògica d’XP, insígnies, ratxes i objectius diaris
- `exercises/`: càrrega i filtratge de sets d’exercicis des de JSON
- `hooks/`: lògica React reutilitzable (perfils, estadístiques, ajustos, etc.)
- `services/`: context global d’app i autenticació
- `pages/` i `components/`: interfície i navegació
- `styles/`: estils globals

## 3) Flux d’execució de l’aplicació

1. `src/main.tsx` arrenca l’app i renderitza `<App />`.
2. `App.tsx` encapsula l’app amb `AuthProvider` i `AppProvider`.
3. Si no hi ha usuari autenticat, es mostra `AuthPage`.
4. Si hi ha usuari, es carreguen perfils (cloud + local), i es selecciona/crea perfil actiu.
5. Amb perfil actiu, la navegació inferior canvia entre Home, Exercicis, Estadístiques, Insígnies i Configuració.
6. Els ajustos de perfil (tema, skin, mida de lletra, mode dislèxia) s’apliquen via `data-*` a `document.documentElement`.

## 4) Persistència i dades

### IndexedDB (local)

Base de dades Dexie: `lletrix` (versió 3) amb stores:

- `profiles`
- `profileStats`
- `sessions`
- `badges`
- `dailyGoals`
- `streaks`
- `settings`

### Supabase (cloud)

Quan hi ha sessió autenticada:

- Es sincronitzen perfils (`profiles`)
- Estadístiques (`profile_stats`)
- Rànquing (`rankings`)
- Gamificació (`profile_badges`, `streaks`, `daily_goals`)
- Configuració (`profile_settings`)

L’app manté enfocament **local-first**: treballa sobre IndexedDB i sincronitza amb Supabase quan és possible.

## 5) Autenticació

S’utilitza **Supabase Auth** (email/contrasenya) a `src/services/AuthContext.tsx`.

Variables d’entorn necessàries:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

L’esquema SQL de les taules està documentat a `.env.example`.

## 6) Mòduls de domini clau

- **Speech**: gestiona compatibilitat navegador, permisos de micròfon i lectura de resultats.
- **Scoring**: normalitza text (accents, equivalència b/v), calcula similitud (Levenshtein), classifica resultats i detecta errors de lectura.
- **Gamificació**: processa sessions completades per atorgar XP, actualitzar estadístiques, ratxes, objectius i insígnies.

## 7) PWA i build

`vite.config.ts` configura:

- `base: '/lletrix/'`
- Manifest PWA
- Service worker generat amb Workbox

Comandes principals:

```bash
npm run dev
npm run lint
npm run build
```

