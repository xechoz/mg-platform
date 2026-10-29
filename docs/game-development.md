# 小游戏开发规范

> **定位**：新游戏从立项到上线的通用规范与流程。
> **适用**：自有站、Poki、CrazyGames 的 Phaser Web 小游戏。
> **不适用**：`mg-platform` 自身开发、`mini-games` 站点开发、Android/Flutter 原生项目。
> **事实源**：硬规则以 `AGENTS.md` 为准；广告渠道细节以 `docs/ads.md` 为准。本文负责流程、架构决策和验收方法，不复制硬规则条文。

## 0. 自动加载

规范由平台仓库根目录的 `opencode.json` 统一提供。游戏仓库不复制配置，而是在根目录放一个软链接：

```text
<game>/opencode.json -> platform/opencode.json
```

`mg-platform/opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "docs/game-development.md",
    "platform/AGENTS.md",
    "platform/docs/game-development.md"
  ]
}
```

- 平台仓库：加载 `docs/game-development.md`；`platform/...` 不存在，自动跳过。
- 游戏仓库：加载 `platform/AGENTS.md` 和 `platform/docs/game-development.md`；`docs/game-development.md` 不存在，自动跳过。
- `platform/` 是固定 tag 的 submodule，每个游戏指向自己锁定的那份配置；升级 submodule 即升级规范。
- 生成器会在平台 tag 包含 `opencode.json` 时自动创建软链接；已有游戏升级到该 tag 后执行一次 `ln -s platform/opencode.json opencode.json`。

## 1. 仓库拓扑与职责

| 仓库                 | 职责                                                                 | 依赖方向                 |
| -------------------- | -------------------------------------------------------------------- | ------------------------ |
| `xechoz/mg-platform` | `@mg/core`、`@mg/platform`、Vite 预设、打包/边界检查、游戏模板、文档 | 不包含游戏代码           |
| `xechoz/<game>`      | 一个仓库只放一个游戏                                                 | `game → platform` 子模块 |
| `xechoz/mini-games`  | 站点聚合器，下载 release 资产并部署 GitHub Pages                     | 只消费 `<id>-web.zip`    |

约束：
- 游戏之间不互相 import。
- `packages` 不 import 游戏。
- 站点不 checkout 游戏源码，不在 CI 里构建游戏。
- 平台不包含可玩的游戏或站点构建。

## 2. 技术栈基线

| 层          | 选型              | 说明                                     |
| ----------- | ----------------- | ---------------------------------------- |
| 语言        | TypeScript strict | 默认非空；可空只出现在 I/O 边界          |
| 引擎        | Phaser 4.x        | 当前模板 `^4.2.1`                        |
| 构建        | Vite 8.x          | 共享预设 `platform/tooling/vite.game.ts` |
| 测试        | Vitest 5.x        | 规则层必须有边界测试                     |
| Lint/Format | Biome 2.x         | `npm run check` 包含 `biome check src`   |
| 包管理      | npm workspaces    | `workspaces: ["platform/packages/*"]`    |
| 平台分发    | git submodule     | 固定 `mg-platform` tag，不改 `platform/` |
| 运行时      | 浏览器            | 零外部请求                               |
| 设计空间    | 短边 720          | `Scale.FIT + CENTER_BOTH`                |
| 首包预算    | ≤ 1.5 MB gzip     | Phaser 本身约 370 KB gzip                |

规则：
- 新增运行时依赖前先确认必要性、体积、许可证。
- 不擅自升级 Phaser/Vite/TypeScript 大版本；升级单独提交并评估全部游戏。
- 平台升级走 submodule tag，不在游戏仓库里改 `platform/`。

## 3. 架构分层与状态流

```text
src/
├─ logic/       纯规则：state、config、levels、ai、progress
├─ scenes/      Phaser 场景：Menu、Game、Hud
├─ ui/          游戏专属绘制、布局、输入辅助
├─ main.ts      createGame() 组合根
├─ i18n.ts      文案与语言
├─ save.ts      版本化存档与迁移
└─ ads.ts       广告落点与奖励策略
```

状态流：

```text
pointer / keyboard
  → InputController
  → dispatch(action)
  → logic.reduce(state, action) → { state, events }
  → scene.render(state) + effects(events)
```

