# 架构与工程原则

本文件是 `mini-games` 的技术事实来源。AI 协作的硬规则见仓库根目录 `AGENTS.md`；新增游戏操作见 `docs/new-game-checklist.md`；发布见 `docs/publishing.md`。

## 1. 项目状态

- 版本：**3.0.0**
- 已发布：`games/snake`（Fruit Snake: Color Trail / 贪吃蛇：水果火车）
- 计划中：`games/lianliankan`（连连看）、`games/ludo`（Ludo）
- 目标平台：自有网站优先，Poki 随后
- 游戏模式：纯单人 vs AI；v1 不做热座、不做在线联机

## 2. 设计目标与非目标

### 目标

- 多个小游戏共用一个稳定的游戏外壳，避免每次重做加载、缩放、音频、存档、暂停、平台适配。
- 每个游戏独立构建、独立部署，可单独上架 Poki。
- 规则层可测试、可复现、可序列化；表现层可替换。
- 新游戏能在几分钟内生成可运行骨架。
- 公共层的改动有明确边界，不被单个游戏的业务需求拖垮。

### 非目标

- 不做通用游戏编辑器。
- 不追求跨引擎抽象；Phaser 就是唯一渲染/输入/音频底座。
- 不提前设计联机、账号、云存档、排行榜。
- 不为“以后可能复用”创建空包或空接口。

## 3. 技术选型

| 项     | 选择                   | 原因                                             |
| ------ | ---------------------- | ------------------------------------------------ |
| 语言   | TypeScript 7           | 规则型游戏需要类型约束；与 JS 基础衔接成本低     |
| 引擎   | Phaser 4.2             | 2D Web 游戏成熟方案，场景/输入/音频/资源加载齐全 |
| 构建   | Vite 8，每游戏独立构建 | 纯静态产物，适配自有站与 Poki                    |
| 包管理 | npm workspaces         | 环境已有，零额外工具                             |
| 测试   | Vitest 5               | 纯逻辑快速覆盖，不依赖浏览器                     |
| 检查   | Biome + 自定义边界脚本 | 格式化、lint、依赖方向一次跑完                   |
| CI     | GitHub Actions         | `check + test + build`，Node 24                  |

放弃的方案：
- **Kotlin/Compose Multiplatform**：Web 产物体积大、首屏慢；Poki/CrazyGames SDK 都是 JS 生态；未来要 Android 可用 Capacitor 包 Web 构建。
- **自研 Canvas 引擎**：缩放、音频解锁、图集、字体、输入、场景生命周期、可见性暂停都要重做，浪费时间且易出兼容 bug。
- **React/DOM UI**：游戏循环、输入、缩放与 Canvas 的协调成本高于收益；HUD 用 Phaser 原生 GameObject 足够。

## 4. 目录与分层

```
mini-games/
├─ AGENTS.md                     # AI 硬规则（项目级）
├─ packages/
│  ├─ core/                      # Phaser 外壳、UI、音频、存档、i18n、广告编排、调试
│  └─ platform/                  # 宿主 / 广告渠道适配（Web、Poki、H5）
├─ games/
│  ├─ snake/
│  │  ├─ game.manifest.json      # 站点与打包共用的元数据
│  │  ├─ src/logic/              # 纯 TS 规则（无 Phaser）
│  │  ├─ src/scenes/             # Menu / Game / Hud
│  │  ├─ src/main.ts             # GameDefinition 组装
│  │  ├─ src/i18n.ts
│  │  └─ src/save.ts
│  └─ ...
├─ templates/game/               # 新游戏模板
├─ tooling/
│  ├─ vite.game.ts               # 共享 Vite 配置
│  ├─ build-site.ts              # 汇总 dist-site
│  ├─ create-game.ts             # 新游戏生成器
│  └─ check-boundaries.ts        # 依赖边界检查
├─ docs/
└─ .opencode/skills/             # 项目级 AI skill
```

依赖方向：

```
games/*  ──>  packages/core  ──>  packages/platform
   │                │
   └──> packages/platform
```

- `@mg/core`：Boot（平台初始化 + 资源加载）、缩放、场景生命周期、UI、音频、SaveStore、Settings、i18n、RNG、调试。
- `@mg/platform`：唯一允许接触外部 SDK 的地方。
- `games/*/src/logic`：纯函数 + 不可变 state，零 Phaser 依赖，Vitest 覆盖。
- `games/*/src/scenes`：编排输入、渲染、动画、场景切换。
- `games/*/src/view`：复杂到需要拆时再建；目前贪吃蛇渲染在 `GameScene` 内。

### 源码即包（JIT packages）

