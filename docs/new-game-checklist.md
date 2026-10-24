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
├─ public/favicon.svg
└─ src/
   ├─ main.ts
   ├─ i18n.ts
   └─ scenes/PlaceholderScene.ts
```

## 2. 必须改的地方

- `game.manifest.json`：`id`、中英文标题/描述、主题色、排序。
- `src/i18n.ts`：至少保留 `game.title`，Preload 场景依赖它。
- `src/main.ts`：`design: { base: 720 }`（短边 720 设计单位，长边随屏幕比例）；`scenes` 注册所有场景；`menuScene` 默认 `Menu`。
- `PlaceholderScene`：改成真正的菜单场景（场景键保持 `Menu`）。

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
- 所有文案走 `services.i18n.t('key')`，中英文都写。
- 中文使用系统字体，不打包 CJK 字体。
- 图标优先用 Lucide 等开源图标，只引入实际用到的。

## 7. 资源

- 图片/音频放在 `public/` 或 `src/assets/`，通过 `GameDefinition.assets` 声明。
- 不使用外部 CDN、字体、统计脚本。
- 单游戏首包尽量控制在 1.5MB gzip 内；Phaser 本身约 370KB gzip。
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
- [ ] 首次点击后音效正常，静音可持久化
- [ ] 暂停/失焦停表，恢复有倒计时
- [ ] 最高分/进度重启后仍在
- [ ] 中英文切换无缺失文案
- [ ] 无 console 报错
- [ ] 结算后能重开、能回菜单
