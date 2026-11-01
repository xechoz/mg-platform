# mg-platform — Agent Instructions

本文件只适用于 `xechoz/mg-platform`。所有游戏是独立仓库，通过 `platform/` git submodule 引用本仓库的 tag；本仓库**不包含游戏代码**。

不要把这里的规则、skill 或文档写入 `~/.config/opencode` 或任何全局配置。

## 仓库定位

- 本仓库只放共享基础设施：`@mg/core`、`@mg/platform`、Vite 预设、打包脚本、边界检查、游戏模板。
- 游戏仓库：`xechoz/snake`、`xechoz/ludo` 等；站点仓库：`xechoz/mini-games`。
- 依赖方向：`games → packages`；`packages` 不 import games；游戏之间不互相 import。
- 版本从 **4.0.0** 起；游戏通过 submodule 固定 tag。平台改动必须新打 tag，再逐个游戏升级，不能假设原子升级。

## 先读什么

- 改分层、公共 API、模板、打包流程：`docs/architecture.md`。
- 发布平台版本：`docs/publishing.md`。
- 广告接入：`docs/ads.md`。
- 新增游戏仓库：`docs/new-game-checklist.md`。
- 其余直接读目标文件；不要预读整个仓库。

## 不可违反的硬规则

### 分层与复用

1. 公共层只放基础设施：加载、缩放、场景生命周期、输入原语、音频解锁/静音、存档机制、平台 SDK、UI 组件、种子随机数、i18n、调试。
2. 游戏规则留在各游戏仓库的 `src/logic`：回合、棋盘、跑道、吃子、计分、关卡、AI、提示、洗牌、速度曲线。
3. **不要**在本仓库创建 `games/`、`site/`、`build-site.ts`。
4. 不要创建 `packages/grid`、`packages/turn`、`packages/assets`。只有同时满足以下条件才允许新建共享包：
   - 至少两个已发布游戏实际使用；
   - 两边用法一致，不需要游戏专属开关；
   - 两边都有测试；
   - 提取后的 API 比两份实现更小、更清楚。
5. 不满足就复制。**宁可重复，也不要为了复用改公共层。**
6. 公共层可以为基础设施需求修改（SDK、浏览器行为、存储、性能、Phaser 升级），但必须让本仓库 CI 全绿，并评估所有已发布游戏。
7. 模板 `templates/game-repo` 必须保持可独立构建：生成的新仓库不依赖本仓库的 workspace。

### 代码边界

8. 游戏 `src/logic` 不 import Phaser；需要随机数只 import `@mg/core/rng`。
9. 游戏代码禁止直接使用任何广告 SDK（`window.PokiSDK`、CrazyGames 全局、AdMob 等）；只能通过 `@mg/core` 的 `services.ads`。渠道实现只在 `@mg/platform`。
10. 游戏/UI 代码禁止直接使用 `localStorage`；一律通过 `services.createSave()` / `SaveStore`。只有 `@mg/core` 的存储实现可以直接访问 `localStorage`。
11. 纯逻辑只接受输入、返回新状态和事件；渲染层只读状态，不回写规则。
12. `@mg/core` / `@mg/platform` 是源码包：`private: true`，`exports` 指向 `./src/`，不构建 dist。

### TypeScript

13. 保持 strict；默认非空，可空只出现在平台 API、JSON、网络等 I/O 边界，并在边界一次性收敛。
14. 默认 immutable：`readonly`、不可变数组、纯函数；可变状态收拢到最小作用域。
15. 不做防御性编程：不写“以防万一”的 null 检查、兜底 try-catch、冗余参数校验。正确性优先交给类型系统。
16. 核心逻辑 FP 取向，整体架构 OOP；不硬套 monad/类型类。
17. 不引入 `any`；确实需要时先说明原因并收窄。
18. 不无理由增加依赖；新增运行时依赖前先确认必要性、体积、许可证。

### 玩法与体验

19. 固定步进 + 两次 tick 间插值；不要用帧率驱动游戏速度。
20. 随机性必须可复现：使用 `@mg/core/rng` 的种子 RNG，不直接用 `Math.random()` 做规则。
21. 输入要有队列/缓冲；禁止非法反向；输入不能吞掉或延迟到下一次死亡。
22. 失焦、切标签页、暂停必须停表；恢复时给 3-2-1 倒计时，避免不公平死亡。
23. 难度曲线、速度、AI 决策时间要写进游戏配置，不散落在渲染代码里。
24. 结算后必须能重新开始、回菜单；最高分/进度要持久化。

