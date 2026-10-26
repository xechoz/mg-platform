# 广告系统

本文件是广告相关的技术事实来源。硬规则见根目录 `AGENTS.md` 第 9、28、35–40 条。

## 1. 目标

- 广告渠道与游戏解耦：Poki、Google H5 Games Ads、AdMob/Pangle（未来 App 壳）都只是 `AdChannel` 实现。
- 游戏只描述“什么时候给什么奖励”，不关心 SDK、静音、事件时序。
- 默认不破坏现有玩法：没有广告渠道时游戏完整可玩，奖励入口隐藏。

## 2. 分层

```
packages/platform
  PlatformAdapter   宿主生命周期：init / loadingFinished / gameplayStart / gameplayStop / happyTime / lang / haptic
  AdChannel         广告渠道：init / rewardedAvailable / rewardedBreak(placement) / interstitialBreak
  AdChannelOptions  渠道选项：sound() 读取玩家静音偏好
  PokiPlatform      Poki 宿主
  PokiAdChannel     Poki 广告
  H5GamesAdChannel  Google H5 Games Ads（自有站）
  DevAdChannel      DEV 模拟器；生产非 Poki 不可用
  WebPlatform       自有站宿主（无 SDK）

packages/core
  AdService         单飞、静音、gameplayStop、插屏、结果映射、调试统计
  RewardedButton    合规奖励按钮
  rewardOfferActions 标准 + 奖励按钮的合规模板

games/<id>/src/ads.ts
  广告落点、资格判断、奖励发放、玩法上限
```

依赖方向不变：`games → @mg/core → @mg/platform`。游戏不得 import 任何广告 SDK，也不得 import `@mg/platform` 的渠道实现。

## 3. 构建矩阵

```bash
# Poki：宿主和广告都用 Poki，强制忽略 VITE_AD_CHANNEL
VITE_PLATFORM=poki npm run build -w @mg/snake

# 自有站：默认无广告渠道，奖励入口隐藏
npm run build -w @mg/snake

# 自有站：Google H5 Games Ads
VITE_PLATFORM=web VITE_AD_CHANNEL=h5games \
VITE_ADSENSE_CLIENT=ca-pub-... \
npm run build -w @mg/snake

# 开发时看 H5 test mode（占位广告，不是真实库存）
VITE_AD_CHANNEL=h5games VITE_ADSENSE_CLIENT=ca-pub-... \
VITE_ADSENSE_TEST=on npm run dev:snake

# 站点构建：同时生成 ads.txt
VITE_AD_CHANNEL=h5games VITE_ADSENSE_CLIENT=ca-pub-... npm run site
```

| 变量                  | 取值                       | 默认  | 说明                                 |
| --------------------- | -------------------------- | ----- | ------------------------------------ |
| `VITE_PLATFORM`       | `web` / `poki`             | `web` | 宿主；Poki 强制 `poki` 渠道          |
| `VITE_AD_CHANNEL`     | `dev` / `poki` / `h5games` | `dev` | 广告渠道；Poki 构建忽略              |
| `VITE_ADSENSE_CLIENT` | `ca-pub-...` / `pub-...`   | 无    | H5 必需；缺失时构建无广告            |
| `VITE_ADSENSE_TEST`   | `on`                       | 关    | test mode；production build 强制忽略 |
- `VITE_PLATFORM=poki` 时 `createServices` 强制 `adChannel=poki`；Poki 禁止其他广告系统。
- `VITE_AD_CHANNEL` 未设置视为 `dev`：开发环境用模拟器，生产环境不可用。
- Poki SDK 脚本只由 `tooling/vite.game.ts` 在 Poki 构建注入；H5 SDK 只在 `h5games` 构建注入；默认构建保持零外部请求。
- H5 的 publisher ID 来自构建环境，不写进代码；没有 ID 时构建成功但无广告，奖励入口隐藏。
- `VITE_ADSENSE_TEST=on` 只允许 dev/staging；`vite build`（production）会警告并忽略。
- `npm run site` 在 `VITE_AD_CHANNEL=h5games` 且 publisher ID 有效时生成 `dist-site/ads.txt`。
- 环境变量建议 inline 传入：`vite.game.ts` 从游戏目录读 `.env*`，`build-site.ts` 从仓库根读；inline 能保证两边一致。

## 4. API