workspace 包的 `exports` 直接指向 `src/index.ts`，不预编译：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./rng": "./src/rng/index.ts"
  }
}
```

- 开发时 Vite 直接转译源码，改 `packages/core` 立即热更新。
- `tsc --noEmit` 做全仓库类型检查。
- 发布时每个游戏仍由 Vite 打成独立静态包。

## 5. 依赖边界

由 `tooling/check-boundaries.ts` 强制：
- `games/*` 不能互相 import。
- `packages/*` 不能 import `games/*`。
- `games/*/src/logic` 不能 import Phaser；只能 import `@mg/core/rng`。
- 游戏代码不能直接使用 `window.PokiSDK`。
- 游戏代码不能直接使用 `localStorage`。

运行：

```bash
npm run check
```

边界脚本不是风格建议，是硬约束。需要跨边界时先改架构、说明理由，不要绕过脚本。

## 6. 公共层准入

### 为什么不把 grid / turn 做成公共包

- `grid` 的寻路规则（≤2 拐点、绕棋盘外圈）是连连看的玩法；贪吃蛇只用边界判断，Ludo 用预定义跑道。
- `turn` 的回合规则（掷 6 额外回合、三连六惩罚、吃子、进家）是 Ludo 的玩法；飞行棋和大富翁会朝不同方向演进。
- 共享它们会让一个游戏的规则改动波及另一个游戏，最后堆出一组游戏专属开关。

结论：规则先留在各自游戏内。等飞行棋做完，再对比 Ludo 与飞行棋，只上提真正相同的机制（例如种子骰子、回合轮转、事件日志）。

### 上提标准

同时满足才上提，否则复制：
1. 至少两个已发布的游戏实际用到。
2. 两边用法一致，不需要游戏专属开关。
3. 两边都有测试。
4. 提取后的 API 比两份实现加起来更小、更清楚。

### 公共层什么时候必须改

- 平台 SDK、浏览器音频解锁、存储限制、缩放行为变化。
- 存档格式或迁移 bug。
- 性能、可访问性、崩溃修复。
- Phaser 大版本升级。

规则：只增不破优先；破坏性改动必须在同一个提交里迁移所有游戏，CI 全绿。

### 反模式

- 在 core 里写 `if (gameId === 'snake')`。
- 为一个游戏加公共层开关，其他游戏永远走不到。
- 提前创建 `packages/grid` / `packages/turn` / `packages/assets`。
- 把“回合”“棋盘”“计分”这类游戏名词放进 `@mg/core` 的 API。

## 7. 游戏架构模式

### 7.1 纯逻辑层

`src/logic` 只依赖类型和 `@mg/core/rng`：

```ts
createInitialState(config, rng): State
enqueueDirection(state, direction): State
step(state, rng): { state: State; events: Event[] }
```

约束：
- 不 import Phaser、Scene、Texture、Audio。
- 不读 DOM、不写 localStorage、不发网络请求。
- state 是可序列化的普通对象；不存 class 实例、函数、DOM 节点。
- 随机性通过传入的 `Rng`，保证同种子同结果。
- 非法操作返回原 state 或明确的错误结果，不 throw 作为流程控制。
- 规则事件（eat/die/win）由逻辑层产出，渲染层消费。

贪吃蛇的落点：
- 20×20 棋盘，初始长度 3。
- 160ms/tick 起，最低 70ms；每 30 分加速 7ms。
- 六种水果按权重 3/3/3/2/2/1 生成，分别 10/10/10/15/15/20 分；食物槽由 `foodTarget` 控制，默认 1，数组结构支持后续广告奖励增加同屏水果。
- 水果权重保存在 `SnakeState.fruitWeights`，由 config 初始化；`boostFruitWeights(state, multiplier, kinds)` 可运行时提升指定水果权重，`highValueFruits` 预置葡萄/蓝莓/西瓜。激励广告可对本局立即调用，或对下一局的新 state 调用；同局内重复调用会叠加。
- 广告超级水果：结算页看广告后，无论完整观看、跳过还是失败，广告流程结束都直接开始下一局；仅完整观看时把 `pendingSuper` 写入存档 v2，下一局由 `grantSuperItem()` 放到空格；吃掉超级水果本身 +1 节、不加分。吃掉后清掉普通道具，用当前 `fruitWeights` 铺满所有空格，进入 20 秒水果盛宴。盛宴水果按普通分值计分（辣椒 ×2），每 8 颗让蛇 +1 节并新增水果色带，其余只计分，普通水果/道具生成暂停；时间到清掉剩余水果并恢复正常生成，提前吃完立即结束，吃到填满棋盘判胜。计时按每 tick 的 `tickMs` 扣减，暂停停表。速度曲线由 `speedScore` 驱动，盛宴分数不进入该值，因此盛宴结束后回到进入前的速度档位，不会永久卡在最快速度。
- 每个蛇节记录出生时的水果种类；吃到水果时长出的新头继承该颜色，形成向尾部推移的色带，未吃过的节段保持品牌蓝。
- 冰淇淋：tick ×1.5，封顶 240ms，持续 24 ticks；辣椒：tick ×0.6，下限 58ms，持续 36 ticks，期间水果得分 ×2。效果不叠加，新道具覆盖旧效果。
- 道具单槽；吃水果后按 35% 概率生成，连续 4 个水果未出则第 5 个保底；40 ticks 未吃消失。水果生成优先占格，最后一个空格冲突时道具让位。
- 输入队列最多 2，禁止 180° 反向。
- 食物由种子 RNG 从空格中选；填满棋盘判胜。
- 撞墙/撞自己判负；尾巴让出的格子不算碰撞。

### 7.2 场景流

```
Boot（并行初始化平台 + 加载资源）
  → Menu（游戏自己的菜单）
  → Game + Hud（并行）
       ├─ 暂停弹窗
       └─ 结算弹窗
