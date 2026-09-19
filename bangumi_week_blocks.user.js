// ==UserScript==
// @name         节目按星期分组排序
// @namespace    https://bgm.tv/user/640151
// @version      1.3.0
// @description  按星期分成七块显示，高亮当前日期（块式布局，去除竖条底色）；深色模式与站点原生 html[data-theme] 同步，玻璃参数与 bangumi_bg_custom 统一
// @author       qbs(based on Xuefer's work, rewritten for new Bangumi layout)
// @include      http://bangumi.tv/
// @include      https://bangumi.tv/
// @include      http://bgm.tv/
// @include      https://bgm.tv/
// @include      http://chii.in/
// @include      https://chii.in/
// @run-at       document-end
// ==/UserScript==

(() => {
  // 注入块式布局样式：去掉每个条目的竖条，改为按星期分块
  try {
    const style = document.createElement("style");
    style.textContent = `
      /* ---- 毛玻璃块 ----
         使用 bangumi_bg_custom 注入的 CSS 变量（--bgc-glass / --bgc-blur / --bgc-saturate / --4 等），
         带 fallback 值以在 bg_custom 未安装时独立运行。
         当 bg_custom 存在时，--bgc-glass 在 html.bgc-dark 下自动切换为深色，
         --bgc-blur / --bgc-saturate 统一模糊度，--4 等透明度变量跟随不透明度滑块，
         从而与 SidePanel 等右侧面板保持完全一致的毛玻璃效果。 */
      .day-block {
        margin: 10px 0;
        border: 1px solid rgba(var(--bgc-glass, 255,255,255), 0.35);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(var(--bgc-glass, 255,255,255), var(--4, 0.4));
        -webkit-backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 160%));
        backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 160%));
      }
      .day-label {
        font-weight: bold;
        padding: 6px 10px;
        background: rgba(var(--bgc-glass, 255,255,255), var(--3, 0.3));
        border-bottom: 1px solid rgba(0,0,0,0.06);
        color: #333;
        text-shadow: 0 1px 1px rgba(255,255,255,.3);
      }
      .day-block.today { border-color: var(--primary-color, rgba(240,145,30,0.6)); }
      .day-block.today .day-label { background: rgba(240,145,30,0.14); color: var(--primary-color, #f0911e); }

      /* 块内条目用 flex 强制单列纵向排列，覆盖原页面 float/inline 两列样式 */
      .day-subjects {
        padding: 8px 10px;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .day-subjects > * {
        display: block !important;
        float: none !important;
        clear: both !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      /* ==== 深色模式 ====
         当 bangumi_bg_custom 存在时，--bgc-glass 在 html.bgc-dark 下自动变为 16,18,28，
         .day-block / .day-label 的 background 和 backdrop-filter 已通过变量适配，无需重复声明。
         以下仅保留：① 变量无法覆盖的属性（文字颜色、today 高亮）；
         ② bangumi_bg_custom 不存在时的 fallback 关灯样式（通过 html.bgc-dark 选择器 + 深色 fallback 值）。 */
      html.bgc-dark .day-block {
        border-color: rgba(255,255,255,0.1);
        background: rgba(var(--bgc-glass, 16,18,28), var(--4, 0.4));
        -webkit-backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 150%));
        backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 150%));
      }
      html.bgc-dark .day-label {
        background: rgba(var(--bgc-glass, 16,18,28), var(--2, 0.2));
        border-bottom-color: rgba(255,255,255,0.08);
        color: #ddd;
        text-shadow: 0 1px 1px rgba(0,0,0,.4);
      }
      html.bgc-dark .day-block.today { border-color: var(--primary-color, rgba(240,145,30,0.5)); }
      html.bgc-dark .day-block.today .day-label { background: rgba(240,145,30,0.1); color: var(--primary-color, #f0911e); }
    `;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) { /* ignore */ }

  // wait_load.ts
  var unsafeWindow = window.unsafeWindow || window;
  async function waitLoad() {
    const t = Date.now();
    while (!unsafeWindow.$ || !document.getElementById("subject_prg_content") || !document.getElementById("cluetip")) {
      if (Date.now() > t + 5e3) throw new Error("waitLoad timeout");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // ep_date.ts
  function extractDate(s) {
    const d = s.match(/(20\d\d-\d{1,2}-\d{1,2})/)?.[1];
    if (!d) return null;
    return new Date(d);
  }
  function epDate(ep) {
    const tips = $(".tip:first", $(ep.rel)).text();
    const d = extractDate(tips);
    if (!d) throw new Error(`No Date in ep ${ep.rel}`);
    return d;
  }
  function nextAirDate(subject) {
    try {
      const eps = $(".prg_list > li", subject).toArray().map((e) => e.querySelector(".load-epinfo"));
      const spIdx = eps.findIndex((e) => !e);
      if (spIdx !== -1) eps.splice(spIdx);
      const air = eps.findLast((ep) => ep.className.includes("epBtnAir"));
      if (air) {
        try {
          return epDate(air);
        } catch {
        }
      }
      const future = eps.find((ep) => !/epBtnDrop|epBtnWatched|epBtnAir/.test(ep.className));
      if (future) {
        try {
          return epDate(future);
        } catch {
        }
      }
      if (eps.length === 0) return null;
      return epDate(eps[eps.length - 1]);
    } catch (e) {
      console.log(e, subject);
      return null;
    }
  }

  // sort_group.ts
  function bangumiSortGroup() {
    const weekdayLabels = [
      "周日",
      "周一",
      "周二",
      "周三",
      "周四",
      "周五",
      "周六",
      "周❓",
      "完结"
    ];
    const $2 = unsafeWindow.$;
    const now = /* @__PURE__ */ new Date();
    const oldDate = now.valueOf() - 8 * 24 * 60 * 60 * 1e3;
    do {
      const subjects = $2("#cloumnSubjectInfo > div:first > div").toArray();
      if (!subjects.length) {
        break;
      }
      const container = subjects[0].parentNode;
      for (const subject of subjects) {
        container.removeChild(subject);
      }
      while (container.lastChild) {
        container.removeChild(container.lastChild);
      }
      const days = weekdayLabels.map((label, index) => ({
        index,
        label,
        subjects: []
      }));
      const unknownSubjects = days[7].subjects;
      const finish = days[8];
      for (const subject of subjects) {
        const date = nextAirDate(subject);
        if (!date) {
          subject.sortId = "";
          unknownSubjects.push(subject);
          continue;
        }
        const title = $2("> a:last", subject)[0].title;
        subject.sortId = date.getFullYear().toString().padStart(4, "0") + (date.getMonth() + 1).toString().padStart(2, "2") + "-" + title;
        if (+date < oldDate) {
          finish.subjects.push(subject);
        } else {
          days[date.getDay()].subjects.push(subject);
        }
      }

      // 按星期分块：周一开始(周一..周日)，最后接「周❓」「完结」
      const order = [1, 2, 3, 4, 5, 6, 0, 7, 8];
      for (const idx of order) {
        const day = days[idx];
        if (day.subjects.length === 0) {
          continue;
        }
        day.subjects.sort(function (a, b) {
          return a.sortId.localeCompare(b.sortId);
        });

        // 每个星期一个块容器，不再给单个条目包竖条
        const block = container.appendChild(document.createElement("div"));
        block.className = "day-block day-" + (day.index + 1);
        if (day.index <= 6 && day.index === now.getDay()) {
          block.classList.add("today");   // 今天的整块高亮
        }
        const label = block.appendChild(document.createElement("div"));
        label.className = "day-label";
        label.appendChild(document.createTextNode(day.label));

        // 该星期下的所有条目直接放进块内
        const list = block.appendChild(document.createElement("div"));
        list.className = "day-subjects";
        for (const subject of day.subjects) {
          list.appendChild(subject);
        }
      }
    } while (0);
    const within_24hours = now.valueOf() - 24 * 60 * 60 * 1e3;
    const within_48hours = now.valueOf() - 48 * 60 * 60 * 1e3;
    $2.each($2(".epBtnAir"), (_i, o) => {
      try {
        const airDate = epDate(o).valueOf();
        if (airDate >= within_48hours) {
          $2(o).addClass(airDate >= within_24hours ? "epBtnAirNewDay1" : "epBtnAirNewDay2");
        }
      } catch {
        $2(o).removeClass("epBtnAir");
        $2(o).addClass("epBtnUnknown");
      }
    });
  }

  // -------------------- 深色模式检测（与 bangumi_bg_custom 共用同一套语义） --------------------
  // 优先级：共享偏好('on'/'off') > 站点原生 html[data-theme]（右下角「关灯」/系统偏好） >
  // 旧式深色 class > body 亮度 > 系统 prefers-color-scheme。
  // 旧版问题：① 不认 data-theme；② 判定结果与 bg_custom 不一致时会把 bg_custom 刚加上的
  // bgc-dark 类又摘掉（首页深色模式"闪回亮色"的直接原因），现两边判定逻辑完全一致，不再互踢。
  const DARK_MODE_KEY = 'bangumi-bg-custom-dark-mode';
  function readDarkPref() {
    try {
      const v = JSON.parse(localStorage.getItem(DARK_MODE_KEY));
      return v === 'on' || v === 'off' ? v : null;
    } catch (e) { return null; }
  }
  function siteNativeDark() {
    const el = document.documentElement;
    const t = el.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    const dc = ['night','dark','lights-off','dark-mode','theme-dark','nightmode'];
    for (const c of dc) { if (el.classList.contains(c) || (document.body && document.body.classList.contains(c))) return true; }
    if (document.body) {
      const m = getComputedStyle(document.body).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m && 0.299*+m[1] + 0.587*+m[2] + 0.114*+m[3] < 80) return true;
    }
    try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true; } catch (e) {}
    return false;
  }
  // bg_custom 未安装时由本脚本代写站点原生主题属性，官方深色 CSS（正文/输入框反色）才会生效；
  // bg_custom 已安装则交还给它管理，避免两边抢写
  function syncSiteTheme(isDark) {
    if (document.getElementById('bangumi-bg-custom-style')) return;
    const el = document.documentElement;
    const target = isDark ? 'dark' : 'light';
    if (el.getAttribute('data-theme') === target) return;
    el.setAttribute('data-theme-change', '1');
    el.setAttribute('data-theme', target);
    setTimeout(() => el.removeAttribute('data-theme-change'), 300);
  }
  function applyDark() {
    const pref = readDarkPref();
    const isDark = pref === 'on' ? true : pref === 'off' ? false : siteNativeDark();
    document.documentElement.classList.toggle('bgc-dark', isDark);
    syncSiteTheme(isDark);
  }
  function watchDark() {
    applyDark();
    const obs = new MutationObserver(applyDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme','class'] });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['class','style'] });
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDark); } catch (e) {}
    setInterval(applyDark, 2000);
  }

  // sort_group_main.ts
  // 深色检测立即启动（旧版等排序完成才启动，期间深色不生效）；
  // 排序仍等待页面依赖（jQuery/#subject_prg_content/cluetip）就绪
  watchDark();
  waitLoad().then(() => { bangumiSortGroup(); }).catch(console.error);
})();