```ts
// 游戏侧唯一入口
const outcome = await services.ads.showRewarded('revive')
// outcome: 'rewarded' | 'skipped' | 'failed'

if (outcome === 'rewarded') applyRevive()

// 自然断点插屏：不返回奖励，也不负责 gameplayStart()
await services.ads.showInterstitial()
```

`showRewarded(placement)` 会把 placement 透传给渠道（H5 用作 `adBreak.name`，Poki 忽略），并通过 `AdChannelOptions.sound()` 读取玩家静音偏好来决定广告是否出声；游戏侧不需要感知这些。

`showInterstitial()` 只用于 Poki 的 `commercialBreak`：在暂停恢复、重开等自然断点调用。它同样会停表、静音、锁输入，但不会发放奖励，也不会调用 `gameplayStart()`；游戏必须在真正回到玩法时自己调用 `gameplayStart()`。没有 `interstitialBreak` 的渠道（web/dev/H5）会直接 no-op。

`AdService` 负责：
- 同时只跑一个广告；重复点击返回 `failed`，不会重复发奖。
- 广告前 `platform.gameplayStop()`、`audio.suspend()`，结束后 `audio.resume()`。
- 渠道异常收敛为 `failed`，不向游戏抛错。
- `active` / `onChange()` 供场景做输入锁。
- `available` 委托渠道；为 `false` 时不要渲染奖励入口。
- `stats()` 返回按 placement 的内存计数，供 debug overlay 使用。
- **不做冷却、不做每日上限**：频率由渠道管理。

`AdService` 不负责：
- 复活、道具、金币、皮肤等奖励逻辑。
- 每局次数上限（属于游戏平衡，写在游戏策略里）。
- `gameplayStart()`；广告结束后由游戏决定是否恢复玩法。
- 持久化统计。

## 5. 渠道实现

### Poki

- 构建时注入 `https://game-cdn.poki.com/scripts/v2/poki-sdk.js`。
- `init()` 调用 `PokiSDK.init()`；失败也继续加载游戏。
- `gameLoadingFinished()` 在 Preload 完成后调用。
- `gameplayStart()` / `gameplayStop()` 去重；广告期间忽略所有宿主事件。
- `rewardedBreak(placement, onStart)` 返回 `true` 才发奖；placement 仅用于渠道报表，Poki 忽略。
- `commercialBreak(onStart)` 已接入：暂停恢复、暂停/结算重开时由 `AdService.showInterstitial()` 调用；广告期间屏蔽宿主事件，奖励广告后的重开传 `commercial:false`，避免连续两条广告。

### Dev 模拟器

- 只在 `import.meta.env.DEV` 下启用；生产构建会被 tree shaking 移除。
- 默认弹出 3 秒倒计时的覆盖层，提供「领取奖励」和「跳过（无奖励）」。
- URL 强制结果，便于 QA：
  - `?ads=reward`：延迟后返回 `true`
  - `?ads=skip`：延迟后返回 `false`
  - `?ads=fail`：立即返回 `false`
- 自有站生产构建 `rewardedAvailable=false`，奖励入口隐藏。

### Google H5 Games Ads

- 构建时由 `tooling/vite.game.ts` 注入 shim + `adsbygoogle.js?client=...`；shim 先入队，SDK 异步加载。
- `data-ad-frequency-hint="30s"` 是给 SDK 的频率提示，不是游戏内冷却；游戏仍然不做广告冷却/每日上限。
- `init()` 调 `adConfig({ preloadAdBreaks:'on', sound, onReady })` 后立即 resolve；`onReady` 才把 `ready` 置 true，不阻塞游戏加载。
- `rewardedAvailable = ready && adBreak 存在`。它只表示 SDK 就绪，不表示有库存。
- `rewardedBreak(placement)` 调 `adBreak({ type:'reward', name:placement, beforeReward, adViewed, adDismissed, adBreakDone })`。
  - `beforeReward` 只在有广告可播时触发；玩家点击奖励按钮即同意，所以直接 `showAdFn()`。
  - `adViewed` 或 `breakStatus==='viewed'` 才发奖；`adDismissed`、`noAdPreloaded`、`timeout`、`frequencyCapped` 等都不发。
  - `adBreakDone` 总会 resolve；同步/异步异常收敛为 `false`。