```

- `Boot` 是 core 保留键，游戏不要占用。
- 菜单默认键 `Menu`。
- `GameScene` 拥有游戏循环、输入、渲染和平台事件。
- `HudScene` 负责分数、暂停按钮、暂停/结算弹窗；结算页右上角关闭按钮直接回主菜单；通过场景方法调用 `GameScene`。
- 游戏内触控组件（如滑动输入）由 `GameScene` 承载，HUD 不负责输入；这些组件属于游戏业务，不放进 `@mg/core`。
- 重开：先 `stop('Hud')` 再 `restart()`，避免 HUD 状态残留。

### 7.3 GameDefinition

每个游戏在 `src/main.ts` 组装：

```ts
import { snakeColors } from './colors'

createGame({
  id: 'snake',
  design: { base: 720 },
  theme: snakeColors.theme,
  defaultLang: 'zh',
  i18n: snakeI18n,
  menuScene: 'Menu',
  scenes: [MenuScene, GameScene, HudScene],
})
```

可选字段：`theme`（覆盖主题 token，贪吃蛇来自 `src/colors.ts`）、`debug`、`assets`（images/audio/json）。背景与标题 Logo 由游戏菜单自己绘制，核心 Boot 不再渲染整页加载页。

### 7.4 Services

场景通过 `getServices()` 获取：

```ts
const services = getServices()
services.i18n.t('menu.play')
services.audio.play('click')
services.platform.gameplayStart()
services.setSound(false)
services.setLang('en')
services.createSave<MySave>({ name: 'save', version: 1, initial: () => ({ best: 0 }) })