硬边界：
- `src/logic` 不 import Phaser、DOM、audio、ads，也不直接使用 `localStorage`。
- 随机性只走 `@mg/core/rng`，不用 `Math.random()` 做规则。
- 渲染层只读状态，不回写规则。
- 难度、速度、AI 决策时间集中在 `logic/config.ts` 或 `logic/levels.ts`。
- 平台能力统一从 `@mg/core` 的 `services` 进入。

### 3.1 什么放公共层，什么留游戏

| 能力                                                    | 位置                         |
| ------------------------------------------------------- | ---------------------------- |
| 加载、缩放、场景生命周期、输入原语                      | `@mg/core`                   |
| 音频解锁/静音、存档机制、宿主 SDK、种子 RNG、i18n、调试 | `@mg/core` / `@mg/platform`  |
| 通用 UI 组件（Button、Modal、RewardedButton）           | `@mg/core`                   |
| 规则、棋盘、关卡、计分、AI、提示、洗牌、速度曲线        | 游戏 `src/logic`             |
| 游戏专属美术、文案、布局、输入手感                      | 游戏 `src/scenes` / `src/ui` |

新建共享包的条件（全部满足）：
1. 至少两个已发布游戏实际使用。
2. 两边用法一致，不需要游戏专属开关。
3. 两边都有测试。
4. 提取后的 API 比两份实现更小、更清楚。

不满足就复制。**宁可重复，也不要为了复用改公共层。**

### 3.2 组合根

```ts
createGame({
  id: '<id>',
  design: { base: 720 },
  theme: gameColors.theme,
  defaultLang: 'en',
  i18n: gameI18n,
  menuScene: 'Menu',
  scenes: [MenuScene, GameScene, HudScene],
})
```

## 4. 品类模型

规则驱动方式按品类选择，但都不要让帧率决定规则速度。

| 品类      | 规则驱动                  | 关键要求                           | 参考                    |
| --------- | ------------------------- | ---------------------------------- | ----------------------- |
| 实时街机  | 固定步进 + 两 tick 间插值 | 输入缓冲、失焦停表、速度曲线配置化 | `snake`                 |
| 回合制    | 事件驱动状态机 + 动画锁   | AI 思考时间配置化；动画不阻塞规则  | `ludo`                  |
| 解谜      | 纯函数 + 关卡数据         | 关卡可解性审计测试                 | `snake` 的 `levelAudit` |
| 无尽/跑酷 | 固定步进 + 难度曲线       | 分数持久化、复活边界、速度分段     | `snake-endless`         |
- 实时玩法必须固定步进；回合制可以由事件驱动规则，但动画和计时仍不得依赖帧率。
- 动画锁只影响输入和表现，不改变规则状态。
- 需要回放/调试的品类，随机必须可复现。

## 5. 立项：先写一页纸

使用 [`game-design-template.md`](game-design-template.md)。在写生产代码前明确：
1. `id`、中英文名、一句话卖点。
2. 核心循环：玩家每 30 秒重复做什么。
3. 操作方式与横竖屏。
4. 单局时长、失败条件、重试成本。
5. 计分、进度、解锁、最高分。
6. 难度曲线与可调参数。
7. 广告落点与玩法上限（如果接广告）。
8. 存档字段与 `version: 1` 初始结构。
9. 美术/音频来源与许可证。
10. 5–10 条可测试的验收标准。

原则：
- 一页纸未确认不写生产代码。
- 先用 Phaser Graphics 做可玩原型，再替换正式素材。
- 验收标准写成可执行的句子，后续直接变成 QA 矩阵。

## 6. 创建游戏：标准流程

### 6.1 阶段与退出条件

| 阶段      | 产出                         | 退出条件                         |
| --------- | ---------------------------- | -------------------------------- |
| P0 立项   | 一页纸、品类模型、验收标准   | 范围和验收确认                   |
| P1 脚手架 | 独立仓库、平台 submodule、CI | `npm run check/test` 通过        |
| P2 规则   | `src/logic` + Vitest         | 边界用例覆盖输赢、非法输入、计分 |
| P3 可玩   | Menu/Game/Hud、输入、主循环  | 能完整玩一局并重开               |
| P4 内容   | 关卡、美术、音频、i18n、存档 | 中英文完整、存档可迁移           |
| P5 平台   | 全屏、PWA、广告、打包        | 四种 flavor 可构建               |
| P6 验收   | 自动检查 + 人工矩阵          | 全部通过                         |
| P7 发布   | tag、4 个 release 资产       | CI 产物齐全                      |
| P8 上线   | 站点版本更新、smoke          | Pages 可玩                       |

