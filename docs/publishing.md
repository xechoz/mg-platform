# Publishing

## Platform releases

The platform is not deployed. It is consumed as a git submodule.

```bash
# mg-platform
npm run check
npm run test
# update CHANGELOG.md and package versions
git tag v4.1.0
git push origin v4.1.0
```

Games pin tags. Never move or delete a published tag.

## Game releases

Each game repository owns its build and release workflow. A `vX.Y.Z` tag runs:

```bash
npm ci
npm run check
npm run test
npm run build
npm run package:web
npm run package:poki
npm run package:crazy:basic
npm run package:crazy:full
```

It then creates a GitHub Release with four assets:

| Asset                       | Contents                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| `<id>-web.zip`              | `index.html`, assets, `game.manifest.json`, optional `thumb.png` |
| `<id>-poki.zip`             | runtime only                                                     |
| `<id>-crazygames-basic.zip` | runtime + SDK, no ads                                            |
| `<id>-crazygames-full.zip`  | runtime + SDK + ads                                              |

All zips have `index.html` at the root and relative asset paths. The web zip is
the only one consumed by the unified site.

## Unified site

Repository: `xechoz/mini-games`. The site does not contain game source.

`site/games.json`:

```json
{
  "games": [{ "id": "snake", "repo": "xechoz/snake", "version": "v3.1.0" }]
}
```

Build:

```bash
npm install
npm run site
# -> dist-site/
```

- CI downloads
  `https://github.com/<repo>/releases/download/<version>/<id>-web.zip`.
- `SITE_LOCAL=1 npm run site` reads `../<game>/dist` instead, for local
  iteration.
- The build validates `index.html`, extracts to `dist-site/games/<id>/`, reads
  `game.manifest.json`, sorts cards by `order`, and writes `dist-site/games.json`.
- `VITE_AD_CHANNEL=h5games` plus a valid `VITE_ADSENSE_CLIENT` writes
  `dist-site/ads.txt`. `ads.txt` must be served from the domain root.
- GitHub Pages deploys `dist-site`; the public URL stays
  `https://xechoz.github.io/mini-games/`.

Release order:
1. Tag and publish the game; wait for all four assets.
2. Bump `site/games.json` to the new tag.
3. Push `mini-games`; Pages deploys the site.

A missing release asset fails the site build. Do not add a game to
`games.json` before its release exists.

## Local game checks

```bash
cd snake
npm ci
npm run check
npm run test
npm run build
npm run package:web
```

## Poki / CrazyGames

The build commands are the same in every game repo. Verify the packaged zip in
the portal's inspector before submitting. Poki builds must not load any SDK
other than Poki's, and CrazyGames Basic must not load ads.

## Rollback

- Site: redeploy the previous `mini-games` commit.
- Game: publish a new tag; do not rewrite an existing tag.
- Platform: revert in a new tag and bump games.