// 激励广告只走 AdService；渠道实现留在 @mg/platform
const outcome = await services.ads.showRewarded('revive')
```

- 不要自己 new AudioContext、写 localStorage、读 `navigator.language`。
- 平台事件只在玩法边界调用，不要每帧调用。
- 广告只在死亡/菜单/结算等边界触发；游戏不接触任何广告 SDK。

### 7.5 表现层

- 场景只读 state，渲染插值/动画/粒子，不回写规则。
- 逻辑 tick 与渲染帧解耦：固定步进 + 两次 tick 间插值。
- 动画不得阻塞输入；动画队列不得吞掉玩家操作。
- 结算/暂停时停表；恢复时先倒计时再继续。
- 布局从 `onLayoutChange(scene, fn)` 读取 `Viewport`（宽高 + 安全区），由纯函数算出各元素矩形；横竖屏走同一套函数，不写死坐标。
- 尺寸变化只重排，不重启场景；弹窗打开时按新尺寸重建。

## 8. 玩法与 UX 原则

- **公平死亡**：失焦、切页、暂停都必须停表；恢复给 3-2-1 倒计时。
- **输入缓冲**：方向/操作进入队列，不能因渲染帧或动画丢失。
- **非法输入明确拒绝**：例如贪吃蛇禁止直接反向；不要静默改成别的方向。
- **确定性**：种子 RNG 驱动食物/关卡/洗牌；测试可复现。
- **难度可解释**：速度曲线、AI 难度、生成概率写在 config，不散落在渲染代码。
- **状态可恢复**：v1 至少持久化最高分/进度；state 设计保持可序列化，为以后云存档留路。
- **结算单行**：标题表达结果（游戏结束/新纪录/通关），hero 显示分数，标题下只留一行 meta（死因 · 最高分）；结算页不写规则说明，广告奖励只体现在按钮文案上。
- **新手可读**：菜单写清操作方式；首次进入不要求读长说明；触屏玩家第一次开局会在倒计时内看到一次图示。
- **移动端优先验证**：横竖屏都可玩，按钮触控区域足够大，滑动不与页面滚动冲突；竖屏主行动锚定在底部拇指区，单手可够到。
- **触控尺寸**：触控目标 ≥ 44 CSS px；短边 720 设计单位在手机上约 0.54 缩放，主按钮 ≥ 92px、次图标按钮视觉 ≥ 84px 且命中区 ≥ 96px、正文 ≥ 30px、标签 ≥ 26px。
- **转屏公平**：朝向变化必须停表并自动暂停，玩家点继续后才走 3-2-1，不能边转屏边计时。
- **HUD 不占棋盘**：分数与暂停放在棋盘外的空白区（横屏左侧、竖屏顶部），不压缩游戏区，也不覆盖盘面。
- **滑动转向**：作为游戏内输入组件实现（如贪吃蛇 `src/ui` 的 `SwipeSteer`），不进公共层；按下任意位置不显示摇杆，只留一个短促的触点涟漪，不常驻、不遮挡盘面；滑动越过死区立即转向，松手结束手势（蛇保持当前方向），不需要一直按住；第二根手指在自身按下点移动超过接管阈值后可接手，旧手指不能反向抢回；若抬起前仍未产生方向，松手按最终位移补一次判定；桌面鼠标拖动同样可用，键盘保留。HUD 区域不响应按下。
- **触觉克制**：只在死亡/新纪录给一次短振动，吃子不振动。
- **暂停即静音**：暂停弹窗提供音效开关，避免回主菜单丢失当前局。
- **操作说明以菜单为主**：菜单写清操作方式；唯一例外是触屏玩家第一次进入游戏时，在 3-2-1 倒计时内显示一次滑动提示，首次转向或倒计时结束即消失，暂停时隐藏、继续后若未看过可再显示。

## 9. 视觉与资源

- 设计空间短边固定 **720** 设计单位，长边 = 720 × 视口比例；`Scale.FIT` + `CENTER_BOTH`，比例在 0.38–2.6 内铺满无黑边。
- `GameDefinition.design` 只声明 `{ base: 720 }`。`installResponsiveViewport` 在视口变化时重算设计尺寸与渲染倍率，再以**物理像素尺寸**调用 `setGameSize`；场景用 `onLayoutChange(scene, fn)` 重排，不重启、不丢局。
- **画布按物理像素渲染**：渲染倍率 = 父容器 CSS 尺寸 × DPR ÷ 设计尺寸，夹在 1–3 倍，并限制单边 ≤ 4096 像素（4K 3840 不受影响）。相机按同一倍率 `setZoom` 并反向偏移 `scroll`，设计坐标仍以 720 短边为原点，规则、动画和布局不需要感知倍率。手机 DPR 3、1080p、4K 桌面都按设备像素出图，不再把 720 画布放大后发虚；监听 `(resolution: Xdppx)` 处理跨屏/缩放变化。
- **设计尺寸只从 `readViewport(scene)` 读取**，不要在布局里直接用 `scene.scale.width/height`（那是画布物理像素）。`readViewport` 同时同步当前场景相机与文字分辨率，场景重建后也会生效。`Text` 的 `resolution` 由 `textStyle()` 按渲染倍率写入，视口变化时已有文字会自动重设。
- 设计稿按手机最小约 0.54 缩放校验（720 设计单位 ≈ 390 CSS px 宽）：30px 正文 ≈ 16 CSS px，26px 标签 ≈ 14 CSS px，24px 辅助提示 ≈ 13 CSS px；倍率只提升清晰度，不改变这些 CSS 尺寸。
- 横竖屏都必须可玩，不再注入旋转遮罩；朝向变化由游戏场景自动暂停。
- 加载流程：`index.html` 的内联 splash 覆盖 Phaser 下载、`Boot` 资源预加载与 SDK 初始化，菜单场景启动后才淡出；`Boot` 不渲染任何 Phaser 加载页，也没有点击门槛。SDK 初始化最多等 1.2 秒，超时就先进菜单、在后台继续完成（宿主语言若随后才就绪，菜单会重启一次以应用）；宿主 SDK 不能阻塞首屏。
- 移动端全屏：菜单点「开始」（`pointerup`）时请求 Fullscreen API；仅触屏、非 iframe、非 standalone 时自动请求。`#game` 是全屏目标，进入/退出触发 resize 与重排，不重启、不丢局。桌面不自动全屏，保留 F11；Poki 等 iframe 环境交给平台播放器。Dev 模拟广告覆盖层挂到当前全屏元素（无全屏则 `#game`/`body`），避免手机全屏后广告被全屏元素遮住。
- 音频默认开启；菜单首次点击或按键即 `audio.unlock()`，之后菜单、弹窗和游戏内音效都可用。玩家保存的音效关闭偏好与宿主静音优先。
- iPhone Safari 不支持任意 DOM 元素全屏（iOS 26/27 仍只开放给 iPad）；通过 `apple-mobile-web-app-capable` + 「添加到主屏幕」以 standalone 启动，并在不支持的移动浏览器菜单里提示 A2HS。
- 安全区：`safeAreaInDesign(scene)` 把 `env(safe-area-inset-*)` 换算成设计单位，HUD、按钮与页面边缘必须内缩，不能压到刘海或手势条。
- 中文使用系统字体栈：Noto Sans SC / PingFang SC / Microsoft YaHei / system-ui。
- **不打包 CJK 字体**；5MB+ 会毁首屏。
- 西文可用 OFL 字体，但要确认许可证和体积。
- 占位阶段用 Phaser Graphics 程序化绘制；正式素材优先 CC0（如 Kenney）。
- **视觉语言**：阳光糖果街机（sunny candy arcade），但**描边分级**，不把所有表面都做成贴纸。三层规则：
  - L0 游戏世界与品牌：蛇、果实、Logo 标题、倒计时数字保留 2–3px 墨线与硬阴影；**棋盘例外**：不再套墨色相框，只保留白衬（接住蛇头与效果环的溢出）和原有 2px 薄荷绿场地边线。
  - L1 主行动：每屏最多一个（开始游戏、继续、再来一局），墨线 + 厚底 + 硬阴影；`Button` 的 `primary` / `danger` 走这一层。贪吃蛇的主行动统一在按钮面散落六颗旋转果实（`ButtonDecoration`）。
  - L2 次行动：音效、语言、重开、主菜单、暂停键、滑动触点反馈，用 `surface` 面 + 1px `borderSoft` + 轻阴影，无厚底无高光；`Button` 的 `soft` / `ghost` 走这一层。菜单里的音效/语言固定在右上角（安全区内），桌面视觉 64、触控视觉 84 且命中区 96，用 `soft` 白色圆面与暂停键统一，不与 L1 主行动同列竞争；暂停弹窗左上角复用同一音效开关。
  - L3 信息容器：分数云朵、最高分、Modal 卡片、加载条、教学键帽，0–1px 弱边或无描线、无墨线，靠底色差与阴影分层。
  - 文字描边只用于 Logo/大标题；分数、Modal hero、正文不再描边。
