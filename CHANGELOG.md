# Changelog

## Unreleased

### 响应式 UI：横竖屏全屏适配

- 设计空间改为动态：短边固定 720 设计单位，长边随视口比例（`computeDesignSize`），`Scale.FIT` 铺满屏幕；手机横屏不再左右留黑边。
- `GameDefinition.design` 由 `{ width, height }` 改为 `{ base: 720 }`；`installResponsiveViewport` 在尺寸变化时 `setGameSize`，场景通过 `onLayoutChange` 重排，不重启、不丢局。
- 新增 `safeAreaInDesign()`：把 `env(safe-area-inset-*)` 换算成设计单位，刘海与手势条区域自动内缩。
- 移除竖屏旋转遮罩、`PORTRAIT_BLOCK_QUERY` 与 `core.rotate`；横竖屏都可玩，朝向变化自动暂停，恢复走 3-2-1。
- 贪吃蛇新增 `src/ui/layout.ts`：棋盘保持最大正方形，分数与暂停收进棋盘外同一块 HUD 区域（横屏左侧、竖屏顶部），不占用盘面。
- 游戏页移除操作提示，说明只保留在菜单；删除 `hud.hint` 文案。
- `Modal` 宽高与动作按钮按视口裁剪，小窗口不再溢出。
- 新增 `designSize` 与 snake `layout` 单测。

### 贪吃蛇 UI 与移动端体验

- 游戏页改为单棋盘居中布局（672×672），移除右侧 536×672 HUD 面板；左侧只保留当前分数与操作提示，右上角保留一个小号暂停按钮。
- 新增全屏浮动摇杆：按住任意位置出现底座与摇杆头，拖动实时转向，松手淡出；死区与轴滞回复用原方向判定。鼠标拖动同样可用。
- 移除固定摇杆、棋盘滑动、速度显示、键位图示与游戏页音效按钮；音效开关仍保留在菜单。
- 图标按钮改为“按下与抬起都在按钮上”才触发，避免拖动经过暂停按钮时误触。
- 菜单改为居中单列，开始按钮 480×96，音效/语言按钮 230×92，插画降为低透明度背景。
- 暂停与结算弹窗改为竖排大按钮；结算展示大分数并延迟 700ms，让玩家看清死亡位置。
- 修复画布 flex 与 Phaser `CENTER_BOTH` 叠加导致的双重居中；同步 `100dvh`、页面背景与 `theme-color`。
- `@mg/core`：Modal 支持 `actionsLayout`、`hero` 与字号覆盖；Button hover 仅在支持 hover 的设备启用，并增加按下归属判定，避免场景切换或拖动时同一个 `pointerup` 误触；Preload 字号放大。

### 文档与 AI 协作

- 新增项目级 `AGENTS.md`，固化分层、边界、TypeScript、玩法、视觉、存档、发布等硬规则。
- 扩展 `docs/architecture.md` 为完整设计手册：技术选型、公共层准入、游戏架构、质量门、变更流程与路线图。
- 新增项目级 skill `.opencode/skills/mini-games-dev/SKILL.md`，覆盖新增游戏、公共层改动、依赖变更、发布与审查清单。
- 更新 `AGENTS.md` 第 24 条、`docs/architecture.md`、`docs/new-game-checklist.md` 与 skill 审查清单：动态设计空间、HUD 不占棋盘、安全区内缩、转屏自动暂停。
- `README.md` 补充局域网调试说明：dev server 默认 `host: true`，手机同 Wi-Fi 打开终端打印的 Network 地址。
- `README.md` 增加文档索引；所有约定仅作用于本仓库，不修改全局 OpenCode 配置。

## 1.0.0 — 2026-10-24

首个可用版本：贪吃蛇 + 可复用游戏基础包。

### 游戏

- 贪吃蛇：20×20 棋盘，吃果实变长，撞墙/撞自己结束，填满棋盘通关。
- 速度随分数提升（145ms → 70ms），种子随机生成食物。
- 方向队列最多 2 个，禁止 180° 反向；键盘、WASD、滑动操作。
- 菜单、HUD、暂停、结算、重新开始、回菜单完整流程。
- 最高分持久化、音效开关、中英文切换。
- 失焦/切页自动暂停，恢复时 3-2-1 倒计时。
- 横屏优先，竖屏提示旋转设备。

### 基础包（@mg/core）

- Phaser 4 游戏外壳：Boot/Preload 场景、1280×720 设计分辨率、FIT 缩放。
- UI：Button、Modal、Panel、主题 token、系统字体文本样式。
- 存档：带版本/迁移的 SaveStore，localStorage 不可用时回退内存。
- 设置：全局音效与语言偏好（`mg:settings:v1`）。
- i18n：中英词典、参数插值、URL/存档/默认值语言解析。
- 音频：WebAudio 程序化音效，首次手势解锁，静音持久化。
- 输入与生命周期：滑动识别、失焦/可见性暂停回调。
- 调试：`?debug=1` FPS/状态面板。
- 种子 RNG，可被纯规则层安全引用。

### 平台（@mg/platform）

- `PlatformAdapter` 接口：初始化、加载完成、玩法开始/结束、插屏/激励广告、happyTime、语言、震动。
- `DevPlatform` 实现；Poki 适配器接口预留，待 M4 接入。

### 工程

- npm workspaces monorepo：`packages/*` + `games/*`。
- Vite 8 共享配置，`base: './'`，单游戏约 367KB gzip。
- 新游戏生成器 `npm run new:game`。
- 站点汇总构建 `npm run site`，自动生成 `dist-site/` 与游戏列表。
- 依赖边界检查：游戏不互相引用、公共包不引用游戏、规则层不依赖 Phaser、禁止直接使用 localStorage/PokiSDK。
- Vitest：规则层、存档、i18n 共 25 个用例。
- Biome + TypeScript 严格模式；GitHub Actions CI。
- 文档：架构、新游戏清单、发布说明。
