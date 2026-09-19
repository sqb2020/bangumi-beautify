# bgm.tv 原生主题机制爬取报告

- 抓取方式：ZCode 内置浏览器（本机网络）访问 `https://bgm.tv/`，页面内 JS 遍历 `document.styleSheets` 提取规则
- 抓取时间：2026-09-19
- 样式表：`https://bgm.tv/css/dist/bangumi.min.css?r771`（3775 条规则）+ 3 个内联 style
- 产物：`home-css-report-part1.json`（含 635 条 `data-theme` 深色规则、各区域原生背景规则、计算样式）

## 1. 原生深色模式 = html[data-theme]

站点有一套完整的官方深色主题（约 635 条规则），全部挂在 `html[data-theme="dark"]` 下：

| 项目 | 亮色 | 深色 |
|---|---|---|
| body | `rgb(255,255,255)` | `rgb(45,46,47)` / 文字 `rgb(255,255,255)` |
| color-scheme | light | `dark` |
| 输入框/textarea | 白底黑字 | `rgb(48,49,50)` / `rgb(224,224,225)` |
| 链接 | 默认蓝 | `rgb(238,238,238)`，hover `#02A3FB` |
| #headerNeue2 | 白渐变 + `#ddd` 下边框 | `rgba(55,57,59,.9)→rgba(51,51,51,.9)` 渐变 + `#333` 边框 |
| div.SidePanel | 白渐变+阴影 | 边框 `rgb(68,68,68)`，渐变 `rgb(63,63,63)→rgb(56,56,56)` |
| #footer #footerLinks | `rgb(248,248,248)` | `rgb(61,61,61)` |
| #timeline .card / .comment | 白 | `rgb(50,50,50)` / `rgb(48,48,48)` |

另有两套辅助属性：
- `html[data-theme-color="pink|blue|green|purple|orange|red"]` → 定义 `--primary-color`（默认 `#f09199`）与 `--filter-black-to-primary`
- `html[data-theme-change="1"] * { transition: background-color .3s linear, border-color .3s linear }` —— 切换主题时的 300ms 过渡开关（站点 JS 设置后 300ms 移除）

## 2. 主题由谁决定（min/g=js 反推）

```js
chiiLib.ukagaka.currentTheme = function(){
  if (!$.cookie('chii_theme_choose')) { chiiLib.ukagaka.autoTheme(); }
  else { chiiLib.ukagaka.isDark($.cookie('chii_theme') == 'dark'); }
  ...
};
chiiLib.ukagaka.autoTheme = function(){
  var cur = matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
  chiiLib.ukagaka.updateTheme(cur, false);
  matchMedia('(prefers-color-scheme: dark)').addListener(e => updateTheme(e.matches?'dark':'light', false));
};
chiiLib.ukagaka.setTheme = function(el, style){
  el.attr('data-theme-change','1'); el.attr('data-theme',style);
  setTimeout(() => el.removeAttr('data-theme-change'), 300);
};
chiiLib.ukagaka.isDark = function(v){ $('#toggleTheme').html(v ? '开灯 |' : '关灯 |'); };
```

结论：
- **站点主题唯一事实源是 `html[data-theme]`**；用户选择存 cookie（`chii_theme_choose`/`chii_theme`），未选择时跟随系统并实时响应系统切换；
- 右下角工具条有原生「关灯/开灯」按钮（`#toggleTheme`）；
- CSS 不使用 `prefers-color-scheme` 媒询（深色判定全由 JS 写属性）。

## 3. 对四个脚本的修复指向

1. 深色判定必须以 `html[data-theme]` 为最高优先的"站点原生"信号（旧 detectSiteDark 不认它 → 深色适配失效）；
2. companion 脚本（timeline/week_blocks）在 bg_custom 缺席时必须代写 `data-theme`，否则官方深色 CSS（正文反色等）不生效 → 玻璃变暗但文字仍是深色（可读性差主因）；
3. 各脚本自建 token 必须与 bg_custom 同值（timeline 原为 `38,38,46`，bg_custom 为 `16,18,28`，同页互相覆盖导致玻璃不一致）；
4. timeline 内 `#26262e/#333` 等硬编码深色块不读 token，是"同一网页不同区域玻璃不一致"的直接来源；
5. 强调色可改用 `var(--primary-color, #f091xx)` 跟随用户选择的站点主题色。

## 4. 亮色各区域原生背景（归一化对象）

- `body.bangumiNeue`：白
- `#prgManagerMain`：白、圆角 15px
- `div.SidePanel/.SidePanelLow`：白渐变 + box-shadow、圆角 15px
- `div.SidePanelMini`：白→`rgb(251,251,251)` 渐变、`#ccc` 边框
- `#footer #footerLinks`：`rgb(248,248,248)`
- `#headerNeue2`：白渐变、`#ddd` 下边框
- 深浅模式在 `#headerNeue2` 等区域都有官方各自背景 → 脚本对它们统一用 `--bgc-glass` 玻璃变量覆盖即可双侧一致
