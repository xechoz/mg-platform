# Poki 上架下一步

当前状态：代码、事件顺序、构建和上传包已准备；**没有 Poki 开发者账号 / Inspector 权限**，真实广告与提审尚未验证。缩略图和录屏按用户要求后续再做。

## 1. 注册与建条目

- 注册 Poki for Developers，创建 Snake 游戏条目。
- 拿到 Inspector 权限后再进入第 2 步。
- 记录 Poki 后台要求的标题、分类、操作说明、支持语言、年龄分级。

## 2. 本地 Inspector 验证

上传 `games/snake/dist` 文件夹（不要上传 zip）：

```bash
VITE_PLATFORM=poki npm run build -w @mg/snake
```

在 <https://inspector.poki.dev> 检查：
- Event Log：启动 `gameLoadingFinished → gameplayStart`。
- 暂停恢复：`gameplayStop → commercialBreak → gameplayStart`。
- 结算重开：`gameplayStop → commercialBreak → gameplayStart`。
- 奖励复活：`gameplayStop → rewardedBreak → gameplayStart`，且奖励后重开不重复插屏。
- 广告期间无任何 SDK 事件，输入被锁，音频静音。
- Event Log 无连续重复事件。
- Scaling Tests：桌面 16:9、移动横屏、移动竖屏、平板。
- Warnings：无外部资源、图片优化、SDK 异常。
- Game Details：加载时间、文件大小；目标 10 秒内可玩。
- 移动端 QR 与弱网测试。
- 语言选择器：11 种语言逐一检查，重点 de / ru / tr 长文案。

## 3. 发布素材

- 静态缩略图：1080×1080 母版 + 628×628 成品，1:1 全出血，无文字/边框/留白，避开 Poki 背景 `#83FFE7`。
- 动态缩略图：1080×1080、4–6 秒、≥50fps、MP4、静音、≤100MB、无鼠标指针。
- 缩略图要真实反映玩法：蛇、水果、棋盘为主体。
- 素材放在 `games/snake/press/`，不打进 `dist`，默认不提交 git。

## 4. 提审

```bash
npm run package:snake:poki
```

zip 输出到仓库根目录的 `release/snake-poki.zip`。
- 确认 zip 根有 `index.html`，资源相对路径，唯一外部请求是 Poki SDK。
- 确认 `grep -RIn "模拟激励广告\|__mgGame" games/snake/dist` 无输出。
- 上传 build，提交内容审核。
- 先 Playtest，再 Web Fit / QA；通过后 Soft Release / Global Release。
- 未在 Inspector 验证前不要提审。

## 5. 发布后

- 监控崩溃、SDK 事件、加载时间。
- 母语校对翻译，尤其德语、俄语、土耳其语。
- 需要普通 Web 构建时重跑 `npm run build -w @mg/snake`。
- 更新 `docs/publishing.md` / `docs/ads.md` 去掉“未验证”说明，并记录实际 Poki 后台配置。
