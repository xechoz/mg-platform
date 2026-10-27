# CrazyGames 上架下一步

当前状态：生命周期、广告渠道、`muteAudio`、一次点击入口、语言同步和 Basic/Full 构建均已实现；开发者账号已具备。代码与本地构建已准备，**门户 preview/QA 和真实广告行为尚未验证**，最终提审由用户在 CrazyGames 门户完成。

建议顺序：先用 Basic 构建上线，确认平台事件、入口和移动端表现；通过后再切 Full，补广告与 `muteAudio` 验收。

## 1. 建条目与元数据

- 在 CrazyGames 开发者门户创建 Fruit Snake 游戏条目，记录后台要求的标题、短描述、长描述、分类、操作说明、支持方向、语言和年龄分级。
- 标题：英文 `Fruit Snake: Color Trail`，中文 `贪吃蛇：水果火车`。游戏内字标使用短名 `Fruit Snake` / `水果火车`（`game.wordmark`），避免长标题被 `logoMaxWidth` 压小。
- 英文文案必须完整；当前支持 11 种语言：`en/fr/it/de/es/tr/zh/ja/ko/pt/ru`。
- 默认英文；SDK locale 可用时按 URL `?lang=` > 玩家显式选择 > SDK locale > 英文的顺序解析。
- 分类按门户实际选项选择；操作说明写清方向键/WASD、滑动、暂停。
- 不添加自定义全屏按钮；iframe 内全屏由 CrazyGames 播放器控制。

## 2. 本地检查

```bash
npm run check
npm run test
npm run build:snake
npm run site
```

浏览器 smoke 至少覆盖：
- 桌面 1920×1080；
- 手机横屏 844×390；
- 手机竖屏 390×844；
- 平板竖屏 768×1024；
- 首屏 → 菜单 → 游戏 → 暂停 → 重开 → 结算 → 回菜单；
- 失焦/切页自动暂停，恢复 3-2-1 倒计时；
- 中英文切换、音效开关、刷新后最高分/待领取奖励仍在；
- console 无报错，Network 除平台 SDK 外无外部请求。

## 3. Basic 构建与门户 QA

```bash
npm run package:snake:crazy:basic
```

zip 输出到仓库根目录的 `release/snake-crazygames-basic.zip`。上传后将 `games/snake/dist` 或其 zip 用于门户 preview，检查：
- `loadingStart → loadingStop → gameplayStart` 顺序正确，无连续重复事件。
- 暂停恢复只出现 `gameplayStop → gameplayStart`，不出现 midgame。
- 死亡结算/重开出现 `gameplayStop → midgame → gameplayStart`（Basic 无广告渠道时应直接继续）。
- 首次进入到可玩只需菜单「开始」1 次点击。
- 门户列出的 iframe 尺寸都可玩：907×510、1216×684、1077×606、821×462、1366×768、1920×1080、1536×864、1280×720、手机 800×450、平板 1080×607。
- DPR1 下文字、按钮、棋盘可读；移动端触摸和横竖屏正常。
- 转屏自动暂停并倒计时恢复；刷新率变化不影响速度。
- zip 根有 `index.html`，资源相对路径，唯一外部请求是 CrazyGames SDK。
- `grep -RIn "模拟激励广告\|__mgGame" games/snake/dist` 无输出。

Basic 通过后先上线，不要等 Full 素材和广告全部完成。

## 4. Full 构建与广告验收

```bash
npm run package:snake:crazy:full
```

zip 输出到仓库根目录的 `release/snake-crazygames-full.zip`。

门户 QA 重点：
- 结算页奖励按钮有视频图标、不是绿色；标准「再来一局」同时出现、尺寸不小于奖励按钮，位于其上方或旁边。
- 完整看完 `rewarded` 才发超级水果；跳过、`unfilled`、`adblock`、`adsDisabled`、`adCooldown` 都不发奖。
- `adError` 后不显示自定义“广告被拦截”提示；广告拦截用户仍能正常游玩，奖励入口隐藏且不留下可点击但无效果的按钮。
- 广告请求期间 UI 锁定、游戏停表、音频静音；广告结束/失败后恢复。
- 不能连续链广告；奖励广告后的下一局不重复弹 midgame。
- midgame 只在死亡/结算重开等自然断点，不在菜单、设置、暂停恢复上弹。
- `muteAudio`：门户设置静音或 `?muteAudio=true` 时，游戏内音效开关不能重新打开声音；关闭宿主静音后恢复玩家偏好。
- 广告期间切标签页/暂停，回来后状态一致。

## 5. 发布素材

素材已生成在 `games/snake/store/crazygames/`（默认不提交 git）：
- `cover-landscape.png`、`cover-portrait.png`、`cover-square.png`
- `preview-landscape.mp4`、`preview-portrait.mp4`

需要：

| 素材     | 尺寸/比例         | 要求                                 |
| -------- | ----------------- | ------------------------------------ |
| 横版封面 | 1920×1080（16:9） | 三张风格一致；无边框；只写游戏标题   |
| 竖版封面 | 800×1200（2:3）   | 用移动端仿真采集，不硬裁桌面图       |
| 方形封面 | 800×800（1:1）    | 与横/竖版同一套配色和构图语言        |
| 横版预览 | 1080p 16:9        | 15–20 秒、无声、≤50MB、首帧=横版封面 |
| 竖版预览 | 1080p 2:3         | 15–20 秒、无声、≤50MB、首帧=竖版封面 |

封面禁止：边框、New/Updated/Play/Play now 等文字、图标、商店 logo、版权素材、模糊/像素化；不要只截一张游戏画面。

视频禁止：黑屏、logo 转场、上下黑边、默认鼠标指针、Play Now/推广文字、App/社交图标、快进。视频第一帧必须是同比例静态封面。

竖版/方形必须用移动端仿真（touch + coarse pointer + 合适 DPR）采集，不能用桌面截图硬裁。

## 6. 提审

- 先 Basic，后 Full；两包分别上传，确认 zip 根有 `index.html`。
- 提交内容审核，按门户要求填写标题、描述、操作说明、分类、方向、语言、年龄分级。
- 上传 3 张封面和 2 个预览视频，检查三张封面风格一致、视频首帧与封面一致。
- 未在门户 preview/QA 验证前不要提审。
- 提审由用户在 CrazyGames 门户完成；仓库只交付代码、zip、素材和清单。

## 7. 发布后

- 监控加载时间、SDK 事件、广告填充和崩溃。
- 母语校对翻译，重点德语、俄语、土耳其语长文案。
- 需要普通 Web 构建时重跑 `npm run build -w @mg/snake`；站点用 `npm run site`。
- 拿到真实广告数据后更新 `docs/publishing.md` / `docs/ads.md` 的“未验证”说明，并记录门户配置。
