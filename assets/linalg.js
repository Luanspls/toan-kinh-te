/* linalg.js — số hữu tỉ, khử Gauss có ghi bước, định thức, hạng, nghịch đảo, giải hệ.
   Dùng chung cho bài giảng (trình duyệt) và kiểm tra đáp số (Node). */
(function (root) {
  'use strict';

  /* ---------- Phân số ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function F(n, d) {
    if (d === undefined) d = 1;
    if (n instanceof Fr) return n;
    if (typeof n === 'string') return parse(n);
    if (!Number.isInteger(n) || !Number.isInteger(d)) return fromDecimal(n / d);
    return new Fr(n, d);
  }
  function Fr(n, d) {
    if (d === 0) throw new Error('Chia cho 0');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d); this.n = n / g; this.d = d / g;
    if (Object.is(this.n, -0)) this.n = 0;
  }
  function fromDecimal(x) {
    const s = String(x);
    if (!s.includes('.')) return new Fr(Math.round(x), 1);
    const k = s.split('.')[1].length; const d = Math.pow(10, k);
    return new Fr(Math.round(x * d), d);
  }
  function parse(s) {
    s = s.trim().replace(',', '.');
    if (s.includes('/')) { const [a, b] = s.split('/'); return F(parseFloat(a)).div(F(parseFloat(b))); }
    const x = parseFloat(s); if (Number.isNaN(x)) throw new Error('Không đọc được số: ' + s);
    return fromDecimal(x);
  }
  Fr.prototype = {
    add(o) { o = F(o); return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); },
    sub(o) { o = F(o); return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); },
    mul(o) { o = F(o); return new Fr(this.n * o.n, this.d * o.d); },
    div(o) { o = F(o); return new Fr(this.n * o.d, this.d * o.n); },
    neg() { return new Fr(-this.n, this.d); },
    isZero() { return this.n === 0; },
    isInt() { return this.d === 1; },
    eq(o) { o = F(o); return this.n === o.n && this.d === o.d; },
    abs() { return new Fr(Math.abs(this.n), this.d); },
    val() { return this.n / this.d; },
    toString() { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; },
    tex() {
      if (this.d === 1) return String(this.n);
      const s = this.n < 0 ? '-' : '';
      return s + '\\frac{' + Math.abs(this.n) + '}{' + this.d + '}';
    }
  };

  /* ---------- Ma trận ---------- */
  function M(rows) { return rows.map(r => r.map(x => F(x))); }
  function parseMatrix(text) {
    const rows = text.trim().split(/\s*[;\n]\s*/).filter(Boolean)
      .map(r => r.trim().split(/[\s,]+/).filter(Boolean).map(parse));
    if (!rows.length) throw new Error('Ma trận trống');
    const n = rows[0].length;
    rows.forEach((r, i) => { if (r.length !== n) throw new Error('Dòng ' + (i + 1) + ' có ' + r.length + ' phần tử, dòng 1 có ' + n); });
    return rows;
  }
  const clone = A => A.map(r => r.slice());
  const ident = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => F(i === j ? 1 : 0)));
  function mul(A, B) {
    if (A[0].length !== B.length) throw new Error('Không nhân được: số cột của ma trận trước khác số dòng của ma trận sau');
    return A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s.add(a.mul(B[k][j])), F(0))));
  }
  const add = (A, B) => A.map((r, i) => r.map((a, j) => a.add(B[i][j])));
  const sub = (A, B) => A.map((r, i) => r.map((a, j) => a.sub(B[i][j])));
  const scale = (k, A) => A.map(r => r.map(a => a.mul(k)));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));

  function texMatrix(A, opts) {
    opts = opts || {};
    const env = opts.det ? 'vmatrix' : 'pmatrix';
    const aug = opts.aug || 0; const n = A[0].length;
    const hl = opts.hlRows || [];
    const body = A.map((r, i) => r.map((x, j) => {
      let t = x.tex ? x.tex() : String(x);
      if (hl.includes(i) || (opts.hlCols || []).includes(j)) t = '\\htmlClass{hlrow}{' + t + '}';
      return t;
    }).join(' & ')).join(' \\\\ ');
    if (aug) {
      const spec = 'r'.repeat(n - aug) + '|' + 'r'.repeat(aug);
      const L = opts.det ? '\\left|' : '\\left(', R = opts.det ? '\\right|' : '\\right)';
      return L + '\\begin{array}{' + spec + '}' + body + '\\end{array}' + R;
    }
    return '\\begin{' + env + '}' + body + '\\end{' + env + '}';
  }

  /* ---------- Khử Gauss có ghi bước ----------
     mode: 'rank' | 'det' | 'gauss' (bậc thang) | 'rref' | 'inverse'
     aug: số cột vế phải (không chọn trụ ở các cột này) */
  function rowLabel(i) { return 'd_{' + (i + 1) + '}'; }
  function coefTex(k, withPlusSign) {
    // trả về chuỗi dạng " + 2d_1", " - \frac12 d_1"
    const neg = k.n < 0; const a = k.abs();
    const mag = a.eq(1) ? '' : a.tex();
    return (neg ? ' - ' : (withPlusSign ? ' + ' : '')) + mag;
  }
  function eliminate(A0, opts) {
    opts = opts || {};
    const mode = opts.mode || 'gauss';
    const aug = opts.aug || 0;
    const A = clone(A0); const m = A.length; const n = A[0].length; const nc = n - aug;
    const steps = [{ ops: [], M: clone(A), note: opts.startNote || '' }];
    const fracOnly = mode === 'det' || mode === 'inverse' || mode === 'rref';
    let sign = 1; let r = 0; const pivots = [];
    for (let c = 0; c < nc && r < m; c++) {
      // chọn dòng trụ: ưu tiên ±1, rồi |giá trị| nhỏ nhất là số nguyên
      let best = -1, score = Infinity;
      for (let i = r; i < m; i++) {
        const x = A[i][c]; if (x.isZero()) continue;
        let s = x.isInt() ? Math.abs(x.n) : 1000 + x.d;
        if (Math.abs(x.n) === 1 && x.d === 1) s = 0;
        if (i === r) s -= 0.5; // ưu tiên giữ nguyên vị trí
        if (s < score) { score = s; best = i; }
      }
      if (best < 0) continue;
      if (best !== r) {
        [A[r], A[best]] = [A[best], A[r]]; sign = -sign;
        steps.push({ ops: [rowLabel(r) + ' \\leftrightarrow ' + rowLabel(best)], M: clone(A), hl: [r, best] });
      }
      const p = A[r][c]; const ops = []; const hl = [];
      for (let i = r + 1; i < m; i++) {
        const x = A[i][c]; if (x.isZero()) continue;
        const k = x.div(p);
        if (fracOnly || k.isInt() || !p.isInt() || !x.isInt()) {
          A[i] = A[i].map((v, j) => v.sub(k.mul(A[r][j])));
          ops.push(rowLabel(i) + ' \\to ' + rowLabel(i) + coefTex(k.neg(), true) + rowLabel(r));
        } else {
          // d_i -> a*d_i - b*d_r  (giữ số nguyên)
          const g = gcd(p.n, x.n);
          let a = F(p.n / g), b = F(x.n / g);
          if (a.n < 0) { a = a.neg(); b = b.neg(); }
          A[i] = A[i].map((v, j) => v.mul(a).sub(b.mul(A[r][j])));
          ops.push(rowLabel(i) + ' \\to ' + (a.eq(1) ? '' : a.tex()) + rowLabel(i) + coefTex(b.neg(), true) + rowLabel(r));
        }
        hl.push(i);
      }
      if (ops.length) steps.push({ ops, M: clone(A), hl });
      pivots.push([r, c]); r++;
    }
    const rank = r;
    let det = null;
    if (mode === 'det') {
      if (rank < m) det = F(0);
      else det = A.reduce((s, row, i) => s.mul(row[i]), F(sign));
    }
    if (mode === 'rref' || mode === 'inverse') {
      // chuẩn hóa trụ = 1 và khử phía trên
      for (let t = pivots.length - 1; t >= 0; t--) {
        const [pr, pc] = pivots[t]; const p = A[pr][pc]; const ops = []; const hl = [];
        if (!p.eq(1)) {
          const inv = F(1).div(p);
          A[pr] = A[pr].map(v => v.mul(inv));
          ops.push(rowLabel(pr) + ' \\to ' + (inv.eq(-1) ? '-' : inv.tex()) + rowLabel(pr));
          hl.push(pr);
        }
        for (let i = 0; i < pr; i++) {
          const x = A[i][pc]; if (x.isZero()) continue;
          A[i] = A[i].map((v, j) => v.sub(x.mul(A[pr][j])));
          ops.push(rowLabel(i) + ' \\to ' + rowLabel(i) + coefTex(x.neg(), true) + rowLabel(pr));
          hl.push(i);
        }
        if (ops.length) steps.push({ ops, M: clone(A), hl });
      }
    }
    return { steps, M: A, rank, det, pivots, sign };
  }

  function rank(A) { return eliminate(A, { mode: 'rank' }).rank; }
  function det(A) {
    if (A.length !== A[0].length) throw new Error('Định thức chỉ xác định cho ma trận vuông');
    return eliminate(A, { mode: 'det' }).det;
  }
  function inverse(A) {
    const n = A.length; if (n !== A[0].length) throw new Error('Ma trận nghịch đảo chỉ xét cho ma trận vuông');
    const I = ident(n); const AI = A.map((r, i) => r.concat(I[i]));
    const res = eliminate(AI, { mode: 'inverse', aug: n });
    if (res.rank < n) return { inv: null, steps: res.steps };
    return { inv: res.M.map(r => r.slice(n)), steps: res.steps };
  }
  function minor(A, i, j) { return A.filter((_, r) => r !== i).map(r => r.filter((_, c) => c !== j)); }
  function cofactor(A, i, j) { const d = det(minor(A, i, j)); return (i + j) % 2 ? d.neg() : d; }
  function adjugate(A) { return T(A.map((r, i) => r.map((_, j) => cofactor(A, i, j)))); }

  /* Giải hệ: Ab là ma trận bổ sung (cột cuối = vế phải) */
  function solve(Ab, varName) {
    varName = varName || 'x';
    const n = Ab[0].length - 1;
    const res = eliminate(Ab, { mode: 'rref', aug: 1 });
    const R = res.M; const rA = res.rank;
    const rAb = rank(Ab);
    const out = { steps: res.steps, rankA: rA, rankAb: rAb, n, R };
    if (rA < rAb) { out.kind = 'none'; return out; }
    const pivCols = res.pivots.map(p => p[1]);
    const free = []; for (let j = 0; j < n; j++) if (!pivCols.includes(j)) free.push(j);
    out.kind = free.length ? 'many' : 'unique';
    out.free = free;
    // biểu thức cho từng ẩn
    const expr = Array(n);
    free.forEach((j, t) => { expr[j] = { c: F(0), terms: [[t, F(1)]] }; });
    res.pivots.forEach(([pr, pc]) => {
      const terms = free.map((j, t) => [t, R[pr][j].neg()]).filter(([, k]) => !k.isZero());
      expr[pc] = { c: R[pr][n], terms };
    });
    out.expr = expr;
    out.tex = expr.map(e => exprTex(e, free.length === 1 ? ['c'] : free.map(j => 'c_{' + (j + 1) + '}')));
    out.paramNames = free.map(j => varName + '_{' + (j + 1) + '}');
    return out;
  }
  function exprTex(e, names) {
    let s = ''; const c = e.c;
    e.terms.forEach(([t, k]) => {
      const nm = names[t]; const first = s === '';
      if (k.n < 0) s += (first ? '-' : ' - ');
      else if (!first) s += ' + ';
      const a = k.abs(); s += (a.eq(1) ? '' : a.tex()) + nm;
    });
    if (!c.isZero() || s === '') {
      if (s === '') s = c.tex();
      else s += (c.n < 0 ? ' - ' : ' + ') + c.abs().tex();
    }
    return s;
  }

  const api = { F, Fr, gcd, M, parseMatrix, clone, ident, mul, add, sub, scale, T, texMatrix, eliminate, rank, det, inverse, minor, cofactor, adjugate, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LA = api;
})(typeof window !== 'undefined' ? window : globalThis);
