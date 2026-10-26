# 发布

## 自有站

```bash
npm run site
```

产物在 `dist-site/`：

```
dist-site/
├─ index.html          # 自动生成的游戏列表
├─ games.json
└─ games/
   └─ snake/
      ├─ index.html
      └─ assets/...
```

每个游戏使用相对路径（`base: './'`），可以直接放在任意子目录。

`dist-site` 是纯静态产物，`base: './'` 让它在根路径和任意子路径下都能直接跑。

### GitHub Pages（默认）

- 仓库必须是 **public**：GitHub Free 不支持从私有仓库发布 Pages
- Settings → Pages → Source 选 **GitHub Actions**（首次必须先手动设置，否则 `deploy-pages` 会报 “Get Pages site failed”）
- 站点地址：`https://xechoz.github.io/mini-games/`
- 发布由 `.github/workflows/ci.yml` 的 `deploy` job 完成：main 分支 push 后，在 `check`（typecheck + Biome + 边界 + 测试）通过的基础上构建并部署
- 产物不提交到分支；`dist-site/` 已在 `.gitignore` 中，部署走 artifact，回滚即重跑旧 commit 的 workflow
- GitHub Pages 对所有文件固定 `Cache-Control: max-age=600` 且无法自定义：哈希资源不受影响，但发版后回访用户最多 10 分钟内仍可能看到旧页面
- 站点上限 1GB、带宽 100GB/月（软限制）

新增游戏不需要改 workflow，`npm run site` 会自动扫描 `games/*/game.manifest.json`。

### Cloudflare Pages（备用）

- 构建命令：`npm run site`
- 输出目录：`dist-site`
- Node 版本：24 或更高
- 支持私有仓库；单文件上限 25 MiB，桌面安装包/APK 放不进去，需要 R2 或 Releases

## Poki

Poki 要求每个游戏是独立包：
- `index.html` 在 zip 根目录；
- 所有资源相对路径；
- 运行时不请求任何外部资源（字体、CDN、统计、登录）；
- 桌面与移动端都能玩；
- 有加载进度、暂停、静音、存档；
- 广告只在局间/重开触发，不在操作中打断。

全屏由 Poki 播放器控制：游戏在 iframe 内不会自动请求全屏，避免与 iframe 权限策略冲突。

### 构建

```bash
VITE_PLATFORM=poki npm run build -w @mg/snake
cd games/snake/dist && zip -r ../../snake-poki.zip .
```

### 已实现

`packages/platform` 已拆分宿主与广告渠道：
- `PokiPlatform`：`init`、`gameLoadingFinished`（幂等）、`gameplayStart/Stop`（去重）、`happyTime`、`haptic`。
- `PokiAdChannel`：`rewardedBreak`、`commercialBreak`；广告期间屏蔽宿主事件。
- `tooling/vite.game.ts` 只在 `VITE_PLATFORM=poki` 构建注入 SDK 脚本。
- `@mg/core` 的 `AdService` 负责静音、停表、单飞、插屏和结果映射。

上架准备已补：
- 11 种语言（`en/fr/it/de/es/tr/zh/ja/ko/pt/ru`），默认 `en`；Poki 构建优先使用 `PokiSDK.getLanguage()`，玩家手动选择覆盖检测结果。
- 菜单语言弹窗使用原生语言名，不依赖国旗；`Settings` 升 v2，区分自动检测与玩家显式选择。
- `commercialBreak` 已接入暂停恢复、暂停/结算重开；奖励广告后的重开不会重复插屏。
- 全局键盘/滚轮守卫，阻止方向键、空格和滚轮滚动页面。
- `index.html` / manifest 默认英文元数据。

### 提交前验证

