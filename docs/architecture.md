# Architecture

## Repositories

| Repository           | Role                                           | Depends on          |
| -------------------- | ---------------------------------------------- | ------------------- |
| `xechoz/mg-platform` | `@mg/core`, `@mg/platform`, tooling, templates | —                   |
| `xechoz/snake`       | Fruit Snake game                               | platform submodule  |
| `xechoz/ludo`        | Ludo game                                      | platform submodule  |
| `xechoz/mini-games`  | Unified site + GitHub Pages                    | game release assets |

```text
snake ── submodule(platform @ tag) ──> mg-platform
ludo  ── submodule(platform @ tag) ──> mg-platform
mini-games(site) ── download <id>-web.zip ──> snake / ludo releases
```

Rules:
- Games never depend on each other.
- `packages` never import games.
- The site never checks out game source; it downloads release assets.
- The platform never contains a playable game or site build.
- Every game has its own git history, CI, changelog and release cadence.

## Platform layout

```text
mg-platform/
├─ packages/
│  ├─ core/                  # @mg/core
│  └─ platform/              # @mg/platform
├─ tooling/
│  ├─ vite.game.ts           # shared Vite config + ad SDK injection
│  ├─ free-dev-port.ts
│  ├─ package-game.ts        # Poki / CrazyGames zips
│  ├─ package-web.ts         # self-hosted web zip + manifest
│  ├─ check-platform.ts
│  ├─ check-game.ts
│  ├─ create-game-repo.ts
│  ├─ adsense.ts
│  └─ count-lines.ts
├─ templates/game-repo/
├─ docs/
├─ tsconfig.base.json
├─ tsconfig.json
├─ biome.json
├─ vitest.config.ts
└─ package.json              # workspaces: packages/*
```

`@mg/core` and `@mg/platform` are **source-only private packages**. Their
`exports` point at `./src/index.ts`; there is no build step for the packages.
A game repo lists them as `"*"` and declares `workspaces:
["platform/packages/*"]`, so npm links the submodule packages into the game's
`node_modules`.

## Game repository layout

```text
snake/
├─ platform/                 # git submodule -> mg-platform @ tag
├─ src/
│  ├─ logic/                 # pure rules, no Phaser
│  ├─ scenes/                # Phaser scenes
│  ├─ ui/                    # game-specific drawing/input helpers
│  ├─ main.ts                # createGame() composition root
│  ├─ i18n.ts
│  └─ save.ts
├─ public/
├─ game.manifest.json
├─ index.html
├─ package.json
├─ package-lock.json
├─ vite.config.ts            # imports ./platform/tooling/vite.game.ts
├─ tsconfig.json             # extends ./platform/tsconfig.base.json
├─ vitest.config.ts
├─ biome.json
├─ AGENTS.md
├─ CHANGELOG.md
└─ .github/workflows/ci.yml
```

`src/logic` is pure TypeScript: it accepts input, returns a new state and
events, and imports only `@mg/core/rng`. `src/scenes` reads state and renders
it; it never writes rules. Platform APIs enter through `@mg/core` services.

## Dependency boundaries

Enforced by `tooling/check-platform.ts` and `tooling/check-game.ts`:
- Game `src/logic` may not import Phaser or `@mg/*` except `@mg/core/rng`.
- Games must declare every `@mg/*` import in `package.json`.
- Games may not import another game.
- Platform packages may not import games.
- Only `@mg/platform` may touch `PokiSDK` / CrazyGames globals.
- Only `@mg/core` may use `localStorage` directly.
- Shared packages stay `private` and export source paths.

## Build and release

The game repo owns the game build. `tooling/vite.game.ts` provides `base: './'`,
fixed dev port, Phaser-friendly chunk settings and per-channel SDK injection:

| Flavor           | `VITE_PLATFORM` | `VITE_AD_CHANNEL`  |
| ---------------- | --------------- | ------------------ |
| web              | `web`           | optional `h5games` |
| Poki             | `poki`          | —                  |
| CrazyGames basic | `crazygames`    | —                  |
| CrazyGames full  | `crazygames`    | `crazygames`       |

Each flavor is a separate Vite build because the injected SDK differs. A game
tag publishes:
- `<id>-web.zip` (includes `game.manifest.json` and optional `thumb.png`)
- `<id>-poki.zip`
- `<id>-crazygames-basic.zip`
- `<id>-crazygames-full.zip`

The site downloads `<id>-web.zip`, unzips it to `dist-site/games/<id>/`, and
reads the manifest for its card. `index.html` must be at the archive root and
all asset URLs must be relative.

## Runtime rules

- Design space short side is 720 units; `Scale.FIT + CENTER_BOTH`.
- Fixed-step simulation with interpolation; no frame-rate-driven speed.
- Seeded RNG for rules; no `Math.random()` in logic.
- Input queue/buffer; no illegal reversal.
- Pause on blur/hidden; resume with a 3-2-1 countdown.
- Saves carry `version` and a migration; keys are `mg:<gameId>:<name>`.
- Language priority: `?lang=` > stored choice > host detection (platform
  adapters only) > game `defaultLang`. No navigator sniffing; every game
  defaults to `en`.
- Zero external runtime requests. Only build-time channel injection may add an
  ad SDK script.
- Chinese uses system fonts; CJK fonts are not bundled.
- First-load target ≤ 1.5 MB gzip per game.

## Platform upgrades

The submodule pin is the contract. To upgrade a game:

```bash
cd platform && git fetch --tags && git checkout vX.Y.Z && cd ..
npm install
git add platform package-lock.json
git commit -m "chore: platform vX.Y.Z"
```

Platform changes cannot be atomic with game changes. Keep public APIs additive;
if a breaking change is unavoidable, bump the platform major and migrate games
one by one.
