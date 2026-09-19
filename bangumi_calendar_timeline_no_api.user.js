// ==UserScript==
// @name         Bangumi 每日放送 · 时间轴 (No API)
// @name:zh-CN   Bangumi 每日放送 · 时间轴 (No API)
// @namespace    https://bangumi.tv/
// @version      1.3.1
// @description  把 /calendar 的密集 7 列网格替换为按天分列的时间轴视图。纯 DOM 提取，不调 API，刷新即显示；深色模式与站点原生 html[data-theme] 同步，玻璃参数与 bangumi_bg_custom 统一
// @description:zh-CN 纯 DOM 提取的时间轴视图，不调 API；深色与站点原生开关同步，玻璃统一
// @author       qbs
// @include      https://bgm.tv/calendar
// @include      https://bangumi.tv/calendar
// @include      https://chii.in/calendar
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  // -------------------- 样式（同 timeline 版，去掉 loading 相关）--------------------
  // 使用原生 style 元素注入，兼容 Tampermonkey 和超合金组件
  (() => {
    const style = document.createElement('style');
    style.textContent = `
    .bangumi, #main, .columns, .column, .mainWrapper { width: 100% !important; max-width: 100% !important; }
    #mainInner, .inner { width: 100% !important; max-width: 100% !important; padding-left: 12px; padding-right: 12px; box-sizing: border-box; }
    .columns { gap: 0 !important; }
    #colunmSingle { width: 100% !important; }

    .bct-wrap { width: 100%; font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #444; }
    .bct-toolbar { display: flex; align-items: center; gap: 10px; padding: 8px 4px 12px; flex-wrap: wrap; }
    .bct-toolbar .bct-title { font-size: 16px; font-weight: 600; color: #333; }
    .bct-toolbar .bct-stat  { font-size: 12px; color: #888; }
    .bct-toolbar .bct-nav   { display: inline-flex; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
    .bct-toolbar .bct-nav button { background:#fff; border:0; padding:4px 10px; cursor:pointer; font-size:12px; color:#666; }
    .bct-toolbar .bct-nav button:hover { background:#f5f5f5; color:#333; }
    .bct-toolbar .bct-nav button:disabled { color:#ccc; cursor:not-allowed; }

    .bct-scroller { display: flex; gap: 10px; padding: 4px 0 16px; width: 100%; }
    .bct-day { flex: 1 1 0; min-width: 0; background: #fff; border: 1px solid #ececec; border-radius: 8px; padding: 10px 8px 14px; box-sizing: border-box; }
    .bct-day.today { border-color: var(--primary-color, #f0911e); box-shadow: 0 0 0 2px rgba(240,145,30,.15); }
    .bct-day-head { text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #eee; }
    .bct-day-head .wd { font-size: 12px; color: #888; }
    .bct-day-head .dt { font-size: 18px; font-weight: 600; color: #333; margin-top: 2px; }
    .bct-day.today .bct-day-head .dt { color: var(--primary-color, #f0911e); }
    .bct-day-head .mk { font-size: 11px; color: #999; margin-top: 2px; }

    .bct-day .bct-empty { text-align: center; color: #999; padding: 24px 0; font-size: 12px; }

    .bct-ep { display: flex; gap: 8px; padding: 6px 4px; border-radius: 4px; margin-bottom: 4px; cursor: pointer; transition: background .12s; }
    .bct-ep:hover { background: #fafafa; }
    .bct-ep img { width: 64px; height: 80px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background:#eee; }
    .bct-ep .info { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
    .bct-ep .info .sub { font-size: 12px; font-weight: 600; color: #333; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .bct-ep .info .orig { font-size: 10px; color: #999;
      display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

    .bct-foot { font-size: 12px; color: #8f8f8f; padding: 6px 4px 0; text-align: right; }

    /* ==== 深色模式 ====
       与 bangumi_bg_custom 共用同一套玻璃 token（两边同值定义，谁先谁后注入都得到同一参数）：
       :root 给出浅色默认，html.bgc-dark 切换为深冷色玻璃，模糊/饱和一并统一。
       旧版在此自定义 --bgc-glass:38,38,46 且硬编码 #26262e/#333 等底色，
       与 bg_custom 的 16,18,28 及变量化区域同页混用，不同区域玻璃深浅不一，已全部变量化。 */
    :root { --bgc-glass: 255, 255, 255; --bgc-blur: 12px; --bgc-saturate: 160%; }
    html.bgc-dark { --bgc-glass: 16, 18, 28; --bgc-saturate: 150%; }
    html.bgc-dark .bct-wrap { color: #ccc; }
    html.bgc-dark .bct-toolbar .bct-title { color: #eee; }
    html.bgc-dark .bct-toolbar .bct-stat { color: #999; }
    html.bgc-dark .bct-toolbar .bct-nav { border-color: rgba(255,255,255,.16); }
    html.bgc-dark .bct-toolbar .bct-nav button { background: rgba(var(--bgc-glass), var(--4, .4)); color: #ccc; }
    html.bgc-dark .bct-toolbar .bct-nav button:hover { background: rgba(var(--bgc-glass), var(--6, .6)); color: #eee; }
    html.bgc-dark .bct-toolbar .bct-nav button:disabled { color: #666; }
    html.bgc-dark .bct-day {
      background: rgba(var(--bgc-glass), var(--4, .4));
      border-color: rgba(255,255,255,.12);
      -webkit-backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 150%));
      backdrop-filter: blur(var(--bgc-blur, 12px)) saturate(var(--bgc-saturate, 150%));
    }
    html.bgc-dark .bct-day.today { border-color: var(--primary-color, #f0911e); }
    html.bgc-dark .bct-day-head { border-bottom-color: rgba(255,255,255,.12); }
    html.bgc-dark .bct-day-head .wd { color: #999; }
    html.bgc-dark .bct-day-head .dt { color: #eee; }
    html.bgc-dark .bct-day-head .mk { color: #8f8f98; }
    html.bgc-dark .bct-day .bct-empty { color: #7d7d85; }
    html.bgc-dark .bct-ep:hover { background: rgba(255,255,255,.08); }
    html.bgc-dark .bct-ep img { background: rgba(255,255,255,.08); }
    html.bgc-dark .bct-ep .info .sub { color: #ddd; }
    html.bgc-dark .bct-ep .info .orig { color: #8f8f98; }
    html.bgc-dark .bct-foot { color: #8f8f98; }

    /* ==== 深色模式：顶部 tabbar 下方横线区域适配 ====
       #headerNeue2 底边框 + #header 标题条；border-bottom-color 只改颜色、
       不会恢复 bgStyle 里 border:none 已移除的边框，互不冲突（bg_val 存在时以 bgStyle 的 !important 为准） */
    html.bgc-dark #headerNeue2 { background: rgba(var(--bgc-glass),.85); border-bottom-color: rgba(255,255,255,.08); box-shadow: none; }
    html.bgc-dark #navMenuNeue li a.top, html.bgc-dark #navMenuNeue li a.top_lite { color: #b8b8c2; }
    html.bgc-dark #header { background: rgba(var(--bgc-glass),.35); }
    html.bgc-dark #header h1 { color: #e8e8ee; }
    html.bgc-dark #header small.blue { color: #7fa8c9; }
    html.bgc-dark #header .tip { color: #9a9aa5; }
    `;
    document.head.appendChild(style);
  })();

  // -------------------- 背景 & 毛玻璃（读取 bangumi_bg_custom 共享配置）--------------------
  (() => {
    const bgVal = localStorage.getItem('bangumi-bg-custom');
    if (!bgVal) return; // 用户未配置背景，跳过

    const opacityVal = parseFloat(localStorage.getItem('bangumi-bg-opacity')) || 1;
    // 透明度等级计算（同 bg_custom 公式）
    const a = (level) => {
      const l = level * 0.1;
      return `calc((${opacityVal} * ${l}) / (1 + ${opacityVal} * ${l} - ${l}))`;
    };

    const bgStyle = document.createElement('style');
    bgStyle.id = 'bct-bg-effect';
    bgStyle.textContent = `
      :root {
        --bg-custom: ${bgVal};
        --bg-opacity: ${opacityVal};
        --b0: 0;
        --b4: ${a(4)}; --b5: ${a(5)}; --b6: ${a(6)}; --b7: ${a(7)}; --b8: ${a(8)}; --b9: ${a(9)};
      }

      /* 全屏背景图（z-index 低于 -2：站点相册/封面候选图原生在 z-index:-2，背景层 -1 会盖住它们） */
      html::after {
        content: ''; height: 100%; width: 100%;
        position: fixed; top: 0; left: 0; opacity: 0.75;
        background: var(--bg-custom);
        background-size: cover;
        z-index: -3;
      }

      /* ==== 玻璃统一：模糊/饱和一律走 --bgc-blur / --bgc-saturate（旧版这里 4px/3px、
         bg_custom 是 12px，同页玻璃质感割裂）。!important 规则必须同时给出浅色与
         html.bgc-dark 深色变体，否则深色时会被浅色规则盖掉 ==== */

      /* 时间轴工具栏毛玻璃 */
      .bct-toolbar {
        background: rgba(var(--bgc-glass),var(--b7)) !important;
        border-radius: 8px;
        padding: 8px 12px 10px !important;
        margin-bottom: 8px;
        -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
        backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
      }
      html.bgc-dark .bct-toolbar { background: rgba(var(--bgc-glass),var(--b7)) !important; }

      /* 每日卡片毛玻璃 */
      .bct-day {
        background: rgba(var(--bgc-glass),var(--b7)) !important;
        -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
        backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
      }
      html.bgc-dark .bct-day {
        background: rgba(var(--bgc-glass),var(--b7)) !important;
        border-color: rgba(255,255,255,.12) !important;
      }
      .bct-day.today {
        background: rgba(var(--bgc-glass),var(--b8)) !important;
      }
      html.bgc-dark .bct-day.today {
        background: rgba(var(--bgc-glass),var(--b8)) !important;
      }

      /* 卡片头部虚线分隔改为半透明 */
      .bct-day-head { border-bottom-color: rgba(0,0,0,.08) !important; }
      html.bgc-dark .bct-day-head { border-bottom-color: rgba(255,255,255,.1) !important; }

      /* 条目悬停半透明 */
      .bct-ep:hover { background: rgba(var(--bgc-glass),var(--b4)); }
      html.bgc-dark .bct-ep:hover { background: rgba(255,255,255,.08); }

      /* 导航按钮毛玻璃 */
      .bct-toolbar .bct-nav button {
        background: rgba(var(--bgc-glass),var(--b6)) !important;
      }
      html.bgc-dark .bct-toolbar .bct-nav button {
        background: rgba(var(--bgc-glass),var(--b5)) !important;
        color: #ccc !important;
      }
      .bct-toolbar .bct-nav button:hover {
        background: rgba(var(--bgc-glass),var(--b8)) !important;
      }
      html.bgc-dark .bct-toolbar .bct-nav button:hover {
        background: rgba(var(--bgc-glass),var(--b7)) !important;
        color: #eee !important;
      }

      /* 脚注：原 b4(≈40%) 黑过淡导致难读，提高对比 */
      .bct-foot { color: rgba(0,0,0,.55) !important; }
      html.bgc-dark .bct-foot { color: rgba(255,255,255,.6) !important; }

      /* 覆盖原页面元素：让它们也半透明以显示背景 */
      #headerNeue2 {
        background: rgba(var(--bgc-glass),var(--b7)) !important; box-shadow: none; border: none;
        -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
        backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
      }
      html.bgc-dark #headerNeue2 { background: rgba(var(--bgc-glass),var(--b7)) !important; border-bottom-color: rgba(255,255,255,.1); }
      #footer #footerLinks { background: rgba(var(--bgc-glass),var(--b6)) !important; }
      html.bgc-dark #footer #footerLinks { background: rgba(var(--bgc-glass),var(--b6)) !important; }
      #navNeue2 #navMenuNeue li a.chl { background: rgba(var(--bgc-glass),var(--b5)) !important; }
      html.bgc-dark #navNeue2 #navMenuNeue li a.chl { background: rgba(var(--bgc-glass),var(--b5)) !important; }
    `;
    document.head.appendChild(bgStyle);
  })();

  // -------------------- 工具 --------------------
  const WEEKDAY_CN = ['周日','周一','周二','周三','周四','周五','周六'];
  const WEEKDAY_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const fmt2 = (n) => (n < 10 ? '0' + n : '' + n);
  const ymd = (d) => `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // -------------------- 从页面 DOM 收集 subject（同 timeline 版，去掉 API 兜底）--------------------
  function collectSubjects() {
    const dom = document.querySelector('.BgmCalendar');
    if (!dom) return [];

    const map = new Map(); // id -> {id, name, name_cn, image, weekday}

    const weekLis = [...dom.querySelectorAll('li.week')];

    weekLis.forEach((li, idx) => {
      let wdIdx = idx % 7; // 兜底：Sun→Sat 顺序
      // 新版页面：星期 class 在内部 <dt class="Sun/Mon/..."> 上
      const dt = li.querySelector('dt');
      const wdCls = dt ? [...dt.classList].find(c => WEEKDAY_EN.includes(c)) : null;
      if (wdCls) {
        wdIdx = WEEKDAY_EN.indexOf(wdCls);
      }
      li.querySelectorAll('li[style*="background"]').forEach(tile => {
        const a = tile.querySelector('a.nav');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const m = href.match(/\/subject\/(\d+)/);
        if (!m) return;
        const id = m[1];
        if (map.has(id)) return;
        const ps = tile.querySelectorAll('p');
        const name_cn = ps[0] ? ps[0].textContent.trim() : '';
        const name    = ps[1] ? ps[1].textContent.trim() : name_cn;
        const sm = (tile.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/);
        let image = sm ? sm[1] : '';
        if (image.startsWith('//')) image = 'https:' + image;
        map.set(id, { id, name, name_cn: name_cn || name, image, weekday: wdIdx });
      });
    });
    return [...map.values()];
  }

  // -------------------- 渲染 --------------------
  function render(container, subjects, startDate, days) {
    const endDate = addDays(startDate, days - 1);
    const dayKeys = [];
    for (let i = 0; i < days; i++) dayKeys.push(ymd(addDays(startDate, i)));

    // 按播出星期聚合
    const byDate = new Map();
    dayKeys.forEach(k => {
      const wd = new Date(k).getDay();
      const list = subjects
        .filter(s => s.weekday === wd)
        .sort((a, b) => (a.name_cn || '').localeCompare(b.name_cn || ''));
      byDate.set(k, list);
    });

    const todayStr = ymd(new Date());
    const totalSubs = [...byDate.values()].reduce((s, a) => s + a.length, 0);
    const todayCount = (byDate.get(todayStr) || []).length;

    container.innerHTML = `
      <div class="bct-wrap">
        <div class="bct-toolbar">
          <span class="bct-title">每日放送 · 时间轴</span>
          <span class="bct-stat">${ymd(startDate)} ~ ${ymd(endDate)} · 共 ${totalSubs} 部${todayStr >= ymd(startDate) && todayStr <= ymd(endDate) ? ` · 今日 ${todayCount} 部` : ''}</span>
          <div class="bct-nav">
            <button data-act="prev">‹ 上一周</button>
            <button data-act="today">今天</button>
            <button data-act="next">下一周 ›</button>
          </div>
        </div>
        <div class="bct-scroller" id="bct-scroller">
          ${dayKeys.map(k => {
            const d = new Date(k);
            const isToday = k === todayStr;
            const list = byDate.get(k) || [];
            return `
              <div class="bct-day ${isToday ? 'today' : ''}" data-date="${k}">
                <div class="bct-day-head">
                  <div class="wd">${WEEKDAY_CN[d.getDay()]} · ${fmt2(d.getMonth()+1)}/${fmt2(d.getDate())}</div>
                  <div class="dt">${d.getDate()}</div>
                  <div class="mk">${list.length} 部</div>
                </div>
                ${list.length === 0 ? '<div class="bct-empty">暂无放送</div>' :
                  list.map(sub => `
                    <div class="bct-ep" data-sub="${sub.id}">
                      <img loading="lazy" src="${sub.image}" onerror="this.style.visibility='hidden'">
                      <div class="info">
                        <div class="sub" title="${escapeHtml(sub.name_cn)}">${escapeHtml(sub.name_cn)}</div>
                        <div class="orig" title="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</div>
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            `;
          }).join('')}
        </div>
        <div class="bct-foot">数据来自页面 DOM · 覆盖 ${subjects.length} 部番 · 点击条目跳转到番剧主页</div>
      </div>
    `;

    // 点击事件：跳转番剧主页
    container.querySelectorAll('.bct-ep').forEach(el => {
      el.addEventListener('click', () => {
        window.open(`https://bgm.tv/subject/${el.dataset.sub}`, '_blank');
      });
    });

    // 导航按钮
    container.querySelector('[data-act="prev"]').onclick = () => window.bctRefresh(addDays(startDate, -7));
    container.querySelector('[data-act="next"]').onclick = () => window.bctRefresh(addDays(startDate, 7));
    container.querySelector('[data-act="today"]').onclick = () => window.bctRefresh(new Date());

    // 滚动到今天
    const todayCol = container.querySelector('.bct-day.today');
    if (todayCol) {
      requestAnimationFrame(() => todayCol.scrollIntoView({inline: 'start', block: 'nearest', behavior: 'auto'}));
    }
  }

  // -------------------- 深色模式检测（与 bangumi_bg_custom 共用同一套语义） --------------------
  // 优先级：共享偏好('on'/'off') > 站点原生 html[data-theme]（右下角「关灯」/系统偏好） >
  // 旧式深色 class > body 亮度 > 系统 prefers-color-scheme。
  // 旧版不认 data-theme：站点/系统已进深色而本脚本仍按浅色渲染玻璃，可读性崩坏。
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

  // -------------------- 主流程 --------------------
  function main() {
    const oldBox = document.querySelector('.BgmCalendar');
    if (!oldBox) {
      console.warn('[bct-no-api] .BgmCalendar not found');
      return;
    }

    const host = document.createElement('div');
    host.id = 'bangumi-calendar-timeline-no-api';
    oldBox.parentNode.insertBefore(host, oldBox);
    oldBox.style.display = 'none';

    let startDate = new Date(); startDate.setHours(0,0,0,0);
    const days = 7;

    const subjects = collectSubjects();
    if (!subjects.length) {
      oldBox.style.display = ''; // 还原，别全空白
      host.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">未能提取番组数据，已还原原视图</div>';
      return;
    }

    render(host, subjects, startDate, days);

    window.bctRefresh = (newStart) => {
      startDate = new Date(newStart); startDate.setHours(0,0,0,0);
      render(host, subjects, startDate, days);
    };
  }

  // 深色检测在脚本加载时立即启动（不依赖 .BgmCalendar 渲染完成）
  watchDark();

  // 等待 DOM 就绪
  const wait = () => document.querySelector('.BgmCalendar');
  let tries = 0;
  const t = setInterval(() => {
    if (wait() || ++tries > 60) {
      clearInterval(t);
      main();
    }
  }, 80);
})();
