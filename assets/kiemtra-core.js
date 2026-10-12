/* kiemtra-core.js — lõi ngân hàng câu hỏi: sinh đề theo hạt giống, chấm điểm.
   Không dùng DOM: chạy được trong trình duyệt, Node (kiểm thử) và Google Apps Script (máy chủ chấm lại).
   Một đề = (mã bài, hạt giống) → luôn sinh ra đúng cùng các câu hỏi, cùng số liệu, cùng thứ tự phương án.

   Loại câu:  mc  trắc nghiệm 1 đáp án      { q, opts:[...], a }           (phương án được xáo trộn)
              ds  đúng/sai 4 ý               { q, y:[{t, d:true|false}×4] } (chấm theo bậc 0,1 / 0,25 / 0,5 / 1)
              so  trả lời ngắn (một số)      { q, a }                       (nhận số nguyên, phân số, thập phân)
   Mức độ:   NB nhận biết · TH thông hiểu · VD vận dụng · VDC vận dụng cao                                   */
(function (root) {
  'use strict';
  const LA = root.LA || (typeof require === 'function' ? require('./linalg.js') : null);
  const F = LA.F;
  const LEVELS = ['NB', 'TH', 'VD', 'VDC'];

  /* ---------- Số ngẫu nhiên có hạt giống (xmur3 + mulberry32) ---------- */
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function rng(seed) {
    let a = hash(String(seed));
    const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const r = {
      f,
      int(lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); },
      nz(lo, hi) { let x; do { x = r.int(lo, hi); } while (x === 0); return x; },
      pick(arr) { return arr[Math.floor(f() * arr.length)]; },
      shuffle(arr) { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
      sample(arr, k) { return r.shuffle(arr).slice(0, k); },
      bool() { return f() < 0.5; }
    };
    return r;
  }

  /* ---------- Công cụ toán học cho người soạn câu hỏi ---------- */
  const H = {
    F,
    M: A => A.map(row => row.map(x => F(x))),
    num(x) { return (x instanceof LA.Fr ? x : F(x)).tex(); },
    mat(A, opts) { return LA.texMatrix(A.map(row => row.map(x => (typeof x === 'string' ? { tex: () => x } : F(x)))), opts); },
    vdet(A) { return H.mat(A, { det: true }); },
    vec(v) { return '(' + v.map(x => (typeof x === 'string' ? x : H.num(x))).join(';\\,') + ')'; },
    det(A) { return LA.det(H.M(A)); },
    rank(A) { return LA.rank(H.M(A)); },
    mul(A, B) { return LA.mul(H.M(A), H.M(B)).map(r => r.map(x => x.val())); },
    T: A => A[0].map((_, j) => A.map(r => r[j])),
    maxAbs: A => Math.max.apply(null, A.map(r => Math.max.apply(null, r.map(x => Math.abs(x))))),
    zeros: A => A.reduce((s, r) => s + r.filter(x => x === 0).length, 0),
    randMat(r, m, n, lo, hi) { return Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(lo, hi))); },
    // Ma trận nguyên có định thức ±1 (nghịch đảo cũng nguyên)
    unimod(r, n, maxAbs) {
      maxAbs = maxAbs || 7;
      for (let tries = 0; tries < 500; tries++) {
        let A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
        for (let k = 0; k < 3 * n; k++) {
          const i = r.int(0, n - 1); let j = r.int(0, n - 2); if (j >= i) j++;
          const c = r.pick([1, -1, 2, -2, 1, -1]);
          A[i] = A[i].map((x, t) => x + c * A[j][t]);
        }
        A = r.shuffle(A);
        if (H.maxAbs(A) <= maxAbs && H.zeros(A) <= n - 1) return A;
      }
      throw new Error('unimod');
    },
    // Ma trận nguyên cấp n có định thức d cho trước
    withDet(r, n, d, maxAbs) {
      maxAbs = maxAbs || 9;
      for (let tries = 0; tries < 800; tries++) {
        const diag = Array(n).fill(1); let rest = Math.abs(d);
        for (let i = 0; i < n && rest > 1; i++) {
          const ds = []; for (let k = 1; k <= rest && k <= 6; k++) if (rest % k === 0) ds.push(k);
          const k = i === n - 1 ? rest : r.pick(ds); diag[i] = k; rest /= k;
        }
        if (rest !== 1) continue;
        if (d < 0) diag[0] = -diag[0];
        let A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? diag[i] : j > i ? r.int(-3, 3) : 0)));
        for (let k = 0; k < 2 * n; k++) {
          const i = r.int(0, n - 1); let j = r.int(0, n - 2); if (j >= i) j++;
          const c = r.pick([1, -1, 2, -1, 1]);
          A[i] = A[i].map((x, t) => x + c * A[j][t]);
        }
        A = r.shuffle(A.map(row => row.slice()));                 // hoán vị dòng: định thức có thể đổi dấu
        if (!H.det(A).eq(d)) { const t = A[0]; A[0] = A[1]; A[1] = t; }
        if (H.det(A).eq(d) && H.maxAbs(A) <= maxAbs && H.zeros(A) <= n) return A;
      }
      throw new Error('withDet');
    },
    // Ma trận m×n có hạng rk
    rankMat(r, m, n, rk, maxAbs) {
      maxAbs = maxAbs || 12;
      for (let tries = 0; tries < 800; tries++) {
        const base = [];
        while (base.length < rk) {
          const row = Array.from({ length: n }, () => r.int(-3, 4));
          if (H.rank(base.concat([row])) === base.length + 1) base.push(row);
        }
        const rows = base.slice();
        while (rows.length < m) {
          const c = base.map(() => r.int(-2, 2)); if (c.every(x => x === 0)) continue;
          rows.push(Array.from({ length: n }, (_, j) => base.reduce((s, b, i) => s + c[i] * b[j], 0)));
        }
        const A = r.shuffle(rows);
        if (H.rank(A) === rk && H.maxAbs(A) <= maxAbs) return A;
      }
      throw new Error('rankMat');
    },
    /* Ma trận vuông cấp n có một phần tử là tham số m, định thức bằng 0 đúng khi m = m0 (nguyên).
       Trả về {A (phần tử tham số là chuỗi 'm'), m0, at:[i,j], val(m) → ma trận số}. */
    paramMat(r, n, maxAbs) {
      maxAbs = maxAbs || 9;
      for (let tries = 0; tries < 800; tries++) {
        const rows = [];
        while (rows.length < n - 1) {
          const row = Array.from({ length: n }, () => r.int(-3, 4));
          if (H.rank(rows.concat([row])) === rows.length + 1) rows.push(row);
        }
        const u = rows.map(() => r.int(-2, 2)); if (u.every(x => x === 0)) continue;
        const last = Array.from({ length: n }, (_, j) => rows.reduce((s, b, i) => s + u[i] * b[j], 0));
        const j = r.int(0, n - 1); const m0 = last[j];
        const all = rows.concat([last]); const order = r.shuffle(all.map((_, i) => i));
        const B = order.map(i => all[i]); const i0 = order.indexOf(n - 1);
        const val = m => B.map((row, i) => row.map((x, c) => (i === i0 && c === j ? m : x)));
        if (H.det(val(m0 + 1)).isZero()) continue;                 // hệ số của m trong định thức phải khác 0
        if (H.maxAbs(B) > maxAbs || Math.abs(m0) > 15) continue;
        const A = B.map((row, i) => row.map((x, c) => (i === i0 && c === j ? 'm' : x)));
        return { A, m0, at: [i0, j], val };
      }
      throw new Error('paramMat');
    },
    // Biểu thức tuyến tính a1x1 + a2x2 + …
    lin(coefs, vars) {
      let s = '';
      coefs.forEach((c, k) => {
        if (c === 0) return;
        const a = Math.abs(c), v = vars[k];
        s += (s === '' ? (c < 0 ? '-' : '') : (c < 0 ? ' - ' : ' + ')) + (a === 1 ? '' : a) + v;
      });
      return s || '0';
    },
    // Hệ phương trình từ ma trận bổ sung (nguyên)
    system(Ab, vars) {
      const n = Ab[0].length - 1;
      vars = vars || Array.from({ length: n }, (_, j) => 'x_{' + (j + 1) + '}');
      return '\\begin{cases}' + Ab.map(row => H.lin(row.slice(0, n), vars) + ' = ' + row[n]).join('\\\\ ') + '\\end{cases}';
    },
    dec(x) { return String(Math.round(x * 1e6) / 1e6).replace('.', '{,}'); },   // 0.25 → 0{,}25
    sub: (i, j) => '_{' + i + (j === undefined ? '' : j) + '}',
    // Gom phương án: đáp án đúng đứng đầu, loại trùng, bổ sung bằng hàm fill
    opts(correct, wrong, fill) {
      const out = [correct]; const seen = new Set([correct]);
      wrong.forEach(w => { if (w != null && !seen.has(w) && out.length < 4) { seen.add(w); out.push(w); } });
      for (let k = 0; out.length < 4 && k < 50 && fill; k++) { const w = fill(k); if (w != null && !seen.has(w)) { seen.add(w); out.push(w); } }
      return out;
    }
  };
  // Đa thức: viết theo bậc tăng dần, gọn
  H.poly = function (c) {
    const parts = [];
    c.forEach((a, k) => {
      if (a === 0) return;
      const v = k === 0 ? '' : k === 1 ? 'x' : 'x^' + k;
      const mag = Math.abs(a) === 1 && k > 0 ? '' : String(Math.abs(a));
      parts.push((a < 0 ? '-' : '+') + mag + v);
    });
    if (!parts.length) return '0';
    let s = parts.join(' ').replace(/ \+/g, ' + ').replace(/ -/g, ' - ');
    if (s[0] === '+') s = s.slice(1);
    return s;
  };

  /* ---------- Ngân hàng ---------- */
  const bank = { items: [], tests: {}, order: [] };
  function item(def) {
    if (!def.id || !def.gen) throw new Error('Câu hỏi thiếu id/gen');
    if (bank.items.some(x => x.id === def.id)) throw new Error('Trùng mã câu ' + def.id);
    if (LEVELS.indexOf(def.md) < 0) throw new Error('Sai mức độ ' + def.id);
    bank.items.push(def);
  }
  function test(id, def) { def.id = id; bank.tests[id] = def; bank.order.push(id); }

  /* Chọn câu theo đặc tả: phần = { tu:[mã buổi], md:{NB, TH, VD, VDC} }; thiếu mức nào thì lấy mức lân cận */
  function pickItems(T, r) {
    const used = new Set(); const chosen = [];
    T.cau.forEach(part => {
      const pool = bank.items.filter(it => part.tu.indexOf(it.bai) >= 0);
      let short = 0;
      LEVELS.forEach(md => {
        const want = (part.md[md] || 0);
        const cands = r.shuffle(pool.filter(it => it.md === md && !used.has(it.id)));
        const take = cands.slice(0, want); take.forEach(it => { used.add(it.id); chosen.push(it); });
        short += want - take.length;
      });
      if (short > 0) {
        const near = r.shuffle(pool.filter(it => !used.has(it.id)));
        near.slice(0, short).forEach(it => { used.add(it.id); chosen.push(it); });
      }
    });
    return chosen;
  }

  function instantiate(it, seed) {
    const r = rng(seed + '|' + it.id);
    const g = it.gen(r, H);
    const out = { id: it.id, bai: it.bai, md: it.md, loai: it.loai, muc: it.muc, cdr: it.cdr, on: it.on, q: g.q, giai: g.giai || '' };
    if (it.loai === 'mc') {
      const n = g.opts.length; const idx = g.keep ? g.opts.map((_, k) => k) : rng(seed + '|o|' + it.id).shuffle(g.opts.map((_, k) => k));
      out.opts = idx.map(k => g.opts[k]); out.a = idx.indexOf(g.a || 0);
      if (n < 2) throw new Error('Thiếu phương án ' + it.id);
    } else if (it.loai === 'ds') {
      out.y = g.y.map(x => ({ t: x.t, d: !!x.d }));
      if (out.y.length !== 4) throw new Error('Câu đúng/sai cần 4 ý: ' + it.id);
    } else if (it.loai === 'so') {
      out.a = (g.a instanceof LA.Fr ? g.a : F(g.a)).toString();
    }
    return out;
  }

  function build(tid, seed) {
    const T = bank.tests[tid]; if (!T) throw new Error('Không có bài ' + tid);
    const r = rng(seed + '|' + tid);
    return pickItems(T, r).map((it, k) => instantiate(it, seed + '|' + tid + '|' + k));
  }

  /* ---------- Chấm ---------- */
  function parseNum(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
    if (!s) return null;
    if (!/^[-+]?(\d+([.,]\d+)?|[.,]\d+)(\/[-+]?\d+([.,]\d+)?)?$/.test(s)) return null;
    try { const x = F(s.replace(/^\+/, '')); return x; } catch (e) { return null; }
  }
  const DS_SCALE = [0, 0.1, 0.25, 0.5, 1];
  function gradeOne(ins, ans) {
    if (ins.loai === 'mc') return { s: ans === ins.a ? 1 : 0 };
    if (ins.loai === 'ds') {
      const k = ins.y.reduce((c, y, i) => c + (Array.isArray(ans) && ans[i] === y.d ? 1 : 0), 0);
      return { s: DS_SCALE[k], k };
    }
    const x = parseNum(ans); if (!x) return { s: 0 };
    const a = F(ins.a);
    if (x.eq(a)) return { s: 1 };
    const isDec = /[.,]/.test(String(ans)) && String(ans).indexOf('/') < 0;
    if (isDec && !a.isInt() && Math.abs(x.val() - a.val()) <= 0.005 + 1e-12) return { s: 1 };
    return { s: 0 };
  }
  function grade(instances, answers) {
    const chi = instances.map((ins, i) => Object.assign({ id: ins.id }, gradeOne(ins, answers ? answers[i] : null)));
    const tong = instances.length; const sum = chi.reduce((s, c) => s + c.s, 0);
    return { diem: Math.round(sum / tong * 1000) / 100, dung: Math.round(sum * 100) / 100, tong, chi };
  }

  const api = { LA, H, rng, hash, item, test, bank, build, grade, gradeOne, parseNum, instantiate, LEVELS, version: 'nguon' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TKTKT = api;
})(typeof window !== 'undefined' ? window : globalThis);