### 6.2 生成仓库

```bash
cd mg-platform
npm run new:game -- <id> \
  --dir ../<id> \
  --title "<Title>" \
  --port 5174 \
  --platform-ref vX.Y.Z
```

生成器会复制 `templates/game-repo`，替换 `__NAME__`、`__TITLE__`、`__PORT__`、`__PLATFORM_REF__`，初始化 git，并添加 `platform/` submodule。

```bash
cd ../<id>
npm install
npm run check
npm run test
git add .
git commit -m "feat: scaffold <id>"
gh repo create xechoz/<id> --public --source=. --remote=origin --push
```

### 6.3 元数据

- `game.manifest.json`：稳定 `id`、`order`、中英文 `title`/`description`、`themeColor`、`tags`。
- `index.html`：标题、theme color、PWA manifest、可选 splash。
- `public/manifest.webmanifest`：名称、短名、图标。
- `package.json`：`name: "@mg/<id>"`，脚本保持模板一致。
- `README.md`、`AGENTS.md`、`CHANGELOG.md`。

### 6.4 先写规则

- 不可变状态；输入 → 新状态 + 事件。
- 种子 RNG；关键随机可复现。
- 测试覆盖：胜利、失败、非法操作、计分、边界、存档迁移。
- 规则层不出现 Phaser/DOM/audio/ads。

### 6.5 再写场景与 UI

- `src/main.ts` 调 `createGame({ id, design: { base: 720 }, defaultLang: 'en', ... })`。
- Menu：本地化标题、开始、设置/语言入口。
- Game：固定步进 + 插值、输入队列、失焦暂停、恢复倒计时。
- HUD/Result：重开、回菜单、最高分持久化。
- 进入玩法 `platform.gameplayStart()`；菜单/暂停/结算 `gameplayStop()`；胜利或新纪录 `happyTime()`。

### 6.6 i18n 与存档

- `game.title` 必填；所有用户可见文案中英文都有。
- 所有游戏统一 `defaultLang: 'en'`；中文通过语言选择器或 `?lang=zh` 进入。
- 语言优先级：`?lang=` > 已存选择 > 宿主检测（仅平台适配器）> `defaultLang`；不做 navigator 嗅探。
- `services.createSave({ name, version, initial, migrate })`；键自动为 `mg:<gameId>:<name>`。
- 改字段必须提升版本并提供迁移；不能破坏旧存档。

### 6.7 广告（可选）

- 只通过 `services.ads.showRewarded(placement)` 和 `showInterstitial()`。
- 落点：死亡/结算/菜单等自然边界，玩家主动触发。
- 奖励只在返回 `'rewarded'` 时发放；跳过/失败/no-fill 不发奖、不显示自定义拦截提示。
- 玩法上限写在游戏里（例如每局 1 次复活）；不做广告冷却/每日次数上限。
- 核心玩法不能锁在广告后；标准按钮始终可用。

### 6.8 验证

```bash
npm run check
npm run test
npm run build
npm run package:web
```

按需再跑：

```bash
npm run package:poki
npm run package:crazy:basic
npm run package:crazy:full
```

### 6.9 发布

1. 更新 `CHANGELOG.md` 与 `package.json` 版本。
2. 提交并打 `vX.Y.Z` tag。
3. CI 跑检查、构建四种 flavor，创建 GitHub Release。

Release 资产：
- `<id>-web.zip`
- `<id>-poki.zip`
- `<id>-crazygames-basic.zip`
- `<id>-crazygames-full.zip`

### 6.10 站点上线

1. 等 release 资产齐全。
2. 在 `mini-games/site/games.json` 更新：

```json
{ "id": "<id>", "repo": "xechoz/<id>", "version": "vX.Y.Z" }
```

3. 本地验证：

```bash
cd ../mini-games
SITE_LOCAL=1 npm run site:local
npm run check && npm run test
```

4. 推送 `main`，GitHub Pages 自动部署。

### 6.11 回滚

- 站点：重新部署上一个 `mini-games` commit。
- 游戏：发布新 tag，不重写旧 tag。
- 平台：新 tag 回退，再逐个游戏升级 submodule。

