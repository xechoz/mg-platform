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

### Cloudflare Pages

- 构建命令：`npm run site`
- 输出目录：`dist-site`
- Node 版本：24 或更高

GitHub Pages 同理，把 `dist-site` 推到 Pages 分支即可。

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

### 待接入

`packages/platform` 已定义 `PlatformAdapter` 接口，包含 Poki 所需能力：
- `init()`
- `loadingFinished()`
- `gameplayStart()` / `gameplayStop()`
- `commercialBreak()` / `rewardedBreak()`
- `happyTime()`
- `lang()` / `haptic()`

提交前需要完成：
1. 实现 `PokiAdapter`，在 `createPlatform('poki')` 中返回；
2. 构建时向 HTML `<head>` 注入 `https://game-cdn.poki.com/scripts/v2/poki-sdk.js`（只对 Poki 构建）；
3. 在 Preload 的 `loadingFinished()` 后调用 `gameLoadingFinished`；
4. 广告前后自动停音乐、冻结计时、加全局广告锁；
5. 用 Poki Inspector 在 iframe、弱网、移动端模拟下跑一遍。

注意：当前 `VITE_PLATFORM=poki` 仍会回退到 `DevPlatform`，不要直接提交。

## 版本与回滚

- 每个游戏独立构建，互不影响；`packages/core` 改动需要全量回归。
- 站点发布保留上一版 `dist-site` 备份，出问题直接回滚静态文件。
- 存档带版本号，发布新版本前确认迁移逻辑能读旧数据。
