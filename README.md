# Bangumi 美化脚本合集

本脚本是在前辈代码的基础上修改而来的(musume_15)(musume_15)(musume_15)，已上传超合金组件等待审核中，[Github仓库]（https://github.com/sqb2020/bangumi-beautify.git），
支持油猴（Tampermonkey）和 Bangumi 自带的超合金组件。

---

## 📋 脚本列表

| # | 脚本 | 版本 | 作用页面 | API 依赖 | 安装方式 |
|---|------|------|----------|----------|----------|
| ① | `bangumi_bg_custom.user.js` | 1.0.0 | bgm.tv **全站** | 随机图需 fetch | 油猴 / 超合金组件 |
| ② | `bangumi_calendar_timeline_no_api.user.js` | 1.0.0 | `/calendar` | ❌ 零 API | 油猴 / 超合金组件 |
| ③ | `bangumi_calendar_timeline.user.js` | 1.0.0 | `/calendar` | ✅ 调用 api.bgm.tv | 仅油猴 |
| ④ | `bangumi_week_blocks.user.js` | 1.0.0 | 首页 `/` | ❌ 零 API | 油猴 / 超合金组件 |

---

## ① 自定义背景与毛玻璃 `bangumi_bg_custom.user.js`

> 把老婆的照片设成全站背景，调透明度做出毛玻璃效果。

基于 [rabbitohh/bangumi-css](https://github.com/rabbitohh/bangumi-css) 改造，从 Stylus 格式转为油猴/超合金组件通用格式。

### 预览

| 配置面板 | 渐变背景 + 毛玻璃 |
|---|---|
| ![配置面板](https://p.sda1.dev/34/df26894683b5f57ae0040cfe3d6f729e/自定义背景与毛玻璃0.png) | ![渐变背景](https://p.sda1.dev/34/9f2e2599044740f99ed45bac808f410c/自定义背景与毛玻璃1.png) |

| 图片背景（条目页） | 随机图片背景 |
|---|---|
| ![图片背景](https://p.sda1.dev/34/12a88f7293cf394e71f8f16917940fc4/自定义背景与毛玻璃2.png) | ![随机图片](https://p.sda1.dev/34/166169dfde2f0dcd9efdbf7370ad6d55/自定义背景与毛玻璃3.png) |

### 功能

- 🎨 **四种背景模式**：纯色 / 渐变 / 图片 URL / 随机图片
- 🔮 **随机图片**：接入[栗次元 API](https://t.alcy.cc)，17 个分类可选（PC 横图、二次元、萌版、原神、风景…），每次刷新自动换图
- 📋 **历史记录**：随机图片自动保存历史，鼠标一点就能锁定喜欢的图
- 🎚️ **不透明度滑块**：0~3 可调，值越大页面越不透明，背景越明显
- ⚙️ **可视化配置面板**：右下角齿轮按钮弹出，全部点点点操作
- 🧊 **全站毛玻璃**：首页、条目页、小组、时间线等所有页面统一透明化

### 使用

```
安装后访问任意 bgm.tv 页面 → 右下角 ⚙ 按钮 → 选模式调参数 → 点「应用」
```

- **纯色**：点击色板选颜色
- **渐变**：选方向 → 选起始色 → 选结束色
- **图片**：粘贴图片直链（支持 lain.bgm.tv 图床）
- **随机**：选分类 → 点应用 → 每次刷新自动换图
- **历史**：随机模式下每张图自动记录，点击历史缩略图直接锁定

---

## ② 每日放送 · 时间轴（No API）`bangumi_calendar_timeline_no_api.user.js`

> 把日历页从密集网格变成横向时间轴，不调 API，打开立刻显示。

### 预览

![时间轴 No API](https://p.sda1.dev/34/b722ad87f8a6a2d1b4426da1dc9015e6/每日放送时间轴no-api.png)

### 功能

- 📊 一周七天等宽分列，每条番剧横向卡片（64×80 封面 + 番名 + 原名）
- 🟠 今天列橙色边框高亮
- ⬅️➡️ 上一周 / 今天 / 下一周 导航按钮
- 🖱️ 点击条目跳转番剧主页
- ⚡ 纯 DOM 提取数据，刷新即显示零等待

### 使用

```
安装后访问 https://bgm.tv/calendar
```

### 调整封面大小

条目卡片的封面图片尺寸可自行修改。打开脚本，搜索 `.bct-ep img`，调整 `width` 和 `height` 即可：

```css
.bct-ep img { width: 64px; height: 80px; ... }  /* 默认 64×80 */
```

比如改成 `width: 50px; height: 62px;` 更紧凑，或 `width: 80px; height: 100px;` 更大。两行数字保持约 4:5 比例效果最佳。

### 适用场景

想要时间轴视图且不想给 API 权限，或使用超合金组件。如果需要带「第 N 话 + 集标题」的版本，用 ③。

---

## ③ 每日放送 · 时间轴（完整版）`bangumi_calendar_timeline.user.js`

> 功能最完整的时间轴。调 Bangumi API 获取每集标题和集数。

### 预览

![时间轴 完整版](https://p.sda1.dev/34/1a67302b4ba346e1583ff73c6623fbe7/每日放送时间轴.png)

### 功能

- 包含 ② 的全部功能
- 📺 每条显示「第 N 话」+ 集标题
- 🕐 今日未播出的集数标注「待播出」
- 🔄 渐进式加载：骨架先渲染，集数信息逐个填充

### 使用

```
安装后首次使用会弹窗请求 api.bgm.tv 权限，点「允许」。
需要油猴（超合金组件不支持 @grant GM_xmlhttpRequest）。
```

### 与 ② 的区别

| | ② No API | ③ 完整版 |
|---|---|---|
| 集数和标题 | ❌ | ✅ |
| 需要 API 权限 | ❌ | ✅ |
| 超合金组件 | ✅ | ❌ |
| 加载速度 | 即时 | 需要拉取 API（几秒） |

---

## ④ 首页节目按星期分组 `bangumi_week_blocks.user.js`

> 把首页「我的 Bangumi」追番列表按星期分成七块卡片，今天高亮。

基于 Xuefer 的原作适配新版 Bangumi 页面。

### 预览

![首页星期分组](https://p.sda1.dev/34/f3dc8380cc4962ef8b5787fc47e31d56/首页节目按星期分组.png)

### 功能

- 🎯 周一~周日各自一个卡片，单列排列
- 🟧 今天的卡片橙色边框 +「今天」标签
- ✨ 纯 CSS + 少量 DOM 修补，不调 API

### 使用

```
安装后访问 https://bgm.tv/ 首页
```

---

## 🔧 安装方法

### 油猴（Tampermonkey）
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击扩展图标 → 创建新脚本
3. 将 `.user.js` 文件内容全部粘贴进去
4. `Ctrl+S` 保存

### 超合金组件（Bangumi 自带）
1. 访问 https://bgm.tv/dev/app
2. 点击「添加新组件」
3. 粘贴脚本内容（②④ 及更新后的 ① 支持，③ 不支持）

---


*Made with ❤️ for Bangumi.*
