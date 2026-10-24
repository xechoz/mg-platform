# 新游戏清单

## 1. 生成骨架

```bash
npm run new:game -- my-game
npm install
npm run dev -w @mg/my-game
```

生成内容：

```
games/my-game/
├─ game.manifest.json
├─ index.html
├─ vite.config.ts
├─ public/
│  ├─ favicon.svg
│  ├─ manifest.webmanifest
│  └─ icons/              # 180 / 192 / 512
└─ src/
   ├─ main.ts
   ├─ colors.ts
   ├─ i18n.ts
   └─ scenes/PlaceholderScene.ts
```

## 2. 必须改的地方

- `game.manifest.json`：`id`、中英文标题/描述、主题色、排序。
- `src/i18n.ts`：至少保留 `game.title`，Preload 场景依赖它。
- `src/main.ts`：`design: { base: 720 }`（短边 720 设计单位，长边随屏幕比例）；`scenes` 注册所有场景；`menuScene` 默认 `Menu`；通过 `theme: colors.theme` 注入游戏主题，不再单独写 `backgroundColor`。
- `src/colors.ts`：该游戏唯一的颜色配置，包含 `theme`（覆盖公共 token）和 `art`（游戏专属美术色）。浅底强调文字用 `accentInk`，色块上的文字/图标用 `onAccent`。
- `PlaceholderScene`：改成真正的菜单场景（场景键保持 `Menu`）。
- `public/manifest.webmanifest`：同步标题、描述、`theme_color`；`public/icons/` 放 180、192、512 的 PNG，正式上线前替换模板图标。

## 3. 场景约定

- `Boot`、`Preload` 是 core 保留键，不要使用。
- 推荐 `Menu` → `Game` + `Hud` 并行。
- 进入实际玩法时调用 `services.platform.gameplayStart()`；菜单、暂停、结算调用 `gameplayStop()`。
- 失焦/切标签页必须暂停，恢复时给 3-2-1 倒计时。

## 4. 规则层

- 放到 `src/logic/`，纯函数 + 不可变 state。
- 不 import Phaser；需要随机数时只 import `@mg/core/rng`。
- 为每个规则边界写 Vitest：非法操作、边界、胜负、随机复现。
- 渲染层只读 state，消费逻辑事件播放动画，不回写规则。

## 5. 存档与设置

```ts
interface MySave {
  best: number
}

const save = services.createSave<MySave>({
  name: 'save',
  version: 1,
  initial: () => ({ best: 0 }),
})
```

- 存档键自动为 `mg:<gameId>:save`。
- 改字段必须提升 `version` 并提供 `migrate`，不要直接破坏旧存档。
- 音效/语言用 `services.settings`、`services.setSound()`、`services.setLang()`，不要自己写 localStorage。

## 6. UI

- 按钮用 `Button`，弹窗用 `Modal`，面板用 `createPanel`，文字样式用 `textStyle`。
- 颜色只从 `src/colors.ts` 读取：UI 用 `getServices().theme`，专属美术用 `colors.art`；场景里不写颜色字面量。浅底强调文字用 `accentInk`，色块上的文字/图标用 `onAccent`。
- 所有文案走 `services.i18n.t('key')`，中英文都写。
- 中文使用系统字体，不打包 CJK 字体。
- 图标优先用 Lucide 等开源图标，只引入实际用到的。
- HTML/manifest/favicon 的颜色是静态品牌资源，用 `colors.test.ts` 校验与 `colors.ts` 一致；图标要能在浅色主屏上看清（贪吃蛇用主题 `accent` 作底色）。

## 7. 资源

- 图片/音频放在 `public/` 或 `src/assets/`，通过 `GameDefinition.assets` 声明。
- 不使用外部 CDN、字体、统计脚本。
- 单游戏首包尽量控制在 1.5MB gzip 内；Phaser 本身约 370KB gzip。
- `public/manifest.webmanifest` 与 `public/icons/` 提供 PWA/A2HS：180 给 iOS，192/512 给 manifest；图标要实色底、无透明角。
- 上线前补 `thumb.png`（512×512）放到游戏根目录，站点构建会自动复制。

## 8. 提交前

```bash
npm run check        # 类型 + Biome + 边界
npm run test
npm run build:snake  # 或对应游戏
npm run site
```

人工检查：
- [ ] 桌面 16:9、手机横屏与竖屏都可玩，转屏自动暂停并恢复倒计时
- [ ] 手机首次点击进入全屏，主菜单已是全屏；iPhone 添加到主屏幕后无浏览器 UI
- [ ] 首次点击后音效正常，静音可持久化
- [ ] 暂停/失焦停表，恢复有倒计时
- [ ] 最高分/进度重启后仍在
- [ ] 中英文切换无缺失文案
- [ ] 无 console 报错
- [ ] 结算后能重开、能回菜单
