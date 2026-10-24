# Mini Games

一个可复用的 2D 小游戏工程：共享游戏外壳，每个游戏独立构建、独立部署。

目前包含：**贪吃蛇**（可玩）。

## 环境

- Node.js >= 22.12（开发机为 26）
- npm（使用 npm workspaces，无需 pnpm）

## 常用命令

```bash
npm install

npm run dev:snake        # 本地开发贪吃蛇
npm run build:snake      # 构建单个游戏到 games/snake/dist

npm run test             # Vitest：规则层单测
npm run typecheck        # tsc --noEmit
npm run check            # 类型 + Biome + 依赖边界检查

npm run site             # 构建全部游戏 + 汇总成 dist-site
npm run new:game -- foo  # 从模板创建 games/foo
```

本地查看构建产物：

```bash
npm run build:snake
npm run preview -w @mg/snake
```

## 结构

```
AGENTS.md      # 项目级 AI 硬规则
.opencode/
└─ skills/     # 项目级 AI skill（仅本仓库）

packages/
├─ core/        # 游戏外壳：场景、UI、音频、存档、i18n、调试
└─ platform/    # 平台适配：dev（Poki 接口已预留）

games/
└─ snake/
   ├─ game.manifest.json   # 标题/描述/主题色，站点与打包共用
   ├─ src/logic/           # 纯 TS 规则，可单测，不 import Phaser
   ├─ src/scenes/          # Menu / Game / Hud
   └─ src/main.ts

tooling/       # Vite 预设、站点构建、边界检查、新游戏生成器
templates/     # 新游戏模板
docs/          # 架构、开发清单、发布说明
```

## 设计原则

公共层只放**基础设施**，不放游戏规则：
- 可以共享：加载、缩放、场景生命周期、输入原语、音频、存档机制、平台 SDK、UI 组件、随机数。
- 不共享：回合、棋盘、吃子、计分、关卡、AI、提示、洗牌。这些留在各游戏 `src/logic`。
- 一个能力只有被至少两个游戏实际使用、且没有游戏专属开关时，才考虑上提到 `packages/`。
- 公共层不 import 游戏；游戏之间不互相 import；`src/logic` 不 import Phaser。

详见 [docs/architecture.md](docs/architecture.md)。

## 文档

- [AGENTS.md](AGENTS.md) — AI 协作硬规则（项目级，仅本仓库）
- [docs/architecture.md](docs/architecture.md) — 完整设计、原则、技术要点
- [docs/new-game-checklist.md](docs/new-game-checklist.md) — 新增游戏清单
- [docs/publishing.md](docs/publishing.md) — 自有站与 Poki 发布
- [.opencode/skills/mini-games-dev/SKILL.md](.opencode/skills/mini-games-dev/SKILL.md) — 项目开发 skill

## 发布

- 自有站：`npm run site` → 部署 `dist-site/`（Cloudflare Pages / GitHub Pages 均可）。
- Poki：`VITE_PLATFORM=poki npm run build:snake`，将 `games/snake/dist` 打成 zip（`index.html` 在根目录）。Poki 适配器与 SDK 注入在提交前接入。

详见 [docs/publishing.md](docs/publishing.md)。
