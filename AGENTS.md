# Mini Games — Agent Instructions

本文件只适用于本仓库，OpenCode 仅在当前项目加载。**不要把这里的规则、skill 或文档写入 `~/.config/opencode` 或任何全局配置。**

本项目是 TypeScript + Phaser 4 的 Web 游戏工程，不是 Kotlin/Android 项目；全局 AGENTS.md 中的 Kotlin/Compose 编码规则不适用于这里。

## 项目定位

- 一个仓库承载多个小游戏，共享游戏基础设施，但每个游戏独立构建、独立发布。
- 当前版本 **2.0.0**，只有 `games/snake` 可玩。
- 路线：自有站优先 → Poki；纯单人 vs AI，不做热座/联机；占位美术 + CC0 素材先跑通。
- 技术栈：TypeScript 7、Phaser 4.2、Vite 8、npm workspaces、Vitest、Biome。

## 开始前先读

1. `docs/architecture.md` — 设计、分层、原则、技术要点（唯一事实来源）。
2. `docs/new-game-checklist.md` — 新增游戏的操作清单。
3. `docs/publishing.md` — 站点与 Poki 发布。
4. 目标游戏的 `game.manifest.json`、`src/main.ts`、`src/logic`、`src/scenes`。

非平凡改动先加载项目 skill：`.opencode/skills/mini-games-dev/SKILL.md`。

## 不可违反的硬规则

### 分层与复用

1. 公共层只放**基础设施**：加载、缩放、场景生命周期、输入原语、音频解锁/静音、存档机制、平台 SDK、UI 组件、种子随机数、i18n、调试。
2. 游戏规则留在 `games/*/src/logic`：回合、棋盘、跑道、吃子、计分、关卡、AI、提示、洗牌、速度曲线。
3. **不要**创建 `packages/grid`、`packages/turn`、`packages/assets`。只有满足上提标准才允许新建共享包。
4. 上提标准必须同时满足：
   - 至少两个已发布游戏实际使用；
   - 两边用法一致，不需要游戏专属开关；
   - 两边都有测试；
   - 提取后的 API 比两份实现更小、更清楚。
5. 不满足就复制。**宁可重复，也不要为了复用改公共层。**
6. 公共层可以为基础设施需求修改（SDK、浏览器行为、存储、性能、Phaser 升级），但必须检查所有游戏并让 CI 全绿；不能为单个游戏的业务需求改。
7. 依赖方向：`games → packages`，`packages` 不 import games，游戏之间不互相 import。

### 代码边界

8. `games/*/src/logic` 不 import Phaser；需要随机数只 import `@mg/core/rng`。
9. 游戏代码禁止直接使用任何广告 SDK（`window.PokiSDK`、AdMob 等）；只能通过 `@mg/core` 的 `services.ads`。渠道实现只在 `@mg/platform`。
10. 游戏/UI 代码禁止直接使用 `localStorage`；一律通过 `services.createSave()` / `SaveStore`。
11. 纯逻辑只接受输入、返回新状态和事件；渲染层只读状态，不回写规则。

### TypeScript

12. 保持 strict；默认非空，可空只出现在平台 API、JSON、网络等 I/O 边界，并在边界一次性收敛。
13. 默认 immutable：`readonly`、不可变数组、纯函数；可变状态收拢到最小作用域。
14. 不做防御性编程：不写“以防万一”的 null 检查、兜底 try-catch、冗余参数校验。正确性优先交给类型系统。
15. 核心逻辑 FP 取向，整体架构 OOP；不硬套 monad/类型类。
16. 不引入 `any`；确实需要时先说明原因并收窄。
17. 不无理由增加依赖；新增运行时依赖前先确认必要性、体积、许可证。

### 玩法与体验

18. 固定步进 + 两次 tick 间插值；不要用帧率驱动游戏速度。
19. 随机性必须可复现：使用 `@mg/core/rng` 的种子 RNG，不直接用 `Math.random()` 做规则。
20. 输入要有队列/缓冲；禁止非法反向；输入不能吞掉或延迟到下一次死亡。
21. 失焦、切标签页、暂停必须停表；恢复时给 3-2-1 倒计时，避免不公平死亡。
22. 难度曲线、速度、AI 决策时间要写进游戏配置，不散落在渲染代码里。
23. 结算后必须能重新开始、回菜单；最高分/进度要持久化。

### 视觉与资源

