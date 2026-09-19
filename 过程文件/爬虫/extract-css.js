// 从四个 userscript 中提取生成的 CSS 文本，供 CSSOM 解析验证（过程脚本，不属于交付物）
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const out = {};

// bg_custom：eval generateCSS 函数并调用（generateCSS 依赖外部的 getHeaderOpacity，测试桩：未配置）
{
  const src = fs.readFileSync(path.join(root, 'bangumi_bg_custom.user.js'), 'utf8');
  const start = src.indexOf('function generateCSS');
  const end = src.indexOf('// ==================== 工具函数');
  let fnSrc = src.slice(start, end).replace(/\}\s*$/, '');
  const generateCSS = eval('const getHeaderOpacity = () => null;\n(' + fnSrc + '})');
  out['bg_custom'] = generateCSS('linear-gradient(to right, #fabbbb, #ee8292)', 1);
}

// 提取 marker 之后第一个模板字符串（模板内无转义反引号）
function tpl(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found: ' + marker);
  const open = src.indexOf('`', i + marker.length);
  let j = open + 1;
  for (;;) {
    j = src.indexOf('`', j);
    if (j < 0) throw new Error('unterminated template');
    if (src[j - 1] !== '\\') break;
    j++;
  }
  return src.slice(open + 1, j);
}

{
  const src = fs.readFileSync(path.join(root, 'bangumi_calendar_timeline.user.js'), 'utf8');
  out['timeline_base'] = tpl(src, 'GM_addStyle(');
  out['timeline_bg'] = tpl(src, 'bgStyle.textContent = ');
}
{
  const src = fs.readFileSync(path.join(root, 'bangumi_calendar_timeline_no_api.user.js'), 'utf8');
  out['noapi_base'] = tpl(src, 'style.textContent = ');
  out['noapi_bg'] = tpl(src, 'bgStyle.textContent = ');
}
{
  const src = fs.readFileSync(path.join(root, 'bangumi_week_blocks.user.js'), 'utf8');
  out['weekblocks'] = tpl(src, 'style.textContent = ');
}

for (const [k, v] of Object.entries(out)) {
  // 模板里可能残留 ${...} 插值 —— bg_custom 已求值；timeline 的 ${bgVal}/${a(n)} 用样例值替换
  const filled = String(v).replace(/\$\{bgVal\}/g, 'linear-gradient(to right, #fabbbb, #ee8292)')
    .replace(/\$\{opacityVal\}/g, '1')
    .replace(/\$\{a\((\d+(?:\.\d+)?)\)\}/g, (m, n) => {
      const l = parseFloat(n) * 0.1, o = 1;
      return String((o * l) / (1 + o * l - l));
    });
  if (/\$\{/.test(filled)) console.log('WARN', k, 'still has interpolation');
  const bal = (filled.match(/\{/g) || []).length - (filled.match(/\}/g) || []).length;
  console.log(k, 'chars=', filled.length, 'brace-balance=', bal);
  fs.writeFileSync(path.join(__dirname, 'extracted-' + k + '.css'), filled);
}