- 不实现 `interstitialBreak`；当前只有激励广告。
- `ads.txt` 只在 `npm run site` 且 publisher ID 有效时生成；test 占位 ID 不生成。
- 真实广告前提：AdSense 账号、H5 Games Ads 申请通过、站点审核、HTTPS、`ads.txt`、隐私政策、EEA/UK/CH 的 Google 认证 CMP。代码只负责接入，不负责账号/审核。

### 未来渠道（App）

| 渠道                  | 形态            | 接入方式                                               |
| --------------------- | --------------- | ------------------------------------------------------ |
| AdMob                 | Android/iOS App | Capacitor 原生桥；AdMob Mediation 可统一接 Meta/Pangle |
| Meta Audience Network | App             | 通过 AdMob Mediation 或原生桥                          |
| Pangle                | App             | 通过 AdMob Mediation 或原生桥                          |

注意：AdMob / Meta / Pangle 主要是 App SDK，不能直接接在网页构建里。自有站用上面的 H5 Games Ads。

新增渠道步骤：
1. 在 `packages/platform` 实现 `AdChannel`，不要动 `@mg/core`。
2. 在 `createAdChannel` 注册；构建脚本按渠道注入 SDK。
3. 补渠道一致性测试：返回 boolean、不抛错、`rewardedAvailable` 与 `init` 一致。
4. 更新本文件与 `docs/publishing.md`。

## 6. 落点与合规

Poki 审核硬规则（摘要）：
- 奖励按钮必须有明显的视频图标，不能使用绿色。
- 标准按钮必须同时出现，尺寸不小于奖励按钮，位于奖励按钮上方或旁边。
- 一次奖励只对应一条广告，不能要求连看多条。
- 奖励只能在 `rewardedBreak()` 返回 `true` 时发放。
- 广告期间静音、停表、锁输入，不能触发 SDK 事件。
- 不要在游戏内实现广告冷却或每日次数上限。
- 广告拦截时不发奖励，不显示自定义“广告被拦截”提示。
- 不能把核心玩法锁在广告后面；标准路径永远可用。
- 奖励要立即生效，并给动画/音效确认。

H5 / 自有站额外要求：
- 全屏广告只在自然过渡点（死亡、暂停、关卡间）；不得在玩法中或每次交互后弹。
- 激励广告必须 opt-in；奖励不能有现实价值；不得鼓励点击广告。
- 生产前配置 `ads.txt`、隐私政策、EEA/UK/CH 的 Google 认证 CMP；没有 CMP 不要开欧洲流量。
- `data-adbreak-test="on"` 只用于测试，production build 已强制关闭。

推荐落点：

| 落点         | 时机       | 奖励                             | 玩法上限      |
| ------------ | ---------- | -------------------------------- | ------------- |
| 复活         | 死亡结算   | 保留分数、蛇身缩短、回到棋盘中心 | 每局 1 次     |
| 局前道具     | 菜单开始前 | 本局减速/双倍/磁铁               | 每日轮换 1 个 |
| 结算双倍金币 | 结算       | 金币 ×2                          | 无            |
| 皮肤         | 菜单       | 纯视觉解锁                       | 无            |

不推荐：
- 局内弹广告。
- 用广告锁“开始游戏”。
- 连看多条广告换一个奖励。
- 每日宝箱弹窗（web 回访率低，容易被判 pushy）。

## 7. UI 原语

- `RewardedButton`：`soft` + `video` 图标，内置加载态和结果处理。用于菜单等非弹窗场景。
- `rewardOfferActions`：返回标准 + 奖励两个 `ModalAction`；标准在上、更大，奖励在下、带视频图标。配合 `actionsLayout: 'column'`。
- `ModalAction` 支持 `icon`、`height`、`fontSize`、`closeOnClick`、`loadingLabel` 和异步 `onClick`；广告动作必须 `closeOnClick: false`，避免跳过时弹窗消失。
- i18n：`core.ad.watch`、`core.ad.loading`。

## 8. 测试

自动：
- `AdService`：结果映射、单飞、静音、`gameplayStop`、无冷却、不可用渠道、placement 透传。
- `PokiRuntime`：init 去重、事件去重、广告期间事件屏蔽、异常返回 `false`。
- `H5GamesAdChannel`：onReady 前不可用、viewed/dismissed/no-fill、`adBreak` 异常、placement、sound、重复 `adBreakDone`。

