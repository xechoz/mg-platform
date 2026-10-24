# 架构

## 技术选型

| 项     | 选择                   | 原因                                             |
| ------ | ---------------------- | ------------------------------------------------ |
| 语言   | TypeScript             | 规则型游戏需要类型约束；与 JS 基础衔接成本低     |
| 引擎   | Phaser 4.2.1           | 2D Web 游戏成熟方案，场景/输入/音频/资源加载齐全 |
| 构建   | Vite 8，每游戏独立构建 | 产物是纯静态站点，适配自有站与 Poki              |
| 包管理 | npm workspaces         | 环境已有，零额外工具                             |
| 测试   | Vitest（规则层）       | 纯逻辑可快速覆盖，不依赖浏览器                   |
| 检查   | Biome + 自定义边界脚本 | 格式化、lint、依赖方向一次跑完                   |

不选 Kotlin/Compose：Web 产物重、首屏慢，平台 SDK 都是 JS 生态。
不选自研引擎：三款游戏的核心价值在玩法，不在重写缩放/音频/输入。

## 分层

```
games/*  ──>  packages/core  ──>  packages/platform
   │                │
   └──> packages/platform
```

- `@mg/core`：Phaser 外壳。场景、UI 组件、音频、输入手势、存档机制、i18n、调试面板。
- `@mg/platform`：唯一允许接触外部 SDK 的地方。当前只有 `DevPlatform`，Poki 适配器按同一接口补。
- `@mg/assets`：等出现真正共享的字体/UI 图集/音效时再建，目前不预建。
- `games/*/src/logic`：纯函数 + 不可变状态，零 Phaser 依赖，Vitest 覆盖。
- `games/*/src/scenes`：编排输入、渲染、动画、场景切换。
- `games/*/src/view`：纯表现，可读逻辑状态，不回写规则。

依赖规则由 `tooling/check-boundaries.ts` 强制：
- `games/*` 不能互相 import；
- `packages/*` 不能 import `games/*`；
- `games/*/src/logic` 只能 import `@mg/core/rng`，不能 import Phaser；
- 游戏代码不能直接使用 `window.PokiSDK` 或 `localStorage`。

## 为什么不把 grid / turn 做成公共包

- `grid` 的寻路规则（≤2 拐点、绕棋盘外圈）是连连看的玩法，贪吃蛇只用边界判断，Ludo 用预定义跑道。
- `turn` 的回合规则（掷 6 额外回合、三连六惩罚、吃子、进家）是 Ludo 的玩法；飞行棋和大富翁会朝不同方向演进。
- 共享它们会让一个游戏的规则改动波及另一个游戏，最后堆出一组游戏专属开关。

结论：规则先留在各自游戏内。等飞行棋做完，再对比 Ludo 与飞行棋，只上提真正相同的机制（例如种子骰子、回合轮转、事件日志）。

## 上提标准

同时满足才上提，否则复制：
1. 至少两个已发布的游戏实际用到；
2. 两边用法一致，不需要游戏专属开关；
3. 两边都有测试；
4. 提取后的 API 比两份实现加起来更小、更清楚。

## 公共层什么时候必须改

- 平台 SDK、浏览器音频解锁、存储限制、缩放行为变化；
- 存档格式或迁移 bug；
- 性能、可访问性、崩溃修复；
- Phaser 大版本升级。

规则：只增不破优先；破坏性改动必须在同一个提交里迁移所有游戏，CI 全绿。

## 场景流

```
Boot（初始化平台）
  → Preload（加载资源 + 点击解锁音频）
  → Menu（游戏自己的菜单）
  → Game + Hud（并行）
       ├─ 暂停弹窗
       └─ 结算弹窗
```

`Boot` 和 `Preload` 是 core 提供的保留场景键，游戏不要占用。

## 关键约定

- 设计分辨率固定 1280×720，横屏优先；`Scale.FIT` 自适应。
- 所有文字走 Phaser Text + 系统字体栈，中文不打包 CJK 字体。
- 存档走 `SaveStore`：带版本、可迁移、localStorage 不可用时回退内存。
- 设置（音效、语言）全局共享，键为 `mg:settings:v1`。
- 每个游戏存档键为 `mg:<gameId>:<name>`。
- 平台事件：进入实际玩法 `gameplayStart()`，菜单/暂停/结算 `gameplayStop()`，胜利或新纪录 `happyTime()`。
- 失败/暂停/失焦都要停表，恢复时给 3-2-1 倒计时，避免不公平死亡。

## 发布

- 自有站：`dist-site/`，每个游戏在 `/games/<id>/`，`base: './'` 保证子路径可用。
- Poki：单游戏 zip，`index.html` 在根目录，所有资源本地化，无外部请求。构建时通过 `VITE_PLATFORM=poki` 注入 SDK 并选择适配器。
