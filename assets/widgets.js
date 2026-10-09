/* widgets.js — các công cụ tương tác trong bài giảng. Mỗi phần tử có data-widget="ten". */
(function () {
  'use strict';
  const LA = window.LA;
  const F = LA.F;

  function K(tex, display) {
    if (!window.katex) return '<code>' + tex + '</code>';
    return katex.renderToString(tex, { throwOnError: false, displayMode: !!display, trust: c => c.command === '\\htmlClass', strict: 'ignore' });
  }
  function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function btn(label, cls, onclick) { const b = h('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (onclick) b.addEventListener('click', onclick); return b; }
  const sub = s => String(s).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);

  /* Ma trận HTML: trả về {el, cells} */
  function htmlMatrix(A, opts) {
    opts = opts || {};
    const wrap = h('span', 'mx' + (opts.det ? ' det' : ''));
    const g = h('span', 'mx-grid'); g.style.gridTemplateColumns = 'repeat(' + A[0].length + ', auto)';
    const cells = A.map((r, i) => r.map((x, j) => {
      const c = h('span', opts.pick ? 'pick' : '', x.toString ? x.toString() : String(x));
      if (opts.ghostFrom !== undefined && j >= opts.ghostFrom) c.classList.add('ghost');
      g.appendChild(c); return c;
    }));
    wrap.appendChild(g);
    return { el: wrap, cells };
  }
  function named(name, el) { const r = h('span', 'mx-row'); if (name) r.appendChild(h('span', 'mx-name', name + ' =')); r.appendChild(el); return r; }
  const M = s => LA.parseMatrix(s);

  const HV = document.documentElement.dataset.mode === 'hv';
  // Báo kết quả trả lời cho bộ theo dõi tiến độ (deck.js)
  function emit(el, correct, sub) { el.dispatchEvent(new CustomEvent('tkt:answer', { bubbles: true, detail: { correct: !!correct, sub: sub || 0 } })); }

  const W = {};

  /* ---------- Trắc nghiệm ---------- */
  W.quiz = function (el) {
    const ans = +el.dataset.answer - 1;
    const ol = el.querySelector('.opts'); const lis = Array.from(ol.children);
    const ex = el.querySelector('.explain'); if (ex) ex.hidden = true;
    lis.forEach((li, k) => {
      const b = h('button', 'opt', '<span class="L">' + 'ABCDEF'[k] + '</span><span>' + li.innerHTML + '</span>'); b.type = 'button';
      li.innerHTML = ''; li.appendChild(b);
      b.addEventListener('click', () => {
        lis.forEach(l => l.firstChild.classList.remove('right', 'wrong'));
        if (k === ans) b.classList.add('right'); else { b.classList.add('wrong'); lis[ans].firstChild.classList.add('right'); }
        if (ex) ex.hidden = false;
        emit(el, k === ans);
      });
    });
    const key = h('p', 'printkey', 'Đáp án: <b>' + 'ABCDEF'[ans] + '</b>'); el.appendChild(key);
    el._print = () => { if (ex) ex.hidden = false; };
  };

  /* ---------- Đúng / Sai ---------- */
  W.tf = function (el) {
    Array.from(el.children).forEach((li, q) => {
      const ans = li.dataset.ans; const why = li.dataset.why;
      const txt = h('span', '', li.innerHTML); li.innerHTML = ''; li.appendChild(txt);
      const bx = h('span', 'tfb');
      [['Đ', 'd'], ['S', 's']].forEach(([lab, v]) => {
        const b = h('button', '', lab); b.type = 'button'; b.title = v === 'd' ? 'Đúng' : 'Sai';
        b.addEventListener('click', () => {
          li.classList.remove('right', 'wrong'); li.classList.add(v === ans ? 'right' : 'wrong');
          let w = li.querySelector('.why'); if (!w) { w = h('span', 'why'); li.appendChild(w); }
          w.innerHTML = (v === ans ? '✓ Chính xác. ' : '✗ Chưa đúng — đáp án: ' + (ans === 'd' ? 'Đúng' : 'Sai') + '. ') + (why || '');
          if (window.TKT) TKT.renderMath(w);
          emit(el, v === ans, q);
        });
        bx.appendChild(b);
      });
      li.appendChild(bx);
      li.appendChild(h('span', 'printkey', '→ <b>' + (ans === 'd' ? 'Đúng' : 'Sai') + '</b>. ' + (why || '')));
    });
  };

  /* ---------- Đồng hồ hoạt động ---------- */
  W.timer = function (el) {
    const total = Math.round(parseFloat(el.dataset.min || '5') * 60);
    el.classList.add('timer');
    el.innerHTML = '<span>' + ((HV && el.dataset.labelHv) || el.dataset.label || 'Thời gian') + '</span><span class="tv"></span>';
    const tv = el.querySelector('.tv'); let left = total, t = null;
    const show = () => { tv.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); el.classList.toggle('done', left === 0); };
    const b = h('button', '', 'Bắt đầu'); b.type = 'button';
    const r = h('button', '', '↺'); r.type = 'button'; r.title = 'Đặt lại';
    b.addEventListener('click', () => {
      if (t) { clearInterval(t); t = null; b.textContent = 'Tiếp tục'; return; }
      if (left === 0) left = total;
      t = setInterval(() => { left = Math.max(0, left - 1); show(); if (!left) { clearInterval(t); t = null; b.textContent = 'Bắt đầu'; } }, 1000);
      b.textContent = 'Tạm dừng';
    });
    r.addEventListener('click', () => { if (t) clearInterval(t); t = null; left = total; b.textContent = 'Bắt đầu'; show(); });
    el.append(b, r); show();
  };

  /* ---------- Chọn phần tử a_ij ---------- */
  W.pick = function (el) {
    const A = M(el.dataset.matrix); const nm = el.dataset.name || 'a';
    el.classList.add('w');
    const { el: mx, cells } = htmlMatrix(A, { pick: true });
    const info = h('div', 'out');
    el.append(named(nm.toUpperCase(), mx), info);
    function sel(i, j) {
      cells.flat().forEach(c => c.classList.remove('sel', 'on', 'on2'));
      cells[i].forEach(c => c.classList.add('on2'));
      cells.forEach(r => r[j].classList.add('on2'));
      cells[i][j].classList.add('sel');
      info.innerHTML = K(nm + '_{' + (i + 1) + (j + 1) + '} = ' + A[i][j].tex()) + ' &nbsp;nằm ở <b>dòng ' + (i + 1) + '</b>, <b>cột ' + (j + 1) + '</b>. Cấp ma trận: ' + K(A.length + '\\times' + A[0].length);
    }
    cells.forEach((r, i) => r.forEach((c, j) => c.addEventListener('click', () => sel(i, j))));
    const [si, sj] = (el.dataset.sel || '1,1').split(',').map(x => +x - 1); sel(si, sj);
  };

  /* ---------- Nhân hai ma trận ---------- */
  W.mxmul = function (el) {
    const A = M(el.dataset.a), B = M(el.dataset.b); const [na, nb] = (el.dataset.names || 'A,B').split(',');
    const C = LA.mul(A, B);
    el.classList.add('w');
    const ma = htmlMatrix(A), mb = htmlMatrix(B), mc = htmlMatrix(C, { pick: true });
    const row = h('div', 'mx-row');
    row.append(h('span', 'mx-name', na), ma.el, h('span', '', '·'), h('span', 'mx-name', nb), mb.el, h('span', '', '='), mc.el);
    const info = h('div', 'out');
    const hint = h('div', 'stepinfo', 'Bấm vào một ô của ma trận tích để xem cách tính');
    el.append(hint, row, info);
    function sel(i, j) {
      [ma, mb, mc].forEach(m => m.cells.flat().forEach(c => c.classList.remove('on', 'on2', 'onr', 'sel')));
      ma.cells[i].forEach(c => c.classList.add('on2'));
      mb.cells.forEach(r => r[j].classList.add('onr'));
      mc.cells[i][j].classList.add('sel', 'on');
      const terms = A[i].map((a, k) => '(' + a.tex() + ')(' + B[k][j].tex() + ')');
      info.innerHTML = K('c_{' + (i + 1) + (j + 1) + '} = \\underbrace{\\text{dòng } ' + (i + 1) + '\\text{ của } ' + na + '}_{} \\times \\underbrace{\\text{cột } ' + (j + 1) + '\\text{ của } ' + nb + '}_{} = ' + terms.join(' + ') + ' = ' + C[i][j].tex());
    }
    mc.cells.forEach((r, i) => r.forEach((c, j) => c.addEventListener('click', () => sel(i, j))));
    sel(0, 0);
  };

  /* ---------- Khử Gauss từng bước ---------- */
  W.elim = function (el) {
    const A = M(el.dataset.matrix); const mode = el.dataset.mode || 'rank'; const nm = el.dataset.name || 'A';
    let aug = +(el.dataset.aug || 0); let res, steps, summary = '';
    try {
      if (mode === 'inverse') {
        const n = A.length; const r = LA.inverse(A); steps = r.steps; aug = n;
        summary = r.inv ? K(nm + '^{-1} = ' + LA.texMatrix(r.inv)) : 'Vế trái không đưa được về ' + K('I') + ' ⇒ ' + K(nm) + ' <b>không khả nghịch</b>.';
      } else if (mode === 'solve' || mode === 'gauss') {
        const r = LA.solve(A); aug = 1;
        steps = mode === 'gauss' ? LA.eliminate(A, { mode: 'rank', aug: 1 }).steps : r.steps;
        const vars = Array.from({ length: r.n }, (_, j) => 'x_{' + (j + 1) + '}');
        let s = K('r(A) = ' + r.rankA + ',\\; r(\\overline{A}) = ' + r.rankAb + ',\\; n = ' + r.n) + ' ⇒ ';
        if (r.kind === 'none') s += '<b class="pen">Hệ vô nghiệm</b>';
        else if (r.kind === 'unique') s += '<b>Nghiệm duy nhất</b> ' + K('(' + vars.join(',') + ') = (' + r.tex.join(',\\ ') + ')');
        else s += '<b>Vô số nghiệm</b> (' + (r.n - r.rankA) + ' ẩn tự do): ' + K('(' + r.tex.join(',\\ ') + ')') + ', ' + K((r.free.length === 1 ? 'c' : r.free.map(j => 'c_{' + (j + 1) + '}').join(', ')) + '\\in\\mathbb{R}');
        summary = s;
      } else {
        res = LA.eliminate(A, { mode: mode === 'det' ? 'det' : 'rank', aug }); steps = res.steps;
        if (mode === 'det') {
          const D = res.M; const diag = D.map((r, i) => '(' + r[i].tex() + ')').join('');
          summary = res.rank < A.length ? 'Có dòng bằng 0 ⇒ ' + K('\\det ' + nm + ' = 0') :
            K('\\det ' + nm + ' = ' + (res.sign < 0 ? '-' : '') + diag + ' = ' + res.det.tex()) + (res.sign < 0 ? ' <span class="muted">(đổi dấu vì có số lẻ lần đổi chỗ hai dòng)</span>' : '');
        } else summary = 'Ma trận bậc thang có <b>' + res.rank + '</b> dòng khác 0 ⇒ ' + K('r(' + nm + ') = ' + res.rank);
      }
    } catch (e) { el.textContent = e.message; return; }
    if (el.dataset.result) summary = el.dataset.result;
    el.classList.add('w');
    const info = h('div', 'stepinfo'); const out = h('div', 'out'); const sum = h('div', 'out'); const ctrl = h('div', 'ctrl');
    let k = 0; const det = mode === 'det';
    function draw() {
      const s = steps[k];
      info.textContent = k === 0 ? 'Ma trận ban đầu · ' + (steps.length - 1) + ' bước biến đổi' : 'Bước ' + k + ' / ' + (steps.length - 1);
      const opts = { aug, det };
      if (k === 0) out.innerHTML = K((det ? '\\det ' + nm + ' = ' : '') + LA.texMatrix(s.M, opts), true);
      else {
        const prev = steps[k - 1];
        const opsTex = '\\substack{' + s.ops.join(' \\\\ ') + '}';
        const isSwap = s.ops.length === 1 && s.ops[0].includes('leftrightarrow');
        const mid = det ? '\\;\\overset{' + opsTex + '}{=}\\;' + (isSwap ? '-' : '') : '\\xrightarrow{' + opsTex + '}';
        out.innerHTML = K(LA.texMatrix(prev.M, opts) + mid + LA.texMatrix(s.M, Object.assign({ hlRows: s.hl || [] }, opts)), true);
      }
      sum.innerHTML = k === steps.length - 1 ? summary : '';
      bP.disabled = k === 0; bN.disabled = k === steps.length - 1;
    }
    const b0 = btn('⟲ Đầu', '', () => { k = 0; draw(); });
    const bP = btn('◀ Lùi', '', () => { if (k > 0) k--; draw(); });
    const bN = btn('Bước tiếp ▶', 'primary', () => { if (k < steps.length - 1) k++; draw(); });
    const bE = btn('Kết quả', '', () => { k = steps.length - 1; draw(); });
    ctrl.append(b0, bP, bN, bE, info);
    el.append(ctrl, out, sum); draw();
    el._print = () => {
      // Bản in: liệt kê mọi bước biến đổi thay cho nút bấm
      const all = h('div', 'out allsteps');
      all.innerHTML = steps.map((s, q) => {
        if (q === 0) return K((det ? '\\det ' + nm + ' = ' : '') + LA.texMatrix(s.M, { aug, det }), true);
        const opsTex = '\\substack{' + s.ops.join(' \\\\ ') + '}';
        const isSwap = s.ops.length === 1 && s.ops[0].includes('leftrightarrow');
        const mid = det ? '\\overset{' + opsTex + '}{=}\\;' + (isSwap ? '-' : '') : '\\xrightarrow{' + opsTex + '}';
        return K(mid + LA.texMatrix(s.M, { aug, det, hlRows: s.hl || [] }), true);
      }).join('') + '<div>' + summary + '</div>';
      el.append(all);
    };
  };

  /* ---------- Quy tắc Sarrus ---------- */
  W.sarrus = function (el) {
    let A = M(el.dataset.matrix); el.classList.add('w');
    const area = h('div', 'mx-row'); const terms = h('div', 'out'); const info = h('div', 'stepinfo'); const ctrl = h('div', 'ctrl');
    let k = 0, grid;
    const diag = [];
    for (let s = 0; s < 3; s++) diag.push({ sign: 1, cells: [[0, s], [1, s + 1], [2, s + 2]] });
    for (let s = 0; s < 3; s++) diag.push({ sign: -1, cells: [[0, s + 2], [1, s + 1], [2, s]] });
    function build() {
      const ext = A.map(r => r.concat([r[0], r[1]]));
      grid = htmlMatrix(ext, { ghostFrom: 3, det: true });
      area.innerHTML = ''; area.append(h('span', 'mx-name', 'D ='), grid.el, h('span', 'muted small', '← chép thêm cột 1, 2'));
    }
    function val(d) { return d.cells.reduce((p, [i, j]) => p.mul(A[i][j % 3]), F(1)); }
    function draw() {
      grid.cells.flat().forEach(c => c.classList.remove('on2', 'onr'));
      const shown = diag.slice(0, Math.min(k, 6));
      if (k >= 1 && k <= 6) { const d = diag[k - 1]; d.cells.forEach(([i, j]) => grid.cells[i][j].classList.add(d.sign > 0 ? 'on2' : 'onr')); }
      let tex = shown.map((d, t) => {
        const prod = d.cells.map(([i, j]) => '(' + A[i][j % 3].tex() + ')').join('\\cdot');
        return (d.sign > 0 ? (t ? '+' : '') : '-') + prod;
      }).join(' ');
      if (k === 7) {
        const vals = diag.map(d => (d.sign > 0 ? val(d) : val(d).neg()));
        const tot = vals.reduce((s, v) => s.add(v), F(0));
        tex = 'D = ' + vals.map((v, t) => (t && v.n >= 0 ? '+' : '') + v.tex()).join(' ') + ' = \\boxed{' + tot.tex() + '}';
      } else if (k) tex = 'D = ' + tex + (k < 6 ? '\\;\\cdots' : '');
      terms.innerHTML = k ? K(tex, true) : '<span class="muted">3 đường chéo xuôi mang dấu <b class="blue">+</b>, 3 đường chéo ngược mang dấu <b class="pen">−</b>.</span>';
      info.textContent = k === 0 ? 'Bắt đầu' : k <= 3 ? 'Chéo xuôi ' + k + ' (dấu +)' : k <= 6 ? 'Chéo ngược ' + (k - 3) + ' (dấu −)' : 'Cộng lại';
    }
    ctrl.append(btn('◀', '', () => { k = Math.max(0, k - 1); draw(); }), btn('Đường chéo tiếp ▶', 'primary', () => { k = Math.min(7, k + 1); draw(); }),
      btn('Đề mới', '', () => { A = A.map(r => r.map(() => F(Math.floor(Math.random() * 13) - 4))); k = 0; build(); draw(); }), info);
    el.append(ctrl, area, terms); build(); draw();
  };

  /* ---------- Khai triển Laplace ---------- */
  W.laplace = function (el) {
    const A = M(el.dataset.matrix); const n = A.length; el.classList.add('w');
    const ctrl = h('div', 'ctrl'); const area = h('div', 'mx-row'); const out = h('div', 'out');
    const { el: mx, cells } = htmlMatrix(A, { det: true }); area.append(h('span', 'mx-name', 'D ='), mx);
    const signs = h('div', 'small muted');
    function show(kind, t) {
      cells.flat().forEach(c => c.classList.remove('on', 'on2'));
      ctrl.querySelectorAll('.btn').forEach(b => b.classList.toggle('on', b.dataset.k === kind + t));
      const parts = [], vals = []; let skipped = 0;
      for (let s = 0; s < n; s++) {
        const i = kind === 'd' ? t : s, j = kind === 'd' ? s : t;
        cells[i][j].classList.add(A[i][j].isZero() ? 'on2' : 'on');
        if (A[i][j].isZero()) { skipped++; continue; }
        const mnr = LA.minor(A, i, j); const sg = (i + j) % 2 ? '-' : '+';
        parts.push((parts.length || sg === '-' ? sg : '') + '(' + A[i][j].tex() + ')' + LA.texMatrix(mnr, { det: true }));
        const v = LA.det(mnr).mul(A[i][j]); vals.push((i + j) % 2 ? v.neg() : v);
      }
      const tot = vals.reduce((s, v) => s.add(v), F(0));
      out.innerHTML = K('D = ' + (parts.join(' ') || '0') + (vals.length ? ' = ' + vals.map((v, q) => (q && v.n >= 0 ? '+' : '') + v.tex()).join(' ') : '') + ' = \\boxed{' + tot.tex() + '}', true) +
        '<div class="small">Khai triển theo <b>' + (kind === 'd' ? 'dòng ' : 'cột ') + (t + 1) + '</b>: cần tính <b>' + (n - skipped) + '</b> định thức con' + (skipped ? ' (bỏ qua ' + skipped + ' số 0)' : '') + '.</div>';
    }
    for (let t = 0; t < n; t++) { const b = btn('Dòng ' + (t + 1), '', () => show('d', t)); b.dataset.k = 'd' + t; ctrl.appendChild(b); }
    for (let t = 0; t < n; t++) { const b = btn('Cột ' + (t + 1), '', () => show('c', t)); b.dataset.k = 'c' + t; ctrl.appendChild(b); }
    signs.innerHTML = 'Dấu của phần bù: ' + K('(-1)^{i+j}') + ' theo bàn cờ ' + K(n === 3 ? '\\begin{smallmatrix}+&-&+\\\\-&+&-\\\\+&-&+\\end{smallmatrix}' : '\\begin{smallmatrix}+&-&+&-\\\\-&+&-&+\\\\+&-&+&-\\\\-&+&-&+\\end{smallmatrix}');
    el.append(ctrl, area, out, signs);
    const st = (el.dataset.start || 'd1'); show(st[0], +st.slice(1) - 1);
  };

  /* ---------- Quy tắc Cramer ---------- */
  W.cramer = function (el) {
    const Ab = M(el.dataset.matrix); const n = Ab.length; const A = Ab.map(r => r.slice(0, n)); const b = Ab.map(r => r[n]);
    const vn = (el.dataset.vars || '').split(',').filter(Boolean); const vname = j => vn[j] || 'x_{' + (j + 1) + '}';
    el.classList.add('w');
    const ctrl = h('div', 'ctrl'); const out = h('div', 'out'); const sum = h('div', 'out');
    const D = LA.det(A); const Ds = [];
    for (let j = 0; j < n; j++) Ds.push(LA.det(A.map((r, i) => r.map((x, c) => (c === j ? b[i] : x)))));
    function show(j) {
      ctrl.querySelectorAll('.btn').forEach(x => x.classList.toggle('on', +x.dataset.j === j));
      if (j < 0) out.innerHTML = K('D = ' + LA.texMatrix(A, { det: true }) + ' = ' + D.tex(), true);
      else if (j < n) {
        const Aj = A.map((r, i) => r.map((x, c) => (c === j ? b[i] : x)));
        out.innerHTML = K('D_{' + (j + 1) + '} = ' + LA.texMatrix(Aj, { det: true, hlCols: [j] }) + ' = ' + Ds[j].tex(), true) + '<div class="small muted">Thay <b>cột ' + (j + 1) + '</b> của D bởi cột hệ số tự do.</div>';
      } else {
        out.innerHTML = D.isZero() ? '<b class="pen">D = 0</b>: không phải hệ Cramer — chuyển sang phương pháp Gauss.' :
          K(Ds.map((d, q) => vname(q) + ' = \\dfrac{D_{' + (q + 1) + '}}{D} = \\dfrac{' + d.tex() + '}{' + D.tex() + '} = ' + d.div(D).tex()).join(',\\quad '), true);
      }
    }
    const b0 = btn('D', '', () => show(-1)); b0.dataset.j = -1; ctrl.appendChild(b0);
    for (let j = 0; j < n; j++) { const bb = btn('D' + sub(j + 1), '', () => show(j)); bb.dataset.j = j; ctrl.appendChild(bb); }
    const bs = btn('Nghiệm', 'primary', () => show(n)); bs.dataset.j = n; ctrl.appendChild(bs);
    el.append(ctrl, out, sum); show(-1);
  };

  /* ---------- Mô hình Leontief 2 ngành ---------- */
  W.leontief = function (el) {
    el.classList.add('w');
    const st = { a11: .2, a12: .3, a21: .4, a22: .1, d1: 100, d2: 200 };
    const ctrl = h('div', 'ctrl');
    const mk = (k, lab, type, min, max, step) => {
      const id = el.id + '-' + k; const l = h('label', '', lab + ' '); l.setAttribute('for', id);
      const i = h('input'); i.type = type; i.id = id; i.min = min; i.max = max; i.step = step; i.value = st[k];
      i.addEventListener('input', () => { st[k] = parseFloat(i.value) || 0; draw(); });
      const wr = h('span', 'row'); wr.style.gap = '.3em'; wr.append(l, i); return wr;
    };
    ['a11', 'a12', 'a21', 'a22'].forEach(k => ctrl.appendChild(mk(k, K('a_{' + k.slice(1) + '}'), 'number', 0, .95, .05)));
    const ctrl2 = h('div', 'ctrl');
    const dv = {};
    ['d1', 'd2'].forEach(k => { const w = mk(k, 'Cầu cuối ' + K('d_' + k[1]), 'range', 0, 500, 10); dv[k] = h('b', '', ''); w.appendChild(dv[k]); ctrl2.appendChild(w); });
    const out = h('div', 'out'); const bars = h('div', 'lbars');
    el.append(ctrl, ctrl2, out, bars);
    const f = x => (Math.round(x * 1000) / 1000).toString();
    function draw() {
      dv.d1.textContent = st.d1; dv.d2.textContent = st.d2;
      const m11 = 1 - st.a11, m12 = -st.a12, m21 = -st.a21, m22 = 1 - st.a22;
      const D = m11 * m22 - m12 * m21;
      if (Math.abs(D) < 1e-9) { out.innerHTML = '<b class="pen">det(I − A) = 0</b>: không tồn tại ma trận nghịch đảo.'; bars.innerHTML = ''; return; }
      const i11 = m22 / D, i12 = -m12 / D, i21 = -m21 / D, i22 = m11 / D;
      const x1 = i11 * st.d1 + i12 * st.d2, x2 = i21 * st.d1 + i22 * st.d2;
      out.innerHTML = K('I-A = \\begin{pmatrix}' + f(m11) + '&' + f(m12) + '\\\\' + f(m21) + '&' + f(m22) + '\\end{pmatrix},\\ \\det(I-A) = ' + f(D) +
        ',\\ (I-A)^{-1} \\approx \\begin{pmatrix}' + f(i11) + '&' + f(i12) + '\\\\' + f(i21) + '&' + f(i22) + '\\end{pmatrix}', true) +
        K('x = (I-A)^{-1}d \\approx \\begin{pmatrix}' + f(x1) + '\\\\' + f(x2) + '\\end{pmatrix}', true);
      const mx = Math.max(x1, x2, st.d1, st.d2, 1);
      const bad = x1 < 0 || x2 < 0 || D < 0;
      bars.innerHTML = [['Ngành 1', st.d1, x1], ['Ngành 2', st.d2, x2]].map(([n, d, x]) =>
        '<div class="lb"><span>' + n + '</span><div class="tr"><i class="d" style="width:' + Math.max(0, d / mx * 100) + '%"></i><i class="x" style="width:' + Math.max(0, x / mx * 100) + '%"></i></div><span class="v">d = ' + d + ' · x ≈ ' + f(x) + '</span></div>').join('') +
        '<div class="small muted">Thanh nhạt: cầu cuối d · thanh đậm: tổng sản lượng x cần sản xuất.' + (bad ? ' <b class="pen">Hệ số không hợp lý về kinh tế (x âm).</b>' : '') + '</div>';
    }
    draw();
  };

  /* ---------- Hệ 2 phương trình 2 ẩn: hình học ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function plane(R, size) {
    const s = svg('svg', { viewBox: (-R) + ' ' + (-R) + ' ' + (2 * R) + ' ' + (2 * R), class: 'plane', role: 'img' });
    if (size) s.style.maxWidth = size;
    const g = svg('g', {}, s);
    for (let t = -R; t <= R; t++) {
      svg('line', { x1: t, y1: -R, x2: t, y2: R, class: t === 0 ? 'ax' : 'gl' }, g);
      svg('line', { x1: -R, y1: t, x2: R, y2: t, class: t === 0 ? 'ax' : 'gl' }, g);
    }
    return s;
  }
  W.sys2 = function (el) {
    el.classList.add('w');
    const presets = {
      'Duy nhất': [1, 1, 4, 1, -1, 2], 'Vô nghiệm': [1, 1, 4, 2, 2, 2], 'Vô số nghiệm': [1, 1, 4, 2, 2, 8]
    };
    let v = presets['Duy nhất'].slice();
    const ctrl = h('div', 'ctrl'); Object.keys(presets).forEach(k => ctrl.appendChild(btn(k, '', () => { v = presets[k].slice(); syncInputs(); draw(); })));
    const eqs = h('div', 'ctrl'); const ins = [];
    const labels = ['x +', 'y =', ''];
    [0, 1].forEach(r => {
      const line = h('span', 'row'); line.style.gap = '.25em'; line.appendChild(h('b', r ? 'pen' : 'blue', r ? '(d₂)' : '(d₁)'));
      for (let c = 0; c < 3; c++) {
        const i = h('input'); i.type = 'number'; i.step = 1; i.id = (el.id || 'sys2') + '-' + r + c; i.setAttribute('aria-label', 'hệ số ' + (r + 1) + '-' + (c + 1));
        i.addEventListener('input', () => { v[r * 3 + c] = parseFloat(i.value) || 0; draw(); }); ins.push(i);
        line.append(i, h('span', '', labels[c]));
      }
      eqs.appendChild(line);
    });
    function syncInputs() { ins.forEach((i, k) => { i.value = v[k]; }); }
    const body = h('div', 'cols'); body.style.alignItems = 'center';
    const R = 7; const pl = plane(R, '330px'); const gL = svg('g', {}, pl); const out = h('div', 'out');
    body.append(pl, out); el.append(ctrl, eqs, body);
    function lineSeg(a, b, c, cls) {
      if (a === 0 && b === 0) return;
      let p;
      if (Math.abs(b) >= Math.abs(a)) p = [[-R, (c + a * R) / b], [R, (c - a * R) / b]];
      else p = [[(c + b * R) / a, -R], [(c - b * R) / a, R]];
      // trục y của SVG hướng xuống: đổi dấu y
      svg('line', { x1: p[0][0], y1: -p[0][1], x2: p[1][0], y2: -p[1][1], class: cls }, gL);
    }
    function draw() {
      gL.innerHTML = '';
      const [a1, b1, c1, a2, b2, c2] = v;
      lineSeg(a1, b1, c1, 'l1'); lineSeg(a2, b2, c2, 'l2');
      const D = F(a1).mul(F(b2)).sub(F(a2).mul(F(b1)));
      const Dx = F(c1).mul(F(b2)).sub(F(c2).mul(F(b1)));
      const Dy = F(a1).mul(F(c2)).sub(F(a2).mul(F(c1)));
      let verdict;
      if (!D.isZero()) {
        const x = Dx.div(D), y = Dy.div(D);
        svg('circle', { cx: x.val(), cy: -y.val(), r: .28, class: 'pt' }, gL);
        verdict = '<span class="verdict ok">D ≠ 0 · Nghiệm duy nhất</span>' + K('(x, y) = \\left(' + x.tex() + ', ' + y.tex() + '\\right)', true) + '<div class="small muted">Hai đường thẳng cắt nhau.</div>';
      } else if (!Dx.isZero() || !Dy.isZero()) verdict = '<span class="verdict bad">D = 0, có D<sub>x</sub> hoặc D<sub>y</sub> ≠ 0 · Vô nghiệm</span><div class="small muted">Hai đường thẳng song song.</div>';
      else verdict = '<span class="verdict mid">D = D<sub>x</sub> = D<sub>y</sub> = 0 · Vô số nghiệm</span><div class="small muted">Hai đường thẳng trùng nhau.</div>';
      out.innerHTML = K('D = \\begin{vmatrix}' + a1 + '&' + b1 + '\\\\' + a2 + '&' + b2 + '\\end{vmatrix} = ' + D.tex() + ',\\ D_x = ' + Dx.tex() + ',\\ D_y = ' + Dy.tex(), true) + verdict;
    }
    syncInputs(); draw();
  };

  /* ---------- Định lý Kronecker – Capelli ---------- */
  W.kc = function (el) {
    el.classList.add('w');
    const st = { n: 4, ra: 2, rb: 2 };
    const ctrl = h('div', 'ctrl');
    [['n', 'Số ẩn n'], ['ra', 'r(A)'], ['rb', 'r(Ā)']].forEach(([k, lab]) => {
      const id = (el.id || 'kc') + '-' + k; const l = h('label', '', lab + ' '); l.setAttribute('for', id);
      const i = h('input'); i.type = 'number'; i.min = 0; i.max = 9; i.value = st[k]; i.id = id;
      i.addEventListener('input', () => { st[k] = parseInt(i.value, 10) || 0; draw(); });
      ctrl.append(l, i);
    });
    const fl = h('div', 'kcflow');
    fl.innerHTML =
      '<div class="kn" data-n="q1">So sánh ' + K('r(A)') + ' và ' + K('r(\\overline{A})') + '</div>' +
      '<div class="kbr"><div class="kcol"><div class="ke" data-n="e1">' + K('r(A) < r(\\overline{A})') + '</div><div class="kn res bad" data-n="none">VÔ NGHIỆM</div></div>' +
      '<div class="kcol"><div class="ke" data-n="e2">' + K('r(A) = r(\\overline{A}) = r') + '</div><div class="kn" data-n="q2">So sánh ' + K('r') + ' với số ẩn ' + K('n') + '</div>' +
      '<div class="kbr"><div class="kcol"><div class="ke" data-n="e3">' + K('r = n') + '</div><div class="kn res ok" data-n="one">NGHIỆM DUY NHẤT</div></div>' +
      '<div class="kcol"><div class="ke" data-n="e4">' + K('r < n') + '</div><div class="kn res mid" data-n="many">VÔ SỐ NGHIỆM<br><small>phụ thuộc n − r tham số</small></div></div></div></div></div>';
    const msg = h('div', 'out');
    el.append(ctrl, fl, msg);
    function draw() {
      const { n, ra, rb } = st; const on = new Set();
      let m = '';
      if (rb < ra || rb > ra + 1 || ra > n) m = '<span class="pen">Bộ số không hợp lệ: luôn có ' + K('r(A) \\le r(\\overline{A}) \\le r(A)+1') + ' và ' + K('r(A) \\le n') + '.</span>';
      else {
        on.add('q1');
        if (ra < rb) { on.add('e1'); on.add('none'); m = 'Hệ <b>vô nghiệm</b>.'; }
        else {
          on.add('e2'); on.add('q2');
          if (ra === n) { on.add('e3'); on.add('one'); m = 'Hệ có <b>nghiệm duy nhất</b>.'; }
          else { on.add('e4'); on.add('many'); m = 'Hệ có <b>vô số nghiệm</b>, phụ thuộc ' + K('n - r = ' + (n - ra)) + ' tham số (ẩn tự do).'; }
        }
      }
      fl.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('lit', on.has(x.dataset.n)));
      msg.innerHTML = m;
    }
    draw();
  };

  /* ---------- Véctơ trong R²: độc lập tuyến tính, tọa độ ---------- */
  W.vec2 = function (el) {
    el.classList.add('w');
    const coords = el.dataset.mode === 'coords';
    const st = { u: [2, 1], v: [1, 3], w: [4, 5] };
    if (el.dataset.u) st.u = el.dataset.u.split(',').map(Number);
    if (el.dataset.v) st.v = el.dataset.v.split(',').map(Number);
    if (el.dataset.w) st.w = el.dataset.w.split(',').map(Number);
    const R = 6; const pl = plane(R, '360px'); pl.classList.add('vecplane');
    const gP = svg('g', {}, pl), gV = svg('g', {}, pl), gH = svg('g', {}, pl);
    const out = h('div', 'out');
    const body = h('div', 'cols'); body.style.alignItems = 'center'; body.append(pl, out);
    const hint = h('div', 'stepinfo', 'Kéo các chấm tròn ở đầu véctơ để thay đổi (tọa độ nguyên)');
    const ctrl = h('div', 'ctrl');
    ctrl.append(btn('Cùng phương', '', () => { st.u = [2, 1]; st.v = [-4, -2]; draw(); }), btn('Không cùng phương', '', () => { st.u = [2, 1]; st.v = [1, 3]; draw(); }), hint);
    el.append(ctrl, body);
    function arrow(p, cls, label) {
      const [x, y] = p; const L = Math.hypot(x, y);
      svg('line', { x1: 0, y1: 0, x2: x, y2: -y, class: 'vec ' + cls }, gV);
      if (L > 0.01) {
        const ux = x / L, uy = -y / L, s = .45;
        const bx = x - ux * s, by = -y - uy * s;
        svg('polygon', { points: [x, -y, bx - uy * s * .5, by + ux * s * .5, bx + uy * s * .5, by - ux * s * .5].join(' '), class: 'head ' + cls }, gV);
      }
      const t = svg('text', { x: x + .25, y: -y - .25, class: 'vlab ' + cls }, gV); t.textContent = label;
    }
    function handle(key, cls) {
      const c = svg('circle', { cx: st[key][0], cy: -st[key][1], r: .38, class: 'hdl ' + cls, tabindex: 0 }, gH);
      c.addEventListener('pointerdown', e => {
        e.preventDefault(); c.setPointerCapture(e.pointerId);
        const mv = ev => {
          const pt = pl.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
          const p = pt.matrixTransform(pl.getScreenCTM().inverse());
          const nx = Math.max(-R + 1, Math.min(R - 1, Math.round(p.x))), ny = Math.max(-R + 1, Math.min(R - 1, Math.round(-p.y)));
          if (nx !== st[key][0] || ny !== st[key][1]) { st[key] = [nx, ny]; draw(); }
        };
        const up = () => { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); };
        c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up);
      });
    }
    function draw() {
      gP.innerHTML = ''; gV.innerHTML = ''; gH.innerHTML = '';
      const [a, b] = st.u, [c, d] = st.v; const D = a * d - b * c;
      if (!coords) svg('polygon', { points: [0, 0, a, -b, a + c, -(b + d), c, -d].join(' '), class: 'para' }, gP);
      let html = K('\\vec u = (' + a + ', ' + b + '),\\ \\vec v = (' + c + ', ' + d + ')') + '<br>' + K('\\det\\begin{pmatrix}' + a + '&' + b + '\\\\' + c + '&' + d + '\\end{pmatrix} = ' + D, true);
      if (D !== 0) html += '<span class="verdict ok">Độc lập tuyến tính</span><div class="small">{u, v} là một <b>cơ sở</b> của ℝ². ' + (coords ? '' : 'Diện tích hình bình hành = |det| = ' + Math.abs(D) + '.') + '</div>';
      else html += '<span class="verdict bad">Phụ thuộc tuyến tính</span><div class="small">' + ((a === 0 && b === 0) || (c === 0 && d === 0) ? 'Hệ chứa véctơ 0.' : 'Hai véctơ cùng phương: hình bình hành "dẹt", diện tích = 0.') + '</div>';
      if (coords) {
        const [p, q] = st.w;
        arrow(st.w, 'vw', 'w');
        if (D !== 0) {
          const x = F(p * d - q * c, D), y = F(a * q - b * p, D);
          const ax = x.val() * a, ay = x.val() * b;
          svg('line', { x1: 0, y1: 0, x2: ax, y2: -ay, class: 'dash du' }, gP);
          svg('line', { x1: ax, y1: -ay, x2: p, y2: -q, class: 'dash dv' }, gP);
          html += '<div class="small" style="margin-top:.4em">' + K('\\vec w = (' + p + ', ' + q + ') = ' + x.tex() + '\\,\\vec u ' + (y.n < 0 ? '' : '+') + y.tex() + '\\,\\vec v') + '<br>Tọa độ của ' + K('\\vec w') + ' đối với cơ sở ' + K('(\\vec u, \\vec v)') + ': ' + K('\\left(' + x.tex() + ', ' + y.tex() + '\\right)') + '</div>';
        } else html += '<div class="small pen">Không phải cơ sở ⇒ không xác định tọa độ.</div>';
      }
      arrow(st.u, 'vu', 'u'); arrow(st.v, 'vv', 'v');
      handle('u', 'vu'); handle('v', 'vv'); if (coords) handle('w', 'vw');
      out.innerHTML = html;
    }
    draw();
  };

  /* ---------- Trò chơi ôn tập ---------- */
  W.game = function (el) {
    const data = JSON.parse(el.querySelector('script[type="application/json"]').textContent);
    el.classList.add('w', 'game');
    const head = h('div', 'ctrl'); const q = h('div', 'gq'); const opts = h('div', 'quiz'); const foot = h('div', 'out');
    const tbar = h('div', 'gtime', '<i></i>');
    el.append(head, tbar, q, opts, foot);
    let k = 0, score = 0, t = null, left = 0; const T = +(el.dataset.sec || 30);
    function start() { k = 0; score = 0; ask(); }
    function stop() { if (t) clearInterval(t); t = null; }
    function ask() {
      stop();
      if (k >= data.length) {
        head.innerHTML = '<b>Kết thúc!</b>';
        q.innerHTML = '<div class="gend">' + score + ' / ' + data.length + '</div><div class="center">câu trả lời đúng</div>';
        opts.innerHTML = ''; foot.innerHTML = ''; foot.appendChild(btn('Chơi lại', 'primary', start)); tbar.firstChild.style.width = '0'; return;
      }
      const it = data[k];
      head.innerHTML = '<span class="chip bt">Câu ' + (k + 1) + ' / ' + data.length + '</span><span class="chip">Điểm: ' + score + '</span>';
      q.innerHTML = it.q;
      opts.innerHTML = '<ol class="opts">' + it.opts.map((o, i) => '<li><button type="button" class="opt" data-i="' + i + '"><span class="L">' + 'ABCD'[i] + '</span><span>' + o + '</span></button></li>').join('') + '</ol>';
      foot.innerHTML = '';
      if (window.TKT) { TKT.renderMath(q); TKT.renderMath(opts); }
      let done = false;
      const finish = (i) => {
        if (done) return; done = true; stop();
        opts.querySelectorAll('.opt').forEach(b => { const j = +b.dataset.i; if (j === it.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
        if (i === it.a) score++;
        foot.innerHTML = (i === it.a ? '<b class="verdict ok">Đúng</b> ' : i < 0 ? '<b class="verdict bad">Hết giờ</b> ' : '<b class="verdict bad">Sai</b> ') + (it.why || '');
        if (window.TKT) TKT.renderMath(foot);
        foot.appendChild(document.createTextNode(' '));
        foot.appendChild(btn(k + 1 < data.length ? 'Câu tiếp ▶' : 'Xem kết quả', 'primary', () => { k++; ask(); }));
      };
      opts.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => finish(+b.dataset.i)));
      left = T; tbar.firstChild.style.width = '100%';
      t = setInterval(() => { left -= .25; tbar.firstChild.style.width = Math.max(0, left / T * 100) + '%'; if (left <= 0) finish(-1); }, 250);
    }
    head.innerHTML = '<span class="chip bt">' + data.length + ' câu · ' + T + ' giây/câu</span>';
    q.innerHTML = HV ? '<b>Rung chuông vàng</b> — tự trả lời ' + data.length + ' câu, mỗi câu ' + T + ' giây. Mục tiêu: đúng từ ' + Math.ceil(data.length * .8) + ' câu trở lên.'
      : '<b>Rung chuông vàng</b> — cả lớp cùng trả lời trên bảng con; giảng viên chọn đáp án đa số.';
    el._print = () => {
      const l = h('ol', 'allsteps small');
      l.innerHTML = data.map(it => '<li>' + it.q + ' <i>— Đáp án: ' + 'ABCD'[it.a] + '. ' + it.opts[it.a] + '</i></li>').join('');
      el.append(l); if (window.TKT) TKT.renderMath(l);
    };
    foot.appendChild(btn('Bắt đầu', 'primary', start));
  };

  /* Lời giải ẩn: <button class="reveal-btn" data-for="id"> */
  document.addEventListener('click', e => {
    const b = e.target.closest('.reveal-btn[data-for]'); if (!b) return;
    const t = document.getElementById(b.dataset.for); if (!t) return;
    t.hidden = !t.hidden; b.textContent = t.hidden ? (b.dataset.label || 'Xem lời giải') : 'Ẩn lời giải';
  });

  window.TKTWidgets = {
    W, K, htmlMatrix,
    initAll(root) {
      root.querySelectorAll('[data-widget]').forEach(el => {
        const f = W[el.dataset.widget];
        if (f) { try { f(el); } catch (e) { el.innerHTML = '<span class="pen">Lỗi công cụ: ' + e.message + '</span>'; console.error(e); } }
      });
      root.querySelectorAll('.reveal-btn[data-for]').forEach(b => { if (!b.dataset.label) b.dataset.label = b.textContent; const t = document.getElementById(b.dataset.for); if (t) t.hidden = true; });
    },
    // Chuẩn bị bản in: mỗi công cụ hiện dạng tĩnh một lần; mở mọi lời giải ẩn
    printAll(root) {
      root.querySelectorAll('[data-widget]').forEach(el => { if (el._print && !el._printed) { el._printed = true; try { el._print(); } catch (e) { console.error(e); } } });
      root.querySelectorAll('.reveal-btn[data-for]').forEach(b => { const t = document.getElementById(b.dataset.for); if (t) t.hidden = false; });
    }
  };
})();