人工（Dev 模拟器）：
- `?ads=reward`：发奖且只发一次。
- `?ads=skip`：不发奖，弹窗恢复，按钮可再次点击。
- `?ads=fail`：不发奖，无自定义错误提示。
- 双击奖励按钮：只触发一次广告。
- 广告期间切标签页/暂停：恢复后状态一致。
- 桌面、手机横屏、手机竖屏布局正常。

人工（H5 test mode）：
- `VITE_AD_CHANNEL=h5games VITE_ADSENSE_CLIENT=... VITE_ADSENSE_TEST=on npm run dev:snake`。
- 点击奖励 → 占位广告 → 看完发奖；关闭不发奖；no-fill 不发奖且弹窗保留。
- Network 里只应出现 Google SDK；没有 Poki/Dev 模拟器。

Poki 真实广告验收（需要账号/Inspector）：
- SDK 事件顺序：`gameplayStart` 不连续、`gameplayStop` 不连续、广告期间无事件。
- `gameLoadingFinished` 在 Preload 后触发。
- 广告拦截时不发奖。
- 奖励按钮层级/颜色/图标符合审核要求。

H5 真实广告验收（需要 AdSense/H5 审核）：
- `data-adbreak-test` 关闭；真实广告出现；`adViewed` 发奖、`adDismissed` 不发。
- `ads.txt` 在域名根可访问；CMP 在 EEA/UK/CH 生效。
- 移动端/桌面端布局正常。

## 9. 反模式

- 在游戏里写 `window.PokiSDK` 或直接 import 渠道实现。
- 在 `@mg/core` 里写 `if (gameId === 'snake')` 或游戏专属开关。
- 在 `AdService` 里加冷却、每日次数、复活逻辑。
- 广告期间调用 `gameplayStart()` / `happyTime()`。
- `rewardedBreak()` 返回 `false` 仍然发奖。
- 用 `primary` 或绿色按钮做奖励入口，且没有标准按钮。
- 把 Dev 模拟器打进生产构建。
- 硬编码 `ca-pub-...` 或把 publisher ID 提交进仓库。
- 在 production build 打开 `VITE_ADSENSE_TEST=on`。
- 没有 CMP/隐私政策就开欧洲流量。
- 把 `rewardedAvailable` 当成“有库存”；H5 的 no-fill 是正常路径。

## 10. 当前状态

- 已实现：Host/AdChannel 拆分、`AdService`、Dev 模拟器、Poki 适配器、H5 Games Ads 渠道、合规 UI 原语、Poki/H5 构建注入、`ads.txt` 生成。
- 未验证：Poki 真实广告（没有开发者账号/Inspector）；H5 真实广告（没有 AdSense/H5 审核）。
- 未实现：AdMob/Pangle/Meta、mediation、同意管理 UI。
- 游戏落点：复活与局前道具在 Phase 1/2 接入，见 §11。

## 11. 后续 Phase

| Phase | 内容                                                         | 状态           |
| ----- | ------------------------------------------------------------ | -------------- |
| 0     | 广告基础设施：AdService、Poki/H5/Dev 渠道、合规 UI、构建注入 | 完成           |
| 1     | 死亡结算复活                                                 | 未开始         |
| 2     | 局前道具：超级水果（已实现）；减速 / 双倍 / 磁铁（后续）     | 进行中         |
| 3     | 金币 / 皮肤 / 商店                                           | 未开始，非 MVP |

MVP = Phase 0 + 1 + 2。Phase 3 在 MVP 之后。

### Phase 1：复活

目标：死亡结算给玩家一次看广告复活的机会，标准重开路径始终可用。

落点：
- 新增 `games/snake/src/ads.ts`：placement `revive`、资格判断、每局 1 次上限、奖励应用。
- `HudScene` 死亡弹窗：标准「重新开始」在上、奖励「看广告复活」在下，使用 `rewardOfferActions` + `actionsLayout: 'column'`。
- 只有 `services.ads.available` 且本局未用过复活时才渲染奖励按钮。

规则：
- 复活保留分数；蛇身缩到最多 8 节；水平居中；头朝右。
- 1.8 秒倒计时后恢复；倒计时期间停表、锁输入。
- 每局最多 1 次；复活后的分数计入最高分。
- 广告跳过/失败/no-fill 不发奖，弹窗保留，标准按钮可用。
- 广告期间 `AdService.active` 为 true，场景停表、静音、锁输入；结束后 `gameplayStart()`。

