# Changelog

## Unreleased

### 贪吃蛇 UI 与移动端体验

- 重排 1280×720 界面：棋盘 672×672，右侧 HUD 536×672，分数、最高分、速度、暂停/音效图标重新分层。
- 新增触屏虚拟摇杆：固定底座、死区与轴滞回、拖动实时转向、松手回中；保留棋盘滑动作备用操作。
- 桌面不显示摇杆，改为方向键 / WASD 键位图示；键盘、鼠标与暂停快捷键保持不变。
- 菜单改为居中单列，开始按钮 480×96，音效/语言按钮 230×92，插画降为低透明度背景。
- 暂停与结算弹窗改为竖排大按钮；结算展示大分数并延迟 700ms，让玩家看清死亡位置。
- 竖屏提示现在会阻断输入并自动暂停，转回横屏后进入暂停→继续→3-2-1 流程。
- 修复画布 flex 与 Phaser `CENTER_BOTH` 叠加导致的双重居中；同步 `100dvh`、页面背景与 `theme-color`。
- `@mg/core`：Modal 支持 `actionsLayout`、`hero` 与字号覆盖；Button hover 仅在支持 hover 的设备启用；Preload 字号放大。

### 文档与 AI 协作

- 新增项目级 `AGENTS.md`，固化分层、边界、TypeScript、玩法、视觉、存档、发布等硬规则。
- 扩展 `docs/architecture.md` 为完整设计手册：技术选型、公共层准入、游戏架构、质量门、变更流程与路线图。
- 新增项目级 skill `.opencode/skills/mini-games-dev/SKILL.md`，覆盖新增游戏、公共层改动、依赖变更、发布与审查清单。
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