- **配色**：贪吃蛇采用琥珀橙 `#ffb020` 作主题强调色（hover `#f09300`），近白冷天空到暖奶油作背景；色块上的文字/图标用墨紫 `onAccent` `#332b45`，浅底强调文字用深海蓝 `accentInk` `#0369a1`，hover 一律变深。蛇与标题 Logo 走独立的浅蓝 `#7dd3fc` 到深海蓝 `#0369a1` 美术色。选琥珀橙是因为它与蓝色蛇身形成冷暖对比，配墨紫文字的对比度约 7.3:1；不用浅柠檬黄，因为浅黄配深棕文字会发灰、像禁用态。公共 `defaultTheme` 是未定色游戏的通用浅色基线，游戏通过 `colors.ts` 覆盖。
- 公共 UI token 统一在 `Theme`：`ink`、`borderSoft`、`accent`、`accentHover`、`accentInk`、`onAccent`、`accentAlt`、`accentWarm`、`surface`、`surfaceAlt`、`highlight`、`onDanger`、`shadow`、`radiusLarge`；`borderSoft` 只作 1px 弱边，不承担文字对比。`displayTextStyle()` 提供描边+硬阴影，`drawIcon()` 提供程序化图标；`Button` 统一 primary/soft/ghost/danger 并内置分层几何（soft 无墨线/无厚底），支持 `minHitSize` 在不放大视觉尺寸的前提下扩大触控命中区，并通过 `ButtonDecoration` 在按钮面与文字之间留出游戏美术插槽（`ModalAction.decoration` 透传）；`Modal` 为无墨线卡片，标题可选 accent 丝带（`titleRibbon`，默认开），结算页使用无丝带的普通标题。游戏只覆盖 token，不另造一套控件。
- **每个游戏的颜色只有一个入口**：`games/<id>/src/colors.ts`，同时包含该游戏的 `theme`（覆盖公共 token）、`art`（蛇身、果实等专属美术色）和 `logo`（品牌标题固定色板）。场景只使用 `getServices().theme` 或 `colors.art`，不写颜色字面量；透明度、`mixColor()` 派生色除外。公共层只保留 `Theme` 类型与通用默认值，不包含任何游戏专属色。**品牌 Logo 不读 `Theme` 颜色**：`logo` 色板独立于主题，换主题不得改变标题；`colors.test.ts` 校验对比度与 `logo.ts` 的主题引用。
- 游戏本地美术放 `games/<id>/src/ui`：贪吃蛇的 `backdrop.ts`（天空/云/山丘/叶片散点）、`foliage.ts`（程序化叶片与画框角饰：只画叶，不画圆果体/光晕/呼吸，确保背景读作生境而不是可吃的东西）、`snakeArt.ts`（描边蛇身、表情蛇头、六种水果、冰淇淋/辣椒、金色超级水果与效果环）、`gameArt.ts`（棋盘与四角枝叶、分段色带蛇、水果/道具绘制；水果层只在 `foods` 或布局变化时重绘，避免铺满水果时每帧重建）、`feedback.ts`（吃水果/吃道具/盛宴/危险反馈）、`celebration.ts`（结算彩纸、烟花与新纪录皇冠）、`CloseButton.ts`（结算弹窗右上角关闭按钮）、`logo.ts`（固定品牌色标题 + 方块直角折线蛇身 + 果实）、`menuDemo.ts`（菜单自动演示棋盘，展示吃水果变色）、`fruitDecoration.ts`（菜单主行动按钮的散落果实）。颜色统一从 `games/snake/src/colors.ts` 读取，这些是表现层实现，不进入公共包。`backdrop.ts` 与 `logo.ts` 只在游戏自己的菜单/游戏场景中使用，不再交给核心 `Boot`。
- `index.html`、`manifest.webmanifest`、`game.manifest.json`、`favicon.svg` 无法 import TS，保留静态字面量；`colors.test.ts` 校验它们与 `colors.ts` 的关键颜色一致，防止漂移。贪吃蛇的 favicon 以主题 `accent` 作底色、`onAccent` 作内边框；PWA PNG 由 favicon 重新生成并填实透明角。
- 图标优先 Lucide 等开源图标，只取实际用到的，记录来源/许可证。当前菜单/按钮图标为程序化 Graphics，不引入图标依赖；贪吃蛇菜单 demo 的手指导引用 Phosphor `hand-pointing`（MIT，`games/snake/src/assets/hand-pointer.svg`，许可证见同目录 `hand-pointer.LICENSE.txt`），重着色为白色填充 + 墨色描边，经 `GameDefinition.assets.images` 加载。
- 音效以 WebAudio 合成兜底；`eat` 使用打包的 CC0 咬合采样（`games/snake/src/assets/audio/eat-1.wav`/`eat-2.wav`，来自 OpenGameArt「7 Eating Crunches」/ StarNinjas，CC0），经 `GameDefinition.audioSamples` 注册，在首次用户手势后 `fetch + decodeAudioData` 缓存；`play()` 的 `pitch` 对采样走 `playbackRate`，连吃按五声音阶升调。
- **音效电平按峰值定标**：合成音效峰值 −9…−1 dBFS；采样解码后用 `peakAmplitude` / `peakNormalizationGain`（`packages/core/src/audio/normalize.ts`）归一化到 −1 dBFS，最多提升 +18 dB，避免换素材后忽大忽小。master 后接 `WaveShaperNode` 软削波（0.9 以下直通，上限 −0.5 dBFS），多层叠加（盛宴连吃、倒计时 + 吃果）不会硬削波，也不像 `DynamicsCompressorNode` 那样把短促的合成音效压低。合成音效的基频与泛音落在 700 Hz 以上，并为 `die` 叠加高八度层，保证手机外放在 500 Hz 以下滚降时仍能听清。
- 运行时零外部请求：无 CDN、外部字体、统计脚本、远程图片/音频。
- 首包目标 ≤ 1.5MB gzip；Phaser 本身约 370KB gzip。贪吃蛇 2.0 约 375KB gzip。