验收：
- `?ads=reward`：复活成功，分数保留，蛇身 ≤8，倒计时正常，最高分更新。
- `?ads=skip` / `?ads=fail`：不复活，弹窗恢复，可重开。
- 同一局第二次死亡不再出现复活按钮。
- 桌面、手机横屏、竖屏布局正常。
- 规则测试覆盖：资格、次数上限、复活后状态、最高分。

### Phase 2：局前道具

目标：用一条广告换下一局的超级水果，不做库存/商店。

已实现：超级水果。
- placement `superfruit`；结算弹窗标准「再来一局」在上、奖励「看广告 · 下局超级水果」在下，使用游戏本地 `superOfferActions`（保持与 `rewardOfferActions` 相同的合规按钮结构）。
- 只有 `services.ads.available` 且没有待领取奖励时才显示奖励按钮；跳过/失败/no-fill 不发奖，标准重开始终可用。
- 广告流程结束后（完整观看、跳过、失败）一律直接开始下一局；只有完整观看才写入存档 v2 的 `pendingSuper`，由下一局开局消费。广告期间玩家主动关闭弹窗回菜单时不强制重开，奖励（如有）保留到之后开局。
- 开局把超级水果放在随机空格；吃掉后清掉普通道具，铺满所有空格水果，进入 20 秒水果盛宴；超级水果本身 +1 节、不加分。
- 盛宴水果按普通分值计分（辣椒 ×2），每 8 颗让蛇 +1 节、新增水果色带，其余只计分；普通水果/道具生成暂停。盛宴分数不计入永久速度曲线，结束后回到进入盛宴前的速度档位。
- 时间到清掉剩余水果并恢复正常生成；提前吃完则立即结束。暂停/失焦停表。
- 分数卡底部显示盛宴倒计时条。
- 存档 v1 → v2 迁移保留 `best` / `plays`，`pendingSuper` 初始为 `false`。

验收：
- `?ads=reward`：结算弹窗出现奖励按钮；点击后自动开始下一局，开局有金色超级水果；吃掉后铺满水果；20 秒后恢复；刷新后奖励仍在。
- `?ads=skip` / `?ads=fail`：不发奖，自动开始下一局；标准「再来一局」仍可单独使用。
- 盛宴期间每 8 颗水果长度 +1、色带随成长变化；辣椒倍率生效；死亡/暂停边界正常；吃满棋盘判胜。
- 移动端横竖屏可玩，铺满水果时无明显掉帧。
- 规则测试覆盖放置、铺满、计时、清场、迁移。

后续扩展：减速 / 双倍分数 / 磁铁；每日轮换与菜单入口暂未实现。

### Phase 3：金币 / 皮肤 / 商店

目标：MVP 后的长期留存，不是当前发布阻塞项。

范围：
- 单一货币；金币来自游玩/结算，不卖数值。
- 皮肤纯视觉解锁；不做 IAP；不做双货币或强制 grind。
- 存档升级版本并提供迁移；商店 UI 复用 `Modal` / `Button` / `createPanel`。
- 广告可以加速金币获取，但不能把核心玩法锁在广告后。

约束：
- 遵守 Poki 的单货币/反 grind 规则。
- 不引入新的共享包；商店逻辑留在 snake，等第二个游戏真正需要再上提。
- 先出存档迁移方案，再改字段。

### 真实广告验证

代码完成不等于可上线。上线前需要：

Poki：
- 开发者账号 + Inspector。
- 验证 SDK 事件顺序、广告期间无事件、`gameLoadingFinished`、广告拦截不发奖。
- 奖励按钮层级/颜色/图标符合审核要求。

H5：
- AdSense 账号 + H5 Games Ads 申请通过 + 站点审核。
- `VITE_ADSENSE_CLIENT=ca-pub-...`。
- 域名根目录 `ads.txt`。
- 隐私政策 + EEA/UK/CH 的 Google 认证 CMP。
- 关闭 test mode，用真实设备验证 viewed / dismissed / no-fill。

在上述验证完成前，Phase 1/2 可以用 Dev 模拟器开发和验收，不阻塞功能实现。
