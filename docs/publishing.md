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
- `PokiPlatform`：`init`、`gameLoadingFinished`、`gameplayStart/Stop`（去重）、`happyTime`、`haptic`。
- `PokiAdChannel`：`rewardedBreak`、`commercialBreak`；广告期间屏蔽宿主事件。
- `tooling/vite.game.ts` 只在 `VITE_PLATFORM=poki` 构建注入 SDK 脚本。
- `@mg/core` 的 `AdService` 负责静音、停表、单飞和结果映射。

### 提交前验证

1. 用 Poki Inspector 跑 iframe、弱网、移动端模拟。
2. 确认 SDK 事件不连续触发，广告期间没有事件。
3. 确认 `gameLoadingFinished` 在 Preload 后触发。
4. 确认广告拦截时不发奖，且没有自定义提示。
5. 确认 zip 根目录有 `index.html`，资源相对路径，运行时除 Poki SDK 外无外部请求。
6. 确认没有 Dev 模拟广告代码：`grep -r "模拟激励广告" dist` 应为空。

当前没有 Poki 开发者账号/Inspector 权限，真实广告行为尚未验证；不要提审。

### 自有站

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