24. 设计空间短边固定 **720** 设计单位，长边随视口比例，`Scale.FIT + CENTER_BOTH` 全屏铺满；横竖屏都必须可玩，不再注入旋转提示。手机首次交互（Preload 点击）后请求全屏，主菜单即全屏，不等到开始游戏；iframe 内不自动请求；iPhone 通过 A2HS/PWA；不锁定方向。
25. 中文使用系统字体栈；**不打包 CJK 字体**。西文可用 OFL 字体。
26. 占位阶段优先用 Phaser Graphics 程序化绘制；正式素材优先 CC0。
27. 图标优先 Lucide 等开源图标，只引入实际用到的，确认许可证。
28. 运行时零外部请求：不使用 CDN、外部字体、统计脚本、远程图片/音频；广告渠道 SDK 只允许由 `@mg/platform` 的渠道实现和构建插件按渠道注入。
29. 单游戏首包目标 ≤ 1.5MB gzip；Phaser 本身约 370KB gzip。

### 存档、语言、平台

30. 存档必须带 `version`；改字段要提升版本并提供 `migrate`，不能直接破坏旧存档。
31. 存档键：`mg:<gameId>:<name>`；全局设置键：`mg:settings:v1`。
32. 语言优先级：URL `?lang=` > 已存选择 > 游戏 `defaultLang`。**不做 navigator 嗅探**；默认中文。
33. 每个游戏必须提供 i18n key `game.title`（Preload 依赖）；所有用户可见文案中英文都要有。
34. 进入实际玩法调用 `platform.gameplayStart()`；菜单/暂停/结算调用 `gameplayStop()`；胜利或新纪录调用 `happyTime()`。
35. Poki 构建必须单游戏独立、`index.html` 在 zip 根、资源相对路径、无外部请求；未在 Poki Inspector 验证前不要提审。

### 广告

36. 广告渠道只在 `@mg/platform` 实现；游戏只通过 `@mg/core` 的 `services.ads.showRewarded(placement)`，不直接接触任何广告 SDK。
37. 激励广告只在死亡/菜单/结算等边界由玩家主动触发；广告期间停表、静音、锁输入，且不得触发 SDK 事件。
38. 奖励只在 `rewardedBreak()` 返回 `true` 时发放；跳过、失败、广告拦截都不发奖励，也不显示自定义“广告被拦截”提示。
39. 不要在游戏内实现广告冷却或每日次数上限（渠道管理频率）；玩法上限（例如每局 1 次复活）可以。
40. 奖励按钮必须有视频图标、不能使用绿色；标准按钮必须同时出现、尺寸不小于奖励按钮、位于其上方或旁边；一次奖励只对应一条广告。

### 工程与协作

41. 本项目约定只写在本仓库；不要改全局 OpenCode 配置、全局 AGENTS.md 或全局 skills。
42. 不为了“以后可能用到”提前抽象；不为单个游戏增加公共层开关。
43. 改动必须同步测试和文档；行为变化更新 `CHANGELOG.md`。
44. 不要擅自升级 Phaser/Vite/TypeScript 大版本；先说明影响并单独提交。
45. 不要提交 `node_modules`、`dist`、`dist-site` 或密钥。

## 常用命令

```bash
npm install
npm run dev:snake
npm run check        # tsc + Biome + 依赖边界
npm run test         # Vitest
npm run build:snake
npm run site         # 构建全部游戏 + dist-site 汇总页
npm run new:game -- <name>
```

新增游戏后记得执行一次 `npm install`，让 npm workspace 链接新包。

## 完成定义（DoD）

- `npm run check` 通过。
- `npm run test` 通过；新增规则边界有测试。
- 目标游戏构建通过；涉及站点时 `npm run site` 通过。
- 桌面 16:9、手机横屏、手机竖屏都实际可玩；转屏自动暂停并恢复倒计时。
- 暂停/失焦/恢复、重开、回菜单、最高分持久化正常。
- 中英文切换无缺失文案；无 console 报错。
- 运行时无外部请求；首包体积没有明显回退。
- 相关文档、`CHANGELOG.md`、存档版本已同步。

## 反模式（看到就拒绝）

- 把回合/棋盘/计分/寻路抽象进 `packages/core`。
- 为一个游戏在 core 加 `if (gameId === ...)` 或游戏专属开关。
- 在 `src/logic` import Phaser、Scene、Texture、Audio。
- 在场景里直接操作 `localStorage` 或 `PokiSDK`。
- 用 `setInterval` 驱动玩法，或让速度依赖帧率。
- 用 `Math.random()` 生成可影响胜负的随机结果。
- 暂停只停渲染不停计时；恢复不倒数。
- 把中文打进 5MB 字体包，或从 CDN 拉字体。
- 为了“复用”提前建空包、空抽象、空接口。
- 改旧存档字段却不升版本、不写迁移。
- 没跑检查就声称完成。

## 发布

- 站点：`npm run site` → 部署 `dist-site/`。
- Poki：见 `docs/publishing.md`；适配器完成前 `VITE_PLATFORM=poki` 会回退 dev，不能提审。
- 版本：语义化版本；发布前更新 `CHANGELOG.md`、打 tag、创建 GitHub Release。
- 未经用户明确要求，不要自行 commit、tag 或 push。