1. 用 Poki Inspector 跑 iframe、弱网、移动端模拟。
2. 确认 SDK 事件不连续触发，广告期间没有事件。
3. 确认 `gameLoadingFinished` 在 Preload 后触发。
4. 确认暂停恢复/重开的顺序为 `gameplayStop → commercialBreak → gameplayStart`，奖励复活为 `gameplayStop → rewardedBreak → gameplayStart`。
5. 确认广告拦截时不发奖，且没有自定义提示。
6. 确认 zip 根目录有 `index.html`，资源相对路径，运行时除 Poki SDK 外无外部请求。
7. 确认没有 Dev 模拟广告代码：`grep -r "模拟激励广告" dist` 应为空。
8. 确认 11 种语言在菜单、暂停、结算中无缺失文案，语言弹窗在竖屏/平板不溢出。

当前仍没有 Poki 开发者账号/Inspector 权限；本地代码、构建和事件顺序已准备，但真实广告行为与 Inspector 提审尚未验证。拿到账号后先跑 Inspector，再更新本节并提交。

## CrazyGames

CrazyGames 分两个阶段：
- **Basic Launch**：SDK 可选，无广告、无分成；审核较基础，可以先把游戏跑通。
- **Full Launch**：必须接入 SDK 和 CrazyGames 广告，接受完整 QA，之后参与广告分成。

代码已按 Full Launch 准备，同时保留 Basic 构建：先提 Basic 不影响之后转 Full。

### 构建与提交包

```bash
# Basic：不启用 CrazyGames 广告，奖励入口隐藏
VITE_PLATFORM=crazygames npm run build -w @mg/snake
cd games/snake/dist && zip -r ../snake-crazygames-basic.zip .

# Full：启用 CrazyGames 激励 + midgame 广告
VITE_PLATFORM=crazygames VITE_AD_CHANNEL=crazygames npm run build -w @mg/snake
cd games/snake/dist && zip -r ../snake-crazygames-full.zip .
```

两种构建都会由 `tooling/vite.game.ts` 在 `index.html` 的 head 注入 `https://sdk.crazygames.com/crazygames-sdk-v3.js`。提交包必须：
- `index.html` 在 zip 根目录；
- 资源使用相对路径（项目已用 `base: './'`）；
- 运行时除 CrazyGames SDK 外没有外部请求；
- 没有 Dev 模拟广告代码：`grep -RIn "模拟激励广告\|__mgGame" games/snake/dist` 应为空；
- 总大小、文件数、初始下载满足 CrazyGames 限制（当前构建远低于上限）。

### 已实现

- `CrazyGamesPlatform`：`SDK.init()`、`loadingStart/Stop`、`gameplayStart/Stop`（去重）、`happytime`、locale、触觉。
- `CrazyGamesAdChannel`：
  - `rewardedBreak` 只在 `adFinished` 返回 `true`；`adError` 返回 `false`，不发奖。
  - `interstitialBreak` 使用 `requestAd('midgame')`，结束或失败都继续游戏。
  - `adblock` / `adsDisabled` 后本次会话隐藏奖励入口；`unfilled` / `adCooldown` 保持可重试。
  - 初始化后调用 `ad.hasAdblock()` 预检，避免广告拦截用户看到无效奖励按钮。
- `muteAudio`：读取 `SDK.game.settings.muteAudio`，监听 `addSettingsChangeListener`；宿主静音优先于游戏内音效开关，且不写入玩家存档。
- 入口：CrazyGames 构建跳过 Preload 点击门槛，加载后直接进菜单，新用户从进入到可玩只需「开始」1 次点击。
- 语言：SDK init 后重新同步 locale；优先级为 URL `?lang=` > 玩家显式选择 > SDK locale > 英文，自动检测不写 `langChosen`。
- 广告落点：
  - 结算页超级水果奖励（rewarded）；
  - 死亡结算后的重开（midgame，自然断点）；
  - 暂停恢复、暂停菜单重开不弹 midgame，避免在导航操作上打断。
- 全屏：iframe 内不自动请求全屏，由 CrazyGames 播放器控制，不添加自定义全屏按钮。

### 提交前验证

