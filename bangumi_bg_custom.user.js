// ==UserScript==
// @name         Bangumi 自定义背景与毛玻璃
// @name:zh-CN   Bangumi 自定义背景与毛玻璃
// @namespace    https://bgm.tv/
// @version      1.8.0
// @description  自定义 bgm.tv 全站背景图片/颜色/渐变，可调透明度实现毛玻璃效果；与站点原生深色模式（html[data-theme]）双向同步，全区域统一玻璃参数。基于 rabbitohh 的 bangumi-css 项目改造，适配油猴和超合金组件
// @description:zh-CN 自定义 bgm.tv 全站背景+毛玻璃；深色模式与站点原生开关互通，玻璃效果全区域统一；支持油猴和超合金组件
// @author       qbs (based on rabbitohh's bangumi-css)
// @include      https://bgm.tv/*
// @include      https://bangumi.tv/*
// @include      https://chii.in/*
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  // ==================== 配置持久化 ====================
  const STORAGE_KEY_BG = 'bangumi-bg-custom';
  const STORAGE_KEY_OPACITY = 'bangumi-bg-opacity';
  const STORAGE_KEY_MODE = 'bangumi-bg-mode';
  const STORAGE_KEY_RANDOM_CAT = 'bangumi-bg-random-cat';
  const STORAGE_KEY_HISTORY = 'bangumi-bg-history';
  const DEFAULT_BG = 'linear-gradient(to right, rgb(250, 187, 187), rgb(238, 130, 146))';
  const DEFAULT_OPACITY = 1;
  const MAX_HISTORY = 20;

  function getBg() { return localStorage.getItem(STORAGE_KEY_BG) || DEFAULT_BG; }
  function getOpacity() { const v = parseFloat(localStorage.getItem(STORAGE_KEY_OPACITY)); return isNaN(v) || v < 0 ? DEFAULT_OPACITY : v; }
  function setBg(v) { localStorage.setItem(STORAGE_KEY_BG, v); }
  function setOpacity(v) { localStorage.setItem(STORAGE_KEY_OPACITY, String(v)); }
  function getMode() { return localStorage.getItem(STORAGE_KEY_MODE) || ''; }
  function setMode(v) { localStorage.setItem(STORAGE_KEY_MODE, v); }
  function getRandomCat() { return localStorage.getItem(STORAGE_KEY_RANDOM_CAT) || 'pc'; }
  function setRandomCat(v) { localStorage.setItem(STORAGE_KEY_RANDOM_CAT, v); }
  function getHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]'); } catch(e) { return []; } }
  function setHistory(arr) { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(arr)); }
  function addHistory(url, cat) {
    const h = getHistory();
    // 去重 + 前置
    const filtered = h.filter(item => item.url !== url);
    filtered.unshift({ url, cat, time: Date.now() });
    if (filtered.length > MAX_HISTORY) filtered.length = MAX_HISTORY;
    setHistory(filtered);
  }
  function removeHistory(url) {
    setHistory(getHistory().filter(item => item.url !== url));
  }

  // 从 JSON API 获取随机图片的实际 URL
  async function fetchRandomUrl(cat) {
    try {
      const resp = await fetch(`https://t.alcy.cc/json?${cat}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return (json && json.data && json.data.link) || null;
    } catch (e) {
      return null;
    }
  }

  let currentBg = getBg();
  let currentOpacity = getOpacity();

  // ==================== CSS 生成 ====================
  function generateCSS(bg, opacity) {
    // 计算透明度等级（公式源自原脚本，opacity 越大越不透明）
    const a = (level) => {
      const l = level * 0.1;
      return `calc((${opacity} * ${l}) / (1 + ${opacity} * ${l} - ${l}))`;
    };
    let css = `
/* ==== CSS 变量 ====
   --bgc-glass / --bgc-blur / --bgc-saturate 是全站玻璃的唯一事实源：
   本脚本与 bangumi_calendar_timeline(.no_api) / bangumi_week_blocks 共用同值定义，
   任何脚本注入先后都不影响最终参数（值相同即无冲突），保证同一网页所有区域玻璃一致 */
:root {
  --bg-custom: ${bg};
  --bg-opacity: ${opacity};
  --bgc-glass: 255, 255, 255;
  /* 统一毛玻璃参数：所有面板/卡片/侧边栏共享同一模糊度与饱和度，
     确保主内容区(.day-block)与侧边栏(SidePanel)视觉完全一致 */
  --bgc-blur: 12px;
  --bgc-saturate: 160%;
  color-scheme: light;
  --0: 0;
  --1: ${a(1)}; --2: ${a(2)}; --3: ${a(3)}; --4: ${a(4)}; --5: ${a(5)};
  --6: ${a(6)}; --7: ${a(7)}; --8: ${a(8)}; --9: ${a(9)}; --10: ${a(10)};
  --35: ${a(3.5)}; --45: ${a(4.5)}; --65: ${a(6.5)}; --77: ${a(7.7)}; --85: ${a(8.5)};
}
/* ==== 关灯模式变量 ====
   深色判定与站点原生 html[data-theme="dark"]（官方关灯开关/系统偏好）同步，
   由 JS 在 html 上切换 bgc-dark 类 */
html.bgc-dark {
  /* 关灯玻璃底色：用「保色相」的深冷色而非中灰。
     中灰（如 38,38,46）与背景图混合会把色彩去饱和成统一深灰浆糊——即「毛玻璃全是深色、只有深浅不同」；
     近黑的深冷色只压暗、不去色，面板因而透出背景图本身的丰富色彩，配合下方 backdrop-filter 成为发光毛玻璃。
     注意：此值与 companion 脚本里的 fallback 保持一致（16,18,28），不得单方面修改 */
  --bgc-glass: 16, 18, 28;
  --bgc-blur: 12px;
  --bgc-saturate: 150%;
  color-scheme: dark;
}

/* ==== 背景图片（全站） ==== */
html::after {
  content: '';
  height: 100%; width: 100%;
  position: fixed; top: 0; left: 0;
  opacity: 0.75;
  background: var(--bg-custom);
  background-size: cover;
  z-index: -1;
}

/* ==== 光标操作：黑条展开 ==== */
span[style*="background-color:#555"][style*="color:#555"] {
  box-shadow: #555 1px 1px 2px; border-radius: 2px;
}
span:hover[style*="background-color:#555"][style*="color:#555"] {
  position: relative; color: #fff !important; transition: all .5s;
}
span:hover[style*="background-color:#555"][style*="color:#555"]::after {
  content: "人家的秘密都被你看光了>人<";
  position: absolute; right: 0; color: #555; background-color: #fff;
  box-shadow: #555 1px 1px 2px; display: block; white-space: nowrap;
}

/* ==== 进度管理：条目悬停弹起 ==== */
ul.prg_list li:hover { margin-bottom: 8px !important; display: block; transition: .5s; margin-top: -5px; padding-top: 0; }
ul.prg_list li { margin-bottom: 3px !important; display: block; transition: .5s; margin-top: 0; }
.tinyMode a.epBtnWatched:hover, a.sepBtnWatched:hover { border: 1px solid #00A8FF !important; padding-top: 2px !important; background-color: #407fd3; transition: .5s; }
.tinyMode a.epBtnUnknown:hover, .tinyMode a.epBtnAir:hover, a.sepBtnUnknown:hover, a.sepBtnAir:hover { border: 1px solid #00A8FF !important; padding-top: 2px !important; background-color: #cddaed; transition: .5s; }
.tinyMode a.epBtnToday:hover { padding-top: 2px !important; background-color: #a8e398; border: #28674e 1px solid; transition: .5s; }
.tinyMode a.epBtnNA:hover { padding-top: 2px !important; background-color: #cac9c9; border: #28674e 1px solid; transition: .5s; }
div.subject_tag_section a.l:hover { margin-left: 5px; margin-right: 5px; background: rgba(255,255,255,.7) !important; color: #003d54; transition: .5s; }
.load-epinfo.epBtnToday { background: #b0eba0; border: #28674e 1px solid; }
a.epBtnWatched:hover { border: 1px solid #00A8FF !important; padding-top: 5px !important; background-color: #407fd3; transition: .5s; }
a.epBtnUnknown:hover, a.epBtnAir:hover { border: 1px solid #00A8FF !important; padding-top: 5px !important; background-color: #cddaed; transition: .5s; }
a.epBtnToday:hover { padding-top: 5px !important; background-color: #a8e398; border: #28674e 1px solid; transition: .5s; }
a.epBtnNA:hover { padding-top: 5px !important; background-color: #cac9c9; border: #28674e 1px solid; transition: .5s; }
/* 集数悬停弹出层：不透明背景 + 高 z-index，防止被毛玻璃层遮挡或透出模糊 */
.epv_popu_default { width: 90%; background: rgba(255,255,255,.97) !important; z-index: 99999 !important; position: relative; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.3); }

/* ==== 404 / 通用头部 ====
   原 .5/.6/.7 硬编码与下方 token 版重复且取值不一致（同页不同区域玻璃忽浓忽淡），已删除，
   统一由「首页样式优化」与「内页透明化」里的 var(--7)/var(--6) 规则承担 */

/* ========== 首页样式优化 ========== */
#headerNeue2 { background: rgba(255,255,255,var(--7)); border: none; box-shadow: none; }
a.chl:hover, a.chl { transition: 0.5s; }
/* 左侧中间容器透明化：消除 .halfPage / #prgManagerMain / #prgManagerHeader 的不透明背景，
   使 .day-block 与 SidePanel 同为单层毛玻璃，左右视觉完全统一 */
.halfPage.sort.ui-draggable { background: rgba(255,255,255,var(--0)); }
.sidePanelHome { background: rgba(255,255,255,var(--0)); }
#home_calendar { background: rgba(255,255,255,var(--6)); }
.clearit.week { border: none; }
#prgManagerMain { background: rgba(255,255,255,var(--0)); }
input.inputtext { background: rgba(255,255,255,var(--7)); }
#cloumnSubjectInfo a.prgCheckIn, ul#prgSubjectList li a.prgCheckIn { background: rgba(255,255,255,var(--0)); }
#prgManagerHeader { background: rgba(255,255,255,var(--0)); border: none; }
#cloumnSubjectInfo div.header, #cloumnSubjectInfo div.moreEp, ul#prgSubjectList.list li.sep, ul#prgSubjectList.full li.sep { background: rgba(255,255,255,var(--0)); border: none; }
ul#prgSubjectList.full { background: rgba(255,255,255,var(--0)); }
ul#prgSubjectList.full li p.listProgress span { background: rgba(65,180,218,var(--4)); border: none; }
ul#prgSubjectList.full li, div.sidePanelHome h2 { border: none; }
#home_calendar, ul.calendarMini div.coverList { border: none; }
ul.calendarMini div.coverList { background: rgba(255,255,255,var(--0)); }
small.grey { color: #8f8f8f; }
ul.calendarMini li, ul.calendarMini li.Sat, ul.calendarMini li.Mon, ul.calendarMini li.Tue, ul.calendarMini li.Wed, ul.calendarMini li.Thu, ul.calendarMini li.Fri, ul.calendarMini li.Sun { background: rgba(255,255,255,var(--0)); color: grey; border: none; }
.halfPage.sort.ui-draggable { padding-top: 5px; background: rgba(255,255,255,var(--0)); border-radius: 10px; }
textarea.quick { padding-top: 5px; background: rgba(255,255,255,var(--6)); border-radius: 10px; }
.line_odd, .line_even { background: rgba(255,255,255,var(--0)); border: none; }
#footer #footerLinks { background: rgba(255,255,255,var(--6)); border-radius: 10px; }
#columnTimelineInnerWrapper, #columnTimelineInnerWrapper ul.timelineTabs { background: rgba(255,255,255,var(--4)); }
div.SidePanelMini.clearit { background: rgba(255,255,255,var(--6)) !important; }
div.SidePanelMini.clearit.award2022 { background: rgba(255,255,255,var(--10)) !important; opacity: var(--6); }
#columnTimelineInnerB { background-color: rgba(255,255,255,var(--4)); }
#columnTimelineInnerB div.TsukkmiBox { background: rgba(255,255,255,var(--0)); }
#cloumnSubjectInfo div.infoWrapper_book div.header { background: rgba(255,255,255,var(--0)); border: none; }
hr.board { height: 0; }
#introWrapper { background: none; box-shadow: none; }
#timeline ul.subReply { background: rgba(255,255,255,var(--0)); }
input.inputBtn, a.fancyBtn { background: rgba(56,176,207,var(--6)); border-radius: 10px; border: none; }
li.doujin { z-index: -1; position: fixed; opacity: 0; }
#columnHomeA div.sort h2.subtitle:hover, #columnHomeB div.sort h2.subtitle:hover { border-radius: 10px 10px 0 0; background: rgba(255,255,255,var(--4)); }
.ui-draggable { padding-top: 5px; background: rgba(255,255,255,var(--6)); border-radius: 10px; }
.sort { background: rgba(255,255,255,var(--0)); }
#header > small.grey { color: white; }
#timeline h4.Header { border: none; }
#timeline ul li.tml_item .card:not(.card_tiny) { background: rgba(255,255,255,var(--4)); }
#timeline ul li.tml_item .card.card_tiny { background: rgba(255,255,255,var(--0)); }
#timeline ul li.tml_item .card.card_tiny .container { background: rgba(255,255,255,var(--4)); }
#timeline ul li.tml_item .card.card_tiny .container:hover { background: rgba(255,255,255,var(--6)); }
ul.sideTpcList .row:nth-child(odd), ul.sideTpcList .row:nth-child(2n) { background: rgba(255,255,255,var(--0)); }
#timeline ul li.tml_item .comment { background: rgba(255,255,255,var(--5)); border: none; }
#columnIntroB div.loginPanel { background: rgba(255,255,255,var(--5)); }
#columnIntroB div.loginPanel dt { background: rgba(255,255,255,var(--0)); border: none; }
#columnIntroB div.loginPanel dt input { background: rgba(255,255,255,var(--5)); }
textarea.quick:focus, textarea.reply:focus, textarea.reply { background: rgba(255,255,255,var(--5)) !important; }
#navNeue2 #navMenuNeue li a.chl { background: rgba(255,255,255,var(--5)); }
#anime-schedule-container { background: rgba(255,255,255,var(--5)); color: #343434; }
ul.sideTpcList .row:nth-child(odd), ul.sideTpcList .row:nth-child(2n), ul.timeline li, #prgManager { border: none; }
/* #prgManager / .sort 均不加 backdrop-filter：
   .sort(.halfPage.sort.ui-draggable) 背景已透明，若再加 blur 会在左侧产生多余模糊层
   （div#main blur → .sort blur → .day-block blur = 3层），
   而右侧仅 div#main blur → SidePanel blur = 2层，导致左右毛玻璃色彩不一致。
   去掉 .sort blur 后左右均为 2 层，视觉统一。 */
#home_calendar, #anime-schedule-container { -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); }
#prgManagerMain div.cloumnSubjects { border-right: #bfbfbf94 2px solid; }
#timeline ul li span.info { border: none; }

/* ========== 内页透明化 ========== */
/* div#main 是全站内容底板：亮色模式同样加 backdrop-filter，与深色模式及 SidePanel/头部保持
   相同的磨砂层数（此前只有深色模糊、亮色不模糊，同一网页不同区域玻璃质感不一致）；
   text-shadow 给正文加一层同色微光晕，提高毛玻璃上的文字可读性（深色模式在尾部有对应深色光晕） */
div#main {
  background: rgba(255,255,255,var(--4));
  -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
  backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
  text-shadow: 0 1px 1px rgba(255,255,255,.14);
}
.indexCatBox ul.cat li a.add, .indexCatBox ul.cat li a.add:hover { background: rgba(255,255,255,var(--0)); }
#user_home div.userSynchronize { background: rgba(255,255,255,var(--6)); }
ul.sideEpList li.even { background: rgba(255,255,255,var(--4)); }
ul.sideEpList li.cur { background: rgba(98,114,178,var(--77)) !important; }
#columnTimelineA #SayInput { background: rgba(255,255,255,var(--6)); }
ul#crtRelateSubjects li.old { background: rgba(255,255,255,var(--0)); }
div.SidePanel, div.SidePanelLow { background: rgba(255,255,255,var(--4)); -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); }
#eden_tpc_list ul li.line_odd:hover, #eden_tpc_list ul li.line_even:hover { background: rgba(255,255,255,var(--7)); }
div.subject_tag_section a.l { background: rgba(255,255,255,var(--7)); }
table.forumtable { background: rgba(255,255,255,var(--4)); }
table.forumtable tr.alt td { background: rgba(255,255,255,var(--0)); }
.subjectListWrapper { background: rgba(255,255,255,var(--5)); }
#columnSearchA ul, #columnSearchA ul li.root { background: rgba(255,255,255,var(--4)); }
#columnSearch { background: rgba(255,255,255,var(--4)); }
.magiHeader { background: rgba(255,255,255,var(--35)); }
.panelProgress.book { background: rgba(255,255,255,var(--35)); border-radius: 7px; border-color: rgba(153,153,153,.59); }
div#ChartWarpper { background: rgba(255,255,255,var(--0)); }
#columnSearchA ul li a:hover, #columnSearchA ul li a.selected { background: #f09199ad; }
.columnsApp.clearit { background: rgba(255,255,255,var(--5)); }
div.eden_rec_box { background: rgba(255,255,255,var(--5)); }
ul#browserItemList { background: rgba(255,255,255,var(--0)); }
div.infobox .modifyTool { background: rgba(255,255,255,var(--5)); }
#columnNotifyA div.even { background: rgba(255,255,255,var(--4)); }
#main.png_bg { background: rgba(255,255,255,var(--4)); }
ul.timelineTabs li a.focus, ul.timelineTabs li a.top_focus { background: rgba(255,255,255,var(--7)); }
.grp_box.clearit { background: rgba(255,255,255,var(--35)); }
#columnB, #pageHeader { background: rgba(255,255,255,var(--0)); }
ul.browserFull li.item.even { background: rgba(255,255,255,var(--0)); }
#columnSubjectBrowserB .sideInner { background: rgba(255,255,255,var(--5)); }
#columnSubjectBrowserB .sideInner h2 { background: rgba(255,255,255,var(--0)); }
select.form { background: rgba(255,255,255,var(--5)); }
input.btnPink, input.btnGray { background: #ff4a5952; }
#comment_list { background: rgba(255,255,255,var(--0)); }
/* #header / #headerSubject / .subject_section 等标题·导航区域改为透明或极淡底色，
   避免在 div#main 毛玻璃之上形成突兀色带横条（讨论页/条目页尤其明显） */
#header { background: rgba(255,255,255,var(--0)); }
/* .mainWrapper 只保留下面这条 var(--4) 规则：原先其上方的 var(--3) 与其下方的 var(--4)
   重复定义同一元素，取值还不一致，属同页玻璃不一致的来源，已合并 */
.mainWrapper, #comment_box .text, #comment_box .text_pm, .line_odd, .line_even, ul.line_list_music li.cat, ul.line_list li.cat { background: rgba(255,255,255,var(--4)); }
#grailBox2, ul.timelineTabs { background: rgba(255,255,255,var(--3)); }
#footer { background: rgba(255,255,255,var(--4)); }
.temples.tab_page_item.tab_page_item_0 { background: rgba(255,255,255,var(--3)); }
#headerSubject { background: rgba(255,255,255,var(--2)); }
.subject_section.clearit { background: rgba(255,255,255,var(--3)); }
tbody { background: rgba(255,255,255,var(--0)); }
hr.board, div#collect_title, #ChartWarpper .chart_desc { background: rgba(255,255,255,var(--0)); }
a.btnGreenSmall.rr { background: rgba(30,181,176,var(--45)); }
a.btnRedSmall.rr { background: rgba(200,106,106,var(--45)); }
#subject_inner_info, div.menu_inner { background: rgba(255,255,255,var(--5)); }
#headerNeue2 { background: rgba(255,255,255,var(--7)); }
div.grp_box { background: rgba(255,255,255,var(--5)); }
table.topic_list tr.header { background: rgba(255,255,255,var(--2)); }
#headerProfile div.subjectNav { background: rgba(255,255,255,var(--0)); }
#headerProfile .headerContainer { background: rgba(255,255,255,var(--2)); }
blockquote.intro { background: rgba(255,255,255,var(--4)); }
div.row_reply { background: rgba(255,255,255,var(--5)); }
a.chiiBtn { background: rgba(255,255,255,var(--5)); }
a.chiiBtn:hover { background: rgba(245,107,155,var(--4)); }
table.topic_list { border-radius: 15px; }
div.collectBlock p.collectModify { background: #ffffffba url(/img/ico/ico_list_love.gif) no-repeat 5px 50%; }
table.topic_list tr.even { background-color: #fff0; }
tr.odd { background-color: #f9f9f900; }
div.subject_section { background-color: #f9f9f900; border-radius: 10px; margin-bottom: 30px; }
ul.browserFull li.item span.rank, a.selected { background: #ff99bf4f !important; }
textarea#content { background: rgba(255,255,255,var(--5)) !important; }
.modifyTool { opacity: var(--9); }
div#footer ul#footerLinks { opacity: var(--9); }
/* 集数悬停弹出窗口（cluetip）：
   原 opacity:var(--85) 让弹出窗整体半透明，在毛玻璃页面上如同隔雾看花；
   改为不透明背景 + 高 z-index，确保弹出窗浮于毛玻璃层之上、清晰可读。
   rgba(255,255,255,.97) 在 dark 模式下经 replaceAll 变为 rgba(var(--bgc-glass),.97)
   即 97% 不透明深色背景，与页面毛玻璃和谐但不会被"吞没"。 */
#cluetip { opacity: 1 !important; z-index: 99999 !important; background: rgba(255,255,255,.97) !important; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.3); }
#cluetip #cluetip-inner { background: rgba(255,255,255,.95) !important; }
#timeline ul li.tml_item .card { background: rgba(255,255,255,var(--6)); }
#timeline ul li.tml_item .card.card_tiny .container { background: rgba(255,255,255,var(--0)); }
ul.sideTpcList .row:nth-child(odd) { background: rgba(255,255,255,var(--0)); }
#comment_list .row:nth-child(odd), #comment_list .row:nth-child(even) { background: rgba(255,255,255,var(--5)); }
.codeHighlight pre { background-color: rgba(255,255,255,var(--5)) !important; }
.infobox_container .infobox_expand { background: rgba(255,255,255,var(--4)); }
.infobox_container .infobox_expand a:hover { background: rgba(245,107,155,var(--4)); }
#comment_list div.row_state { background: rgba(255,255,255,var(--5)); }
div.reply_highlight { background: rgba(255,255,255,var(--4)) !important; }
#aboutTimeline ul.Events li.detail ul.column li, #aboutTimeline ul.Events li.intro p { background: rgba(255,255,255,var(--0)); }
#aboutTimeline { background: rgba(255,255,255,var(--4)); }
input.inputtext, textarea.reply { background: rgba(255,255,255,var(--5)) !important; }
input.inputBtn, a.fancyBtn { background: #ff7a947a; }
#columnCrtBrowserA { background: rgba(255,255,255,var(--5)); }
#columnCrtBrowserA h3 { background: none; }
#columnTimelineInnerB div.TsukkmiBox, #columnTimelineInnerWrapper { background: none; }
#columnTimelineInnerWrapper ul.timelineTabs, #columnTimelineInnerB { background: rgba(255,255,255,var(--3)); }
#timeline ul li.tml_item .comment { background: rgba(255,255,255,var(--5)); }
#columnIntroB div.loginPanel { background: rgba(255,255,255,var(--5)); }
#columnIntroB div.loginPanel dt { background: rgba(255,255,255,var(--0)); }
#timeline ul li.tml_item .card:not(.card_tiny) { background: rgba(255,255,255,var(--4)); }
#timeline ul li.tml_item .card.card_tiny { background: rgba(255,255,255,var(--0)); }
#timeline ul li.tml_item .card.card_tiny .container { background: rgba(255,255,255,var(--4)); }
#timeline ul li.tml_item .card.card_tiny .container:hover { background: rgba(255,255,255,var(--6)); }
rect[data-count="0"] { fill: rgb(255,255,255); }
ul.secTab li a { background: rgba(255,255,255,var(--5)); }
ul.secTab li a:hover { background: rgba(255,164,189,.14); }
#navNeue2 #navMenuNeue li a.chl { background: rgba(255,255,255,var(--5)); }
a.btnBlue, a.btnBlueSmall { background: rgba(255,255,255,var(--7)); }
a.btnBlue:hover, a.btnBlueSmall:hover { background: rgba(255,114,114,var(--4)); }
input.inputBtn:hover, a.fancyBtn:hover { background: rgba(255,98,130,var(--6)); }
.likes_grid .item { background: rgba(255,255,255,var(--6)); }
textarea.quick { background: rgba(255,255,255,var(--6)); }
textarea.quick:focus, textarea.reply:focus { background: rgba(255,255,255,var(--8)); }
#show-diff-view-side-by-side { background: rgba(255,255,255,var(--6)); }
.d2h-file-header, .d2h-code-side-linenumber { background: rgba(255,255,255,var(--6)); }
ul#infobox li.group_section { background: rgba(255,255,255,var(--4)); }
table.settings .tag_list li a { background: rgba(255,255,255,var(--8)); }
#sliderContainer { background: rgba(229,229,229,var(--5)); }
div.ui-widget-content { background: rgba(255,255,255,var(--7)); }

/* ========== 边框处理 ========== */
#timeline h4.Header, ul.timeline li, ul.tagList li, #headerNeue2, .line_odd, .line_even, .user_list.line_list li,
#columnSearch, a.cover:hover img.cover, img.cover, table.settings td, #columnSearchA ul li a,
#columnSearchA ul li a:hover, #columnSearchA ul li a.selected, #wrapperNeue #columnSubjectBrowserA #browserTools,
ul.browserFull li.item.even, div.light_odd, div.light_even, .borderNeue, #headerSubject div.subjectNav,
div.navSubTabsWrapper, div.section_line, ul.browserList li.even, div#footer ul#footerLinks, ul.browserList li.item,
ul#infobox li, ul.groupsLine li, div.subject_tag_section, table td.even, ul.browserCoverMedium li.sep,
div.subjectFilter, div.subjectFilter ul.grouped, #browserTools, ul.browserFull li.even, ul.browserFull li.item,
.cell.name.medium.ll, div.cell.ll, .line_list.user_list, input.inputtext, div.subject_section, table.topic_list tr.header,
ul.collect li.item, ul.collect li.cat, div.sub_reply_bg, #entry_list div.item, #columnSearchA ul,
div.SimpleSidePanel h2, div.user_box, ul#crtRelateSubjects li.old, ul.ajaxSubjectList li, #columnCrtBrowserB .crtTools
{ border: none; background: rgba(0,0,0,0); }
#headerSubject h1 { margin-top: 0; padding-top: 10px; }
.panelProgress.book { border-radius: 7px; border-color: rgba(153,153,153,.59); }
#eden_tpc_list ul li.line_odd:hover, #eden_tpc_list ul li.line_odd, #eden_tpc_list ul li.line_even:hover,
#eden_tpc_list ul li.line_even { transition: 0.8s; }
a.chl:hover, a.chl { transition: 0.5s; }
img.cover, img.cover:hover { padding: 0; border: 0; }
#headerNeue2, div.codeHighlight { -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate)); z-index: 9; box-shadow: none; }
a.tip_i, a.tip_i:link, a.tip_i:visited, a.tip_i:active, a.reply-plus-one { color: #686868; }
a.reply-plus-one { border: 1px solid #686868; }
div.re_info, div.re_info a, .tip_j { color: #686868; }
div.SimpleSidePanel { border-radius: 8px; }
#searchHomeBox ul.cat li a, .indexCatBox ul.cat li a { color: #7d7d7d !important; border-radius: 7px; box-shadow: none; }
img.cover { border-radius: 6px; }
#headerProfile div.subjectNav { border: none; margin-bottom: 0; }
/* #headerProfile, .mainWrapper, #main.png_bg, #columnSearch, div#main { width: 90%; margin: auto; }   -- 注释掉：bgm.tv 官方 CSS 已将内容中心化在 1000px，再加 90% 会导致多余白边 */
.tab_button { color: #000; }
span.count { filter: saturate(0); }
span.description, small.alarm { color: #000000f5; }
q { color: #767680; }
span.tip_i { color: rgb(83,79,104); }
ul { z-index: 99; }
span.userInfo { z-index: 99; }
table.forumtable { border: 2px; border-color: white; }
.columns.clearit { margin: auto; }
div[style*="width:800px; margin:0 auto; overflow:hidden"] { transform: translate(0,10%); }
.columnsApp.clearit { margin-top: 5px; margin-bottom: 100px; }
div.SidePanel h2, div.SidePanelLow h2 { text-shadow: none; }
#slider { width: 95%; margin-right: 2.5%; }
#sliderContainer { border: none; }
div.ui-widget-content { border: 1px solid #b4b4b4; }
.ui-state-default, .ui-widget-content .ui-state-default { border-radius: 40%; background: white; border: 1px solid #666; }
#eden_tpc_list { margin-top: -1px; }
.indexCatBox ul.cat li a.add { color: grey; }
.indexCatBox ul.cat li a.add:hover { color: #F09199; }
div.row_reply { margin-bottom: 7px; border-radius: 10px; }
#comment_list { box-shadow: none; }
input.inputBtn, a.fancyBtn { border-radius: 5px; border: none; }
table.topic_list { font-size: 13px !important; }
div.grp_box { border: 1px solid #F0F0F0; }
table.topic_list td.subject, table.topic_list th.subject { padding: 10px; }
.shareBtn { opacity: 0; position: fixed; z-index: -1000; }
div.eden_rec_box { border-radius: 20px; }
a.selected { border: 1px solid #c4c4c4bd !important; }
a.chiiBtn { box-shadow: none; border-radius: 4px; padding: 5px 10px; text-shadow: none; border: none; }
div.collectBlock p.collectModify { box-shadow: none; }
#comment_list div.row_reply:first-child, #comment_list div.row_reply:last-child { border-radius: 10px; border: 1px solid #F0F0F0; }
blockquote.intro { border-radius: 15px; border: 1px solid #F0F0F0; }
table.forumtable th { padding: 8px; }
div.subject_tag_section a.l { margin: 2px; transition: .5s; }
div.subject_tag_section a.l:hover small { color: #484848; }
div.subject_tag_section div.inner { padding-right: 5px; }
li.doujin { z-index: -1; position: fixed; opacity: 0; }
ul.navTabs { background: rgba(255,255,255,0) !important; border: none; }
.subjectNav .navTabs { width: 100%; }
.infobox_container .infobox_expand { border: none; border-radius: 4px; }
.infobox_container .infobox_expand a { border-radius: 4px; }
#comment_list div.row_state { border-radius: 4px !important; }
div.reply_highlight { border-color: #88c5ff82 !important; }
/* #wrapperNeue { min-width: 100% !important; }   -- 注释掉：会导致全站页面撑满屏，与其他 width:90% 规则冲突产生白条 */
ul.secTab li a.selected, ul.secTab li a.focus, ul.secTab li a:hover { color: black; }
#columnCrtBrowserA { border-radius: 10px; }
#timeline ul li span.info, #columnTimelineInnerWrapper ul.timelineTabs, #columnTimelineInnerWrapper, #columnTimelineInnerB { border: none; }
#timeline ul li.tml_item .comment { border: none; }
.mosaic-tile { padding: 5px; border-radius: 10px; }
ul.secTab li a, ul.secTab li:first-child a { padding: 5px 10px; text-shadow: none; box-shadow: none; border: none; }
a.selected { box-shadow: none; padding: 4px 9px 4.5px 9px !important; }
ul.secTab li a:hover { box-shadow: none; }
div.menu_inner { box-shadow: none; }
#navMenuNeue li a.focus { color: var(--primary-color, rgb(204,129,146)); }
a.btnBlue, a.btnBlueSmall { color: black; padding: 10px 20px; border-radius: 5px; }
#rakuen_infobox { width: 200px; }
#headerProfile h1 span { color: black; }
a.chiiBtn:hover { box-shadow: none; }
#show-diff-view-side-by-side { width: 90%; }
ul#infobox li.sub, ul#infobox li.sub_section, ul#infobox li.sub_group { border: none; }
#headerSubject span.collect a { line-height: 20px; }
ul#infobox li .tag { border: 1px solid #0084B4; }
a.cover:hover img.cover { padding: 0; }

/* ========== 小组标题居中 ========== */
/* .columns.clearit 原为 rgba(255,255,255,.3) 硬编码：它在 div#main 玻璃底板之上又叠一层浓淡
   与周边区域不同的白雾，是"同一网页不同区域玻璃不一致"的来源之一，归一为透明 */
.columns.clearit { background: rgba(255,255,255,var(--0)); }

/* ========== 封面 hover 放大（条目页） ========== */
img.cover:hover { height: 95%; width: 95%; box-shadow: 0 0 12px black; transition: all .5s; }
img.cover { margin: auto; height: 68%; width: 68%; box-shadow: none; transition: all .5s; }

/* ========== 封面放大（搜索/排行榜） ========== */
ul.browserFull li.item img.cover { max-width: 100px; }
.columns.clearit { display: -webkit-box; -webkit-box-pack: center; }
img.cover:hover { box-shadow: 0 0 12px black; height: 100%; width: 100%; transition: all .5s; }
#columnSearchA { margin-right: 0; }

/* 角色页封面 bug 排除 */
img.cover[src*="//lain.bgm.tv/pic/crt"] { box-shadow: none; transition: all .5s; }
img.cover[src*="//lain.bgm.tv/pic/crt"]:hover { box-shadow: 0 0 12px black; transition: all .5s; }

/* ========== 标题居中（原 Stylus 限定了页面范围，扁平化后与其他规则冲突，已注释） ========== */
/* #header { padding: 20px; }
h1 { display: block !important; text-align: center; }
#headerSubject, div.mainWrapper { margin-left: auto; padding-top: 10px; padding-bottom: 10px; }
#headerSubject div.subjectNav { width: 100%; height: 40px; text-align: center; }
#headerSubject { padding-bottom: 0; }
.subjectNav .navTabs { display: inline-block; width: auto !important; text-align: center; height: 20px; line-height: 20px; margin-top: 10px; } */

/* 讨论/日志页 h1 左对齐（已注释：原限定 blog/topic，扁平化后误伤全部页面） */
/* #headerSubject div.subjectNav { text-align: left !important; }
h1 { display: block !important; text-align: left !important; } */

/* ========== Wiki 界面 ========== */
input.multiKeyAdd {
  background: #a7db9c url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M19 11H13V5h-2v6H5v2h6v6h2v-6h6z'/%3E%3C/svg%3E") no-repeat center center;
  border-radius: 50%; border: 1.5px solid #85bf79; box-shadow: rgba(0,0,0,.2) 0px 4px 8px;
}

/* Wiki 统计 */
ul.wikiStats li { background: rgba(255,255,255,.5); border: none; box-shadow: none; margin: 3.5px; }
ul.wikiScrollBlock { border-radius: 10px; }
.user_list .cell.name { background: none; }
#comment_box .text, #comment_box .text_pm, .comment_box { background: rgba(255,255,255,.5); }

/* ========== 个人主页 ========== */
#columnA { margin: 5px 0 0 0; }
#columnTimelineInnerWrapper, #columnTimelineInnerWrapper ul.timelineTabs, div.SidePanelMini { background: rgba(255,255,255,.3); }
.line_odd, .line_even { background: rgba(255,255,255,0); border: none; }
#columnTimelineInnerB { background-color: rgba(255,255,255,0); }
#columnTimelineInnerB div.TsukkmiBox { background: rgba(255,255,255,0); }
ul.navTabs { background: rgba(255,255,255,var(--0)) !important; border: none; }

/* ========== 图片优化 ========== */
.pictureFrameGroup .overlay { background: none; }
img { image-rendering: -webkit-optimize-contrast; border-radius: 5px; }

/* ========== 组件页（原限定 dev/app，已注释避免全局生效） ========== */
/* .subjectNav .navTabs, #header { width: 1000px !important; margin: 0 auto; }
#header { background: none; } */

/* ========== BRRS 关联 ========== */
.brrs-editor-item, .brrs-editor-item:hover {
  border-radius: 15px; background: rgba(255,255,255,0);
  padding: 15px 10px; margin: 10px 0; border: none;
}
.brrs-previewer-item { background: rgba(255,255,255,.4); border-radius: 15px; margin-bottom: 80px; }

/* ========== 制作人员页 ========== */
ul.line_list li.cat { border: none; position: relative; }
ul.line_list li.cat::after {
  content: ""; position: absolute; bottom: 0; left: 1%;
  width: 98%; height: 1.2px; background-color: #00000036;
}
ul.sideEpList li.odd { background: rgba(255,255,255,.4); margin: 4px 0; }

/* ========== 用户页封面比例 ========== */
ul.coversSmall li { height: 140px; }
.pictureFrameGroup { height: 103px; }
.pictureFrameGroup .image { height: 100px; border-radius: 5px; }
.pictureFrameGroup .overlay { height: 103px; }
.pictureFrameGroup .image img { height: 100% !important; }
`;
    // 将硬编码白色玻璃底色替换为 CSS 变量（--bgc-glass 在关灯时切换为深色）
    css = css.replaceAll('rgba(255,255,255,', 'rgba(var(--bgc-glass),');
    // 关灯模式额外覆盖（非 rgba 白色 + 文字/边框颜色适配）
    css += `
/* ==== 关灯模式覆盖 ==== */
html.bgc-dark rect[data-count="0"] { fill: #2a2a32; }
html.bgc-dark .tab_button { color: #ddd; }
html.bgc-dark span.description, html.bgc-dark small.alarm { color: #ccc; }
html.bgc-dark #headerProfile h1 span { color: #eee; }
html.bgc-dark a.btnBlue, html.bgc-dark a.btnBlueSmall { color: #ddd; }
html.bgc-dark ul.secTab li a.selected, html.bgc-dark ul.secTab li a.focus, html.bgc-dark ul.secTab li a:hover { color: #eee; }
html.bgc-dark .ui-state-default, html.bgc-dark .ui-widget-content .ui-state-default { background: #444; border-color: #888; }
html.bgc-dark div.ui-widget-content { border-color: #555; }
html.bgc-dark #searchHomeBox ul.cat li a, html.bgc-dark .indexCatBox ul.cat li a { color: #aaa !important; }
html.bgc-dark div.grp_box { border-color: #3a3a44; }
html.bgc-dark #comment_list div.row_reply:first-child, html.bgc-dark #comment_list div.row_reply:last-child { border-color: #3a3a44; }
html.bgc-dark blockquote.intro { border-color: #3a3a44; }
html.bgc-dark a.tip_i, html.bgc-dark a.tip_i:link, html.bgc-dark a.tip_i:visited, html.bgc-dark a.tip_i:active, html.bgc-dark a.reply-plus-one { color: #999; }
html.bgc-dark a.reply-plus-one { border-color: #999; }
html.bgc-dark div.re_info, html.bgc-dark div.re_info a, html.bgc-dark .tip_j { color: #999; }
html.bgc-dark span.tip_i { color: #a09cbc; }
html.bgc-dark q { color: #999; }
html.bgc-dark small.grey { color: #8a8a92; }
html.bgc-dark #header > small.grey { color: #aaa; }
html.bgc-dark .indexCatBox ul.cat li a.add { color: #999; }
html.bgc-dark #navMenuNeue li a.focus { color: rgb(220,150,170); }
html.bgc-dark ul.line_list li.cat::after { background-color: rgba(255,255,255,.15); }
html.bgc-dark a.selected { border-color: #555 !important; }
html.bgc-dark #anime-schedule-container { color: #ccc; }
/* 配置面板 & 齿轮按钮暗色 */
html.bgc-dark #bg-custom-btn { background: rgba(50,50,60,.9) !important; color: #bbb !important; border-color: #555 !important; }
html.bgc-dark #bg-custom-panel { background: #2a2a34 !important; color: #ccc !important; box-shadow: 0 8px 32px rgba(0,0,0,.5) !important; }
html.bgc-dark #bg-custom-panel .bg-popup-title { color: #eee !important; }
html.bgc-dark #bg-custom-panel .bg-mode-btn { border-color: #555 !important; }
html.bgc-dark #bg-custom-panel input[type="text"], html.bgc-dark #bg-custom-panel select { background: #333 !important; color: #ddd !important; border-color: #555 !important; }
html.bgc-dark #bg-custom-panel #bg-btn-reset { background: #3a3a44 !important; color: #aaa !important; border-color: #555 !important; }
html.bgc-dark #bg-custom-panel .bg-hint { color: #888 !important; }
html.bgc-dark #bg-custom-panel .bg-hint a { color: #e0a050 !important; }

/* ==== 关灯毛玻璃 ====
   主内容容器加模糊+提饱和，让透出的背景图柔化成发光磨砂，而非平的深色块；
   saturate 抵消深色叠层带来的发暗/发灰，使色彩「活」起来。
   模糊度/饱和度通过 --bgc-blur / --bgc-saturate 变量统一，与亮色模式共享同一套参数。

   层叠策略（以讨论页为例）：
     div#main [blur]              ← 第 1 层：全站内容底板
       .mainWrapper (无 blur)     ← 仅极淡底色，不加模糊，避免多余层
         div.row_reply [blur]     ← 第 2 层：回帖卡片自带模糊
         div.SidePanel  [blur]    ← 第 2 层：侧栏自带模糊（base CSS 已有）
         blockquote.intro [blur]  ← 第 2 层：简介卡片
   回帖卡片与侧栏同为 2 层模糊，视觉和谐统一；
   卡片间的间隙仅 1 层模糊，形成自然层次感。 */
html.bgc-dark div#main,
html.bgc-dark #headerNeue2,
html.bgc-dark #footer,
html.bgc-dark #bgm-calendar-timeline,
html.bgc-dark #bangumi-calendar-timeline-no-api {
  -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
  backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
}
/* 关灯正文光晕：深色底上浅色文字加暗色微光晕，抵消背景图亮部对文字的干扰（与亮色 rgba 白光晕对应） */
html.bgc-dark div#main { text-shadow: 0 1px 1px rgba(0,0,0,.45); }
/* 内容卡片级模糊：回帖、简介在 div#main 模糊之上再加一层，
   与 SidePanel（base CSS 已有 backdrop-filter）保持相同层数，和谐统一 */
html.bgc-dark div.row_reply,
html.bgc-dark blockquote.intro {
  -webkit-backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
  backdrop-filter: blur(var(--bgc-blur)) saturate(var(--bgc-saturate));
}
/* 注：左侧中间容器透明化、#prgManager 去模糊、.day-block/.day-label 关灯覆盖
   已移至亮色基础规则中统一处理（中间层 var(--0) 透明 + #prgManager 无 backdrop-filter），
   bangumi_week_blocks 的 .day-block/.day-label 通过 --bgc-glass 变量自动适配关灯色，无需 !important 覆盖。 */
`;
    return css;
  }

  // ==================== 工具函数 ====================
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ==================== CSS 注入 ====================
  function injectCSS() {
    // 移除旧样式（重新注入时更新）
    const old = document.getElementById('bangumi-bg-custom-style');
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = 'bangumi-bg-custom-style';
    style.textContent = generateCSS(currentBg, currentOpacity);
    document.head.appendChild(style);
  }

  // ==================== 深色模式（与站点原生 html[data-theme] 双向同步） ====================
  // 站点主题由 chiiLib.ukagaka 管理：cookie 记忆用户选择，否则跟随系统 prefers-color-scheme
  //（并实时响应系统切换），统一通过 html[data-theme="dark|light"] 应用官方深色 CSS，
  // 右下角工具条自带「关灯/开灯」按钮（#toggleTheme）。
  // 本脚本策略：
  //   pref='auto'（默认）→ 跟随站点属性：原生开关、系统偏好变化都自动跟随；
  //   pref='on'/'off'    → 初始强制深/浅色；若用户点了站点自带开关，则采纳为新偏好，
  //                        避免脚本与站点互相拉扯（旧版会把站点开关改回 light，属于 bug）。
  const DARK_MODE_KEY = 'bangumi-bg-custom-dark-mode';
  let darkModePref = null;
  try { darkModePref = JSON.parse(localStorage.getItem(DARK_MODE_KEY)); } catch (e) {}
  // 合法值 on/off/auto；旧版把 auto 强制当 off 处理，现恢复 auto=跟随站点/系统
  if (darkModePref !== 'on' && darkModePref !== 'off' && darkModePref !== 'auto') darkModePref = 'auto';

  // 复刻站点 setTheme：data-theme-change="1" 触发官方 300ms 过渡，随后移除
  function setSiteTheme(theme) {
    const el = document.documentElement;
    if (el.getAttribute('data-theme') === theme) return;
    el.setAttribute('data-theme-change', '1');
    el.setAttribute('data-theme', theme);
    setTimeout(() => el.removeAttribute('data-theme-change'), 300);
  }

  // 站点原生深色判定：data-theme 优先，其余为无属性时的兜底
  function detectSiteDark() {
    const el = document.documentElement;
    const t = el.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    const dc = ['night', 'dark', 'lights-off', 'dark-mode', 'theme-dark', 'nightmode'];
    for (const c of dc) {
      if (el.classList.contains(c) || (document.body && document.body.classList.contains(c))) return true;
    }
    if (document.body) {
      const m = getComputedStyle(document.body).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m && 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] < 80) return true;
    }
    try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true; } catch (e) { /* ignore */ }
    return false;
  }

  function applyDarkMode() {
    const isDark = darkModePref === 'on' ? true
      : darkModePref === 'off' ? false
      : detectSiteDark();
    document.documentElement.classList.toggle('bgc-dark', isDark);
    // 同步站点原生主题属性：官方深色 CSS（正文/输入框/链接反色等）才能生效；
    // auto 模式下属性归站点自己维护，仅在其缺失时补写
    if (darkModePref !== 'auto' || !document.documentElement.getAttribute('data-theme')) {
      setSiteTheme(isDark ? 'dark' : 'light');
    }
    // 同步站点「关灯/开灯」按钮文案
    try {
      if (window.chiiLib && chiiLib.ukagaka && typeof chiiLib.ukagaka.isDark === 'function') {
        chiiLib.ukagaka.isDark(isDark);
      }
    } catch (e) { /* ignore */ }
    return isDark;
  }

  function setDarkModePref(pref) {
    darkModePref = pref;
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(pref));
    applyDarkMode();
  }

  function startDarkModeWatcher() {
    applyDarkMode();
    // 监听站点原生主题属性：auto 直接跟随；on/off 被站点开关改动时采纳为新偏好
    new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr !== 'dark' && attr !== 'light') return;
      const forced = darkModePref === 'on' ? 'dark' : darkModePref === 'off' ? 'light' : null;
      if (forced && attr !== forced) {
        setDarkModePref(attr); // 用户点了站点自带的「关灯/开灯」→ 采纳，不抢回
      } else {
        applyDarkMode();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyDarkMode());
    } catch (e) { /* ignore */ }
    // 其他标签页修改偏好时同步
    window.addEventListener('storage', (e) => {
      if (e.key === DARK_MODE_KEY) {
        try {
          const v = JSON.parse(e.newValue);
          if (v === 'on' || v === 'off' || v === 'auto') darkModePref = v;
        } catch (err) { /* ignore */ }
        applyDarkMode();
      }
    });
  }

  // ==================== 触发入口：挂到 bangumi 右下角自带工具条 ====================
  // bangumi 首页右下角有自带的悬浮工具条（含"个性化""隐藏"按钮）。
  // 把"背景"入口直接挂进这个工具条，避免脚本再单独放一个浮动齿轮按钮。
  function findPersonalizeLink() {
    let link = document.querySelector('a[title="个性化"]');
    if (!link) {
      for (const a of document.querySelectorAll('a')) {
        if (a.textContent.trim() === '个性化') { link = a; break; }
      }
    }
    return link;
  }

  function mountToPersonalizeToolbar() {
    const link = findPersonalizeLink();
    if (!link) return null;
    const li = link.closest('li');
    const ul = li && li.parentElement;
    if (!ul) return null;
    const entry = document.createElement('a');
    entry.href = 'javascript:void(0);';
    entry.title = '背景美化设置';
    entry.setAttribute('aria-label', '背景美化设置');
    // 用「图片」符号代替文字，currentColor 自动跟随工具条主题色
    entry.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="display:inline-block;vertical-align:-2px;opacity:.8;transition:transform .25s ease,opacity .25s ease;">' +
      '<rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5"/>' +
      '<circle cx="8.5" cy="8.5" r="1.5"/>' +
      '<path d="M21 15l-5-5L5 21"/>' +
      '</svg>';
    const icon = entry.querySelector('svg');
    entry.addEventListener('mouseenter', () => { icon.style.transform = 'scale(1.25)'; icon.style.opacity = '1'; });
    entry.addEventListener('mouseleave', () => { icon.style.transform = 'scale(1)'; icon.style.opacity = '.8'; });
    const newLi = document.createElement('li');
    newLi.appendChild(entry);
    li.insertAdjacentElement('afterend', newLi);
    return entry;
  }

  // 找不到工具条时的兜底浮动齿轮按钮
  function createFallbackBtn() {
    const btn = document.createElement('div');
    btn.id = 'bg-custom-btn';
    btn.innerHTML = '⚙';
    btn.title = 'Bangumi 背景设置';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '99999',
      width: '40px', height: '40px', borderRadius: '50%',
      background: 'rgba(255,255,255,.85)', boxShadow: '0 2px 8px rgba(0,0,0,.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: '20px', color: '#666',
      transition: 'transform .2s, box-shadow .2s', userSelect: 'none',
      border: '1px solid #e0e0e0',
    });
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,.2)'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)'; };
    document.body.appendChild(btn);
    return btn;
  }

  // ==================== 交互式配置面板 UI ====================
  function createConfigUI() {
    // 弹窗
    const panel = document.createElement('div');
    panel.id = 'bg-custom-panel';
    Object.assign(panel.style, {
      position: 'fixed', bottom: '70px', right: '20px', zIndex: '99998',
      width: '420px', background: '#fff', borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,.2)', padding: '20px',
      display: 'none', fontFamily: '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
      color: '#444', fontSize: '14px', lineHeight: '1.6',
    });

    // 解析 currentBg 判断当前模式（优先用存储的 mode，其次检测值内容）
    function detectMode(val) {
      const sm = getMode();
      if (sm === 'random') return 'random';
      if (sm === 'gradient' || val.includes('gradient')) return 'gradient';
      if (sm === 'image' || val.includes('url(')) return 'image';
      if (sm === 'color') return 'color';
      if (val.includes('#')) return 'color';
      return 'color';
    }
    // 解析渐变参数
    function parseGradient(val) {
      const dirMatch = val.match(/(to\s+\w+(\s+\w+)?)/);
      const colors = [...val.matchAll(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g)].map(m => m[1]);
      return {
        direction: dirMatch ? dirMatch[1] : 'to right',
        c1: colors[0] || '#fabbbb',
        c2: colors[1] || '#ee8292',
      };
    }
    // 解析色值（支持 #xxx 和 rgb(...)）
    function extractColor(val) {
      const hex = val.match(/(#[0-9a-fA-F]{3,8})/);
      if (hex) return hex[1];
      const rgb = val.match(/rgba?\(([^)]+)\)/);
      if (rgb) {
        const parts = rgb[1].split(/[\s,]+/).filter(Boolean);
        const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2]);
        return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
      }
      return '#fabbbb';
    }
    // 构建背景值
    function buildBg() {
      const mode = panel.querySelector('input[name="bg-mode"]:checked').value;
      if (mode === 'color') {
        return panel.querySelector('#bg-color-solid').value;
      }
      if (mode === 'gradient') {
        const dir = panel.querySelector('#bg-grad-dir').value;
        const c1 = panel.querySelector('#bg-grad-c1').value;
        const c2 = panel.querySelector('#bg-grad-c2').value;
        return `linear-gradient(${dir}, ${c1}, ${c2})`;
      }
      if (mode === 'image') {
        const u = panel.querySelector('#bg-img-url').value.trim();
        return u ? `url("${u}")` : DEFAULT_BG;
      }
      if (mode === 'preset') {
        const sel = panel.querySelector('#bg-preset-select').value;
        return sel || DEFAULT_BG;
      }
      if (mode === 'random') {
        // 返回当前的随机图片 URL（可能已解析为实际图片链接）
        // 如果是 API 端点格式则临时构建，apply 时会解析为实际 URL
        const cat = panel.querySelector('#bg-random-cat').value;
        if (currentBg.includes('tc.alcy.cc') || currentBg.includes('lain.bgm.tv')) {
          return currentBg; // 已解析过的实际 URL
        }
        return `url("https://t.alcy.cc/${cat}")`;
      }
      return DEFAULT_BG;
    }

    const initialMode = detectMode(currentBg);
    let gc = { direction: 'to right', c1: '#fabbbb', c2: '#ee8292' };
    if (initialMode === 'gradient') gc = parseGradient(currentBg);
    const solidColor = initialMode === 'color' ? extractColor(currentBg) : '#fabbbb';
    const imgUrl = initialMode === 'image' ? (currentBg.match(/url\(["']?([^"')]+)["']?\)/) || ['',''])[1] : '';
    const randomCat = initialMode === 'random' ? (currentBg.match(/t\.alcy\.cc\/([^"')\s]+)/) || ['','pc'])[1] : 'pc';

    panel.innerHTML = `
      <div class="bg-popup" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span class="bg-popup-title" style="font-size:16px;font-weight:600;color:#333;">Bangumi 背景设置</span>
        <span id="bg-panel-close" style="cursor:pointer;font-size:18px;color:#aaa;line-height:1;" title="关闭">✕</span>
      </div>

      <!-- 深色模式：自动=跟随站点原生开关/系统偏好 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:8px 10px;border-radius:8px;background:rgba(128,128,128,.08);">
        <span style="font-size:13px;">🌙 深色模式</span>
        <div style="display:flex;border-radius:6px;overflow:hidden;border:1px solid rgba(128,128,128,.3);">
          <button id="bg-dark-auto" title="跟随站点右下角「关灯/开灯」开关与系统偏好" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:${darkModePref==='auto'?'#f0911e':'transparent'};color:${darkModePref==='auto'?'#fff':'inherit'};transition:.15s;">自动</button>
          <button id="bg-dark-light" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;border-left:1px solid rgba(128,128,128,.3);background:${darkModePref==='off'?'#f0911e':'transparent'};color:${darkModePref==='off'?'#fff':'inherit'};transition:.15s;">亮色</button>
          <button id="bg-dark-dark" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;border-left:1px solid rgba(128,128,128,.3);background:${darkModePref==='on'?'#f0911e':'transparent'};color:${darkModePref==='on'?'#fff':'inherit'};transition:.15s;">暗色</button>
        </div>
      </div>

      <!-- 实时预览 -->
      <div id="bg-live-preview" style="width:100%;height:60px;border-radius:8px;margin-bottom:14px;border:1px solid #eee;background:${currentBg};background-size:cover;background-position:center;transition:background .3s;"></div>

      <!-- 模式切换 -->
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <label class="bg-mode-btn" style="flex:1;text-align:center;padding:6px 0;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid #ddd;background:${initialMode==='color'?'#f0911e':'#fff'};color:${initialMode==='color'?'#fff':'#666'};transition:.15s;">
          <input type="radio" name="bg-mode" value="color" style="display:none;" ${initialMode==='color'?'checked':''}> 纯色
        </label>
        <label class="bg-mode-btn" style="flex:1;text-align:center;padding:6px 0;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid #ddd;background:${initialMode==='gradient'?'#f0911e':'#fff'};color:${initialMode==='gradient'?'#fff':'#666'};transition:.15s;">
          <input type="radio" name="bg-mode" value="gradient" style="display:none;" ${initialMode==='gradient'?'checked':''}> 渐变
        </label>
        <label class="bg-mode-btn" style="flex:1;text-align:center;padding:6px 0;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid #ddd;background:${initialMode==='image'?'#f0911e':'#fff'};color:${initialMode==='image'?'#fff':'#666'};transition:.15s;">
          <input type="radio" name="bg-mode" value="image" style="display:none;" ${initialMode==='image'?'checked':''}> 图片
        </label>
        <label class="bg-mode-btn" style="flex:1;text-align:center;padding:6px 0;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid #ddd;background:#fff;color:#666;transition:.15s;">
          <input type="radio" name="bg-mode" value="preset" style="display:none;"> 预设
        </label>
        <label class="bg-mode-btn" style="flex:1;text-align:center;padding:6px 0;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid #ddd;background:${initialMode==='random'?'#f0911e':'#fff'};color:${initialMode==='random'?'#fff':'#666'};transition:.15s;">
          <input type="radio" name="bg-mode" value="random" style="display:none;" ${initialMode==='random'?'checked':''}> 随机
        </label>
      </div>

      <!-- 纯色模式 -->
      <div class="bg-mode-panel" id="bg-mode-color" style="display:${initialMode==='color'?'block':'none'};margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="color" id="bg-color-solid" value="${solidColor}" style="width:44px;height:44px;border:none;border-radius:6px;cursor:pointer;padding:0;background:none;">
          <input type="text" id="bg-color-hex" value="${solidColor}" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:14px;font-family:monospace;box-sizing:border-box;" placeholder="#afc9f0">
        </div>
      </div>

      <!-- 渐变模式 -->
      <div class="bg-mode-panel" id="bg-mode-gradient" style="display:${initialMode==='gradient'?'block':'none'};margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-size:13px;color:#888;white-space:nowrap;">方向</span>
          <select id="bg-grad-dir" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box;">
            <option value="to right" ${gc.direction==='to right'?'selected':''}>→ 右</option>
            <option value="to left" ${gc.direction==='to left'?'selected':''}>← 左</option>
            <option value="to bottom" ${gc.direction==='to bottom'?'selected':''}>↓ 下</option>
            <option value="to top" ${gc.direction==='to top'?'selected':''}>↑ 上</option>
            <option value="to right bottom" ${gc.direction==='to right bottom'?'selected':''}>↘ 右下</option>
            <option value="to right top" ${gc.direction==='to right top'?'selected':''}>↗ 右上</option>
            <option value="to left bottom" ${gc.direction==='to left bottom'?'selected':''}>↙ 左下</option>
            <option value="to left top" ${gc.direction==='to left top'?'selected':''}>↖ 左上</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="color" id="bg-grad-c1" value="${gc.c1}" style="width:36px;height:36px;border:none;border-radius:6px;cursor:pointer;padding:0;background:none;">
            <input type="text" class="bg-grad-hex" value="${gc.c1}" style="width:72px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;" placeholder="#fabbbb">
          </div>
          <span style="color:#ccc;font-size:18px;">→</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="color" id="bg-grad-c2" value="${gc.c2}" style="width:36px;height:36px;border:none;border-radius:6px;cursor:pointer;padding:0;background:none;">
            <input type="text" class="bg-grad-hex" value="${gc.c2}" style="width:72px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;" placeholder="#ee8292">
          </div>
        </div>
      </div>

      <!-- 图片模式 -->
      <div class="bg-mode-panel" id="bg-mode-image" style="display:${initialMode==='image'?'block':'none'};margin-bottom:14px;">
        <input type="text" id="bg-img-url" value="${escapeHtml(imgUrl)}" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box;" placeholder="https://lain.bgm.tv/pic/photo/l/...">
        <div style="font-size:11px;color:#999;margin-top:4px;">支持 lain.bgm.tv 图片直链，也可用其他图床 URL</div>
      </div>

      <!-- 预设模式 -->
      <div class="bg-mode-panel" id="bg-mode-preset" style="display:none;margin-bottom:14px;">
        <div id="bg-preset-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${[
            {label:'樱花粉', val:'linear-gradient(to right, rgb(250,187,187), rgb(238,130,146))', bg:'linear-gradient(to right, #fabbbb, #ee8292)'},
            {label:'海洋蓝', val:'linear-gradient(to right, rgb(56,189,248), rgb(59,130,246))', bg:'linear-gradient(to right, #38bdf8, #3b82f6)'},
            {label:'紫罗兰', val:'linear-gradient(to right, rgb(168,140,255), rgb(100,149,237))', bg:'linear-gradient(to right, #a88cff, #6495ed)'},
            {label:'深空蓝', val:'linear-gradient(to bottom, rgb(10,25,47), rgb(22,58,89))', bg:'linear-gradient(to bottom, #0a192f, #163a59)'},
            {label:'黄昏橙', val:'linear-gradient(to right, rgb(251,146,60), rgb(251,113,133))', bg:'linear-gradient(to right, #fb923c, #fb7185)'},
            {label:'薄荷绿', val:'linear-gradient(to right, rgb(110,231,183), rgb(52,211,153))', bg:'linear-gradient(to right, #6ee7b7, #34d399)'},
            {label:'暗夜黑', val:'#1a1a2e', bg:'#1a1a2e'},
            {label:'暖米白', val:'#f5f0eb', bg:'#f5f0eb'},
            {label:'星空紫', val:'linear-gradient(to bottom, rgb(67,56,202), rgb(124,58,237))', bg:'linear-gradient(to bottom, #4338ca, #7c3aed)'},
          ].map(p => `
            <div class="bg-preset-item" style="height:56px;border-radius:6px;cursor:pointer;overflow:hidden;position:relative;background:${p.bg};background-size:cover;"
                 data-val="${escapeHtml(p.val)}" title="${p.label}">
              <span style="position:absolute;bottom:0;left:0;right:0;padding:2px 0;text-align:center;font-size:11px;color:#fff;background:rgba(0,0,0,.35);">${p.label}</span>
            </div>
          `).join('')}
        </div>
        <input type="hidden" id="bg-preset-select" value="">
      </div>

      <!-- 随机图片模式（基于 t.alcy.cc API，每次页面加载自动换图） -->
      <div class="bg-mode-panel" id="bg-mode-random" style="display:${initialMode==='random'?'block':'none'};margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:13px;color:#888;white-space:nowrap;">分类</span>
          <select id="bg-random-cat" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box;">
            <option value="pc" ${randomCat==='pc'?'selected':''}>PC 横图 · 通用</option>
            <option value="ycy" ${randomCat==='ycy'?'selected':''}>二次元 · 自适应</option>
            <option value="moez" ${randomCat==='moez'?'selected':''}>萌版 · 自适应</option>
            <option value="moe" ${randomCat==='moe'?'selected':''}>萌版 · 横图</option>
            <option value="ai" ${randomCat==='ai'?'selected':''}>AI · 自适应</option>
            <option value="fj" ${randomCat==='fj'?'selected':''}>风景 · 横图</option>
            <option value="bd" ${randomCat==='bd'?'selected':''}>白底 · 横图</option>
            <option value="ysz" ${randomCat==='ysz'?'selected':''}>原神 · 自适应</option>
            <option value="ys" ${randomCat==='ys'?'selected':''}>原神 · 横图</option>
            <option value="mp" ${randomCat==='mp'?'selected':''}>萌版 · 竖图</option>
            <option value="moemp" ${randomCat==='moemp'?'selected':''}>通用 · 竖图</option>
            <option value="aimp" ${randomCat==='aimp'?'selected':''}>AI · 竖图</option>
            <option value="ysmp" ${randomCat==='ysmp'?'selected':''}>原神 · 竖图</option>
            <option value="tx" ${randomCat==='tx'?'selected':''}>头像 · 方图</option>
            <option value="acg" ${randomCat==='acg'?'selected':''}>ACG · 动图</option>
            <option value="lai" ${randomCat==='lai'?'selected':''}>七濑胡桃</option>
            <option value="xhl" ${randomCat==='xhl'?'selected':''}>小狐狸</option>
          </select>
        </div>
        <div style="font-size:11px;color:#999;">
          图片由 <a href="https://t.alcy.cc" target="_blank" style="color:#f0911e;">t.alcy.cc（栗次元）</a> 提供 · 每次打开/刷新页面自动切换 · 建议选「PC 横图」或「自适应」类
        </div>
        <div id="bg-random-history" style="margin-top:10px;">
          ${(() => {
            const hist = getHistory();
            if (!hist.length) return '<div style="font-size:11px;color:#ccc;text-align:center;padding:8px 0;">暂无历史记录</div>';
            return `<div style="font-size:12px;color:#888;margin-bottom:6px;">历史记录（点击可直接设为背景）</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:160px;overflow-y:auto;">
                ${hist.map(h => `
                <div class="bg-hist-item" data-url="${escapeHtml(h.url)}" data-cat="${escapeHtml(h.cat)}"
                     style="height:56px;border-radius:4px;cursor:pointer;overflow:hidden;position:relative;background-image:url(${escapeHtml(h.url)});background-size:cover;background-position:center;background-color:#eee;"
                     title="${escapeHtml(h.cat)} · ${new Date(h.time).toLocaleDateString()}">
                  <span style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.5);color:#fff;font-size:9px;padding:1px 4px;border-radius:2px;cursor:pointer;"
                        class="bg-hist-del">✕</span>
                </div>`).join('')}
              </div>
              <div style="text-align:right;margin-top:4px;"><a href="#" id="bg-hist-clear" style="font-size:10px;color:#ccc;text-decoration:none;">清空历史</a></div>`;
          })()}
        </div>
      </div>

      <!-- 不透明度 -->
      <div style="margin-bottom:14px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;color:#555;">
          不透明度 <span id="bg-opacity-val" style="font-weight:400;color:#f0911e;">${currentOpacity}</span>
        </label>
        <input id="bg-input-opacity" type="range" min="0" max="3" step="0.05" value="${currentOpacity}"
          style="width:100%;accent-color:#f0911e;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#bbb;">
          <span>全透明</span><span>默认</span><span>最不透明</span>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button id="bg-btn-apply" style="flex:1;padding:8px;background:#f0911e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">应用</button>
        <button id="bg-btn-reset" style="padding:8px 16px;background:#f5f5f5;color:#666;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">重置默认</button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#aaa;text-align:center;">
        基于 rabbitohh 的 bangumi-css | 设置保存在浏览器本地
      </div>
    `;

    document.body.appendChild(panel);

    // ===== 触发入口：优先挂到 bangumi 右下角自带的"个性化"工具条 =====
    const togglePanel = () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
    let trigger = mountToPersonalizeToolbar();
    if (trigger) {
      trigger.onclick = togglePanel;
    } else {
      // 工具条可能稍后才渲染出来：先放兜底齿轮按钮，并持续尝试挂载
      trigger = createFallbackBtn();
      trigger.onclick = togglePanel;
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        const mounted = mountToPersonalizeToolbar();
        if (mounted) {
          clearInterval(timer);
          const fb = document.getElementById('bg-custom-btn');
          if (fb) fb.remove();
          trigger = mounted;
          trigger.onclick = togglePanel;
        } else if (attempts >= 10) {
          clearInterval(timer);
        }
      }, 500);
    }

    // ===== 事件绑定 =====
    panel.querySelector('#bg-panel-close').onclick = () => { panel.style.display = 'none'; };

    // 深色模式控件（自动/亮色/暗色 三选一）
    const darkAutoBtn = panel.querySelector('#bg-dark-auto');
    const darkLightBtn = panel.querySelector('#bg-dark-light');
    const darkDarkBtn = panel.querySelector('#bg-dark-dark');
    function updateDarkBtns() {
      const set = (el, on) => { el.style.background = on ? '#f0911e' : 'transparent'; el.style.color = on ? '#fff' : 'inherit'; };
      set(darkAutoBtn, darkModePref === 'auto');
      set(darkLightBtn, darkModePref === 'off');
      set(darkDarkBtn, darkModePref === 'on');
    }
    darkAutoBtn.onclick = () => { setDarkModePref('auto'); updateDarkBtns(); };
    darkLightBtn.onclick = () => { setDarkModePref('off'); updateDarkBtns(); };
    darkDarkBtn.onclick = () => { setDarkModePref('on'); updateDarkBtns(); };
    applyDarkMode();

    const opacityInput = panel.querySelector('#bg-input-opacity');
    const opacityValEl = panel.querySelector('#bg-opacity-val');
    opacityInput.oninput = () => { opacityValEl.textContent = parseFloat(opacityInput.value).toFixed(2); };

    const preview = panel.querySelector('#bg-live-preview');

    // 模式切换
    panel.querySelectorAll('input[name="bg-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const mode = radio.value;
        panel.querySelectorAll('.bg-mode-panel').forEach(p => p.style.display = 'none');
        panel.querySelectorAll('.bg-mode-btn').forEach(l => { l.style.background = '#fff'; l.style.color = '#666'; });
        const panelEl = document.getElementById('bg-mode-' + mode);
        if (panelEl) panelEl.style.display = 'block';
        radio.closest('.bg-mode-btn').style.background = '#f0911e';
        radio.closest('.bg-mode-btn').style.color = '#fff';
        preview.style.background = buildBg();
        preview.style.backgroundSize = 'cover';
      });
    });

    // 纯色：双向同步 color picker ↔ hex input
    const solidColorPicker = panel.querySelector('#bg-color-solid');
    const solidHexInput = panel.querySelector('#bg-color-hex');
    solidColorPicker.oninput = () => {
      solidHexInput.value = solidColorPicker.value;
      preview.style.background = solidColorPicker.value;
    };
    solidHexInput.oninput = () => {
      const v = solidHexInput.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
        solidColorPicker.value = v;
        preview.style.background = v;
      }
    };

    // 渐变：颜色选择器同步旁边 hex 输入，方向联动预览
    function updateGradPreview() {
      preview.style.background = buildBg();
      preview.style.backgroundSize = 'cover';
    }
    panel.querySelector('#bg-grad-dir').onchange = updateGradPreview;
    const gradC1 = panel.querySelector('#bg-grad-c1');
    const gradC2 = panel.querySelector('#bg-grad-c2');
    const gradHexes = panel.querySelectorAll('.bg-grad-hex');
    gradC1.oninput = () => { gradHexes[0].value = gradC1.value; updateGradPreview(); };
    gradC2.oninput = () => { gradHexes[1].value = gradC2.value; updateGradPreview(); };
    gradHexes[0].oninput = () => { const v=gradHexes[0].value.trim(); if(/^#[0-9a-fA-F]{3,8}$/.test(v)){gradC1.value=v;updateGradPreview();} };
    gradHexes[1].oninput = () => { const v=gradHexes[1].value.trim(); if(/^#[0-9a-fA-F]{3,8}$/.test(v)){gradC2.value=v;updateGradPreview();} };

    // 图片 URL
    const imgUrlInput = panel.querySelector('#bg-img-url');
    imgUrlInput.oninput = () => {
      const v = imgUrlInput.value.trim();
      preview.style.background = v ? `url("${v}")` : '#ddd';
      preview.style.backgroundSize = 'cover';
    };

    // 预设
    const presetSelect = panel.querySelector('#bg-preset-select');
    panel.querySelectorAll('.bg-preset-item').forEach(item => {
      item.onclick = () => {
        presetSelect.value = item.dataset.val;
        preview.style.background = item.dataset.val;
        preview.style.backgroundSize = 'cover';
        // 高亮选中
        panel.querySelectorAll('.bg-preset-item').forEach(x => x.style.outline = 'none');
        item.style.outline = '2px solid #f0911e';
      };
    });

    // 随机图片：切换分类时预览更新
    const randomCatSelect = panel.querySelector('#bg-random-cat');
    randomCatSelect.onchange = () => {
      preview.style.background = `url("https://t.alcy.cc/${randomCatSelect.value}")`;
      preview.style.backgroundSize = 'cover';
    };
    // 初始进入随机模式时预览（优先用已解析的实际 URL）
    if (initialMode === 'random') {
      const hist = getHistory();
      if (hist.length && currentBg.includes('url(')) {
        preview.style.background = currentBg;
      } else {
        preview.style.background = `url("https://t.alcy.cc/${randomCat}")`;
      }
      preview.style.backgroundSize = 'cover';
    }

    // 历史记录：点击设为背景
    panel.querySelector('#bg-random-history').addEventListener('click', (e) => {
      const delBtn = e.target.closest('.bg-hist-del');
      const item = e.target.closest('.bg-hist-item');
      const clearBtn = e.target.closest('#bg-hist-clear');
      if (delBtn) {
        e.stopPropagation();
        const url = item.dataset.url;
        removeHistory(url);
        item.remove();
        if (!panel.querySelector('.bg-hist-item')) {
          panel.querySelector('#bg-random-history').innerHTML = '<div style="font-size:11px;color:#ccc;text-align:center;padding:8px 0;">暂无历史记录</div>';
        }
        return;
      }
      if (clearBtn) {
        e.preventDefault();
        setHistory([]);
        panel.querySelector('#bg-random-history').innerHTML = '<div style="font-size:11px;color:#ccc;text-align:center;padding:8px 0;">暂无历史记录</div>';
        return;
      }
      if (item) {
        // 设为固定背景（image 模式）
        const url = item.dataset.url;
        currentBg = `url("${url}")`;
        setBg(currentBg);
        setMode('image');
        injectCSS();
        preview.style.background = currentBg;
        preview.style.backgroundSize = 'cover';
        // 切换到图片模式（更新 UI tab）
        const imgModeRadio = panel.querySelector('input[name="bg-mode"][value="image"]');
        if (imgModeRadio) {
          imgModeRadio.checked = true;
          imgModeRadio.dispatchEvent(new Event('change'));
        }
        panel.querySelector('#bg-img-url').value = url;
        panel.style.display = 'none';
      }
    });

    // 应用按钮
    panel.querySelector('#bg-btn-apply').onclick = async () => {
      const mode = panel.querySelector('input[name="bg-mode"]:checked').value;
      currentBg = buildBg();
      currentOpacity = parseFloat(opacityInput.value);
      if (isNaN(currentOpacity) || currentOpacity < 0) currentOpacity = DEFAULT_OPACITY;

      // 随机模式：从 JSON API 获取实际图片 URL
      if (mode === 'random') {
        const cat = panel.querySelector('#bg-random-cat').value;
        const realUrl = await fetchRandomUrl(cat);
        if (realUrl) {
          currentBg = `url("${realUrl}")`;
          addHistory(realUrl, cat);
        }
        setMode('random');
        setRandomCat(cat);
      } else {
        setMode(mode);
      }

      setBg(currentBg);
      setOpacity(currentOpacity);
      injectCSS();
      panel.style.display = 'none';
    };

    // 重置
    panel.querySelector('#bg-btn-reset').onclick = () => {
      currentBg = DEFAULT_BG;
      currentOpacity = DEFAULT_OPACITY;
      opacityInput.value = String(DEFAULT_OPACITY);
      opacityValEl.textContent = String(DEFAULT_OPACITY);
      setBg(DEFAULT_BG);
      setOpacity(DEFAULT_OPACITY);
      setMode('gradient');
      injectCSS();
      panel.style.display = 'none';
    };

    // 点击弹窗外关闭
    // 注意：入口内是 SVG 图标，点击时 e.target 是 SVG 子元素而非 trigger 本身，
    // 必须用 contains 判断，否则面板会被同帧关闭（表现为"按钮点不开"）
    document.addEventListener('click', (e) => {
      if (panel.style.display === 'block' && !panel.contains(e.target) && !(trigger && trigger.contains(e.target))) {
        panel.style.display = 'none';
      }
    });
  }

  // ==================== 初始化（document-end: DOM 已就绪） ====================
  (async function init() {
    // 先注入 CSS：随机模式下沿用上次阅读保存的实际图片 URL，
    // 毛玻璃与背景立即呈现，不被拉取新图的网络请求阻塞
    injectCSS();
    createConfigUI();
    startDarkModeWatcher();

    // 随机模式：后台拉取新随机图片，预加载完成后再热替换，
    // 避免换图过程中出现白底/渐进渲染的割裂感
    if (getMode() === 'random') {
      const cat = getRandomCat();
      const realUrl = await fetchRandomUrl(cat);
      if (realUrl) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = realUrl;
          setTimeout(resolve, 8000); // 兜底：图片挂起时不无限等待
        });
        currentBg = `url("${realUrl}")`;
        addHistory(realUrl, cat);
        setBg(currentBg);
        injectCSS();
      }
    }
  })();
})();