## 10. 存档与设置

### SaveStore

```ts
const save = services.createSave<MySave>({
  name: 'save',
  version: 1,
  initial: () => ({ best: 0 }),
  migrate: (old, fromVersion) => {
    // 返回新结构，或 null 表示无法迁移
  },
})
```

- 键：`mg:<gameId>:<name>`。
- 信封：`{ version, data }`。
- 版本不匹配时调用 `migrate`；失败/损坏回退 `initial()`。
- localStorage 不可用（隐私模式、受限 iframe）自动回退内存。
- 改字段必须升版本并提供迁移；不要静默丢档。
- 不要把 Phaser 对象、函数、DOM 写进存档。

### 设置

- 全局键：`mg:settings:v1`。
- 字段：`sound: boolean`、`lang: 'zh' | 'en'`。
- 通过 `services.setSound()` / `services.setLang()` 修改，自动持久化并同步运行时。
- 设置是跨游戏共享的；不要为单个游戏另建音效/语言偏好。

## 11. i18n

- 默认中文；英文同步准备。
- 解析顺序：URL `?lang=` > 已存选择 > 游戏 `defaultLang`。
- **不做 navigator 嗅探**：中文站不应因为浏览器是英文就自动变英文。
- 每个游戏必须提供 `game.title`；Boot 加载页依赖它。
- 玩家可见文案全部走 `services.i18n.t(key, params)`；中英文词典都要有。
- key 命名：`game.*`、`menu.*`、`hud.*`、`pause.*`、`over.*`；core 用 `core.*`。
- 参数用 `{name}` 占位；缺失 key 回退中文，再回退 key 本身。
- 语言切换后重建/刷新当前场景，确保所有文本更新。

## 12. 平台与广告渠道

宿主 `PlatformAdapter` 只负责页面/平台生命周期：