### 视觉与资源

25. 设计空间短边固定 **720** 设计单位，长边随视口比例，`Scale.FIT + CENTER_BOTH` 全屏铺满；横竖屏都必须可玩，不注入旋转遮罩或强制旋转提示。手机在菜单点「开始」后请求全屏（iframe 内不自动请求）；移动端可在全屏后尝试锁定横屏作为默认方向，锁定失败、浏览器不支持或退出全屏时必须回退到设备当前方向（竖屏布局仍可用），不得阻塞竖屏玩法；桌面端不锁定方向；iPhone 通过 A2HS/PWA。
26. 中文使用系统字体栈；**不打包 CJK 字体**。西文可用 OFL 字体。
27. 占位阶段优先用 Phaser Graphics 程序化绘制；正式素材优先 CC0。
28. 图标优先 Lucide 等开源图标，只引入实际用到的，确认许可证。
29. 运行时零外部请求：不使用 CDN、外部字体、统计脚本、远程图片/音频；广告渠道 SDK 只允许由 `@mg/platform` 的渠道实现和构建插件按渠道注入。
30. 单游戏首包目标 ≤ 2MB gzip；Phaser 本身约 370KB gzip，背景音乐通常再占 1–1.5MB。

### 存档、语言、平台

31. 存档必须带 `version`；改字段要提升版本并提供 `migrate`，不能直接破坏旧存档。
32. 存档键：`mg:<gameId>:<name>`；全局设置键：`mg:settings:v1`。
33. 语言优先级：URL `?lang=` > 已存选择 > 宿主检测（仅平台适配器）> 游戏 `defaultLang`。**不做 navigator 嗅探**；所有游戏统一 `defaultLang: 'en'`。
34. 每个游戏必须提供 i18n key `game.title`（Boot 加载页依赖）；所有用户可见文案中英文都要有。
35. 进入实际玩法调用 `platform.gameplayStart()`；菜单/暂停/结算调用 `gameplayStop()`；胜利或新纪录调用 `happyTime()`。
36. Poki 构建必须单游戏独立、`index.html` 在 zip 根、资源相对路径、无外部请求；未在 Poki Inspector 验证前不要提审。

### 广告

37. 广告渠道只在 `@mg/platform` 实现；游戏只通过 `@mg/core` 的 `services.ads.showRewarded(placement)`，不直接接触任何广告 SDK。
38. 激励广告只在死亡/菜单/结算等边界由玩家主动触发；广告期间停表、静音、锁输入，且不得触发 SDK 事件。
39. 奖励只在 `rewardedBreak()` 返回 `true` 时发放；跳过、失败、广告拦截都不发奖励，也不显示自定义“广告被拦截”提示。
40. 不要在游戏内实现广告冷却或每日次数上限（渠道管理频率）；玩法上限（例如每局 1 次复活）可以。
41. 奖励按钮必须有视频图标、不能使用绿色；标准按钮必须同时出现、尺寸不小于奖励按钮、位于其上方或旁边；一次奖励只对应一条广告。

### 工程与协作

42. 本项目约定只写在本仓库；不要改全局 OpenCode 配置、全局 AGENTS.md 或全局 skills。
43. 不为了“以后可能用到”提前抽象；不为单个游戏增加公共层开关。
44. 改动必须同步测试和文档；行为变化更新 `CHANGELOG.md`。
45. 不要擅自升级 Phaser/Vite/TypeScript 大版本；先说明影响并单独提交。
46. 不要提交 `node_modules`、`dist`、`release` 或密钥。
47. 平台发布：更新 `CHANGELOG.md`、提升版本、打 `vX.Y.Z` tag；不修改已发布 tag。
48. 未经用户明确要求，不要自行 commit、tag 或 push。

## 完成定义（DoD）

- `npm run check` 通过。
- `npm run test` 通过。
- `node tooling/create-game-repo.ts` 生成的仓库能独立 `npm ci`、`npm run check`、`npm run test`、`npm run build`。
- 涉及公共 API 时，至少用一个真实游戏仓库验证升级路径。
- 文档、`CHANGELOG.md`、版本号已同步；运行时无新增外部请求。

## 发布流程

1. 修改、测试、更新 `CHANGELOG.md` 与版本号。
2. `git tag vX.Y.Z && git push origin vX.Y.Z`。
3. 在游戏仓库升级 submodule 并重新安装依赖。
4. 游戏发布新版本后，站点仓库更新 `site/games.json`。
