/* qhtt.js — quy hoạch tuyến tính bằng số hữu tỉ chính xác (dùng LA.F của linalg.js).
   Quy ước theo giáo trình: bài toán chuẩn là MIN, ước lượng Δj = Σ c_i t_ij − c_j, tối ưu khi mọi Δj ≤ 0;
   đưa vào cơ sở cột có Δ lớn nhất, loại ra theo tỉ số θ nhỏ nhất (hòa: ưu tiên loại biến giả, sau đó chỉ số nhỏ nhất — quy tắc Bland);
   biến giả có hệ số M (số dạng α + βM). Bài toán vận tải: phương pháp cước phí nhỏ nhất / Vogel, thế vị.
   Không dùng DOM: chạy trong trình duyệt, Node và Google Apps Script. */
(function (root) {
  'use strict';
  const LA = root.LA || (typeof require === 'function' ? require('./linalg.js') : null);
  const F = LA.F;
  const Z = () => F(0);

  /* ---------- Số dạng α + βM ---------- */
  function MV(a, b) { this.a = F(a || 0); this.b = F(b || 0); }
  MV.prototype = {
    add(o) { o = mv(o); return new MV(this.a.add(o.a), this.b.add(o.b)); },
    sub(o) { o = mv(o); return new MV(this.a.sub(o.a), this.b.sub(o.b)); },
    mul(k) { k = F(k); return new MV(this.a.mul(k), this.b.mul(k)); },
    neg() { return new MV(this.a.neg(), this.b.neg()); },
    cmp(o) { o = mv(o); const d = this.sub(o); if (!d.b.isZero()) return d.b.n > 0 ? 1 : -1; return d.a.isZero() ? 0 : d.a.n > 0 ? 1 : -1; },
    isZero() { return this.a.isZero() && this.b.isZero(); },
    hasM() { return !this.b.isZero(); },
    tex() {
      if (this.b.isZero()) return this.a.tex();
      const bm = this.b.eq(1) ? 'M' : this.b.eq(-1) ? '-M' : this.b.tex() + 'M';
      if (this.a.isZero()) return bm;
      return this.a.tex() + (this.b.n > 0 ? '+' : '') + bm;
    },
    toString() { return this.b.isZero() ? this.a.toString() : this.a + (this.b.n >= 0 ? '+' : '') + this.b + 'M'; }
  };
  const mv = x => (x instanceof MV ? x : x === 'M' ? new MV(0, 1) : new MV(F(x), 0));
  const M = new MV(0, 1);

  /* ---------- Đọc bài toán dạng văn bản ----------
     Dòng 1: "min 2 -1 1" hoặc "max 3 5" (hệ số hàm mục tiêu)
     Các dòng sau: "1 3 -1 = 6", "1 -2 >= 3", "2 1 -4 <= 12"
     Dòng dấu (tùy chọn): "dau >=0 >=0 tuy" (mỗi biến: >=0, <=0, tuy). Mặc định mọi biến ≥ 0. */
  function parseLP(text) {
    const lines = String(text).trim().split(/\s*[\n;]\s*/).filter(Boolean);
    const head = lines.shift().trim().split(/[\s,]+/);
    const type = head.shift().toLowerCase();
    if (type !== 'min' && type !== 'max') throw new Error('Dòng đầu phải bắt đầu bằng min hoặc max');
    const c = head.map(x => F(x));
    const rows = []; let signs = null;
    lines.forEach(l => {
      const t = l.trim().split(/[\s,]+/);
      if (/^(dau|dấu|sign)/i.test(t[0])) { signs = t.slice(1).map(s => (s === '<=0' || s === '≤0' ? '<=0' : /^t|^f/i.test(s) ? 'free' : '>=0')); return; }
      const k = t.findIndex(x => /^(<=|>=|=|≤|≥)$/.test(x));
      if (k < 0) throw new Error('Thiếu dấu ràng buộc (<=, >=, =) ở dòng: ' + l);
      const op = t[k].replace('≤', '<=').replace('≥', '>=');
      rows.push({ a: t.slice(0, k).map(x => F(x)), op, b: F(t[k + 1]) });
    });
    const n = c.length;
    rows.forEach((r, i) => { if (r.a.length !== n) throw new Error('Ràng buộc ' + (i + 1) + ' có ' + r.a.length + ' hệ số, hàm mục tiêu có ' + n); });
    return { type, c, rows, signs: signs || Array(n).fill('>=0'), n };
  }
  function lpFromArrays(type, c, rows, signs) {
    return { type, c: c.map(x => F(x)), rows: rows.map(r => ({ a: r[0].map(x => F(x)), op: r[1], b: F(r[2]) })), signs: signs || c.map(() => '>=0'), n: c.length };
  }

  /* ---------- Đưa về dạng chính tắc (min, ràng buộc =, b ≥ 0, biến ≥ 0) ---------- */
  function canonical(lp) {
    const cols = [];          // mỗi cột: {name, from: chỉ số biến gốc hoặc null, sign: +1/-1, kind}
    lp.signs.forEach((s, j) => {
      const nm = 'x_{' + (j + 1) + '}';
      if (s === '>=0') cols.push({ name: nm, from: j, sign: 1, kind: 'goc' });
      else if (s === '<=0') cols.push({ name: "x'_{" + (j + 1) + '}', from: j, sign: -1, kind: 'goc' });
      else { cols.push({ name: 'x^+_{' + (j + 1) + '}', from: j, sign: 1, kind: 'goc' }); cols.push({ name: 'x^-_{' + (j + 1) + '}', from: j, sign: -1, kind: 'goc' }); }
    });
    const sgn = lp.type === 'max' ? -1 : 1;
    const A = lp.rows.map(r => cols.map(col => r.a[col.from].mul(col.sign)));
    const c = cols.map(col => lp.c[col.from].mul(col.sign * sgn));
    const b = lp.rows.map(r => r.b);
    let next = lp.n;
    lp.rows.forEach((r, i) => {
      if (r.op === '=') return;
      next++;
      cols.push({ name: 'x_{' + next + '}', from: null, sign: 0, kind: 'phu' });
      A.forEach((row, t) => row.push(F(t === i ? (r.op === '<=' ? 1 : -1) : 0)));
      c.push(F(0));
    });
    // b ≥ 0
    A.forEach((row, i) => { if (b[i].n < 0) { A[i] = row.map(x => x.neg()); b[i] = b[i].neg(); } });
    return { A, b, c, cols, type: lp.type, n0: lp.n, lp };
  }

  /* ---------- Phương pháp đơn hình (bảng đơn hình, có biến giả M) ---------- */
  function unitColumn(A, i, j) { return A.every((row, t) => (t === i ? row[j].eq(1) : row[j].isZero())); }
  function simplex(cf, opts) {
    opts = opts || {};
    const m = cf.A.length;
    let A = cf.A.map(r => r.slice()), b = cf.b.slice();
    let c = cf.c.map(x => mv(x)); let cols = cf.cols.map(x => Object.assign({}, x));
    // cơ sở ban đầu: cột đơn vị có sẵn, thiếu thì thêm biến giả
    const basis = Array(m).fill(-1);
    for (let i = 0; i < m; i++) for (let j = 0; j < A[0].length; j++) if (basis[i] < 0 && basis.indexOf(j) < 0 && unitColumn(A, i, j)) { basis[i] = j; }
    const art = [];
    for (let i = 0; i < m; i++) if (basis[i] < 0) {
      const j = A[0].length; A.forEach((row, t) => row.push(F(t === i ? 1 : 0))); c.push(M); art.push(j);
      cols.push({ name: 'x_{' + (cols.length + 1) + '}', from: null, sign: 0, kind: 'gia' }); basis[i] = j;
    }
    // bảng: T = A (vì cơ sở là các cột đơn vị, t_ij = a_ij), x = b
    let T = A.map(r => r.slice()), x = b.slice();
    const steps = []; let status = null;
    const deltas = () => T[0].map((_, j) => basis.reduce((s, bj, i) => s.add(c[bj].mul(T[i][j])), new MV(0, 0)).sub(c[j]));
    const fval = () => basis.reduce((s, bj, i) => s.add(c[bj].mul(x[i])), new MV(0, 0));
    for (let it = 0; it < 60; it++) {
      const d = deltas(); const f = fval();
      const st = { basis: basis.slice(), cB: basis.map(j => c[j]), x: x.slice(), T: T.map(r => r.slice()), d, f, cols: cols.map(z => z.name), c: c.slice(), kinds: cols.map(z => z.kind) };
      steps.push(st);
      const pos = d.map((v, j) => (v.cmp(0) > 0 ? j : -1)).filter(j => j >= 0);
      if (!pos.length) {
        const artIn = basis.some((bj, i) => cols[bj].kind === 'gia' && !x[i].isZero());
        status = artIn ? 'vo-nghiem' : 'toi-uu'; break;
      }
      const unb = pos.find(j => T.every(r => r[j].n <= 0));
      if (unb !== undefined) { status = 'khong-bi-chan'; st.unb = unb; break; }
      let k = pos[0]; pos.forEach(j => { if (d[j].cmp(d[k]) > 0) k = j; });
      let r = -1, best = null;
      for (let i = 0; i < m; i++) {
        if (T[i][k].n <= 0) continue;
        const th = x[i].div(T[i][k]);
        const isA = q => cols[basis[q]].kind === 'gia';
        if (r < 0 || th.sub(best).n < 0 || (th.eq(best) && (isA(i) !== isA(r) ? isA(i) : basis[i] < basis[r]))) { r = i; best = th; }
      }
      st.pivot = { r, k, theta: best };
      // biến đổi bảng
      const p = T[r][k], colk = T.map(row => row[k]);
      const Tr = T[r].map(v => v.div(p)), xr = x[r].div(p);
      T = T.map((row, i) => (i === r ? Tr : row.map((v, j) => v.sub(Tr[j].mul(colk[i])))));
      x = x.map((v, i) => (i === r ? xr : v.sub(xr.mul(colk[i]))));
      const leaving = basis[r]; basis[r] = k;
      // biến giả rời cơ sở: bỏ cột của nó (như giáo trình)
      if (cols[leaving].kind === 'gia') {
        T = T.map(row => row.filter((_, j) => j !== leaving)); c = c.filter((_, j) => j !== leaving); cols = cols.filter((_, j) => j !== leaving);
        for (let i = 0; i < m; i++) if (basis[i] > leaving) basis[i]--;
      }
    }
    if (!status) status = 'qua-nhieu-buoc';
    const last = steps[steps.length - 1];
    const res = { status, steps, cf };
    if (status === 'toi-uu') {
      const full = Array(cols.length).fill(F(0)); last.basis.forEach((bj, i) => { full[bj] = last.x[i]; });
      res.xCanon = full;
      const xs = Array(cf.n0).fill(F(0));
      cols.forEach((col, j) => { if (col.from !== null && col.kind === 'goc') xs[col.from] = xs[col.from].add(full[j].mul(col.sign)); });
      res.x = xs;
      let fmin = last.f.a; res.f = cf.type === 'max' ? fmin.neg() : fmin;
      // có phương án tối ưu khác? (Δj = 0 ở cột ngoài cơ sở)
      res.nhieuPA = last.d.some((v, j) => last.basis.indexOf(j) < 0 && v.isZero() && cols[j].kind !== 'gia' && T.some(rw => rw[j].n > 0));
    }
    return res;
  }
  function solve(lp) { return simplex(canonical(lp)); }

  /* ---------- Bài toán đối ngẫu (bảng 2.11 giáo trình) ---------- */
  function dual(lp) {
    const m = lp.rows.length, n = lp.n, mn = lp.type === 'min';
    const ysign = lp.rows.map(r => (r.op === '=' ? 'free' : mn ? (r.op === '>=' ? '>=0' : '<=0') : (r.op === '<=' ? '>=0' : '<=0')));
    const rows = [];
    for (let j = 0; j < n; j++) {
      const s = lp.signs[j];
      const op = s === 'free' ? '=' : mn ? (s === '>=0' ? '<=' : '>=') : (s === '>=0' ? '>=' : '<=');
      rows.push({ a: lp.rows.map(r => r.a[j]), op, b: lp.c[j] });
    }
    return { type: mn ? 'max' : 'min', c: lp.rows.map(r => r.b), rows, signs: ysign, n: m, var: 'y' };
  }

  /* ---------- Phương pháp hình học (2 biến) ---------- */
  function halfplanes(lp) {
    const H = lp.rows.map(r => ({ a: r.a, op: r.op, b: r.b }));
    lp.signs.forEach((s, j) => { if (s !== 'free') H.push({ a: [0, 1].map(t => F(t === j ? 1 : 0)), op: s === '>=0' ? '>=' : '<=', b: F(0), sign: true }); });
    return H;
  }
  const sat = (h, p) => { const v = h.a[0].mul(p[0]).add(h.a[1].mul(p[1])); const d = v.sub(h.b); return h.op === '<=' ? d.n <= 0 : h.op === '>=' ? d.n >= 0 : d.isZero(); };
  function vertices(lp) {
    if (lp.n !== 2) throw new Error('Phương pháp hình học chỉ dùng cho bài toán 2 biến');
    const H = halfplanes(lp), V = [];
    for (let i = 0; i < H.length; i++) for (let k = i + 1; k < H.length; k++) {
      const [a1, b1] = H[i].a, [a2, b2] = H[k].a; const D = a1.mul(b2).sub(a2.mul(b1)); if (D.isZero()) continue;
      const p = [H[i].b.mul(b2).sub(H[k].b.mul(b1)).div(D), a1.mul(H[k].b).sub(a2.mul(H[i].b)).div(D)];
      if (H.every(h => sat(h, p)) && !V.some(q => q[0].eq(p[0]) && q[1].eq(p[1]))) V.push(p);
    }
    const val = p => lp.c[0].mul(p[0]).add(lp.c[1].mul(p[1]));
    return V.map(p => ({ p, f: val(p) }));
  }
  function graph(lp) {
    const res = solve(lp); const V = vertices(lp);
    const out = { status: res.status, V, f: res.f, x: res.x, H: halfplanes(lp) };
    if (res.status === 'toi-uu') out.opt = V.filter(v => v.f.eq(res.f));
    return out;
  }

  /* ---------- Phương án cực biên của hệ chính tắc Ax = b, x ≥ 0 ---------- */
  function combos(n, k) { const out = []; const rec = (s, a) => { if (a.length === k) { out.push(a.slice()); return; } for (let j = s; j < n; j++) { a.push(j); rec(j + 1, a); a.pop(); } }; rec(0, []); return out; }
  function basicSolutions(A, b) {
    const m = A.length, n = A[0].length, out = [];
    combos(n, m).forEach(B => {
      const Bm = A.map(r => B.map(j => r[j]));
      if (LA.det(Bm).isZero()) { out.push({ B, loai: 'suy-bien-co-so' }); return; }
      const xb = LA.solve(Bm.map((r, i) => r.concat([b[i]])));
      const x = Array(n).fill(F(0)); B.forEach((j, t) => { x[j] = xb.expr[t].c; });
      const feas = x.every(v => v.n >= 0); const pos = x.filter(v => v.n > 0).length;
      out.push({ B, x, kha: feas, suyBien: pos < m });
    });
    return out;
  }

  /* ---------- Bài toán vận tải ----------
     cost: ma trận số hoặc 'M' (ô cấm); sense 'min' (cước phí) | 'max' (năng suất – bài toán phân phối) */
  function transport(a0, b0, cost0, opts) {
    opts = opts || {};
    const sense = opts.sense || 'min';
    let a = a0.map(x => F(x)), b = b0.map(x => F(x));
    let C = cost0.map(r => r.map(x => (x === 'M' ? (sense === 'min' ? M : M.neg()) : mv(x))));
    const SA = a.reduce((s, x) => s.add(x), F(0)), SB = b.reduce((s, x) => s.add(x), F(0));
    let dummy = null;
    if (SA.sub(SB).n > 0) { b.push(SA.sub(SB)); C = C.map(r => r.concat([mv(0)])); dummy = { col: b.length - 1 }; }
    else if (SA.sub(SB).n < 0) { a.push(SB.sub(SA)); C.push(b.map(() => mv(0))); dummy = { row: a.length - 1 }; }
    const m = a.length, n = b.length;
    const isDummy = (i, j) => dummy && (dummy.row === i || dummy.col === j);
    const better = (u, v) => (sense === 'min' ? u.cmp(v) < 0 : u.cmp(v) > 0);   // u "tốt hơn" v
    // phương án ban đầu
    const X = Array.from({ length: m }, () => Array(n).fill(null));   // null: ô loại; Fr: ô chọn (kể cả 0)
    const ra = a.slice(), rb = b.slice(); const rowDone = Array(m).fill(false), colDone = Array(n).fill(false);
    const order = [];
    const method = opts.method || 'min';
    const nAct = arr => arr.filter(x => !x).length;
    while (nAct(rowDone) > 0 && nAct(colDone) > 0) {
      const active = []; for (let i = 0; i < m; i++) if (!rowDone[i]) for (let j = 0; j < n; j++) if (!colDone[j]) active.push([i, j]);
      let pool = active.filter(([i, j]) => !isDummy(i, j)); if (!pool.length) pool = active;
      let cell;
      if (method === 'vogel') {
        const pen = (cells) => { const cs = cells.map(([i, j]) => C[i][j]).sort((u, v) => (sense === 'min' ? u.cmp(v) : v.cmp(u))); return cs.length > 1 ? cs[1].sub(cs[0]).mul(sense === 'min' ? 1 : -1) : cs.length ? cs[0].mul(sense === 'min' ? 1 : -1) : null; };
        let bestLine = null, bestPen = null;
        for (let i = 0; i < m; i++) if (!rowDone[i]) { const cells = pool.filter(([r]) => r === i); if (!cells.length) continue; const p = pen(cells); if (bestPen === null || p.cmp(bestPen) > 0) { bestPen = p; bestLine = cells; } }
        for (let j = 0; j < n; j++) if (!colDone[j]) { const cells = pool.filter(([, cc]) => cc === j); if (!cells.length) continue; const p = pen(cells); if (bestPen === null || p.cmp(bestPen) > 0) { bestPen = p; bestLine = cells; } }
        cell = bestLine[0]; bestLine.forEach(z => { if (better(C[z[0]][z[1]], C[cell[0]][cell[1]])) cell = z; });
      } else {
        cell = pool[0]; pool.forEach(z => { if (better(C[z[0]][z[1]], C[cell[0]][cell[1]])) cell = z; });
      }
      const [i, j] = cell; const q = ra[i].sub(rb[j]).n <= 0 ? ra[i] : rb[j];
      X[i][j] = q; ra[i] = ra[i].sub(q); rb[j] = rb[j].sub(q); order.push([i, j, q]);
      // Mỗi lần chỉ xóa MỘT hàng hoặc MỘT cột (lần cuối xóa cả hai) → đúng m + n − 1 ô chọn;
      // khi hàng và cột cùng hết hàng, ô còn lại sau này nhận lượng 0 (ô chọn 0, tránh suy biến).
      if (nAct(rowDone) === 1 && nAct(colDone) === 1) { rowDone[i] = true; colDone[j] = true; }
      else if (ra[i].isZero() && rb[j].isZero()) { if (nAct(rowDone) > 1) rowDone[i] = true; else colDone[j] = true; }
      else if (ra[i].isZero()) rowDone[i] = true;
      else colDone[j] = true;
    }
    const steps = [];
    const cost = () => { let s = new MV(0, 0); for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (X[i][j]) s = s.add(C[i][j].mul(X[i][j])); return s; };
    for (let it = 0; it < 60; it++) {
      const G = []; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (X[i][j] !== null) G.push([i, j]);
      // thế vị: u1 = 0
      const u = Array(m).fill(null), v = Array(n).fill(null); u[0] = mv(0);
      for (let guard = 0; guard < m + n + 2; guard++) G.forEach(([i, j]) => { if (u[i] && !v[j]) v[j] = C[i][j].sub(u[i]); else if (!u[i] && v[j]) u[i] = C[i][j].sub(v[j]); });
      const D = Array.from({ length: m }, () => Array(n).fill(null));
      let enter = null;
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
        if (X[i][j] !== null || !u[i] || !v[j]) continue;
        const d = u[i].add(v[j]).sub(C[i][j]); D[i][j] = d;
        const improving = sense === 'min' ? d.cmp(0) > 0 : d.cmp(0) < 0;
        if (improving && (!enter || (sense === 'min' ? d.cmp(D[enter[0]][enter[1]]) > 0 : d.cmp(D[enter[0]][enter[1]]) < 0))) enter = [i, j];
      }
      const st = { X: X.map(r => r.slice()), u: u.slice(), v: v.slice(), D, G, f: cost() };
      steps.push(st);
      if (!enter) break;
      const cyc = findCycle(G, enter, m, n);
      const minus = cyc.filter((_, t) => t % 2 === 1);
      let out = minus[0]; minus.forEach(z => { if (X[z[0]][z[1]].sub(X[out[0]][out[1]]).n < 0) out = z; });
      const th = X[out[0]][out[1]];
      st.enter = enter; st.cycle = cyc; st.theta = th; st.leave = out;
      cyc.forEach((z, t) => { const cur = X[z[0]][z[1]] || F(0); X[z[0]][z[1]] = t % 2 === 0 ? cur.add(th) : cur.sub(th); });
      X[out[0]][out[1]] = null;
    }
    const last = steps[steps.length - 1];
    const sol = last.X.map(r => r.map(x => x || F(0)));
    return { a, b, C, dummy, sense, init: order, steps, X: sol, f: last.f, m, n, banned: cost0.map(r => r.map(x => x === 'M')),
      orig: { m: a0.length, n: b0.length }, feasible: !sol.some((r, i) => r.some((x, j) => x.n > 0 && C[i][j].hasM())) };
  }
  // chu trình đi qua ô vào (r,k) trong cây các ô chọn: xen kẽ hàng/cột
  function findCycle(G, start, m, n) {
    const [r0, k0] = start;
    // tìm đường từ cột k0 về hàng r0 qua các ô chọn (đồ thị hai phía hàng–cột)
    const adjR = Array.from({ length: m }, () => []), adjC = Array.from({ length: n }, () => []);
    G.forEach(([i, j]) => { adjR[i].push(j); adjC[j].push(i); });
    const prev = new Map(); const q = [['c', k0]]; prev.set('c' + k0, null);
    while (q.length) {
      const [t, x] = q.shift();
      if (t === 'r' && x === r0) break;
      const nb = t === 'c' ? adjC[x].map(i => ['r', i]) : adjR[x].map(j => ['c', j]);
      nb.forEach(([tt, y]) => { if (!prev.has(tt + y)) { prev.set(tt + y, [t, x]); q.push([tt, y]); } });
    }
    const path = []; let cur = ['r', r0];
    while (cur) { path.push(cur); cur = prev.get(cur[0] + cur[1]); }
    // path: r0, c?, r?, ..., k0 (cột) — đổi thành dãy ô
    const cells = [[r0, k0]];
    for (let t = 0; t < path.length - 1; t++) {
      const [ta, xa] = path[t], [tb, xb] = path[t + 1];
      cells.push(ta === 'r' ? [xa, xb] : [xb, xa]);
    }
    return cells;
  }

  const api = { F, MV, mv, M, parseLP, lpFromArrays, canonical, simplex, solve, dual, vertices, graph, halfplanes, basicSolutions, transport, combos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QH = api;
})(typeof window !== 'undefined' ? window : globalThis);
