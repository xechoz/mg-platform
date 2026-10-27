# __TITLE__

A standalone Phaser 4 game built on [`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

The platform is a git submodule pinned at `__PLATFORM_REF__`:

```bash
git clone --recurse-submodules <this-repo>
npm ci
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port `__PORT__` |
| `npm run check` | Typecheck, Biome and game boundary checks |
| `npm run test` | Vitest |
| `npm run build` | Production self-hosted build |
| `npm run package:web` | `<id>-web.zip` release asset |
| `npm run package:poki` | Poki build |
| `npm run package:crazy:basic` | CrazyGames lifecycle build |
| `npm run package:crazy:full` | CrazyGames lifecycle + ads build |

## Platform updates

```bash
cd platform
git fetch --tags
git checkout vX.Y.Z
cd ..
npm install
git add platform package-lock.json
git commit -m "chore: platform vX.Y.Z"
```

Do not edit `platform/` in place; changes belong in the platform repository.
