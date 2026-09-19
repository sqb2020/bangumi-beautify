// ==UserScript==
// @name         Bangumi 每日放送 · 时间轴
// @name:zh-CN   Bangumi 每日放送 · 时间轴
// @namespace    https://bangumi.tv/
// @version      1.2.1
// @description  把 /calendar 的密集 7 列网格替换为按天分列的时间轴视图：每天显示当天放送的剧集（封面+集数+标题），今天高亮，支持左右切换日期；深色模式与站点原生 html[data-theme] 同步，玻璃参数与 bangumi_bg_custom 统一
// @description:zh-CN 把 /calendar 的密集 7 列网格替换为按天分列的时间轴视图；深色与站点原生开关同步，玻璃统一
// @author       qbs
// @include      https://bgm.tv/calendar
// @include      https://bangumi.tv/calendar
// @include      https://chii.in/calendar
// @connect      api.bgm.tv
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  // -------------------- 样式 --------------------
  GM_addStyle(`
    /* 全屏宽度：参考「每日放送全屏」脚本，让页面主体撑满视口 */
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

    /* 7 列等宽撑满屏幕 */
    .bct-scroller { display: flex; gap: 10px; padding: 4px 0 16px; width: 100%; }
    .bct-day { flex: 1 1 0; min-width: 0; background: #fff; border: 1px solid #ececec; border-radius: 8px; padding: 10px 8px 14px; box-sizing: border-box; }
    .bct-day.today { border-color: #f0911e; box-shadow: 0 0 0 2px rgba(240,145,30,.15); }
    .bct-day-head { text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #eee; }
    .bct-day-head .wd { font-size: 12px; color: #888; }
    .bct-day-head .dt { font-size: 18px; font-weight: 600; color: #333; margin-top: 2px; }
    .bct-day.today .bct-day-head .dt { color: #f0911e; }
    .bct-day-head .mk { font-size: 11px; color: #aaa; margin-top: 2px; }

    .bct-day .bct-empty { text-align: center; color: #999; padding: 24px 0; font-size: 12px; }

    .bct-ep { display: flex; gap: 8px; padding: 6px 4px; border-radius: 4px; margin-bottom: 4px; cursor: pointer; transition: background .12s; }
    .bct-ep:hover { background: #fafafa; }
    .bct-ep.pending { opacity: .55; }
    .bct-ep.pending .ep { color: #aaa; }
    .bct-ep.loading { opacity: .7; }
    .bct-ep.loading .ep { color: #bbb; font-style: italic; }
    .bct-ep img { width: 50px; height: 62px; object-fit: cover; border-radius: 3px; flex-shrink: 0; background:#eee; }
    .bct-ep .info { min-width: 0; flex: 1; }
    .bct-ep .info .sub { font-size: 12px; font-weight: 600; color: #333; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .bct-ep .info .ep { font-size: 11px; color: var(--primary-color, #f0911e); margin-top: 2px; }
    .bct-ep .info .ttl { font-size: 11px; color: #888; margin-top: 2px;
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
    html.bgc-dark .bct-ep .info .ttl { color: #999; }
    html.bgc-dark .bct-ep.pending .ep { color: #8f8f98; }
    html.bgc-dark .bct-ep.loading .ep { color: #777; }
    html.bgc-dark .bct-foot { color: #8f8f98; }
  `);

  // -------------------- 背景 & 毛玻璃（读取 bangumi_bg_custom 共享配置） --------------------
  // 旧版只有 no_api 变体做了这层适配，API 变体装了背景后日期卡片仍是死白，
  // 与全站玻璃质感割裂；两变体现在共用同一套规则（模糊/饱和走共享 token，深浅双变体齐全）
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

      /* ==== 玻璃统一：模糊/饱和一律走 --bgc-blur / --bgc-saturate（旧版 4px/3px、
         bg_custom 12px，同页玻璃质感割裂）。!important 规则必须同时给出浅色与
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

      /* 脚注：原 ≈40% 黑过淡导致难读，提高对比 */
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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // 限并发请求
  async function pMap(items, mapper, concurrency = 6, delay = 0) {
    const out = new Array(items.length);
    let i = 0;
    const workers = Array.from({length: concurrency}, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        try { out[idx] = await mapper(items[idx], idx); } catch (e) { out[idx] = null; }
        if (delay) await sleep(delay);
      }
    });
    await Promise.all(workers);
    return out;
  }

  // GM_xmlhttpRequest Promise 封装
  function gmFetch(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bangumi-calendar-timeline/1.0)' },
        responseType: 'json',
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) resolve(res.response);
          else reject(new Error('HTTP ' + res.status));
        },
        ontimeout: () => reject(new Error('timeout')),
        onerror: () => reject(new Error('network'))
      });
    });
  }

  // -------------------- 收集今日起 N 天的 subject --------------------
  async function collectSubjects(startDate, days) {
    // 优先用页面已有的 BgmCalendar DOM（已按星期分好）
    const dom = document.querySelector('.BgmCalendar');
    if (dom) {
      const map = new Map(); // id -> {id,name,name_cn,image,weekday}

      // 新版页面：每个 li.week 内含 <dl><dt class="Sun/Mon/...">，星期 class 在 dt 上
      const weekLis = [...dom.querySelectorAll('li.week')];

      weekLis.forEach((li, idx) => {
        let wdIdx = idx % 7; // 兜底：Sun→Sat 顺序
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
          // 名称：第一个 <p> 里的 a 文本（中日），第二个是原名
          const ps = tile.querySelectorAll('p');
          const name_cn = ps[0] ? ps[0].textContent.trim() : '';
          const name    = ps[1] ? ps[1].textContent.trim() : name_cn;
          // 封面：在 style 里（保留原始 URL，不替换路径，避免 lain.bgm.tv 404）
          const sm = (tile.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/);
          let image = sm ? sm[1] : '';
          if (image.startsWith('//')) image = 'https:' + image;
          map.set(id, { id, name, name_cn: name_cn || name, image, weekday: wdIdx });
        });
      });
      return [...map.values()];
    }
    // 兜底：调 /calendar API
    const data = await gmFetch('https://api.bgm.tv/calendar');
    const map = new Map();
    data.forEach(day => {
      const wdIdx = day.weekday.id - 1; // 1..7
      (day.items || []).forEach(it => {
        if (map.has(it.id)) return;
        const image = it.images && (it.images.medium || it.images.common || it.images.small || it.images.large) || '';
        map.set(it.id, { id: it.id, name: it.name, name_cn: it.name_cn || it.name, image, weekday: wdIdx });
      });
    });
    return [...map.values()];
  }

  // -------------------- 取每个 subject 的 episodes --------------------
  async function fetchEpisodes(subject) {
    try {
      const d = await gmFetch(`https://api.bgm.tv/subject/${subject.id}/ep`);
      return (d.eps || []).map(e => ({
        id: e.id,
        sort: e.sort,
        airdate: e.airdate || '',
        name: e.name_cn || e.name || '',
        status: e.status || '',
      })).filter(e => e.airdate);
    } catch (e) {
      return [];
    }
  }

  // -------------------- 渲染 --------------------
  // 为指定 subject 在某天选 episode：精确命中优先，否则取最近一集
  function pickEpisodeForDay(sub, k, episodesById) {
    const eps = (episodesById.get(sub.id) || []).slice();
    let ep = eps.find(e => e.airdate === k);
    const exact = !!ep;
    if (!ep && eps.length) {
      const t = new Date(k).getTime();
      ep = eps.reduce((best, e) => {
        if (!e.airdate) return best;
        const dt = Math.abs(new Date(e.airdate).getTime() - t);
        if (!best || dt < best._dt) return Object.assign({}, e, { _dt: dt });
        return best;
      }, null);
    }
    return { episode: ep, exact };
  }

  // 渲染单张卡片 HTML（提取出来便于「渐进式更新单卡」复用）
  function renderEpCard(subject, episode, exact, isToday, isLoading) {
    const epId = episode && episode.id ? episode.id : '';
    const epSort = episode && episode.sort ? episode.sort : '?';
    const isTodayPending = isToday && !exact;
    const epName = (episode && episode.name) || '';
    const epLine = isLoading
      ? `加载中…`
      : ((!exact && isToday) ? `第 ${epSort} 话 · 待播出` : `第 ${epSort} 话`);
    return `
      <div class="bct-ep ${isTodayPending ? 'pending' : ''} ${isLoading ? 'loading' : ''}" data-ep="${epId}" data-sub="${subject.id}">
        <img loading="lazy" src="${subject.image}" onerror="this.style.visibility='hidden'">
        <div class="info">
          <div class="sub" title="${escapeHtml(subject.name_cn)}">${escapeHtml(subject.name_cn)}</div>
          <div class="ep">${epLine}</div>
          <div class="ttl" title="${escapeHtml(epName)}">${escapeHtml(epName)}</div>
        </div>
      </div>`;
  }

  // 渐进式更新单张卡片：episodes 拉到一部后立即刷新它在所有出现的列里的内容
  function updateSubjectCard(host, subject, episodesById, dayKeys, todayStr) {
    host.querySelectorAll(`.bct-ep[data-sub="${subject.id}"]`).forEach(el => {
      const dayEl = el.closest('.bct-day');
      if (!dayEl) return;
      const k = dayEl.dataset.date;
      const isToday = k === todayStr;
      const { episode, exact } = pickEpisodeForDay(subject, k, episodesById);
      const newHtml = renderEpCard(subject, episode, exact, isToday, false);
      // 用 outerHTML 整体替换（保留 dataset 后续可点击）
      const tmp = document.createElement('div');
      tmp.innerHTML = newHtml.trim();
      const next = tmp.firstElementChild;
      if (next) el.replaceWith(next);
    });
  }

  // 更新顶部进度文本
  function updateProgress(host, done, total) {
    const el = host.querySelector('.bct-stat');
    if (!el) return;
    const base = el.dataset.base || '';
    el.textContent = `${base} · 加载进度 ${done}/${total}`;
  }

  function render(container, subjects, episodesById, startDate, days) {
    const endDate = addDays(startDate, days - 1);
    const dayKeys = [];
    for (let i = 0; i < days; i++) dayKeys.push(ymd(addDays(startDate, i)));

    // 按播出星期聚合
    const byDate = new Map();
    dayKeys.forEach(k => {
      const wd = new Date(k).getDay();
      const list = subjects.filter(s => s.weekday === wd).map(sub => {
        const { episode, exact } = pickEpisodeForDay(sub, k, episodesById);
        return { subject: sub, episode, exact, hasEps: episodesById.has(sub.id) };
      });
      byDate.set(k, list);
    });
    // 排序：精确命中按集数升序在前，未命中按番名在后
    byDate.forEach(arr => arr.sort((a, b) => {
      if (a.exact && !b.exact) return -1;
      if (!a.exact && b.exact) return 1;
      const sa = parseInt(a.episode && a.episode.sort, 10) || 0;
      const sb = parseInt(b.episode && b.episode.sort, 10) || 0;
      if (sa !== sb) return sa - sb;
      return (a.subject.name_cn || '').localeCompare(b.subject.name_cn || '');
    }));

    const todayStr = ymd(new Date());
    const totalSubs = [...byDate.values()].reduce((s, a) => s + a.length, 0);
    const todayCount = (byDate.get(todayStr) || []).length;
    const hasAnyEps = [...episodesById.values()].some(a => a && a.length);
    const statBase = `${ymd(startDate)} ~ ${ymd(endDate)} · 共 ${totalSubs} 部${todayStr >= ymd(startDate) && todayStr <= ymd(endDate) ? ` · 今日 ${todayCount} 部` : ''}`;

    container.innerHTML = `
      <div class="bct-wrap">
        <div class="bct-toolbar">
          <span class="bct-title">每日放送 · 时间轴</span>
          <span class="bct-stat" data-base="${escapeHtml(statBase)}">${statBase}${hasAnyEps ? '' : ' · 加载中…'}</span>
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
                  list.map(({subject, episode, exact, hasEps}) =>
                    renderEpCard(subject, episode, exact, isToday, !hasEps)
                  ).join('')
                }
              </div>
            `;
          }).join('')}
        </div>
        <div class="bct-foot">由 Bangumi 公开 API 驱动 · 覆盖 ${subjects.length} 部番 · 点击条目跳转到对应话</div>
      </div>
    `;

    // 事件
    container.querySelectorAll('.bct-ep').forEach(el => {
      el.addEventListener('click', () => {
        const epId = el.dataset.ep;
        const subId = el.dataset.sub;
        // 有集 id 跳到对应话，否则跳番剧主页
        window.open(epId ? `https://bgm.tv/ep/${epId}` : `https://bgm.tv/subject/${subId}`, '_blank');
      });
    });
    container.querySelector('.bct-scroller').addEventListener('click', (e) => {
      const epEl = e.target.closest('.bct-ep');
      if (!epEl) return;
      // 单击条目名 → 跳转番剧页
      if (e.target.closest('.info')) {
        // 默认行为已经覆盖（点击整行跳转到 ep），这里保持
      }
    });
    container.querySelector('[data-act="prev"]').onclick = () => window.bctRefresh(addDays(startDate, -7), days);
    container.querySelector('[data-act="next"]').onclick = () => window.bctRefresh(addDays(startDate, 7), days);
    container.querySelector('[data-act="today"]').onclick = () => window.bctRefresh(new Date(), days);

    // 滚动到今天
    const todayCol = container.querySelector('.bct-day.today');
    if (todayCol) {
      requestAnimationFrame(() => todayCol.scrollIntoView({inline: 'start', block: 'nearest', behavior: 'auto'}));
    }
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  async function main() {
    const oldBox = document.querySelector('.BgmCalendar');
    if (!oldBox) {
      console.warn('[bct] .BgmCalendar not found, give up');
      return;
    }

    // 准备容器
    const host = document.createElement('div');
    host.id = 'bangumi-calendar-timeline';
    oldBox.parentNode.insertBefore(host, oldBox);
    oldBox.style.display = 'none'; // 隐藏原密集网格

    let startDate = new Date(); startDate.setHours(0,0,0,0);
    let days = 7;

    const loading = document.createElement('div');
    loading.style.cssText = 'padding:40px;text-align:center;color:#aaa;';
    loading.textContent = '正在加载每日放送…';
    host.appendChild(loading);

    const subjects = await collectSubjects(startDate, days);
    if (!subjects.length) {
      loading.textContent = '未能获取任何番组，请检查网络';
      return;
    }
    loading.remove();

    const episodesById = new Map();
    // 立即渲染骨架：每张卡片显示「加载中…」，避免整页空白
    render(host, subjects, episodesById, startDate, days);

    window.bctRefresh = async (newStart, newDays) => {
      startDate = new Date(newStart); startDate.setHours(0,0,0,0);
      days = newDays || days;
      // 复用已加载 episodes，没有的再补
      const missing = subjects.filter(s => !episodesById.has(s.id));
      if (missing.length) {
        let done = 0;
        await pMap(missing, async (s) => {
          const eps = await fetchEpisodes(s);
          if (eps) {
            episodesById.set(s.id, eps);
            const dayKeys = [];
            for (let i = 0; i < days; i++) dayKeys.push(ymd(addDays(startDate, i)));
            updateSubjectCard(host, s, episodesById, dayKeys, ymd(new Date()));
          }
          done++;
          updateProgress(host, done, missing.length);
        }, 6, 30);
      }
      render(host, subjects, episodesById, startDate, days);
    };

    // 渐进式拉取：每完成一部就更新它的所有卡片，用户立即看到内容填充
    const dayKeys = [];
    for (let i = 0; i < days; i++) dayKeys.push(ymd(addDays(startDate, i)));
    let done = 0;
    await pMap(subjects, async (s) => {
      const eps = await fetchEpisodes(s);
      if (eps) {
        episodesById.set(s.id, eps);
        updateSubjectCard(host, s, episodesById, dayKeys, ymd(new Date()));
      }
      done++;
      updateProgress(host, done, subjects.length);
    }, 6, 30);

    // 全部完成后最终重渲染一次（按集数排序最终落地）
    render(host, subjects, episodesById, startDate, days);
  }

  // 深色检测在脚本加载时立即启动（旧版放在 main() 尾部，等集数拉完才生效，深色会迟到数十秒）
  watchDark();

  // 等待 #colunmSingle .BgmCalendar 出现
  const wait = () => document.querySelector('.BgmCalendar');
  let tries = 0;
  const t = setInterval(() => {
    if (wait() || ++tries > 50) {
      clearInterval(t);
      main().catch(err => console.error('[bct]', err));
    }
  }, 100);
})();