/* widgets-qhtt.js — công cụ tương tác Chương 2 (quy hoạch tuyến tính). Nạp sau widgets.js và qhtt.js.
   data-widget: lpgraph · simplex · dual · transport · pacb · canon   (dữ liệu bài toán: data-lp, xem QH.parseLP) */
(function () {
  'use strict';
  const TW = window.TKTWidgets, QH = window.QH, LA = window.LA;
  if (!TW || !QH) return;
  const W = TW.W, K = TW.K, F = QH.F;
  function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function btn(label, cls, fn) { const b = h('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  const math = el => { if (window.TKT && TKT.renderMath) TKT.renderMath(el); };

  /* ---------- Định dạng ---------- */
  function numD(x) {            // dùng khi ghi đề bài: số thập phân hữu hạn ghi kiểu Việt Nam 0{,}3
    if (x instanceof QH.MV) return x.tex();
    const f = F(x);
    let d = f.d, two = 0, five = 0; while (d % 2 === 0) { d /= 2; two++; } while (d % 5 === 0) { d /= 5; five++; }
    if (f.d > 1 && d === 1 && f.d <= 1000) { const k = Math.max(two, five); return String((f.n / f.d).toFixed(k)).replace('.', '{,}'); }
    return f.tex();
  }
  function num(x) {             // dùng trong bảng tính: phân số như giáo trình; chỉ mẫu 10, 100, 1000 mới ghi thập phân
    if (x instanceof QH.MV) return x.tex();
    const f = F(x);
    return (f.d === 10 || f.d === 100 || f.d === 1000) ? numD(f) : f.tex();
  }
  function lin(coefs, vars) {
    let s = '';
    coefs.forEach((c0, j) => {
      const c = F(c0); if (c.isZero()) return;
      const a = c.abs(); const mag = a.eq(1) ? '' : numD(a);
      s += (s === '' ? (c.n < 0 ? '-' : '') : (c.n < 0 ? ' - ' : ' + ')) + mag + vars[j];
    });
    return s || '0';
  }
  const opTex = op => (op === '<=' ? '\\le' : op === '>=' ? '\\ge' : '=');
  const vname = (v, j) => v + '_{' + (j + 1) + '}';
  function signTex(signs, v) {
    const g = { '>=0': [], '<=0': [], free: [] };
    signs.forEach((s, j) => g[s].push(vname(v, j)));
    const parts = [];
    if (g['>=0'].length) parts.push(g['>=0'].join(',\\ ') + '\\ge 0');
    if (g['<=0'].length) parts.push(g['<=0'].join(',\\ ') + '\\le 0');
    if (g.free.length) parts.push(g.free.join(',\\ ') + '\\ \\text{tùy ý}');
    return parts.join(';\\quad ');
  }
  function lpTex(lp, v, fname) {
    v = v || lp.var || 'x'; fname = fname || (v === 'y' ? 'g(y)' : 'f(x)');
    const vars = Array.from({ length: lp.n }, (_, j) => vname(v, j));
    return fname + ' = ' + lin(lp.c, vars) + ' \\to \\' + lp.type + '\\quad\\text{với}\\quad\\begin{cases}' +
      lp.rows.map(r => lin(r.a, vars) + ' ' + opTex(r.op) + ' ' + numD(r.b)).join('\\\\ ') + '\\\\ ' + signTex(lp.signs, v) + '\\end{cases}';
  }
  window.TKT = window.TKT || {}; window.TKT.lpTex = lpTex;
  const getLP = el => QH.parseLP((el.dataset.lp || '').replace(/\|/g, '\n'));

  /* ======================================================== Phương pháp đồ thị */
  W.lpgraph = function (el) {
    const lp = getLP(el); const G = QH.graph(lp);
    el.classList.add('w', 'qh-graph');
    const fl = x => x.val();
    const V = G.V.map(v => ({ x: fl(v.p[0]), y: fl(v.p[1]), p: v.p, f: v.f }));
    // phạm vi vẽ
    let R = +(el.dataset.r || 0);
    if (!R) {
      const vals = [5]; V.forEach(v => vals.push(Math.abs(v.x), Math.abs(v.y)));
      lp.rows.forEach(r => { [0, 1].forEach(j => { if (!r.a[j].isZero()) vals.push(Math.abs(fl(r.b) / fl(r.a[j]))); }); });
      R = Math.max.apply(null, vals.filter(x => isFinite(x) && x < 1e4)) * 1.15;
      const pow = Math.pow(10, Math.floor(Math.log10(R))); R = Math.ceil(R / (pow / 2)) * (pow / 2);
    }
    const lo = lp.signs.some(s => s !== '>=0') ? -R : -R * 0.08;
    const step = (() => { const raw = R / 6, p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; })();
    const NS = 'http://www.w3.org/2000/svg';
    const S = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
    const span = R - lo, sw = span / 300;
    const svg = S('svg', { viewBox: lo + ' ' + (-R) + ' ' + span + ' ' + span, class: 'qh-plane', role: 'img' });
    const gGrid = S('g', {}, svg), gReg = S('g', {}, svg), gLines = S('g', {}, svg), gLev = S('g', {}, svg), gPts = S('g', {}, svg);
    for (let t = Math.ceil(lo / step) * step; t <= R; t += step) {
      S('line', { x1: t, y1: -R, x2: t, y2: -lo, class: t === 0 ? 'ax' : 'gl' }, gGrid);
      S('line', { x1: lo, y1: -t, x2: R, y2: -t, class: t === 0 ? 'ax' : 'gl' }, gGrid);
      if (t !== 0) { const tx = S('text', { x: t, y: -lo - 0.01 * span, class: 'qh-tick', 'font-size': span * 0.03 }, gGrid); tx.textContent = Math.round(t * 100) / 100; const ty = S('text', { x: lo + 0.01 * span, y: -t, class: 'qh-tick', 'font-size': span * 0.03 }, gGrid); ty.textContent = Math.round(t * 100) / 100; }
    }
    // miền phương án = hộp cắt bởi các nửa mặt phẳng (Sutherland – Hodgman)
    let poly = [[lo, lo], [R, lo], [R, R], [lo, R]];
    const H = G.H.map(hp => ({ a: fl(hp.a[0]), b: fl(hp.a[1]), c: fl(hp.b), op: hp.op }));
    const clip = (P, a, b, c, keepLe) => {
      const inside = p => (keepLe ? a * p[0] + b * p[1] <= c + 1e-9 : a * p[0] + b * p[1] >= c - 1e-9);
      const out = [];
      P.forEach((p, i) => {
        const q = P[(i + 1) % P.length]; const ip = inside(p), iq = inside(q);
        if (ip) out.push(p);
        if (ip !== iq) { const t = (c - a * p[0] - b * p[1]) / (a * (q[0] - p[0]) + b * (q[1] - p[1])); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      });
      return out;
    };
    H.forEach(hp => { if (!poly.length) return; if (hp.op !== '>=') poly = clip(poly, hp.a, hp.b, hp.c, true); if (poly.length && hp.op !== '<=') poly = clip(poly, hp.a, hp.b, hp.c, false); });
    if (poly.length >= 3) S('polygon', { points: poly.map(p => p[0] + ',' + (-p[1])).join(' '), class: 'qh-region' }, gReg);
    else if (poly.length === 2) S('line', { x1: poly[0][0], y1: -poly[0][1], x2: poly[1][0], y2: -poly[1][1], class: 'qh-segment' }, gReg);
    // các đường ràng buộc chính
    const clipLine = (a, b, c) => { const pts = []; const add = p => { if (p[0] >= lo - 1e-9 && p[0] <= R + 1e-9 && p[1] >= lo - 1e-9 && p[1] <= R + 1e-9) pts.push(p); };
      if (b !== 0) { add([lo, (c - a * lo) / b]); add([R, (c - a * R) / b]); } if (a !== 0) { add([(c - b * lo) / a, lo]); add([(c - b * R) / a, R]); }
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]); return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null; };
    lp.rows.forEach((r, i) => {
      const seg = clipLine(fl(r.a[0]), fl(r.a[1]), fl(r.b)); if (!seg) return;
      S('line', { x1: seg[0][0], y1: -seg[0][1], x2: seg[1][0], y2: -seg[1][1], class: 'qh-line q' + (i % 4) }, gLines);
      const mid = [seg[0][0] * 0.25 + seg[1][0] * 0.75, seg[0][1] * 0.25 + seg[1][1] * 0.75];
      const t = S('text', { x: mid[0] + 0.01 * span, y: -mid[1] - 0.012 * span, class: 'qh-lab q' + (i % 4), 'font-size': span * 0.04 }, gLines); t.textContent = '(d' + (i + 1) + ')';
    });
    // đỉnh: đặt tên theo thứ tự vòng quanh trọng tâm
    const cx = V.reduce((s, v) => s + v.x, 0) / (V.length || 1), cy = V.reduce((s, v) => s + v.y, 0) / (V.length || 1);
    V.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    const names = 'ABCDEFGHIJKLMN';
    let nk = 0; V.forEach(v => { v.name = v.x === 0 && v.y === 0 ? 'O' : names[nk++]; });
    const isOpt = v => G.opt && G.opt.some(o => o.p[0].eq(v.p[0]) && o.p[1].eq(v.p[1]));
    V.forEach(v => {
      S('circle', { cx: v.x, cy: -v.y, r: 4 * sw, class: 'qh-pt' + (isOpt(v) ? ' opt' : '') }, gPts);
      const t = S('text', { x: v.x + 0.012 * span, y: -v.y + 0.04 * span, class: 'qh-vname', 'font-size': span * 0.042 }, gPts); t.textContent = v.name;
    });
    // đường mức f = α và hướng tăng
    const c1 = fl(lp.c[0]), c2 = fl(lp.c[1]); const cn = Math.hypot(c1, c2) || 1;
    const corners = [[lo, lo], [R, lo], [R, R], [lo, R]].map(p => c1 * p[0] + c2 * p[1]);
    const amin = Math.min.apply(null, corners), amax = Math.max.apply(null, corners);
    const levLine = S('line', { class: 'qh-level' }, gLev);
    const ar = R * 0.22;
    S('line', { x1: 0, y1: 0, x2: c1 / cn * ar, y2: -c2 / cn * ar, class: 'qh-grad', 'marker-end': 'url(#qhArrow' + (el.id || '') + ')' }, gLev);
    const defs = S('defs', {}, svg); const mk = S('marker', { id: 'qhArrow' + (el.id || ''), viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs); S('path', { d: 'M0,0 L10,5 L0,10 z', class: 'qh-arrowhead' }, mk);
    const ct = S('text', { x: c1 / cn * ar + 0.01 * span, y: -c2 / cn * ar - 0.01 * span, class: 'qh-vname grad', 'font-size': span * 0.04 }, gLev); ct.textContent = 'c';
    const ctrl = h('div', 'ctrl'); const slider = h('input'); slider.type = 'range'; slider.min = amin; slider.max = amax; slider.step = (amax - amin) / 400;
    slider.setAttribute('aria-label', 'Giá trị mức α'); const lv = h('span', 'stepinfo');
    function setLevel(a) {
      const seg = clipLine(c1, c2, a);
      if (seg) { levLine.setAttribute('x1', seg[0][0]); levLine.setAttribute('y1', -seg[0][1]); levLine.setAttribute('x2', seg[1][0]); levLine.setAttribute('y2', -seg[1][1]); levLine.style.display = ''; }
      else levLine.style.display = 'none';
      lv.innerHTML = 'Đường mức ' + K('f = ' + (Math.round(a * 100) / 100).toString().replace('.', '{,}'));
    }
    slider.addEventListener('input', () => setLevel(+slider.value));
    const optF = G.status === 'toi-uu' ? fl(G.f) : null;
    ctrl.append(h('span', '', 'Kéo đường mức:'), slider, lv);
    if (optF !== null) ctrl.append(btn('Đến phương án tối ưu', 'primary', () => { slider.value = optF; setLevel(optF); }));
    const start = V.length ? Math.min.apply(null, V.map(v => fl(v.f))) : (amin + amax) / 2; slider.value = start; setLevel(start);
    // bảng đỉnh + kết luận
    const tbl = h('div', 'out qh-vtab');
    const typ = lp.type;
    let concl;
    if (G.status === 'vo-nghiem') concl = '<span class="verdict bad">Tập phương án rỗng ⇒ bài toán không có phương án tối ưu</span>';
    else if (G.status === 'khong-bi-chan') concl = '<span class="verdict bad">Hàm mục tiêu không bị chặn ' + (typ === 'max' ? 'trên' : 'dưới') + ' ⇒ không có phương án tối ưu</span>';
    else if (G.opt.length > 1) { const o = V.filter(isOpt); concl = '<span class="verdict mid">Vô số phương án tối ưu</span> trên đoạn ' + o.map(v => v.name).join('') + ', ' + K('f_{' + typ + '} = ' + num(G.f)); }
    else { const o = V.find(isOpt); concl = '<span class="verdict ok">Phương án tối ưu</span> ' + K((o ? o.name : '') + '\\left(' + num(G.x[0]) + ';\\,' + num(G.x[1]) + '\\right),\\ f_{' + typ + '} = ' + num(G.f)); }
    tbl.innerHTML = (V.length ? '<table class="tbl"><tr><th>Đỉnh</th>' + V.map(v => '<th class="c">' + v.name + '</th>').join('') + '</tr><tr><td>Tọa độ</td>' + V.map(v => '<td class="c">' + K('(' + num(v.p[0]) + ';\\,' + num(v.p[1]) + ')') + '</td>').join('') +
      '</tr><tr><td>' + K('f') + '</td>' + V.map(v => '<td class="c' + (isOpt(v) ? ' qh-best' : '') + '">' + K(num(v.f)) + '</td>').join('') + '</tr></table>' : '') + '<div class="qh-concl">' + concl + '</div>';
    const showTab = el.dataset.table !== '0';
    const body = h('div', 'cols qh-gbody'); body.append(svg, h('div', 'stack')); body.lastChild.append(ctrl, tbl);
    if (!showTab) { tbl.hidden = true; ctrl.append(btn('Bảng các đỉnh', '', () => { tbl.hidden = !tbl.hidden; })); }
    el.append(body);
  };

  /* ======================================================== Bảng đơn hình */
  W.simplex = function (el) {
    const lp = getLP(el); const cf = QH.canonical(lp); const res = QH.simplex(cf); const S = res.steps;
    el.classList.add('w', 'qh-simplex');
    const roman = k => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][k] || String(k + 1);
    const hasM = S.some(s => s.c.some(c => c.hasM()));
    function table(s, k) {
      const n = s.T[0].length; const piv = s.pivot;
      const colName = j => { const nm = s.cols[j]; const m = nm.match(/^x_\{(\d+)\}$/); return m ? 'a_{' + m[1] + '}' : nm.replace(/^x/, 'a'); };
      let t = '<table class="tbl qh-tab"><tr><th rowspan="2">' + roman(k) + '</th><th>Cơ sở</th><th>' + K('c_i') + '</th><th>Phương án</th>' + s.c.map(c => '<th class="c">' + K(c.tex()) + '</th>').join('') + '</tr>' +
        '<tr><th></th><th></th><th>' + K('x_i') + '</th>' + s.c.map((_, j) => '<th class="c' + (piv && piv.k === j ? ' qh-in' : '') + '">' + K(colName(j)) + '</th>').join('') + '</tr>';
      s.T.forEach((row, i) => {
        t += '<tr' + (piv && piv.r === i ? ' class="qh-out"' : '') + '><td>' + (piv && piv.r === i ? '⇐' : '') + '</td><td>' + K(colName(s.basis[i])) + '</td><td class="c">' + K(s.cB[i].tex()) + '</td><td class="c">' + K(num(s.x[i])) + '</td>' +
          row.map((v, j) => '<td class="c' + (piv && piv.r === i && piv.k === j ? ' qh-piv' : '') + '">' + K(num(v)) + '</td>').join('') + '</tr>';
      });
      const isB = j => s.basis.indexOf(j) >= 0;
      if (hasM) {
        t += '<tr class="qh-d"><td></td><td colspan="2">' + K('\\alpha_j') + '</td><td class="c">' + K(num(s.f.a)) + '</td>' + s.d.map((d, j) => '<td class="c">' + K(num(d.a)) + '</td>').join('') + '</tr>';
        t += '<tr class="qh-d"><td></td><td colspan="2">' + K('\\beta_j') + '</td><td class="c">' + K(num(s.f.b)) + '</td>' + s.d.map((d, j) => '<td class="c' + (piv && piv.k === j ? ' qh-in' : '') + '">' + K(num(d.b)) + (piv && piv.k === j ? ' ⇑' : '') + '</td>').join('') + '</tr>';
      } else {
        t += '<tr class="qh-d"><td></td><td colspan="2">' + K('\\Delta_j') + '</td><td class="c">' + K(num(s.f.a)) + '</td>' + s.d.map((d, j) => '<td class="c' + (piv && piv.k === j ? ' qh-in' : '') + '">' + K(isB(j) ? '0' : num(d.a)) + (piv && piv.k === j ? ' ⇑' : '') + '</td>').join('') + '</tr>';
      }
      return t + '</table>';
    }
    function note(s, k) {
      if (s.pivot) {
        const p = s.pivot; const j = p.k, r = p.r;
        const nm = s.cols[j].replace(/^x/, 'a'), out = s.cols[s.basis[r]].replace(/^x/, 'a');
        const ratios = s.T.map((row, i) => (row[j].n > 0 ? K('\\tfrac{' + num(s.x[i]) + '}{' + num(row[j]) + '}') : null)).filter(Boolean);
        return 'Còn ' + K('\\Delta_j>0') + ': chọn ' + K('\\Delta = ' + s.d[j].tex()) + ' lớn nhất ⇒ đưa ' + K(nm) + ' vào cơ sở. ' +
          K('\\theta = \\min') + '{' + ratios.join(', ') + '} ' + K('= ' + num(p.theta)) + ' ⇒ loại ' + K(out) + '; phần tử trục ' + K(num(s.T[r][j])) + '.';
      }
      if (res.status === 'toi-uu') {
        const v = res.x.map(num).join(';\\,');
        return '<span class="verdict ok">Mọi Δ<sub>j</sub> ≤ 0 ⇒ tối ưu</span> ' + K('x^* = (' + v + '),\\ f_{' + lp.type + '} = ' + num(res.f)) + (res.nhieuPA ? ' <span class="muted">(có Δ<sub>j</sub> = 0 ngoài cơ sở: bài toán còn phương án tối ưu khác)</span>' : '');
      }
      if (res.status === 'khong-bi-chan') { const nm = s.cols[s.unb].replace(/^x/, 'a'); return '<span class="verdict bad">Có ' + K('\\Delta>0') + ' mà cột ' + K(nm) + ' không có phần tử dương ⇒ hàm mục tiêu không bị chặn, không có phương án tối ưu</span>'; }
      if (res.status === 'vo-nghiem') return '<span class="verdict bad">Mọi Δ<sub>j</sub> ≤ 0 nhưng còn biến giả dương trong cơ sở ⇒ bài toán gốc không có phương án</span>';
      return '';
    }
    const ctrl = h('div', 'ctrl'); const info = h('span', 'stepinfo'); const out = h('div', 'out'); const nt = h('div', 'qh-note small');
    let k = 0;
    const draw = () => { out.innerHTML = table(S[k], k); nt.innerHTML = note(S[k], k); info.textContent = 'Bảng ' + roman(k) + ' / ' + roman(S.length - 1); bP.disabled = k === 0; bN.disabled = k === S.length - 1; };
    const b0 = btn('⟲', '', () => { k = 0; draw(); }), bP = btn('◀', '', () => { if (k) k--; draw(); }), bN = btn('Bảng tiếp ▶', 'primary', () => { if (k < S.length - 1) k++; draw(); }), bE = btn('Kết quả', '', () => { k = S.length - 1; draw(); });
    ctrl.append(b0, bP, bN, bE, info);
    if (el.dataset.canon === '1') {
      const art = S[0].kinds.filter(x => x === 'gia').length;
      const cfv = S[0].cols.map(x => x);
      const vars = cfv;
      const ct = h('div', 'out small');
      ct.innerHTML = (art ? 'Bài toán (M): thêm biến giả ' + K(S[0].kinds.map((kd, j) => (kd === 'gia' ? cfv[j] : null)).filter(Boolean).join(',\\ ')) + ' có hệ số ' + K('M') + ' trong hàm mục tiêu.' : 'Dạng chính tắc có sẵn cơ sở đơn vị.') +
        K('\\ ' + lin(S[0].c.map(c => c.a), vars) + (art ? ' + M(' + S[0].kinds.map((kd, j) => (kd === 'gia' ? cfv[j] : null)).filter(Boolean).join('+') + ')' : '') + '\\to\\min', false);
      el.append(ct);
    }
    if (lp.type === 'max') el.append(h('div', 'small muted', 'Bài toán max: giải bài toán min của ' + K('g = -f') + ' (đổi dấu các hệ số ' + K('c_j') + '), cuối cùng ' + K('f_{\\max} = -g_{\\min}') + '.'));
    el.append(ctrl, out, nt); draw();
    el._print = () => { const all = h('div', 'allsteps'); all.innerHTML = S.map((s, i) => table(s, i) + '<div class="qh-note small">' + note(s, i) + '</div>').join(''); el.append(all); };
  };

  /* ======================================================== Lập bài toán đối ngẫu */
  W.dual = function (el) {
    const lp = getLP(el); const D = QH.dual(lp); D.var = 'y';
    el.classList.add('w', 'qh-dual');
    const xv = Array.from({ length: lp.n }, (_, j) => vname('x', j)), yv = Array.from({ length: D.n }, (_, i) => vname('y', i));
    const sgn = (s, v) => (s === '>=0' ? v + '\\ge 0' : s === '<=0' ? v + '\\le 0' : v + '\\ \\text{tùy ý}');
    const mn = lp.type === 'min';
    const ruleC = r => (r.op === '=' ? 'ràng buộc "=" ⇒ biến đối ngẫu tùy ý' : (mn ? (r.op === '>=' ? 'bài min, ràng buộc "≥" ⇒ y ≥ 0' : 'bài min, ràng buộc "≤" ⇒ y ≤ 0') : (r.op === '<=' ? 'bài max, ràng buộc "≤" ⇒ y ≥ 0' : 'bài max, ràng buộc "≥" ⇒ y ≤ 0')));
    const ruleV = s => (s === 'free' ? 'biến tùy ý ⇒ ràng buộc đối ngẫu "="' : (mn ? (s === '>=0' ? 'bài min, x ≥ 0 ⇒ ràng buộc "≤"' : 'bài min, x ≤ 0 ⇒ ràng buộc "≥"') : (s === '>=0' ? 'bài max, x ≥ 0 ⇒ ràng buộc "≥"' : 'bài max, x ≤ 0 ⇒ ràng buộc "≤"')));
    let L = '<table class="tbl qh-dtab"><tr><th colspan="2">Bài toán gốc</th></tr><tr data-p="f"><td colspan="2">' + K('f(x) = ' + lin(lp.c, xv) + '\\to\\' + lp.type) + '</td></tr>' +
      lp.rows.map((r, i) => '<tr data-p="c' + i + '"><td>' + K(lin(r.a, xv) + ' ' + opTex(r.op) + ' ' + numD(r.b)) + '</td><td class="tag">(' + (i + 1) + ')</td></tr>').join('') +
      lp.signs.map((s, j) => '<tr data-p="v' + j + '"><td>' + K(sgn(s, xv[j])) + '</td><td class="tag">[' + (j + 1) + ']</td></tr>').join('') + '</table>';
    let R = '<table class="tbl qh-dtab"><tr><th colspan="2">Bài toán đối ngẫu</th></tr><tr data-p="f"><td colspan="2">' + K('g(y) = ' + lin(D.c, yv) + '\\to\\' + D.type) + '</td></tr>' +
      D.rows.map((r, j) => '<tr data-p="v' + j + '"><td>' + K(lin(r.a, yv) + ' ' + opTex(r.op) + ' ' + numD(r.b)) + '</td><td class="tag">[' + (j + 1) + ']</td></tr>').join('') +
      D.signs.map((s, i) => '<tr data-p="c' + i + '"><td>' + K(sgn(s, yv[i])) + '</td><td class="tag">(' + (i + 1) + ')</td></tr>').join('') + '</table>';
    const body = h('div', 'cols'); body.innerHTML = '<div>' + L + '</div><div>' + R + '</div>';
    // data-an="1": che bài toán đối ngẫu, người học tự lập rồi mở từng cặp (bấm dòng bài gốc) hoặc mở tất cả
    const an = el.dataset.an === '1'; const RT = body.querySelectorAll('.qh-dtab')[1];
    const msg = h('div', 'qh-note small', an ? 'Tự lập bài toán đối ngẫu ra giấy, sau đó bấm từng dòng của <b>bài toán gốc</b> để mở dòng tương ứng, hoặc bấm "Hiện tất cả".' : 'Bấm vào một dòng để thấy <b>cặp điều kiện đối ngẫu</b> tương ứng (cùng số hiệu).');
    if (an) { el._print = () => RT.classList.remove('qh-an'); RT.classList.add('qh-an'); const bAll = btn('Hiện tất cả', '', () => RT.querySelectorAll('tr[data-p]').forEach(x => x.classList.add('qh-show'))); const ct = h('div', 'ctrl'); ct.append(bAll); el.append(ct); }
    body.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-p]'); if (!tr) return; const p = tr.dataset.p;
      if (an) RT.querySelectorAll('tr[data-p="' + p + '"]').forEach(x => x.classList.add('qh-show'));
      body.querySelectorAll('tr[data-p]').forEach(x => x.classList.toggle('qh-hl', x.dataset.p === p));
      if (p === 'f') msg.innerHTML = 'Hàm mục tiêu: hệ số của ' + K('g') + ' là vế phải ' + K('b_i') + ' của bài gốc; ' + (mn ? 'min → max.' : 'max → min.');
      else if (p[0] === 'c') { const i = +p.slice(1); msg.innerHTML = 'Ràng buộc chính (' + (i + 1) + ') của bài gốc ↔ dấu của ' + K(yv[i]) + ': ' + ruleC(lp.rows[i]) + '.'; }
      else { const j = +p.slice(1); msg.innerHTML = 'Dấu của ' + K(xv[j]) + ' ↔ ràng buộc [' + (j + 1) + '] của bài đối ngẫu (hệ số là <b>cột ' + (j + 1) + '</b> của ma trận A, vế phải ' + K('c_' + (j + 1)) + '): ' + ruleV(lp.signs[j]) + '.'; }
    });
    el.append(body, msg);
  };

  /* ======================================================== Bài toán vận tải */
  W.transport = function (el) {
    const rowsOf = s => s.split(';').map(r => r.trim().split(/[\s,]+/).map(x => (x === 'M' ? 'M' : +x)));
    const a = el.dataset.a.split(/[\s,]+/).map(Number), b = el.dataset.b.split(/[\s,]+/).map(Number), C0 = rowsOf(el.dataset.c);
    const sense = el.dataset.sense || 'min', method = el.dataset.method || 'min';
    const R = QH.transport(a, b, C0, { sense, method });
    el.classList.add('w', 'qh-tp');
    const m = R.m, n = R.n;
    const lbl = { min: sense === 'min' ? 'cước phí nhỏ nhất' : 'năng suất lớn nhất', vogel: 'Vogel' }[method];
    // dãy bước: phân phối ban đầu (từng ô) rồi các vòng thế vị
    const frames = [];
    const X = Array.from({ length: m }, () => Array(n).fill(null));
    frames.push({ kind: 'dau', X: X.map(r => r.slice()), text: 'Bảng ' + (sense === 'min' ? 'cước phí' : 'năng suất') + (R.dummy ? ' (đã thêm ' + (R.dummy.row !== undefined ? 'điểm phát giả' : 'điểm thu giả') + ' để cân bằng thu phát)' : '') + '. Phân phối ban đầu bằng phương pháp ' + lbl + '.' });
    R.init.forEach(([i, j, q], t) => { X[i][j] = q; frames.push({ kind: 'dau', X: X.map(r => r.slice()), cell: [i, j], text: 'Lần ' + (t + 1) + ': ô ' + K('(' + (i + 1) + ',' + (j + 1) + ')') + ', ' + K('x_{' + (i + 1) + (j + 1) + '} = ' + num(q)) + (q.isZero() ? ' (ô chọn 0, giữ đủ ' + K('m+n-1') + ' ô chọn)' : '') }); });
    R.steps.forEach((s, t) => frames.push({ kind: 'the', s, t }));
    const ctrl = h('div', 'ctrl'); const info = h('span', 'stepinfo'); const out = h('div', 'out'); const nt = h('div', 'qh-note small');
    function grid(f) {
      const s = f.s; const XX = s ? s.X : f.X; const cyc = s && s.cycle ? s.cycle : [];
      const sgnOf = (i, j) => { const k = cyc.findIndex(z => z[0] === i && z[1] === j); return k < 0 ? '' : k % 2 ? '−' : '+'; };
      let t = '<table class="tbl qh-ttab"><tr><th>' + (sense === 'min' ? 'Phát \\ Thu' : 'Nguồn \\ Hạng mục') + '</th>' + R.b.map((x, j) => '<th class="c">' + K(num(x)) + (R.dummy && R.dummy.col === j ? '<br><small>giả</small>' : '') + '</th>').join('') + (s ? '<th class="c">' + K('u_i') + '</th>' : '') + '</tr>';
      for (let i = 0; i < m; i++) {
        t += '<tr><th class="c">' + K(num(R.a[i])) + (R.dummy && R.dummy.row === i ? '<br><small>giả</small>' : '') + '</th>';
        for (let j = 0; j < n; j++) {
          const x = XX[i][j]; const c = R.C[i][j]; const banned = c.hasM();
          const D = s && s.D[i][j]; const sg = sgnOf(i, j);
          const cls = ['qh-cell', x !== null ? 'sel' : '', f.cell && f.cell[0] === i && f.cell[1] === j ? 'now' : '', s && s.enter && s.enter[0] === i && s.enter[1] === j ? 'enter' : '', sg ? 'cyc' : ''].join(' ');
          t += '<td class="' + cls + '"><span class="qx">' + (x !== null ? K(num(x)) : '') + '</span><span class="qd">' + (D ? K(D.tex()) : '') + '</span><span class="qs">' + (sg ? '(' + sg + ')' : '') + '</span><span class="qc">' + K(banned ? (c.b.n > 0 ? 'M' : '-M') : num(c.a)) + '</span></td>';
        }
        if (s) t += '<td class="c">' + (s.u[i] ? K(s.u[i].tex()) : '') + '</td>';
        t += '</tr>';
      }
      if (s) t += '<tr><th>' + K('v_j') + '</th>' + s.v.map(v => '<td class="c">' + (v ? K(v.tex()) : '') + '</td>').join('') + '<td></td></tr>';
      return t + '</table>';
    }
    function text(f, idx) {
      if (f.kind === 'dau') return f.text;
      const s = f.s; const fv = K((sense === 'min' ? 'f = ' : 'f = ') + s.f.tex());
      let x = 'Vòng ' + (f.t + 1) + ': thế vị ' + K('u_1 = 0') + ', giải ' + K('u_i + v_j = c_{ij}') + ' tại ô chọn; ước lượng ' + K('\\Delta_{ij} = u_i + v_j - c_{ij}') + ' ghi góc trên phải. ' + fv + '. ';
      if (s.enter) {
        x += (sense === 'min' ? 'Còn ' + K('\\Delta_{ij} > 0') + ': đưa ô có ' + K('\\Delta') + ' lớn nhất ' : 'Còn ' + K('\\Delta_{ij} < 0') + ': đưa ô có ' + K('\\Delta') + ' nhỏ nhất ') + K('(' + (s.enter[0] + 1) + ',' + (s.enter[1] + 1) + ')') + ' vào. Chu trình ' +
          s.cycle.map(z => '(' + (z[0] + 1) + ',' + (z[1] + 1) + ')').join('→') + '; ' + K('\\theta = ' + num(s.theta)) + ' (min ở các ô "−"), cộng θ vào ô "+", trừ ở ô "−", loại ô ' + K('(' + (s.leave[0] + 1) + ',' + (s.leave[1] + 1) + ')') + '.';
      } else x += '<span class="verdict ok">' + (sense === 'min' ? 'Mọi Δ<sub>ij</sub> ≤ 0' : 'Mọi Δ<sub>ij</sub> ≥ 0') + ' ⇒ phương án tối ưu</span> ' + K('f_{' + (sense === 'min' ? 'min' : 'max') + '} = ' + s.f.tex()) + (R.feasible ? '' : ' <b class="pen">— còn hàng ở ô cấm: bài toán gốc không có phương án.</b>');
      return x;
    }
    let k = 0;
    const draw = () => { const f = frames[k]; out.innerHTML = grid(f); nt.innerHTML = text(f, k); info.textContent = (f.kind === 'dau' ? 'Phân phối ban đầu ' : 'Thế vị ') + k + '/' + (frames.length - 1); bP.disabled = !k; bN.disabled = k === frames.length - 1; };
    const bP = btn('◀', '', () => { if (k) k--; draw(); }), bN = btn('Bước tiếp ▶', 'primary', () => { if (k < frames.length - 1) k++; draw(); });
    ctrl.append(btn('⟲', '', () => { k = 0; draw(); }), bP, bN, btn('Bắt đầu thế vị', '', () => { k = R.init.length + 1; draw(); }), btn('Kết quả', '', () => { k = frames.length - 1; draw(); }), info);
    el.append(ctrl, out, nt);
    k = el.dataset.start === 'the' ? R.init.length + 1 : 0; draw();
    el._print = () => { const all = h('div', 'allsteps'); all.innerHTML = frames.filter(f => f.kind === 'the' || f === frames[R.init.length]).map((f, i) => grid(f) + '<div class="qh-note small">' + (f.kind === 'dau' ? 'Phương án xuất phát (phương pháp ' + lbl + '): ' + R.init.map(([a1, b1, q]) => K('x_{' + (a1 + 1) + (b1 + 1) + '}=' + num(q))).join(', ') + '.' : text(f, i)) + '</div>').join(''); el.append(all); };
  };

  /* ======================================================== Phương án cực biên của hệ chính tắc */
  W.pacb = function (el) {
    const A = LA.parseMatrix(el.dataset.a), b = el.dataset.b.split(/[\s,;]+/).map(x => F(x));
    const list = QH.basicSolutions(A, b); el.classList.add('w');
    const n = A[0].length; const xv = Array.from({ length: n }, (_, j) => vname('x', j));
    const rows = list.map(r => {
      const B = '\\{' + r.B.map(j => 'a_{' + (j + 1) + '}').join(',') + '\\}';
      if (r.loai) return '<tr><td>' + K(B) + '</td><td colspan="2" class="muted">Các cột phụ thuộc tuyến tính — không là cơ sở</td></tr>';
      return '<tr class="' + (r.kha ? 'qh-ok' : '') + '"><td>' + K(B) + '</td><td>' + K('(' + r.x.map(num).join(';\\,') + ')') + '</td><td>' + (r.kha ? (r.suyBien ? '<b>PACB suy biến</b>' : '<b>PACB không suy biến</b>') : '<span class="muted">có thành phần âm — không là phương án</span>') + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="out"><table class="tbl"><tr><th>Cơ sở</th><th>Nghiệm cơ sở</th><th>Kết luận</th></tr>' + rows + '</table></div><div class="small muted">Mỗi cơ sở gồm ' + A.length + ' cột độc lập tuyến tính; cho các biến ngoài cơ sở bằng 0 rồi giải hệ. PACB = nghiệm cơ sở không âm.</div>';
  };

  /* ======================================================== Biến đổi dạng bài toán */
  W.canon = function (el) {
    const lp = getLP(el); const to = el.dataset.to || 'chinh-tac'; el.classList.add('w');
    const n = lp.n; const steps = [];
    let cols = [];   // tên biến mới
    const repl = [];
    lp.signs.forEach((s, j) => {
      if (s === '>=0') cols.push({ nm: vname('x', j), from: j, k: 1 });
      else if (s === '<=0') { cols.push({ nm: "x'_{" + (j + 1) + '}', from: j, k: -1 }); repl.push(K(vname('x', j) + " = -x'_{" + (j + 1) + '}') + ' với ' + K("x'_{" + (j + 1) + '}\\ge 0')); }
      else { cols.push({ nm: 'x^+_{' + (j + 1) + '}', from: j, k: 1 }, { nm: 'x^-_{' + (j + 1) + '}', from: j, k: -1 }); repl.push(K(vname('x', j) + ' = x^+_{' + (j + 1) + '} - x^-_{' + (j + 1) + '}') + ' với ' + K('x^+_{' + (j + 1) + '},\\,x^-_{' + (j + 1) + '}\\ge 0')); }
    });
    const coef = r => cols.map(c => r[c.from].mul(c.k));
    const names = cols.map(c => c.nm);
    let rows = lp.rows.map(r => ({ a: coef(r.a), op: r.op, b: r.b }));
    if (repl.length) steps.push('Thay biến không ràng buộc dấu chuẩn: ' + repl.join('; ') + '.');
    let extra = [];
    if (to === 'chinh-tac') {
      let next = n; const slack = [];
      rows = rows.map((r, i) => {
        if (r.op === '=') return r;
        next++; const nm = vname('x', next - 1); slack.push(K(nm) + (r.op === '<=' ? ' (cộng vào ràng buộc ' : ' (trừ ở ràng buộc ') + (i + 1) + ')');
        extra.push(nm); return { a: r.a, op: '=', b: r.b, add: { i: extra.length - 1, s: r.op === '<=' ? 1 : -1 } };
      });
      if (slack.length) steps.push('Thêm biến phụ không âm ' + slack.join(', ') + '; biến phụ có hệ số 0 trong hàm mục tiêu.');
      const allN = names.concat(extra);
      const full = rows.map(r => r.a.concat(extra.map((_, t) => F(r.add && r.add.i === t ? r.add.s : 0))));
      const res = lin(cols.map(c => lp.c[c.from].mul(c.k)), names) + ' \\to \\' + lp.type + '\\quad\\begin{cases}' + full.map((a, i) => lin(a, allN) + ' = ' + num(rows[i].b)).join('\\\\ ') + '\\\\ ' + allN.join(',\\ ') + '\\ge 0\\end{cases}';
      el.innerHTML = '<div class="small">' + K(lpTex(lp, 'x')) + '</div><ol class="small">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol><div class="box key small" data-tag="Dạng chính tắc">' + K(res, true) + '</div>';
    } else {
      const want = lp.type === 'min' ? '>=' : '<=';
      const out = [];
      rows.forEach((r, i) => {
        if (r.op === want) out.push(r);
        else if (r.op === '=') { out.push({ a: r.a, op: want, b: r.b }); out.push({ a: r.a.map(x => x.neg()), op: want, b: r.b.neg() }); steps.push('Ràng buộc ' + (i + 1) + ' là đẳng thức: thay bằng hai bất đẳng thức "' + (want === '>=' ? '≥' : '≤') + '".'); }
        else { out.push({ a: r.a.map(x => x.neg()), op: want, b: r.b.neg() }); steps.push('Nhân hai vế ràng buộc ' + (i + 1) + ' với ' + K('-1') + ' để đổi chiều bất đẳng thức.'); }
      });
      const res = lin(cols.map(c => lp.c[c.from].mul(c.k)), names) + ' \\to \\' + lp.type + '\\quad\\begin{cases}' + out.map(r => lin(r.a, names) + ' ' + opTex(r.op) + ' ' + numD(r.b)).join('\\\\ ') + '\\\\ ' + names.join(',\\ ') + '\\ge 0\\end{cases}';
      el.innerHTML = '<div class="small">' + K(lpTex(lp, 'x')) + '</div><ol class="small">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol><div class="box key small" data-tag="Dạng chuẩn tắc">' + K(res, true) + '</div>';
    }
  };
})();