```ts
readonly name: string

init(): Promise<void>
loadingFinished(): void
gameplayStart(): void
gameplayStop(): void
happyTime(): void
lang(): Lang | null
haptic(ms: number): void
hostMuted?(): boolean
onHostMutedChange?(listener: (muted: boolean) => void): () => void
```

广告渠道 `AdChannel` 独立存在：

```ts
readonly name: string
readonly rewardedAvailable: boolean

init(): Promise<void>
rewardedBreak(placement: string, onStart?: () => void): Promise<boolean>
interstitialBreak?(onStart?: () => void): Promise<void>
```

`AdChannelOptions` 提供 `sound?: () => boolean`，渠道用它决定广告是否出声；游戏只传 `AudioManager.soundEnabled`，不直接接触渠道。
- `@mg/platform` 是唯一允许接触广告 SDK 的地方；Poki、CrazyGames 的宿主与广告渠道分别共享同一个 SDK 运行时。
- 游戏只通过 `@mg/core` 的 `AdService`；它负责单飞、静音、`gameplayStop`、结果映射和调试统计。
- `VITE_PLATFORM=poki` 强制 `adChannel=poki`；自有站默认无广告渠道（奖励入口隐藏）。
- `VITE_PLATFORM=crazygames` 注入 CrazyGames SDK v3，并把 `loadingStart/Stop`、`gameplayStart/Stop`、`happytime`、locale 映射到 `PlatformAdapter`。
- `VITE_AD_CHANNEL=crazygames` 启用 Full Launch 广告渠道；不设置时是 Basic 构建，游戏完整可玩但无广告。
- CrazyGames 广告：`rewarded` 只在 `adFinished` 发奖，`adError` 不发奖；`midgame` 只用于死亡/结算重开等自然断点；`adblock`/`adsDisabled` 后隐藏奖励入口；`unfilled`/`adCooldown` 允许重试。
- CrazyGames `muteAudio` 通过 `hostMuted()` / `onHostMutedChange()` 传给 `AudioManager`，优先级高于玩家音效偏好，不写入存档。
- 所有构建统一在 Boot 加载完成后直接进菜单；新用户到可玩只需菜单「开始」1 次点击。
- CrazyGames 构建不加载 H5 Ads 或其他外部广告；平台 SDK 只由 Vite 插件注入，游戏代码不接触 `window.CrazyGames`。
- 不提供 TrackKit 式的通用自定义事件层；需要分析时走平台后台、平台原生事件或以后单独设计的渠道，避免与生命周期重复上报。
- 自有站 H5 Games Ads 已实现：`VITE_AD_CHANNEL=h5games` + `VITE_ADSENSE_CLIENT`；缺少 publisher ID 时构建无广告。真实广告还需要 AdSense/H5 审核、`ads.txt`、隐私政策和 CMP。
- H5 的 `rewardedAvailable` 只表示 SDK ready，不表示库存；no-fill 按未奖励处理。
- 广告只在死亡/菜单/结算等边界触发；广告期间停表、静音、锁输入，且不触发 SDK 事件。`createGame` 在创建 Phaser.Game 后调用 `bindAdInputLock(game.input, services.ads)`：广告 `active` 时 `game.input.enabled=false`，结束后恢复，覆盖所有广告 surface，而不仅是 Dev 模拟器。
- 奖励只在 `rewardedBreak()` 返回 `true` 时发放；不在游戏内做广告冷却或每日上限。
- `commercialBreak()` / `midgame` 已通过 `AdService.showInterstitial()` 接入：只在死亡、结算重开等自然断点调用；CrazyGames 宿主下暂停恢复和暂停菜单重开不弹；广告结束后由游戏自己调用 `gameplayStart()`，奖励广告后的重开传 `commercial:false`，避免连续两条广告。
- Poki/CrazyGames 构建：单游戏 zip、`index.html` 在根、资源相对路径、运行时除平台 SDK 外无外部请求；平台 SDK 由 Vite 插件按渠道注入。
- Poki 渠道已实现，但没有账号/Inspector 验证前不要提审；CrazyGames 已具备账号，门户 QA 待跑；H5 真实广告也需要账号/审核验证。
- 详见 `docs/ads.md`。

## 13. 代码规范

- TypeScript strict；默认非空；可空只在 I/O 边界出现并一次性收敛。
- 默认 immutable：`readonly`、纯函数、不可变数组；可变状态最小化。
- 不防御性编程：不写无意义的 null 检查、兜底 try-catch、冗余参数校验。
- 核心逻辑 FP 取向，整体架构 OOP；不硬套 monad/类型类。
- 文件按职责命名：`state.ts`、`types.ts`、`config.ts`、`save.ts`、`*Scene.ts`。
- 不引入 `any`；需要时先说明并收窄。
- 注释只解释“为什么”，不复述代码。
- 新依赖必须说明必要性、体积、许可证；优先标准库和已有依赖。

