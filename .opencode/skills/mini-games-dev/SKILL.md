---
name: Mini Games Development
description: Use when adding a game, changing gameplay rules, touching @mg/core or @mg/platform, or making a multi-file feature/fix in the mini-games monorepo. Do not load for single-file copy, color, or layout tweaks; follow the lightweight-task path in AGENTS.md instead.
---

# Mini Games Development

## 适用范围

用于本仓库 `mini-games` 的任何非平凡改动：新增游戏、改玩法、动 `@mg/core` / `@mg/platform`、跨多文件功能、审查边界、修 bug、发布。

轻量改动（文案、颜色、单文件样式/布局，不涉及规则）不要加载本 skill，按 AGENTS.md 的轻量任务路径直接修改并跑检查。

所有约定只写在本仓库。**不要修改 `~/.config/opencode`、全局 AGENTS.md 或全局 skills。**

## 开始前

1. `AGENTS.md` 已由 OpenCode 自动注入，不要重复读。
2. 只在需要时读文档：改分层/公共层 → `docs/architecture.md`（先看标题，只读相关章节，不要整篇读）；新游戏 → `docs/new-game-checklist.md`；发布 → `docs/publishing.md`；广告 → `docs/ads.md`。
3. 读目标游戏的 `game.manifest.json`、`src/main.ts`、`src/logic`、`src/scenes`。
4. 用 `git status` 确认工作区，不要覆盖用户未提交的改动。

## 第一步：判断改动层级

| 改动                                            | 归属                                  | 额外要求                         |
| ----------------------------------------------- | ------------------------------------- | -------------------------------- |
| 玩法、棋盘、回合、计分、AI、关卡、洗牌          | `games/<id>/src/logic`                | 纯 TS + Vitest，不 import Phaser |
| 该游戏的渲染、动画、HUD、菜单                   | `games/<id>/src/scenes`               | 只读 state，不回写规则           |
| 加载、缩放、音频、存档、i18n、UI 组件、平台 SDK | `packages/core` / `packages/platform` | 检查所有游戏，CI 全绿            |
| 新共享抽象                                      | 先证明满足上提标准                    | 否则复制，不建包                 |

如果需求属于“某个游戏的业务”，不要改公共层。公共层只接受基础设施需求。

## 工作流

### A. 新增游戏

1. `npm run new:game -- <name>`
2. `npm install`
3. 修改 `game.manifest.json`、`src/i18n.ts`、`src/main.ts`。
4. 把 `PlaceholderScene` 改为 `Menu` 场景。
5. 先写 `src/logic` 和测试，再写 `GameScene` / `HudScene`。
6. 接入存档、音效、暂停、结算、重开、回菜单。
7. 按 `docs/new-game-checklist.md` 和下面的质量门验证。

### B. 游戏功能 / Bug

1. 先定位是规则问题还是表现问题。
2. 规则问题 → 在 `src/logic` 写失败用例，再修。
3. 表现问题 → 检查 tick/插值/输入队列/场景生命周期。
4. 涉及暂停/失焦/恢复时，必须验证停表与 3-2-1 倒计时。
5. 行为变化更新 `CHANGELOG.md`。

### C. 公共层改动

1. 明确这是基础设施需求，而不是单个游戏的业务需求。
2. 列出受影响游戏；至少跑全部游戏的构建与测试。
3. 保持 API 只增不破；破坏性改动同提交迁移所有调用方。
4. 更新 `docs/architecture.md` 和 `CHANGELOG.md`。
5. 不要为单个游戏加 `if (gameId === ...)` 或专属开关。

### D. 依赖变更

1. 说明为什么标准库/已有依赖不够。
2. 检查体积、许可证、维护状态、浏览器兼容。
3. 运行时依赖尽量少；开发依赖不得进入产物。
4. 不擅自升级 Phaser/Vite/TypeScript 大版本。

### E. 发布

1. 版本号保持一致：根、游戏、`@mg/core`、`@mg/platform`。
2. 更新 `CHANGELOG.md`。
3. 跑完整质量门。
4. 仅当用户明确要求发布时：commit → push → tag → GitHub Release（附单游戏 zip）。
5. 确认 CI 在 `main` 和 tag 上都通过。

