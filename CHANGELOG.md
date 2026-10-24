# Changelog

## 2.0.0 — 2026-10-24

### 视觉系统（@mg/core）

- 全新「阳光糖果街机」视觉：浅蓝主题色 `#38bdf8`、奶油/薄荷底色、墨色粗描边、硬偏移阴影、厚底按钮与贴纸徽章；按钮、强调文字和高亮统一使用浅蓝，不使用橙色作为主题强调色。
- `Theme` 扩展 `bgAlt`、`ink`、`accentAlt`、`accentWarm`、`accentInk`、`surface`、`surfaceAlt`、`muted`、`shadow`、`radiusLarge`；新增 `mixColor()`、`displayTextStyle()`（描边 + 硬阴影）。
- `Button` 重做：primary / soft / ghost / danger，底部厚边、hover 抬起、按下下沉，支持程序化图标；`Modal` 重做为遮罩 + 圆角卡片 + 丝带标题 + 蓝色大分数 + Back.out 入场；`createPanel()` 改为贴纸卡片。
- 新增 `drawIcon()` 程序化图标：play、pause、soundOn/Off、globe、star、home、restart，零图标依赖。
- `PreloadScene` 改为天空渐变、太阳/云朵、蓝色描边标题与厚底点击卡片，加载条同步新风格。

### 贪吃蛇 UI

- 菜单重做：天空/云/山丘/彩纸背景、盘蛇吉祥物（眨眼、吐信、呼吸浮动）、蓝色描边标题、贴纸最高分徽章、带图标的主按钮、音效/语言按钮、方向键/摇杆操作提示、分层入场动画。
- 棋盘重做：奶油色棋盘、薄荷格纹、墨色相框与硬阴影；蛇身改为连续描边胶囊并带渐变色、尾巴收窄；蛇头增加白眼球、瞳孔、高光、脸颊与吐信；死亡时变灰并显示 X 眼。
- 果实改为带叶、高光、呼吸光晕的糖果果实，并按坐标稳定轮换粉/莓红/蓝紫三种颜色（不使用橙色）。
- HUD 重做为白色贴纸卡片，分数使用浅蓝填充 + 墨色描边；暂停按钮改为白色圆形糖果按钮；横屏左侧、竖屏顶部布局保持不变，仍不占用棋盘。
- 暂停/结算弹窗使用新卡片、丝带标题与厚底按钮；新纪录或通关时增加彩纸庆祝。
- 浮动摇杆改为白色半透明底座 + 蓝色摇杆头 + 方向刻度；桌面鼠标与移动端触控表现一致。
- 倒计时改为棋盘中央的白色圆形徽章 + 浅蓝圆环，数字切换有弹跳；转屏自动暂停、恢复仍走 3-2-1。
- 站点品牌同步：`theme-color` 改为天空蓝，PWA manifest 背景/主题色更新，favicon 与 180/192/512 图标重绘为浅蓝底、绿色盘蛇、粉色果实。

### 工程

- 版本提升至 2.0.0；无玩法、存档结构、速度曲线或输入规则变化；存档版本保持兼容。
- 无新增运行时依赖、无外部字体/图片/音频，运行时仍为零外部请求。
- 贪吃蛇首包约 375KB gzip（+约 4KB），仍远低于 1.5MB 目标。
- `layout` 单测同步新 HUD 尺寸、顶部/侧栏分数位置、菜单 mascot 可见性与边界。

## 1.1.0 — 2026-10-24

### 移动端全屏与 PWA

- `@mg/core` 新增全屏策略：触屏、非 iframe、非 standalone 时，Preload 首次点击（`pointerup`）后请求 Fullscreen API；主菜单已是全屏，不等到开始游戏。
- 主菜单内若仍未全屏，首次点击任意位置会补一次请求；点「开始游戏」也会补一次。桌面不自动全屏；Poki 等 iframe 交给平台播放器。
- 贪吃蛇新增 `manifest.webmanifest`、iOS standalone meta 与 180/192/512 图标；不支持网页全屏的移动浏览器在菜单提示「分享 → 添加到主屏幕」。
- iPhone Safari 仍不支持网页内全屏，A2HS/PWA 是唯一无浏览器 UI 的路径；Android/iPad 使用标准 Fullscreen API。
- `#game` 作为 fullscreen target，进入/退出全屏只触发重排，不重启场景；补全屏背景与 `-webkit-touch-callout` 样式。
- 模板与新游戏生成器同步带上 manifest / icons，`.webmanifest` 也参与 `__TITLE__` 占位替换。

### 响应式 UI：横竖屏全屏适配

- 设计空间改为动态：短边固定 720 设计单位，长边随视口比例（`computeDesignSize`），`Scale.FIT` 铺满屏幕；手机横屏不再左右留黑边。
- `GameDefinition.design` 由 `{ width, height }` 改为 `{ base: 720 }`；`installResponsiveViewport` 在尺寸变化时 `setGameSize`，场景通过 `onLayoutChange` 重排，不重启、不丢局。
- 新增 `safeAreaInDesign()`：把 `env(safe-area-inset-*)` 换算成设计单位，刘海与手势条区域自动内缩。
- 移除竖屏旋转遮罩、`PORTRAIT_BLOCK_QUERY` 与 `core.rotate`；横竖屏都可玩，朝向变化自动暂停，恢复走 3-2-1。
- 贪吃蛇新增 `src/ui/layout.ts`：棋盘保持最大正方形，分数与暂停收进棋盘外同一块 HUD 区域（横屏左侧、竖屏顶部），不占用盘面。
- 竖屏顶部 HUD 的「分数」与数字改为单行横排（标签在左、数字在右），按实测文本宽度居中，位数变化不跳动；横屏侧栏保持上下堆叠。
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
