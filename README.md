# mg-platform

Shared infrastructure for the Mini Games projects. Each game is a separate
repository that consumes this repo as a `platform/` git submodule pinned to a
tag.

```
snake ── platform@v4.0.0 ──┐
ludo  ── platform@v4.0.0 ──┼──> mg-platform
                           │
mini-games (site) ─────────┘   downloads release assets, not source
```

## Contents

- `packages/core` — `@mg/core`: Phaser game shell, scenes, UI, audio, saves,
  i18n, seeded RNG, debug overlay.
- `packages/platform` — `@mg/platform`: Web/Poki/CrazyGames adapters and ad
  channels. This is the only package allowed to touch host SDK globals.
- `tooling/` — Vite preset, packaging, boundary checks, game repo generator.
- `templates/game-repo/` — standalone game repository template.
- `docs/` — architecture, publishing, ads, game development spec and checklists.

## Development

```bash
npm install
npm run check
npm run test
npm run stats
```

Create a new game repository:

```bash
npm run new:game -- ludo \
  --dir ../ludo \
  --title "Ludo" \
  --port 5174 \
  --platform-ref v4.1.0
```

The generated repo gets its own `package.json`, lockfile, CI, `AGENTS.md`,
`CHANGELOG.md` and a `platform/` submodule.

## Versioning

Platform versions start at **4.0.0** after the multi-repo split. Games pin a
tag; platform changes are additive where possible. To upgrade a game:

```bash
# in the game repo
cd platform
git fetch --tags
git checkout v4.1.0
cd ..
npm install
git add platform package-lock.json
git commit -m "chore: platform v4.1.0"
```

## Release assets

The platform does not publish games. A game tag produces:
- `<id>-web.zip` — self-hosted build, includes `game.manifest.json`
- `<id>-poki.zip`
- `<id>-crazygames-basic.zip`
- `<id>-crazygames-full.zip`

The site repository only downloads these assets; it never checks out game
source.

## Documentation

- [AGENTS.md](AGENTS.md) — hard rules
- [docs/game-development.md](docs/game-development.md) — game development spec and process
- [docs/game-design-standard.md](docs/game-design-standard.md) — gameplay, text, interaction, UI and acceptance standards
- [docs/art-standard.md](docs/art-standard.md) — visual style, asset and animation standards
- [docs/game-design-template.md](docs/game-design-template.md) — one-page design template
- [docs/architecture.md](docs/architecture.md) — repository layout and boundaries
- [docs/new-game-checklist.md](docs/new-game-checklist.md) — new game repo
- [docs/publishing.md](docs/publishing.md) — platform tags, game releases, site
- [docs/ads.md](docs/ads.md) — ad channel integration