## 质量门

```bash
npm run check        # tsc + Biome + 依赖边界
npm run test         # Vitest
npm run build:snake  # 或对应游戏
npm run site         # 涉及站点/多游戏时
```

浏览器 smoke（桌面 + 手机横屏 + 竖屏）：
- 首屏 → 点击开始 → 菜单 → 游戏 → 暂停 → 重开 → 结算 → 回菜单。
- 失焦/切页自动暂停；恢复有倒计时。
- 中英文切换、音效开关、刷新后持久化。
- 最高分/进度重启后仍在。
- console 无报错；Network 无外部请求。
- 首包 gzip 体积无明显回退（目标 ≤ 1.5MB）。

## 代码模式

- 纯逻辑：`createInitialState` / `enqueue*` / `step`，输入 state，返回新 state + events。
- 随机：只用 `@mg/core/rng` 的种子 RNG；规则不用 `Math.random()`。
- 场景：`Menu` → `Game` + `Hud`；`Game` 拥有循环/输入/渲染，`Hud` 只管统计和弹窗。
- 存档：`services.createSave()`，带 `version`，改字段必须迁移。
- 文案：全部 `services.i18n.t()`，中英文都写；`game.title` 必填。
- 平台：`services.platform.gameplayStart()` / `gameplayStop()` / `happyTime()`。
- 广告：只调 `services.ads.showRewarded(placement)`；渠道实现留在 `@mg/platform`，奖励只在 `rewarded` 时发放。详见 `docs/ads.md`。
- H5 构建：`VITE_AD_CHANNEL=h5games` + `VITE_ADSENSE_CLIENT`；无 ID 时无广告；test mode 不能进 production；`ads.txt` 由 `npm run site` 生成。
- UI：`Button`、`Modal`、`createPanel`、`textStyle`；不要另造一套风格。
- 场景用 `onLayoutChange(scene, fn)` 重排，不重启场景；`GameDefinition.design` 只写 `{ base: 720 }`。
- HUD（分数、暂停）放在棋盘外的空白区，不压缩游戏区；安全区用 `safeAreaInDesign(scene)` 内缩。
- 横竖屏都要能玩；朝向变化自动暂停，不写旋转遮罩。

## 审查清单

- [ ] 规则层没有 Phaser / DOM / localStorage。
- [ ] 游戏之间没有互相 import；packages 没有 import games。
- [ ] 没有为单个游戏改公共层或加专属开关。
- [ ] 没有提前创建 `packages/grid` / `turn` / `assets`。
- [ ] 固定步进 + 插值；速度不依赖帧率。
- [ ] 输入队列正常，非法输入被明确拒绝。
- [ ] 暂停/失焦停表，恢复倒计时。
- [ ] 存档版本/迁移正确，旧档可读。
- [ ] 中英文文案完整，默认中文。
- [ ] 短边 720 动态设计空间；横竖屏都可玩，转屏自动暂停。
- [ ] 广告只在死亡/菜单/结算等边界触发；广告期间停表、静音、锁输入。
- [ ] 奖励只在 `rewardedBreak()` 返回 `true` 时发放；跳过/失败/拦截不发奖。
- [ ] 奖励按钮有视频图标、不是绿色；标准按钮同时存在、更大、在上/旁边。
- [ ] 游戏内没有广告冷却/每日次数上限。
- [ ] H5 构建配置了 publisher ID；production 没有 test mode；`ads.txt` 在域名根。
- [ ] 运行时零外部请求；无 CJK 字体包；Poki 构建无 Dev 模拟代码。
- [ ] 新增规则边界有测试。
- [ ] `npm run check` / `test` / 构建通过。
- [ ] 文档与 `CHANGELOG.md` 已同步。

## 硬停止

遇到以下情况先停下来问用户，不要自行决定：
- 需要新增共享包或把游戏规则上提到公共层。
- 需要改存档结构但没有迁移方案。
- 需要升级 Phaser/Vite/TypeScript 大版本。
- 需要引入新的运行时依赖或外部服务。
- 需要改全局 OpenCode 配置。
- 需要 commit/tag/push 但用户没有明确要求。
