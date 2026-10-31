# New game checklist

> Read [`game-development.md`](game-development.md) first for the full process,
> architecture rules and quality gates.

## 1. Create the repository

The game must live in its own git repository. Do not add it to
`mg-platform` or to the site repository.

```bash
# from mg-platform, after tagging the platform
npm run new:game -- ludo \
  --dir ../ludo \
  --title "Ludo" \
  --port 5174 \
  --platform-ref v4.1.0
```

The generator:
- copies `templates/game-repo`;
- replaces `__NAME__`, `__TITLE__`, `__PORT__`, `__PLATFORM_REF__`;
- initializes git;
- adds `platform/` as a submodule and checks out the requested tag;
- leaves the initial commit to you.

Then create the GitHub repo and push:

```bash
cd ../ludo
npm install
npm run check
npm run test
git add .
git commit -m "feat: scaffold ludo"
gh repo create xechoz/ludo --public --source=. --remote=origin --push
```

## 2. Metadata

- `game.manifest.json`: stable `id`, `order`, Chinese/English title and
  description, `themeColor`, tags.
- `opencode.json`: a symlink to `platform/opencode.json` when the pinned
  platform tag provides it; do not replace it with a copy.
- `index.html`: title, theme color, PWA manifest, optional splash.
- `public/manifest.webmanifest`: name, short name, icons.
- `package.json`: name `@mg/<id>`, scripts unchanged.
- `README.md`, `AGENTS.md`, `CHANGELOG.md`.

## 3. Implement rules first

Create `src/logic/` with pure TypeScript:
- immutable state;
- input → new state + events;
- seeded RNG from `@mg/core/rng`;
- Vitest coverage for boundaries (win, loss, illegal move, scoring, etc.).

No Phaser, DOM, audio, ads or `Math.random()` in `src/logic`.

## 4. Scenes and UI

- `src/main.ts`: `createGame({ id, design: { base: 720 }, ... })`.
- Menu scene: localized title, play button, settings/language entry.
- Game scene: fixed timestep + interpolation, input queue, pause on blur.
- HUD/result: restart, menu, score persistence.
- `platform.gameplayStart()` on play; `gameplayStop()` on menu/pause/result;
  `happyTime()` on win or new record.

## 5. Persistence and i18n

- `services.createSave({ version, migrate })`.
- Keys `mg:<gameId>:<name>`.
- All visible strings in Chinese and English; `game.title` is mandatory.
- Language priority: `?lang=` > stored choice > host detection > `defaultLang`;
  every game defaults to `en`.

## 6. Verify

```bash
npm run check
npm run test
npm run build
npm run package:web
```

- Desktop 16:9, phone landscape and portrait are playable.
- Rotation pauses and resumes with a countdown.
- Pause/blur, restart, menu, high score persistence.
- No console errors, no external runtime requests.
- If ads are enabled, satisfy the channel-agnostic invariants in
  `game-development.md`; channel QA stays in `ads.md`.
- First-load size ≤ 2 MB gzip.

## 7. Release

```bash
# update CHANGELOG.md and package.json version
git tag v0.1.0
git push origin v0.1.0
```

Wait for the Release assets, then add the game to `xechoz/mini-games`:

```json
{ "id": "ludo", "repo": "xechoz/ludo", "version": "v0.1.0" }
```