## 14. 测试与质量门

### 自动检查

```bash
npm run check        # tsc + Biome + 依赖边界
npm run test         # Vitest
npm run build:snake  # 或对应游戏
npm run site         # 涉及站点/多游戏时
```

### 测试范围

- 规则层：移动、碰撞、吃子、胜负、非法输入、随机复现、速度曲线。
- 核心：SaveStore 初始/持久化/迁移/损坏回退；i18n 回退与语言解析。
- 广告：AdService 结果映射、单飞、静音、`gameplayStop`、无冷却、placement 透传；Poki/CrazyGames 运行时事件去重与广告期间事件屏蔽；CrazyGames rewarded/midgame/adblock/muteAudio；H5 渠道 onReady/viewed/dismissed/no-fill/异常。
- 每个新游戏至少覆盖：初始状态、正常推进、边界失败、胜利条件、种子确定性。

### 浏览器 smoke

至少检查：
- 桌面 1920×1080（设计空间 1280×720）。
- 手机横屏 844×390。
- 手机竖屏 390×844。
- 平板竖屏 768×1024。
- 首屏 → 点击开始 → 菜单 → 游戏 → 暂停 → 重开 → 结算 → 回菜单。
- 失焦/切页自动暂停；恢复有倒计时。
- 中英文切换、音效开关、刷新后持久化。
- console 无报错；Network 无外部请求。
- 首包 gzip 体积无明显回退。

仓库目前没有内置 Playwright 用例；smoke 可由开发者在浏览器或临时脚本完成。若以后固化，优先加 `@playwright/test` 并用系统 Chromium，避免把浏览器二进制提交进仓库。

## 15. 变更流程

### 新游戏

1. `npm run new:game -- <name>`
2. `npm install`
3. 按 `docs/new-game-checklist.md` 改 manifest、i18n、场景。
4. 先写 `src/logic` 和测试，再做场景/渲染。
5. 跑完整质量门，补 `thumb.png`，更新 CHANGELOG。

### 修改公共层

1. 先判断是基础设施需求还是单个游戏的业务需求。
2. 业务需求 → 留在游戏内，复制实现。
3. 基础设施需求 → 列出受影响游戏，补回归测试，更新所有游戏。
4. 破坏性改动必须同提交迁移，CI 全绿。

### 新增依赖

- 说明为什么现有依赖/标准库不够。
- 检查体积、许可证、维护状态、浏览器兼容。
- 运行时依赖优先少而稳；开发依赖不进入产物。

### 发布

1. 更新版本号（根、游戏、core、platform 保持一致）。
2. 更新 `CHANGELOG.md`。
3. `npm run check && npm run test && npm run site`。
4. commit → push → tag → GitHub Release（附游戏 zip）。
5. 确认 CI 在 `main` 和 tag 上都通过。

## 16. 已知取舍与路线图

### 已知取舍

- Poki 宿主/广告渠道已实现，但未在真实账号/Inspector 验证；CrazyGames 宿主/广告渠道已实现，账号已具备但门户 QA 待跑；自有站 H5 Games Ads 已实现，未通过 AdSense/H5 审核，真实广告未验证。
- 广告渠道抽象已就位；AdMob/Pangle/Meta、mediation、同意管理 UI 未实现。
- iPhone Safari 不支持网页内全屏，只能通过 A2HS/PWA 获得无浏览器 UI；Android/iPad 用 Fullscreen API。
- 没有 `packages/assets`；共享素材出现前不建。
- 没有 `packages/grid` / `packages/turn`；规则留在游戏内。
- 贪吃蛇渲染暂时放在 `GameScene`；复杂后再拆 `src/view`。
- v1 不做热座、在线联机、账号、排行榜。
- 没有内置 E2E；浏览器 smoke 目前是人工/临时脚本。

### 路线图

| 阶段 | 内容                                                    | 验收                                          |
| ---- | ------------------------------------------------------- | --------------------------------------------- |
| M2   | 连连看：10×8、≤2 拐点、绕边界、死局洗牌、种子可解       | 寻路单测、洗牌、种子复现                      |
| M3   | Ludo：1 玩家 + 3 AI、掷骰/吃子/进家、动画队列           | 完整一局无死锁、规则测试、AI <100ms           |
| M4   | Poki Inspector / CrazyGames 门户验证、H5 生产验证、提审 | 平台 QA 通过、单游戏 zip 独立可跑、无外部请求 |

## 17. 相关文档

- `AGENTS.md` — AI 必须遵守的硬规则
- `docs/new-game-checklist.md` — 新游戏操作清单
- `docs/publishing.md` — 自有站、Poki 与 CrazyGames 发布
- `README.md` — 快速开始与命令
- `.opencode/skills/mini-games-dev/SKILL.md` — 项目开发 skill