1. 在 CrazyGames 开发者门户上传 build，用其 preview / QA 工具运行。
2. Event Log：`loadingStart → loadingStop → gameplayStart`；暂停/广告期间无重复或错误事件。
3. 暂停恢复：只 `gameplayStop → gameplayStart`，不出现 midgame。
4. 死亡结算重开：`gameplayStop → midgame → gameplayStart`；奖励广告：`gameplayStop → rewarded → gameplayStart`。
5. 广告拦截：`adblock` 后奖励入口消失，标准重开始终可用；不显示自定义“广告被拦截”提示。
6. `muteAudio`：在门户设置或 `?muteAudio=true` 下，游戏内音效开关不能重新打开声音；关闭宿主静音后恢复玩家偏好。
7. 移动端横屏/竖屏、桌面 16:9 与门户列出的 iframe 尺寸都可玩；转屏自动暂停并倒计时恢复。
8. 11 种语言在菜单、暂停、结算中无缺失；英文必须完整。
9. Network 面板除 CrazyGames SDK 外无外部请求；刷新后最高分/待领取奖励仍在。
10. 首次进入到可玩不超过 1 次点击。

### 发布素材

需要 3 张风格一致的封面和 2 个预览视频：
- 横版封面 1920×1080（16:9）；
- 竖版封面 800×1200（2:3）；
- 方形封面 800×800（1:1）；
- 横版预览视频 1080p 16:9；
- 竖版预览视频 1080p 2:3。

封面规则：无边框；除游戏标题外不要写任何文字（不能写 New/Play/Play now）；不要放图标、商店 logo 或版权素材；不要模糊/像素化；不要只截一张游戏画面，要设计过。

视频规则：15–20 秒、≤50MB、无声音；第一帧使用对应比例的静态封面；不能有黑屏、logo 转场、上下黑边、默认鼠标指针、Play Now 或推广文字；不要快进。

竖版/方形素材必须用移动端仿真采集（touch + coarse pointer），不能把桌面截图硬裁。素材放在 `games/snake/store/crazygames/`，默认不提交 git。

CrazyGames 账号已具备；门户 QA 与最终提审由用户完成。详细步骤见 [`crazygames-next-steps.md`](./crazygames-next-steps.md)。

## 自有站构建

```bash
npm run build -w @mg/snake
```

默认 `VITE_PLATFORM=web`、`VITE_AD_CHANNEL=dev`：生产环境没有广告渠道，奖励入口隐藏，游戏完整可玩。

### Google H5 Games Ads

```bash
VITE_PLATFORM=web VITE_AD_CHANNEL=h5games \
VITE_ADSENSE_CLIENT=ca-pub-... \
npm run build -w @mg/snake
```

- `VITE_ADSENSE_CLIENT` 只从构建环境读取；没有 ID 时构建成功但无广告，奖励入口隐藏。
- `VITE_ADSENSE_TEST=on` 只用于 dev/staging；production build 会警告并忽略。
- `npm run site` 在配置了有效 publisher ID 时生成 `dist-site/ads.txt`；部署时 `ads.txt` 必须在域名根目录。
- 真实广告前提：AdSense 账号、H5 Games Ads 申请通过、站点审核、HTTPS、隐私政策、EEA/UK/CH 的 Google 认证 CMP。
- 没有账号/审核前只能 test mode；test mode 使用占位广告，不代表真实库存。
- AdMob/Pangle/Meta 是 App SDK，建议等 Capacitor 壳；Web 端不要按“直接接 AdMob”设计。

## 版本与回滚

- 每个游戏独立构建，互不影响；`packages/core` 改动需要全量回归。
- 站点发布保留上一版 `dist-site` 备份，出问题直接回滚静态文件。
- 存档带版本号，发布新版本前确认迁移逻辑能读旧数据。

## 下一步

- Poki 账号、Inspector 验证、发布素材、提审与发布后事项见 [`poki-next-steps.md`](./poki-next-steps.md)。
- CrazyGames 账号、门户 QA、发布素材、Basic → Full 提审与发布后事项见 [`crazygames-next-steps.md`](./crazygames-next-steps.md)。