## 7. 玩法与交互规范

- 固定步进 + 插值；规则速度不随帧率变化。
- 输入队列/缓冲；拒绝非法反向；输入不能被吞掉或延迟到死亡后。
- 失焦、切标签页、暂停必须停表；恢复给 3-2-1 倒计时。
- 随机性可复现：种子 RNG；调试可指定 seed。
- 难度、速度、AI 时间写进配置，不散落在渲染代码。
- 结算必须能重开、回菜单；最高分/进度持久化。
- 首次进入可玩不超过 1 次点击；不做登录门槛。
- 横竖屏都可玩；不注入旋转提示；不锁定方向。
- 手机在菜单点开始后请求全屏；iframe 内不自动请求；iPhone 走 A2HS/PWA。
- 每个输入都有视觉或音频反馈；避免无反馈的死状态。
- 不制造不可避免的死亡；危险提前预警；打断期间停表。
- 建议：颜色不是唯一信号；保证对比度；触控目标足够大。

## 8. 视觉、音频与资源

- 设计空间短边 720，长边随视口；`Scale.FIT + CENTER_BOTH`。
- 占位阶段优先 Phaser Graphics 程序化绘制。
- 正式素材优先 CC0；每个外部素材记录许可证（如 `*.LICENSE.txt`）。
- 图标优先 Lucide 等开源图标，只引入实际用到的，确认许可证。
- 中文使用系统字体栈，不打包 CJK 字体；西文可用 OFL 字体。
- 运行时零外部请求：无 CDN、外部字体、统计脚本、远程图片/音频。
- 音频首次手势解锁；静音偏好持久化；宿主静音优先；广告期间静音。
- 控制首包体积：纹理合图、压缩、避免每帧分配；用 debug overlay 查渲染指标。

## 9. 存档与 i18n

- 存档必须带 `version`；改字段提升版本并提供 `migrate`。
- 键：`mg:<gameId>:<name>`；全局设置：`mg:settings:v1`。
- 只存必要数据；加载时在边界一次性收敛，不在规则层写防御性 null 检查。
- 每个游戏必须提供 `game.title`（Boot 加载页依赖）。
- 所有用户可见文案中英文都要有；支持 11 种语言时按需补齐。
- 文案布局要测最长语言；不要用固定像素宽度硬塞。
- 默认语言统一 `en`；`defaultLang` 必须在 `main.ts` 明确写出并在 README/AGENTS 记录。

## 10. 广告：不变量与渠道合规

广告规范分两层，避免把未上架的渠道细节写死。

### 10.1 渠道无关的不变量（开发阶段必须满足）

- 只通过 `services.ads`，禁止直接碰任何广告 SDK。
- 标准路径永远可用，核心玩法不锁广告。
- 奖励只在 `showRewarded()` 返回 `'rewarded'` 时发放。
- 广告期间停表、静音、锁输入。
- 渠道不可用时隐藏奖励入口；广告拦截用户仍可完整游玩。
- 游戏内不做广告冷却/每日上限，只做玩法上限（例如每局 1 次复活）。
- 插屏只在死亡、结算、重开等自然断点。
- 奖励按钮必须有视频图标、不能使用绿色；标准按钮同时出现、尺寸不小于奖励按钮、位于其上方或旁边。
- 一次奖励只对应一条广告。

### 10.2 渠道合规（上架前执行）

具体 SDK 时序、按钮视觉细则、midgame 落点、Inspector/portal 验收，按 [`docs/ads.md`](ads.md) 和渠道后台逐项跑。本文不复制这些细节，原因：
- 渠道规则会变，复制会产生第二事实源。
- 未上架前没有账号/Inspector/portal 实测，写进去的是二手信息。
- 广告架构不变量已经足够约束实现，细节留到上架前验收。

| 阶段     | 要求                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 开发完成 | 10.1 全部满足 + Dev 模拟器（`?ads=reward`、`?ads=skip`、`?ads=fail`）通过 |
| 上架完成 | 10.1 + `docs/ads.md` 的渠道验收清单 + 真实广告验证                        |

## 11. 成熟度与质量门禁

### 11.1 成熟度分级

