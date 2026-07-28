// ==UserScript==
// @name         节目按星期分组排序
// @namespace    https://bgm.tv/user/640151
// @version      1.0.0
// @description  按星期分成七块显示，高亮当前日期（块式布局，去除竖条底色）
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
      .day-block { margin: 10px 0; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; }
      .day-label { font-weight: bold; padding: 6px 10px; background: #f7f7f7; border-bottom: 1px solid #e5e5e5; }
      .day-block.today { border-color: #f0911e; }
      .day-block.today .day-label { background: #fff7e6; color: #f0911e; }
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

  // sort_group_main.ts
  waitLoad().then(bangumiSortGroup).catch(console.error);
})();