| 级别        | 含义         | 要求                              |
| ----------- | ------------ | --------------------------------- |
| M0 原型     | 验证核心循环 | 一页纸 + Graphics 占位            |
| M1 可玩     | 能完整玩一局 | 规则 + 场景 + 输入 + 重开         |
| M2 内容完成 | 可展示       | 关卡/内容、美术、音频、i18n、存档 |
| M3 可发布   | 可提交渠道   | 自动检查 + 人工矩阵 + 广告不变量  |
| M4 已上架   | 真实渠道通过 | 渠道验收 + 线上 smoke             |

未上架的游戏目标到 M3；M4 的渠道规则不进入开发 DoD。

### 11.2 自动检查

```bash
npm run check      # tsc + biome + 边界检查
npm run test       # 规则与迁移测试
npm run build
npm run package:web
```

### 11.3 人工矩阵

- 桌面 16:9、手机竖屏、手机横屏。
- 旋转、失焦、切标签页、暂停/恢复倒计时。
- 重开、回菜单、最高分/进度持久化。
- 首次加载无控制台错误、无外部网络请求。
- 广告流程（如启用）：奖励/跳过/失败/拦截。
- 音频：静音、恢复、宿主静音、广告静音。
- 中英文完整；最长文案不溢出。
- 旧版本存档可迁移。
- 低端设备无明显掉帧。

### 11.4 完成定义（DoD）

- 上述自动与人工检查全部通过。
- `AGENTS.md`、`README.md`、`CHANGELOG.md` 与代码一致（存档版本、脚本、平台 tag 不能写旧）。
- 无 `node_modules/`、`dist/`、`release/`、密钥提交。
- 运行时无新增外部请求。
- 首包 ≤ 1.5 MB gzip。

## 12. 反模式

- `src/logic` import Phaser 或 `@mg/*`（`@mg/core/rng` 除外）。
- 用 `Math.random()` 做规则随机。
- 用帧率驱动移动或计时。
- 直接访问 `localStorage`、`PokiSDK`、CrazyGames 全局。
- 在游戏仓库里修改 `platform/`。
- 为单个游戏给公共层加开关。
- 只有一个游戏使用时新建共享包。
- 把难度/速度/AI 参数写死在场景里。
- 存档不带 `version` 或改字段不迁移。
- 硬编码中英文文案、缺 `game.title`。
- 运行时引 CDN、外部字体、远程图片。
- 把核心玩法锁在广告后。
- 奖励按钮用绿色、无视频图标、没有标准路径。
- 提交 `dist/`、`release/`、密钥。
- 文档停留在旧版本，和代码不一致。

## 附录 A：一页纸模板

见 [`game-design-template.md`](game-design-template.md)。

## 附录 B：提交前自检

- [ ] 一页纸已确认
- [ ] `src/logic` 无 Phaser/DOM/audio/ads，随机走 `@mg/core/rng`
- [ ] 规则边界测试覆盖输赢、非法输入、计分
- [ ] 固定步进/事件驱动模型明确，输入有缓冲
- [ ] 失焦暂停 + 3-2-1 恢复
- [ ] 重开/回菜单/最高分持久化
- [ ] 中英文文案完整，`game.title` 存在
- [ ] 存档 version + migrate
- [ ] 广告只走 `services.ads`，标准路径可用
- [ ] `npm run check/test/build/package:web` 通过
- [ ] 桌面/竖屏/横屏/旋转/失焦验收通过
- [ ] 无外部请求，首包 ≤ 1.5 MB gzip
- [ ] `CHANGELOG.md`、版本号、`AGENTS.md` 已同步

完整的建仓流程见 [`new-game-checklist.md`](new-game-checklist.md)。

## 附录 C：命令速查

| 目的             | 命令                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| 安装             | `npm ci`                                                                         |
| 开发             | `npm run dev`                                                                    |
| 检查             | `npm run check`                                                                  |
| 测试             | `npm run test`                                                                   |
| 构建             | `npm run build`                                                                  |
| Web 包           | `npm run package:web`                                                            |
| Poki 包          | `npm run package:poki`                                                           |
| CrazyGames Basic | `npm run package:crazy:basic`                                                    |
| CrazyGames Full  | `npm run package:crazy:full`                                                     |
| 平台升级         | `cd platform && git fetch --tags && git checkout vX.Y.Z && cd .. && npm install` |
| 站点本地预览     | `cd ../mini-games && SITE_LOCAL=1 npm run site:local`                            |
