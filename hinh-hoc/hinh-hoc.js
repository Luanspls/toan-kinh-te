/* Xưởng Hình học — môi trường hình học động cho học sinh THPT.
   Lõi: đồ thị phụ thuộc (điểm tự do → đối tượng dựng), tính lại toàn bộ khi kéo thả,
   kiểm nghiệm giả thuyết bằng cách biến đổi ngẫu nhiên các tham số tự do (tìm phản ví dụ),
   quỹ tích, vết, thử thách dựng hình bằng thước – compa với "phép thử kéo thả". */
(function () {
  'use strict';

  // ---------------- Tiện ích véctơ ----------------
  const UNIT = 40;              // 1 đơn vị độ dài = 40 điểm ảnh thế giới
  const TOL = 1e-6;             // sai số tương đối chấp nhận khi kiểm nghiệm
  const SAMPLES = 300;          // số hình ngẫu nhiên trong một lần kiểm nghiệm
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const len = a => Math.hypot(a.x, a.y);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const unit = a => { const l = len(a); return l < 1e-12 ? null : { x: a.x / l, y: a.y / l }; };
  const perpv = a => ({ x: -a.y, y: a.x });
  const clamp = (t, a, b) => Math.max(a, Math.min(b, t));
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const subs = n => String(n).split('').map(d => SUBS[+d]).join('');
  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '—');
  const fmtR = n => (Number.isFinite(n) ? String(+n.toFixed(4)).replace('.', ',') : '—');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* trình duyệt chặn lưu trữ */ } }
  };

  // ---------------- Loại đối tượng ----------------
  // P: điểm · L: đường thẳng/đoạn · C: đường tròn · M: số đo · X: quỹ tích
  const KIND = {
    free: 'P', glider: 'P', midpoint: 'P', intersect: 'P', foot: 'P', reflect: 'P', center: 'P',
    segment: 'L', line: 'L', perp: 'L', parallel: 'L', perpbis: 'L', anglebis: 'L',
    circle: 'C', circle3: 'C', length: 'M', angle: 'M', pathlen: 'M', locus: 'X'
  };

  // ---------------- Trạng thái ----------------
  let objs = [], byId = new Map(), V = new Map(), nextId = 1;
  let checks = [], nextCheck = 1;
  const traces = new Map();
  const view = { s: 1, ox: 0, oy: 0 };
  const opts = { grid: true, axes: false };
  let tool = 'move', slots = [], checkRel = 'collinear', hoverId = null;
  let undoStack = [];
  let mission = null, mst = null;     // bài toán đang mở và trạng thái của nó
  let labelPos = new Map();
  let lociCache = new Map();

  const svg = document.getElementById('board');

  function reindex() { byId = new Map(objs.map(o => [o.id, o])); }
  const nm = id => (byId.get(id) ? byId.get(id).name : '?');

  // ---------------- Tính toán hình học ----------------
  function project(P, L) { const t = dot(sub(P, L.p), L.v) / dot(L.v, L.v); return add(L.p, mul(L.v, t)); }
  function circum(A, B, C) {
    if (!A || !B || !C) return null;
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    const s = Math.max(dist(A, B), dist(B, C), dist(A, C));
    if (s < 1e-9 || Math.abs(d) < 1e-9 * s * s) return null;
    const a2 = dot(A, A), b2 = dot(B, B), c2 = dot(C, C);
    const c = {
      x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
      y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    };
    return { c, r: dist(c, A) };
  }
  const isCirc = v => v && v.r !== undefined;
  function intersections(a, b) {
    if (!a || !b) return [];
    if (!isCirc(a) && !isCirc(b)) {
      const c = cross(a.v, b.v);
      if (Math.abs(c) < 1e-12 * len(a.v) * len(b.v)) return [];
      const t = cross(sub(b.p, a.p), b.v) / c;
      return [add(a.p, mul(a.v, t))];
    }
    if (isCirc(a) && !isCirc(b)) { const t = a; a = b; b = t; }
    if (!isCirc(a)) { // a: đường thẳng, b: đường tròn
      const f = sub(a.p, b.c), A = dot(a.v, a.v), B = 2 * dot(f, a.v), C = dot(f, f) - b.r * b.r;
      let D = B * B - 4 * A * C;
      if (D < 0) { if (D > -1e-10 * (B * B + Math.abs(4 * A * C))) D = 0; else return []; }
      const s = Math.sqrt(D), t1 = (-B - s) / (2 * A), t2 = (-B + s) / (2 * A);
      return [add(a.p, mul(a.v, t1)), add(a.p, mul(a.v, t2))];
    }
    const d = dist(a.c, b.c);
    if (d < 1e-12 || d > a.r + b.r + 1e-9 * d || d < Math.abs(a.r - b.r) - 1e-9 * d) return [];
    const e = mul(sub(b.c, a.c), 1 / d), x = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, a.r * a.r - x * x)), base = add(a.c, mul(e, x)), n = perpv(e);
    return [add(base, mul(n, h)), sub(base, mul(n, h))];
  }

  function evalOne(o, M) {
    const g = i => M.get(i), a = o.args || [];
    switch (o.type) {
      case 'free': return { x: o.x, y: o.y };
      case 'glider': {
        const c = g(a[0]); if (!c) return null;
        if (isCirc(c)) return { x: c.c.x + c.r * Math.cos(o.t), y: c.c.y + c.r * Math.sin(o.t) };
        const t = c.seg ? clamp(o.t, 0, 1) : o.t; return add(c.p, mul(c.v, t));
      }
      case 'midpoint': { const A = g(a[0]), B = g(a[1]); return A && B ? mul(add(A, B), 0.5) : null; }
      case 'intersect': return intersections(g(a[0]), g(a[1]))[o.k] || null;
      case 'foot': { const P = g(a[0]), L = g(a[1]); return P && L ? project(P, L) : null; }
      case 'reflect': { const P = g(a[0]), L = g(a[1]); return P && L ? sub(mul(project(P, L), 2), P) : null; }
      case 'center': { const c = g(a[0]); return c ? { x: c.c.x, y: c.c.y } : null; }
      case 'segment': case 'line': {
        const A = g(a[0]), B = g(a[1]); if (!A || !B || dist(A, B) < 1e-9) return null;
        return { p: A, v: sub(B, A), seg: o.type === 'segment', a: A, b: B };
      }
      case 'perp': case 'parallel': {
        const P = g(a[0]), L = g(a[1]); if (!P || !L) return null;
        const u = unit(L.v); if (!u) return null;
        return { p: P, v: mul(o.type === 'perp' ? perpv(u) : u, UNIT * 2) };
      }
      case 'perpbis': {
        const A = g(a[0]), B = g(a[1]); if (!A || !B) return null;
        const u = unit(sub(B, A)); if (!u) return null;
        return { p: mul(add(A, B), 0.5), v: mul(perpv(u), UNIT * 2) };
      }
      case 'anglebis': {
        const A = g(a[0]), O = g(a[1]), B = g(a[2]); if (!A || !O || !B) return null;
        const u1 = unit(sub(A, O)), u2 = unit(sub(B, O)); if (!u1 || !u2) return null;
        let d = add(u1, u2); d = len(d) < 1e-9 ? perpv(u1) : unit(d);
        return { p: O, v: mul(d, UNIT * 2) };
      }
      case 'circle': { const C = g(a[0]), P = g(a[1]); if (!C || !P) return null; const r = dist(C, P); return r < 1e-9 ? null : { c: C, r }; }
      case 'circle3': return circum(g(a[0]), g(a[1]), g(a[2]));
      case 'length': { const A = g(a[0]), B = g(a[1]); return A && B ? { val: dist(A, B) / UNIT, at: mul(add(A, B), 0.5) } : null; }
      case 'angle': {
        const A = g(a[0]), O = g(a[1]), B = g(a[2]); if (!A || !O || !B) return null;
        const u = unit(sub(A, O)), w = unit(sub(B, O)); if (!u || !w) return null;
        return { val: Math.atan2(Math.abs(cross(u, w)), dot(u, w)) * 180 / Math.PI, at: O, u, w };
      }
      case 'pathlen': {
        const A = g(a[0]), P = g(a[1]), B = g(a[2]); if (!A || !P || !B) return null;
        return { val: (dist(A, P) + dist(P, B)) / UNIT, at: P };
      }
    }
    return null;
  }
  function finite(v) {
    if (!v) return false;
    for (const k of ['x', 'y', 'r', 'val']) if (k in v && !Number.isFinite(v[k])) return false;
    if (v.p && !(Number.isFinite(v.p.x) && Number.isFinite(v.p.y) && Number.isFinite(v.v.x) && Number.isFinite(v.v.y))) return false;
    if (v.c && !(Number.isFinite(v.c.x) && Number.isFinite(v.c.y))) return false;
    return true;
  }
  function computeAll() {
    const M = new Map();
    for (const o of objs) {
      if (o.type === 'locus') continue;
      let v = null;
      try { v = evalOne(o, M); } catch (e) { v = null; }
      M.set(o.id, finite(v) ? v : null);
    }
    return M;
  }

  // ---------------- Tạo đối tượng ----------------
  function nextPointName() {
    const used = new Set(objs.map(o => o.name)), L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; ; i++) { const n = L[i % 26] + (i >= 26 ? subs(Math.floor(i / 26)) : ''); if (!used.has(n)) return n; }
  }
  function nextName(prefix) {
    const used = new Set(objs.map(o => o.name));
    for (let i = 1; ; i++) { const n = prefix + subs(i); if (!used.has(n)) return n; }
  }
  function autoName(o) {
    const k = KIND[o.type];
    if (k === 'P') return nextPointName();
    if (o.type === 'segment') return nm(o.args[0]) + nm(o.args[1]);
    if (k === 'L') return nextName('d');
    if (k === 'C') return nextName('c');
    return '';
  }
  function addObj(o) {
    o.id = nextId++;
    if (!o.args) o.args = [];
    if (o.name == null) o.name = autoName(o);
    objs.push(o); byId.set(o.id, o);
    return o.id;
  }

  // Bộ dựng hình dùng trong tệp bài toán (bai-toan.js)
  function builder() {
    const mk = (type, args, ex, extra) => addObj(Object.assign({ type, args }, extra || {}, ex || {}, { given: true }));
    return {
      pt: (name, x, y, ex) => mk('free', [], ex, { name, x, y }),
      seg: (a, b, ex) => mk('segment', [a, b], ex),
      line: (a, b, ex) => mk('line', [a, b], ex),
      perp: (p, l, ex) => mk('perp', [p, l], ex),
      par: (p, l, ex) => mk('parallel', [p, l], ex),
      perpbis: (a, b, ex) => mk('perpbis', [a, b], ex),
      bis: (a, o, b, ex) => mk('anglebis', [a, o, b], ex),
      circle: (c, p, ex) => mk('circle', [c, p], ex),
      circ3: (a, b, c, ex) => mk('circle3', [a, b, c], ex),
      mid: (name, a, b, ex) => mk('midpoint', [a, b], ex, { name }),
      inter: (name, x, y, k, ex) => mk('intersect', [x, y], ex, { name, k: k || 0 }),
      foot: (name, p, l, ex) => mk('foot', [p, l], ex, { name }),
      refl: (name, p, l, ex) => mk('reflect', [p, l], ex, { name }),
      center: (name, c, ex) => mk('center', [c], ex, { name }),
      glider: (name, c, t, ex) => mk('glider', [c], ex, { name, t }),
      len: (a, b, ex) => mk('length', [a, b], ex),
      ang: (a, o, b, ex) => mk('angle', [a, o, b], ex),
      path: (a, m, b, ex) => mk('pathlen', [a, m, b], ex),
      locus: (t, d, ex) => mk('locus', [t, d], ex),
      circum: (A, B, C) => circum(A, B, C)
    };
  }

  // ---------------- Quan hệ để kiểm nghiệm ----------------
  function quantity(M, id) {
    const o = byId.get(id), v = M.get(id); if (!o || !v) return null;
    return o.type === 'segment' ? len(v.v) / UNIT : v.val;
  }
  function qName(id) {
    const o = byId.get(id); if (!o) return '?';
    if (o.type === 'length') return nm(o.args[0]) + nm(o.args[1]);
    if (o.type === 'angle') return '∠' + o.args.map(nm).join('');
    if (o.type === 'pathlen') return nm(o.args[0]) + nm(o.args[1]) + ' + ' + nm(o.args[1]) + nm(o.args[2]);
    return o.name;
  }
  function distToCurve(P, c) {
    if (isCirc(c)) return Math.abs(dist(P, c.c) - c.r);
    return Math.abs(cross(sub(P, c.p), c.v)) / len(c.v);
  }
  const REL = {
    collinear: {
      name: 'Ba điểm thẳng hàng', need: ['P', 'P', 'P'], txt: n => `${n[0]}, ${n[1]}, ${n[2]} thẳng hàng`,
      res(M, [a, b, c]) {
        const A = M.get(a), B = M.get(b), C = M.get(c); if (!A || !B || !C) return null;
        const s = Math.max(dist(A, B), dist(B, C), dist(A, C)); if (s < 1e-9) return 0;
        return Math.abs(cross(sub(B, A), sub(C, A))) / (s * s);
      }
    },
    concyclic: {
      name: 'Bốn điểm cùng thuộc một đường tròn', need: ['P', 'P', 'P', 'P'], txt: n => `${n.join(', ')} cùng thuộc một đường tròn`,
      res(M, ids) {
        const P = ids.map(i => M.get(i)); if (P.some(p => !p)) return null;
        const w = circum(P[0], P[1], P[2]); if (!w) return null;
        let s = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) s = Math.max(s, dist(P[i], P[j]));
        return Math.abs(dist(w.c, P[3]) - w.r) / s;
      }
    },
    concurrent: {
      name: 'Ba đường thẳng đồng quy', need: ['L', 'L', 'L'], txt: n => `${n.join(', ')} đồng quy`,
      res(M, [a, b, c], ck, S) {
        const X = intersections(M.get(a), M.get(b))[0], l = M.get(c); if (!X || !l) return null;
        return distToCurve(X, l) / S;
      }
    },
    parallel: {
      name: 'Hai đường thẳng song song', need: ['L', 'L'], txt: n => `${n[0]} ∥ ${n[1]}`,
      res(M, [a, b]) { const l1 = M.get(a), l2 = M.get(b); if (!l1 || !l2) return null; return Math.abs(cross(unit(l1.v), unit(l2.v))); }
    },
    perpendicular: {
      name: 'Hai đường thẳng vuông góc', need: ['L', 'L'], txt: n => `${n[0]} ⊥ ${n[1]}`,
      res(M, [a, b]) { const l1 = M.get(a), l2 = M.get(b); if (!l1 || !l2) return null; return Math.abs(dot(unit(l1.v), unit(l2.v))); }
    },
    incident: {
      name: 'Điểm thuộc đường thẳng / đường tròn', need: ['P', 'K'], txt: n => `${n[0]} thuộc ${n[1]}`,
      res(M, [p, c], ck, S) { const P = M.get(p), w = M.get(c); if (!P || !w) return null; return distToCurve(P, w) / S; }
    },
    equal: {
      name: 'Hai độ dài (hoặc hai góc) bằng nhau', need: ['Q', 'Q'], txt: n => `${n[0]} = ${n[1]}`,
      res(M, [a, b]) { const p = quantity(M, a), q = quantity(M, b); if (p == null || q == null) return null; const s = Math.max(Math.abs(p), Math.abs(q)); return s < 1e-12 ? 0 : Math.abs(p - q) / s; }
    },
    ratio: {
      name: 'Tỉ số hai đại lượng không đổi', need: ['Q', 'Q'], txt: (n, c) => `${n[0]} : ${n[1]} luôn bằng ${fmtR(c.r0)}`,
      res(M, [a, b], c) { const p = quantity(M, a), q = quantity(M, b); if (p == null || q == null || Math.abs(q) < 1e-12) return null; return Math.abs(p / q - c.r0) / Math.max(Math.abs(c.r0), 1e-12); }
    }
  };
  function argLabel(id) { const o = byId.get(id); if (!o) return '?'; return (o.type === 'length' || o.type === 'angle' || o.type === 'pathlen') ? qName(id) : o.name; }
  function checkText(c) { return REL[c.rel].txt(c.args.map(argLabel), c); }

  // ---------------- Kiểm nghiệm ngẫu nhiên ----------------
  function figureScale(M) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const o of objs) {
      if (KIND[o.type] !== 'P') continue; const p = M.get(o.id); if (!p) continue;
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    if (!Number.isFinite(x0)) return { S: UNIT * 8, center: { x: 0, y: 0 } };
    return { S: Math.max(Math.hypot(x1 - x0, y1 - y0), UNIT * 4), center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } };
  }
  function freeVars() { return objs.filter(o => o.type === 'free' || o.type === 'glider'); }
  function snapVars() { return freeVars().map(o => ({ o, x: o.x, y: o.y, t: o.t })); }
  function restoreVars(s) { for (const r of s) { r.o.x = r.x; r.o.y = r.y; r.o.t = r.t; } }
  function carrierKind(o) { const c = byId.get(o.args[0]); return !c ? 'line' : KIND[c.type] === 'C' ? 'circle' : c.type === 'segment' ? 'segment' : 'line'; }
  function randomize(snap, S, center, local) {
    for (const r of snap) {
      const o = r.o;
      if (o.type === 'free') {
        if (local) { o.x = r.x + gauss() * S * 0.16; o.y = r.y + gauss() * S * 0.16; }
        else { o.x = center.x + (Math.random() - 0.5) * S; o.y = center.y + (Math.random() - 0.5) * S; }
      } else {
        const k = carrierKind(o);
        o.t = k === 'circle' ? Math.random() * 2 * Math.PI : k === 'segment' ? Math.random() : (local ? r.t + gauss() * 0.8 : -1 + Math.random() * 3);
      }
    }
  }
  function degenerate(M, S, center) {
    const pts = [];
    for (const o of objs) {
      if (KIND[o.type] !== 'P') continue; const p = M.get(o.id); if (!p) continue;
      if (dist(p, center) > 200 * S) return true;
      if (o.type === 'free') pts.push(p);
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (dist(pts[i], pts[j]) < 0.02 * S) return true;
    return false;
  }
  // pred(M, S) → sai lệch tương đối (số ≥ 0) hoặc null nếu hình suy biến/không xác định
  function robustTest(pred, N = SAMPLES) {
    const snap = snapVars(), M0 = computeAll(), { S, center } = figureScale(M0);
    let cur = null; try { cur = pred(M0, S); } catch (e) { cur = null; }
    let pass = 0, fail = 0, undef = 0, cex = null, cexLocal = false, ex = null;
    const save = () => snapVars().map(s => ({ id: s.o.id, x: s.o.x, y: s.o.y, t: s.o.t }));
    for (let i = 0; i < N; i++) {
      const local = i % 2 === 0;
      randomize(snap, S, center, local);
      const M = computeAll();
      let r = null;
      if (!degenerate(M, S, center)) { try { r = pred(M, S); } catch (e) { r = null; } }
      if (r == null || !Number.isFinite(r)) { undef++; continue; }
      if (r < TOL) { pass++; if (!ex && local) ex = save(); }
      else { fail++; if (!cex || (local && !cexLocal && r > 1e-3)) { cex = save(); cexLocal = local; } }
    }
    restoreVars(snap);
    return { cur, pass, fail, undef, N, cex, ex };
  }
  function applyConfig(cfg) {
    if (!cfg) return;
    pushUndo();
    for (const r of cfg) { const o = byId.get(r.id); if (!o) continue; if (o.type === 'free') { o.x = r.x; o.y = r.y; } else o.t = r.t; }
    traces.clear(); fitView(); changed(false);
  }

  // ---------------- Hoàn tác, lưu ----------------
  function serialize() {
    return JSON.stringify({ v: 1, objs: objs.map(o => { const c = Object.assign({}, o); delete c.anim; delete c.dir; return c; }), checks: checks.map(c => ({ rel: c.rel, args: c.args, r0: c.r0 })) });
  }
  function pushUndo() { undoStack.push(JSON.stringify({ objs, checks, nextId, nextCheck })); if (undoStack.length > 120) undoStack.shift(); }
  function undo() {
    const s = undoStack.pop(); if (!s) { say('Không còn thao tác để hoàn tác.'); return; }
    const d = JSON.parse(s); objs = d.objs; checks = d.checks; nextId = d.nextId; nextCheck = d.nextCheck;
    reindex(); traces.clear(); slots = slots.map(() => null); changed(true);
  }
  function loadData(d) {
    objs = (d.objs || []).map(o => Object.assign({}, o)); reindex();
    nextId = objs.reduce((m, o) => Math.max(m, o.id), 0) + 1;
    checks = []; nextCheck = 1;
    for (const c of d.checks || []) if (REL[c.rel] && c.args.every(a => byId.has(a))) checks.push({ id: nextCheck++, rel: c.rel, args: c.args, r0: c.r0 });
    traces.clear(); undoStack = [];
  }
  function autosave() { if (!mission) store.set('hh-tudo', serialize()); }

  // ---------------- Khung nhìn ----------------
  const toS = w => ({ x: w.x * view.s + view.ox, y: w.y * view.s + view.oy });
  const toW = p => ({ x: (p.x - view.ox) / view.s, y: (p.y - view.oy) / view.s });
  const narrow = () => window.matchMedia('(max-width: 700px)').matches;
  function boardSize() { const r = svg.getBoundingClientRect(); return { W: r.width || 600, H: r.height || 420 }; }
  function fitView() {
    const { W, H } = boardSize(), M = computeAll();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const inc = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    for (const o of objs) {
      if (o.hidden) continue; const v = M.get(o.id); if (!v) continue;
      if (KIND[o.type] === 'P') inc(v.x, v.y);
      else if (KIND[o.type] === 'C' && v.r < 3000) { inc(v.c.x - v.r, v.c.y - v.r); inc(v.c.x + v.r, v.c.y + v.r); }
    }
    if (!Number.isFinite(x0)) { x0 = -320; x1 = 320; y0 = -220; y1 = 220; }
    // chừa chỗ cho thanh trạng thái (trên ở máy tính, dưới ở điện thoại) và bảng số đo
    const pt = narrow() ? 56 : 72, pb = narrow() ? 76 : 40, px = 44;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = Math.max(x1 - x0, 420), h = Math.max(y1 - y0, 300);
    view.s = clamp(Math.min((W - 2 * px) / w, (H - pt - pb) / h), 0.15, 1.8);
    view.ox = W / 2 - view.s * cx; view.oy = pt + (H - pt - pb) / 2 - view.s * cy;
  }
  function zoomAt(f, p) {
    const w = toW(p); view.s = clamp(view.s * f, 0.08, 12);
    view.ox = p.x - w.x * view.s; view.oy = p.y - w.y * view.s; schedule();
  }

  // ---------------- Chọn đối tượng trên bảng ----------------
  function hitPoint(p, touch) {
    let best = null, bd = touch ? 18 : 11;
    for (const o of objs) {
      if (o.hidden || KIND[o.type] !== 'P') continue; const v = V.get(o.id); if (!v) continue;
      const d = dist(toS(v), p); if (d < bd || (d === bd && best && byId.get(best).type !== 'free')) { bd = d; best = o.id; }
    }
    return best;
  }
  function hitCurves(p, touch) {
    const w = toW(p), tol = (touch ? 14 : 7) / view.s, out = [];
    for (const o of objs) {
      if (o.hidden) continue; const k = KIND[o.type]; if (k !== 'L' && k !== 'C') continue;
      const v = V.get(o.id); if (!v) continue;
      let d;
      if (k === 'C') d = Math.abs(dist(w, v.c) - v.r);
      else if (v.seg) { const t = clamp(dot(sub(w, v.p), v.v) / dot(v.v, v.v), 0, 1); d = dist(w, add(v.p, mul(v.v, t))); }
      else d = Math.abs(cross(sub(w, v.p), v.v)) / len(v.v);
      if (d < tol) out.push({ id: o.id, d });
    }
    return out.sort((a, b) => a.d - b.d).map(x => x.id);
  }
  function hitMeasure(p) {
    for (const [id, q] of labelPos) if (p.x > q.x - 6 && p.x < q.x + q.w + 6 && p.y > q.y - 15 && p.y < q.y + 5) return id;
    return null;
  }
  function draggable(id) { const o = byId.get(id); return o && (o.type === 'free' || o.type === 'glider'); }
  function dragTo(id, w) {
    const o = byId.get(id);
    if (o.type === 'free') { o.x = w.x; o.y = w.y; return; }
    const c = V.get(o.args[0]); if (!c) return;
    if (isCirc(c)) o.t = Math.atan2(w.y - c.c.y, w.x - c.c.x);
    else { let t = dot(sub(w, c.p), c.v) / dot(c.v, c.v); if (c.seg) t = clamp(t, 0, 1); o.t = t; }
  }
  function gliderParam(cid, w) {
    const c = V.get(cid); if (isCirc(c)) return Math.atan2(w.y - c.c.y, w.x - c.c.x);
    let t = dot(sub(w, c.p), c.v) / dot(c.v, c.v); if (c.seg) t = clamp(t, 0, 1); return t;
  }

  // ---------------- Công cụ ----------------
  const T = (id, name, need, make, help, extra) => Object.assign({ id, name, need, make, help: help || [] }, extra || {});
  const TOOLS = [
    T('move', 'Di chuyển', [], null, ['Kéo điểm xanh (tự do) hoặc điểm rỗng (thuộc đường) để biến đổi hình. Kéo nền để dịch, lăn chuột / chụm hai ngón để phóng to. Nhấp đúp vào điểm để đổi tên.']),
    T('point', 'Điểm', ['P'], () => [], ['Nhấp để đặt điểm. Nhấp lên đường → điểm thuộc đường; nhấp vào chỗ hai đường cắt nhau → giao điểm.']),
    T('segment', 'Đoạn thẳng', ['P', 'P'], ([a, b]) => [{ type: 'segment', args: [a, b] }], ['Chọn điểm đầu.', 'Chọn điểm cuối.']),
    T('line', 'Đường thẳng', ['P', 'P'], ([a, b]) => [{ type: 'line', args: [a, b] }], ['Chọn điểm thứ nhất.', 'Chọn điểm thứ hai.']),
    T('triangle', 'Tam giác', ['P', 'P', 'P'], ([a, b, c]) => [{ type: 'segment', args: [a, b] }, { type: 'segment', args: [b, c] }, { type: 'segment', args: [c, a] }], ['Chọn đỉnh thứ nhất.', 'Chọn đỉnh thứ hai.', 'Chọn đỉnh thứ ba.']),
    T('circle', 'Đường tròn', ['P', 'P'], ([c, p]) => [{ type: 'circle', args: [c, p] }], ['Chọn tâm.', 'Chọn một điểm mà đường tròn đi qua.']),
    T('circle3', 'Tròn qua 3 điểm', ['P', 'P', 'P'], ([a, b, c]) => [{ type: 'circle3', args: [a, b, c] }], ['Chọn điểm thứ nhất.', 'Chọn điểm thứ hai.', 'Chọn điểm thứ ba.']),
    // Có đường tròn: luôn tạo cả hai giao điểm (kể cả khi lúc này chưa cắt nhau — kéo hình có thể làm chúng xuất hiện)
    T('intersect', 'Giao điểm', ['K', 'K'], ([a, b]) => {
      const circ = KIND[byId.get(a).type] === 'C' || KIND[byId.get(b).type] === 'C';
      return (circ ? [0, 1] : [0]).map(k => ({ type: 'intersect', args: [a, b], k }));
    }, ['Chọn đường thứ nhất.', 'Chọn đường thứ hai.']),
    T('midpoint', 'Trung điểm', ['P', 'P'], ([a, b]) => [{ type: 'midpoint', args: [a, b] }], ['Chọn đầu mút thứ nhất.', 'Chọn đầu mút thứ hai.']),
    T('perp', 'Vuông góc', ['P', 'L'], ([p, l]) => [{ type: 'perp', args: [p, l] }], ['Chọn điểm mà đường vuông góc đi qua.', 'Chọn đường thẳng (đoạn thẳng) cần vuông góc.']),
    T('parallel', 'Song song', ['P', 'L'], ([p, l]) => [{ type: 'parallel', args: [p, l] }], ['Chọn điểm mà đường song song đi qua.', 'Chọn đường thẳng (đoạn thẳng) gốc.']),
    T('foot', 'Hình chiếu', ['P', 'L'], ([p, l]) => [{ type: 'foot', args: [p, l] }], ['Chọn điểm cần chiếu.', 'Chọn đường thẳng chiếu lên.']),
    T('reflect', 'Đối xứng trục', ['P', 'L'], ([p, l]) => [{ type: 'reflect', args: [p, l] }], ['Chọn điểm.', 'Chọn trục đối xứng.']),
    T('perpbis', 'Trung trực', ['P', 'P'], ([a, b]) => [{ type: 'perpbis', args: [a, b] }], ['Chọn đầu mút thứ nhất.', 'Chọn đầu mút thứ hai.']),
    T('anglebis', 'Phân giác', ['P', 'P', 'P'], ([a, o, b]) => [{ type: 'anglebis', args: [a, o, b] }], ['Chọn một điểm trên cạnh thứ nhất.', 'Chọn đỉnh của góc.', 'Chọn một điểm trên cạnh thứ hai.']),
    T('center', 'Tâm', ['C'], ([c]) => [{ type: 'center', args: [c] }], ['Chọn đường tròn.']),
    T('length', 'Đo độ dài', ['P', 'P'], ([a, b]) => [{ type: 'length', args: [a, b] }], ['Chọn điểm thứ nhất.', 'Chọn điểm thứ hai.']),
    T('angle', 'Đo góc', ['P', 'P', 'P'], ([a, o, b]) => [{ type: 'angle', args: [a, o, b] }], ['Chọn một điểm trên cạnh thứ nhất.', 'Chọn đỉnh góc.', 'Chọn một điểm trên cạnh thứ hai.']),
    T('locus', 'Quỹ tích', ['P', 'G'], ([t, d]) => [{ type: 'locus', args: [t, d] }], ['Chọn điểm cần vẽ quỹ tích.', 'Chọn điểm điều khiển (một điểm thuộc đường thẳng/đường tròn).']),
    T('trace', 'Bật vết', ['P'], ([p]) => { const o = byId.get(p); o.trace = !o.trace; traces.delete(p); say(o.trace ? `Đang lưu vết của ${o.name}. Hãy kéo hình.` : `Đã tắt vết của ${o.name}.`); return []; }, ['Chọn điểm cần bật / tắt vết.'], { noCreate: true }),
    T('check', 'Kiểm nghiệm', null, null, null, { noCreate: true }),
    T('delete', 'Xóa', ['A'], ([id]) => { removeObj(id); return []; }, ['Chọn đối tượng cần xóa (các đối tượng phụ thuộc cũng bị xóa).'], { noCreate: true })
  ];
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));
  const needOf = () => (tool === 'check' ? REL[checkRel].need : TOOL[tool].need);
  function matches(kind, id) {
    const o = byId.get(id); if (!o) return false; const k = KIND[o.type];
    switch (kind) {
      case 'P': return k === 'P';
      case 'G': return o.type === 'glider';
      case 'L': return k === 'L';
      case 'C': return k === 'C';
      case 'K': return k === 'L' || k === 'C';
      case 'Q': return k === 'M' || o.type === 'segment';
      case 'A': return true;
    }
    return false;
  }

  const ICON = {
    move: '<path d="M6 3l13 7-5.5 1.6L11.5 18z" class="f"/>',
    point: '<circle cx="12" cy="12" r="4" class="f"/>',
    segment: '<path d="M5 18L19 6"/><circle cx="5" cy="18" r="2.4" class="f"/><circle cx="19" cy="6" r="2.4" class="f"/>',
    line: '<path d="M1 21L23 3"/><circle cx="7" cy="16" r="2.4" class="f"/><circle cx="17" cy="8" r="2.4" class="f"/>',
    triangle: '<path d="M12 4L21 19H3z"/>',
    circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" class="f"/><circle cx="20" cy="12" r="2" class="f"/>',
    circle3: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="2" class="f"/><circle cx="5" cy="16" r="2" class="f"/><circle cx="19" cy="16" r="2" class="f"/>',
    intersect: '<path d="M3 19L21 5M3 6l18 12"/><circle cx="12" cy="12" r="2.6" class="f"/>',
    midpoint: '<path d="M3 17L21 7"/><circle cx="3.5" cy="16.7" r="2" class="f"/><circle cx="20.5" cy="7.3" r="2" class="f"/><circle cx="12" cy="12" r="3" class="pen"/>',
    perp: '<path d="M3 19h18M10 19V3"/><path d="M10 15h4v4" class="thin"/>',
    parallel: '<path d="M2 15L18 5M6 21L22 11"/>',
    foot: '<path d="M2 19h20"/><path d="M12 5v14" class="dash"/><circle cx="12" cy="5" r="2.4" class="f"/><circle cx="12" cy="19" r="2.6" class="pen"/>',
    reflect: '<path d="M12 2v20" class="dash"/><circle cx="6" cy="9" r="2.6" class="f"/><circle cx="18" cy="9" r="2.6" class="pen"/>',
    perpbis: '<path d="M3 15h18M12 3v18"/><circle cx="4" cy="15" r="2" class="f"/><circle cx="20" cy="15" r="2" class="f"/>',
    anglebis: '<path d="M3 19h18M3 19L15 4"/><path d="M3 19l18-8" class="pen-l"/>',
    center: '<circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6" class="thin"/>',
    length: '<path d="M3 16L21 8"/><path d="M3 11v10M21 3v10" class="thin"/>',
    angle: '<path d="M3 19h18M3 19L14 5"/><path d="M10 19a7 7 0 00-2.7-5.5" class="pen-l"/>',
    locus: '<path d="M3 16c3-9 6-9 9 0s6 9 9 0" class="pen-l"/><circle cx="12" cy="16" r="2.6" class="f"/>',
    trace: '<circle cx="5" cy="17" r="1.6" class="pf"/><circle cx="9" cy="13" r="1.6" class="pf"/><circle cx="13" cy="11" r="1.6" class="pf"/><circle cx="18" cy="7" r="3" class="f"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-7"/>',
    delete: '<path d="M6 6l12 12M18 6L6 18"/>'
  };

  // ---------------- Xử lý thao tác dựng ----------------
  function wantKinds() { const n = needOf() || []; return new Set(n.filter((k, i) => slots[i] == null)); }
  function setTool(id) {
    if (!TOOL[id]) return;
    if (mission && mission.kind === 'construct' && !mission.tools.includes(id)) return;
    tool = id; slots = new Array((needOf() || []).length).fill(null);
    if (id === 'check') showTab('gt');
    renderTools(); helpText(); schedule();
  }
  function helpText(extra) {
    const st = document.getElementById('status'); if (!st) return;
    let t;
    if (tool === 'check') {
      const n = REL[checkRel].need, i = slots.findIndex(s => s == null);
      const kindName = { P: 'một điểm', L: 'một đường thẳng / đoạn thẳng', K: 'một đường thẳng hoặc đường tròn', Q: 'một đoạn thẳng hoặc một số đo' };
      t = `Kiểm nghiệm “${REL[checkRel].name}”: chọn ${kindName[n[i]] || 'đối tượng'} (${i + 1}/${n.length}).`;
    } else {
      const h = TOOL[tool].help, i = Math.max(0, slots.findIndex(s => s == null));
      t = h[Math.min(i, h.length - 1)] || '';
    }
    st.innerHTML = `<b>${esc(TOOL[tool].name)}</b> · ${esc(extra || t)}`;
  }
  function say(msg) { helpText(msg); }

  function pickFor(p, touch) {
    const wants = wantKinds(), def = TOOL[tool];
    const hp = hitPoint(p, touch);
    if (hp && (wants.has('P') || wants.has('A') || (wants.has('G') && byId.get(hp).type === 'glider'))) return hp;
    if (wants.has('Q') || wants.has('A')) { const hm = hitMeasure(p); if (hm) return hm; }
    const hc = hitCurves(p, touch);
    for (const c of hc) for (const k of wants) if (k !== 'P' && k !== 'G' && matches(k, c)) return c;
    if (def.noCreate || !(wants.has('P') || wants.has('G'))) return null;
    const w = toW(p);
    if (hc.length >= 2 && wants.has('P')) {
      const pts = intersections(V.get(hc[0]), V.get(hc[1]));
      let bk = -1, bd = (touch ? 18 : 12) / view.s;
      pts.forEach((q, k) => { const d = dist(q, w); if (d < bd) { bd = d; bk = k; } });
      if (bk >= 0) { pushUndo(); return addObj({ type: 'intersect', args: [hc[0], hc[1]], k: bk }); }
    }
    if (hc.length >= 1) { pushUndo(); return addObj({ type: 'glider', args: [hc[0]], t: gliderParam(hc[0], w) }); }
    if (wants.has('P')) { pushUndo(); return addObj({ type: 'free', x: w.x, y: w.y }); }
    return null;
  }
  function offer(id) {
    const need = needOf() || [];
    if (slots.includes(id)) { say('Đối tượng này đã được chọn.'); return; }
    const i = need.findIndex((k, j) => slots[j] == null && matches(k, id));
    if (i < 0) { say('Đối tượng này không phù hợp với bước hiện tại.'); return; }
    slots[i] = id;
    if (slots.every(s => s != null)) exec(); else { helpText(); changed(true); }
  }
  function exec() {
    const ids = slots.slice(); slots = slots.map(() => null);
    if (tool === 'check') { addCheck(checkRel, ids); helpText(); return; }
    const def = TOOL[tool];
    V = computeAll();                   // giá trị mới nhất, kể cả đối tượng vừa tạo trước lần vẽ kế tiếp
    if (tool !== 'point') pushUndo();   // điểm mới đã được ghi hoàn tác khi tạo trong pickFor
    const made = def.make(ids) || [];
    for (const m of made) addObj(m);
    if (mst && mission && mission.kind === 'construct' && tool !== 'delete') mst.ops++;
    if (tool === 'delete' || tool === 'trace') { /* thông báo đã hiện trong make */ }
    else if (made.length) helpText(`Đã tạo: ${made.map((m, i) => describe(objs[objs.length - made.length + i])).join('; ')}.`);
    else helpText();
    if (mst && mission && mission.kind === 'construct') renderMission();
    changed(true);
  }
  function removeObj(id) {
    const o = byId.get(id); if (!o) return;
    if (o.given) { say('Đây là dữ kiện của đề bài nên không xóa được.'); return; }
    const dead = new Set([id]);
    for (const x of objs) if (x.args.some(a => dead.has(a))) dead.add(x.id);
    objs = objs.filter(x => !dead.has(x.id)); reindex();
    checks = checks.filter(c => !c.args.some(a => dead.has(a)));
    for (const d of dead) traces.delete(d);
    say(`Đã xóa ${dead.size} đối tượng.`);
  }

  // ---------------- Giả thuyết ----------------
  function addCheck(rel, args) {
    pushUndo();
    const c = { id: nextCheck++, rel, args };
    if (rel === 'ratio') {
      const M = computeAll(), p = quantity(M, args[0]), q = quantity(M, args[1]);
      if (p == null || q == null || Math.abs(q) < 1e-12) { say('Không tính được tỉ số ở hình hiện tại.'); undoStack.pop(); return null; }
      c.r0 = p / q;
    }
    checks.push(c); runCheck(c); changed(true); showTab('gt');
    return c;
  }
  function runCheck(c) {
    const r = REL[c.rel];
    c.result = robustTest((M, S) => r.res(M, c.args, c, S));
    return c.result;
  }
  function verdictHTML(c) {
    const r = c.result; if (!r) return '';
    const valid = r.N - r.undef, okNow = r.cur != null && r.cur < TOL;
    let h;
    if (valid === 0) h = '<span class="v warn">Mọi hình thử đều suy biến — chưa kết luận được.</span>';
    else if (r.fail === 0) h = `<span class="v good">Đứng vững qua ${r.pass}/${valid} hình ngẫu nhiên.</span> Bằng chứng thực nghiệm mạnh — <i>nhưng chưa phải chứng minh</i>. Vì sao nó đúng?`;
    else if (r.pass === 0) h = `<span class="v bad">Sai ở ${r.fail}/${valid} hình.</span> ${okNow ? 'Hình hiện tại thỏa chỉ là <b>trùng hợp</b> của một vị trí đặc biệt.' : 'Giả thuyết bị bác bỏ.'}`;
    else h = `<span class="v warn">Chỉ đúng ở ${Math.round(100 * r.pass / valid)}% số hình.</span> Có lẽ cần thêm điều kiện: so sánh một hình đúng với một hình sai để tìm điều kiện đó.`;
    const b = [];
    if (r.fail && r.cex) b.push(`<button class="btn sm" type="button" data-cex="${c.id}">Xem phản ví dụ</button>`);
    if (r.fail && r.pass && r.ex) b.push(`<button class="btn sm" type="button" data-ex="${c.id}">Xem một hình đúng</button>`);
    return h + (b.length ? `<div class="row">${b.join('')}</div>` : '');
  }

  // ---------------- Mô tả đối tượng ----------------
  function describe(o) {
    const a = o.args.map(nm);
    switch (o.type) {
      case 'free': return `${o.name}: điểm tự do`;
      case 'glider': return `${o.name}: điểm thuộc ${a[0]}`;
      case 'midpoint': return `${o.name}: trung điểm ${a[0]}${a[1]}`;
      case 'intersect': return `${o.name}: giao điểm của ${a[0]} và ${a[1]}`;
      case 'foot': return `${o.name}: hình chiếu của ${a[0]} lên ${a[1]}`;
      case 'reflect': return `${o.name}: đối xứng của ${a[0]} qua ${a[1]}`;
      case 'center': return `${o.name}: tâm của ${a[0]}`;
      case 'segment': return `đoạn thẳng ${o.name}`;
      case 'line': return `${o.name}: đường thẳng ${a[0]}${a[1]}`;
      case 'perp': return `${o.name}: qua ${a[0]}, vuông góc ${a[1]}`;
      case 'parallel': return `${o.name}: qua ${a[0]}, song song ${a[1]}`;
      case 'perpbis': return `${o.name}: trung trực của ${a[0]}${a[1]}`;
      case 'anglebis': return `${o.name}: phân giác góc ${a.join('')}`;
      case 'circle': return `${o.name}: đường tròn tâm ${a[0]} qua ${a[1]}`;
      case 'circle3': return `${o.name}: đường tròn qua ${a.join(', ')}`;
      case 'length': return `độ dài ${a[0]}${a[1]}`;
      case 'angle': return `góc ${a.join('')}`;
      case 'pathlen': return `tổng ${a[0]}${a[1]} + ${a[1]}${a[2]}`;
      case 'locus': return `quỹ tích của ${a[0]} khi ${a[1]} di chuyển`;
    }
    return o.name;
  }
  function valueText(o) {
    const v = V.get(o.id); if (o.type === 'locus') return '';
    if (!v) return 'không xác định';
    const k = KIND[o.type];
    if (k === 'P') return `(${fmt(v.x / UNIT)}; ${fmt(-v.y / UNIT)})`;
    if (o.type === 'segment') return `= ${fmt(len(v.v) / UNIT)}`;
    if (k === 'C') return `R = ${fmt(v.r / UNIT)}`;
    if (o.type === 'angle') return `= ${fmt(v.val, 1)}°`;
    if (k === 'M') return `= ${fmt(v.val)}`;
    return '';
  }

  // ---------------- Vẽ ----------------
  function computeLocus(o) {
    const [tid, did] = o.args, drv = byId.get(did); if (!drv || drv.type !== 'glider') return [];
    const k = carrierKind(drv), save = drv.t, pts = [];
    const [lo, hi, n] = k === 'circle' ? [0, 2 * Math.PI, 360] : k === 'segment' ? [0, 1, 160] : [-4, 5, 270];
    for (let i = 0; i <= n; i++) { drv.t = lo + (hi - lo) * i / n; const M = computeAll(); pts.push(M.get(tid)); }
    drv.t = save;
    return pts;
  }
  function recordTraces() {
    for (const o of objs) {
      if (!o.trace) continue; const v = V.get(o.id);
      let arr = traces.get(o.id); if (!arr) { arr = []; traces.set(o.id, arr); }
      const last = arr[arr.length - 1];
      if (!v) { if (last) arr.push(null); continue; }
      if (!last || dist(last, v) > 1.2 / view.s) arr.push({ x: v.x, y: v.y });
      if (arr.length > 6000) arr.splice(0, 1000);
    }
  }
  function polyPath(pts, maxJump) {
    let d = '', pen = false, prev = null;
    for (const q of pts) {
      if (!q) { pen = false; prev = null; continue; }
      const s = toS(q);
      if (pen && prev && dist(prev, s) < maxJump) d += `L${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
      else d += `M${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
      pen = true; prev = s;
    }
    return d;
  }
  function gridSVG(W, H) {
    let h = '';
    if (opts.grid) {
      let step = UNIT * view.s; while (step < 14) step *= 5;
      const x0 = ((view.ox % step) + step) % step, y0 = ((view.oy % step) + step) % step;
      let d = '';
      for (let x = x0; x < W; x += step) d += `M${x.toFixed(1)} 0V${H}`;
      for (let y = y0; y < H; y += step) d += `M0 ${y.toFixed(1)}H${W}`;
      h += `<path class="g-grid" d="${d}"/>`;
    }
    if (opts.axes) {
      const o = toS({ x: 0, y: 0 });
      h += `<path class="g-axis" d="M0 ${o.y}H${W}M${o.x} 0V${H}"/>`;
      let step = UNIT * view.s, u = 1; while (step < 34) { step *= 5; u *= 5; }
      let t = '';
      const i0 = Math.ceil(-o.x / step), i1 = Math.floor((W - o.x) / step);
      for (let i = i0; i <= i1; i++) if (i) t += `<text class="tick" x="${o.x + i * step}" y="${o.y + 14}">${i * u}</text>`;
      const j0 = Math.ceil(-o.y / step), j1 = Math.floor((H - o.y) / step);
      for (let j = j0; j <= j1; j++) if (j) t += `<text class="tick" x="${o.x - 6}" y="${o.y + j * step + 4}" text-anchor="end">${-j * u}</text>`;
      h += t + `<text class="tick" x="${o.x - 6}" y="${o.y + 14}" text-anchor="end">O</text>`;
    }
    return h;
  }
  function render() {
    V = computeAll(); recordTraces(); labelPos = new Map();
    const { W, H } = boardSize(), sel = new Set(slots.filter(s => s != null));
    const cls = o => `${o.aux ? ' aux' : ''}${o.color ? ' c-' + o.color : ''}${sel.has(o.id) ? ' sel' : ''}${hoverId === o.id ? ' hov' : ''}`;
    let back = gridSVG(W, H), curves = '', halos = '', marks = '', pts = '', lbls = '', nRead = 0;
    const readTop = narrow() ? 58 : 76;
    for (const [id, arr] of traces) { if (byId.has(id)) back += `<path class="o-trace" d="${polyPath(arr, 60)}"/>`; }
    const far = 3 * (W + H) / view.s;
    for (const o of objs) {
      if (o.hidden) continue; const v = V.get(o.id), k = KIND[o.type];
      if (o.type === 'locus') { back += `<path class="o-locus${cls(o)}" d="${polyPath(computeLocus(o), (W + H) / 3)}"/>`; continue; }
      if (!v) continue;
      if (k === 'L') {
        let A, B;
        if (v.seg) { A = toS(v.a); B = toS(v.b); }
        else { const u = unit(v.v), cw = toW({ x: W / 2, y: H / 2 }), L = far + dist(v.p, cw); A = toS(sub(v.p, mul(u, L))); B = toS(add(v.p, mul(u, L))); }
        const d = `M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${B.x.toFixed(1)} ${B.y.toFixed(1)}`;
        if (sel.has(o.id)) halos += `<path class="halo" d="${d}"/>`;
        curves += `<path class="o-l${cls(o)}" d="${d}"/>`;
      } else if (k === 'C') {
        const c = toS(v.c), r = v.r * view.s; if (r > 1e6) continue;
        if (sel.has(o.id)) halos += `<circle class="halo" cx="${c.x}" cy="${c.y}" r="${r}"/>`;
        curves += `<circle class="o-l${cls(o)}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r.toFixed(1)}"/>`;
      } else if (k === 'M') {
        const at = toS(v.at); let txt, lx = at.x + 10, ly = at.y + 20;
        if (o.type === 'angle') {
          const rr = 24, p1 = add(at, mul(v.u, rr)), p2 = add(at, mul(v.w, rr)), sw = cross(v.u, v.w) > 0 ? 1 : 0;
          marks += `<path class="arc${sel.has(o.id) ? ' sel' : ''}" d="M${p1.x} ${p1.y}A${rr} ${rr} 0 0 ${sw} ${p2.x} ${p2.y}"/>`;
          const bis = unit(add(v.u, v.w)) || perpv(v.u); lx = at.x + bis.x * 34 - 18; ly = at.y + bis.y * 34 + 5;
          txt = `${qName(o.id)} = ${fmt(v.val, 1)}°`;
        } else {   // độ dài, tổng độ dài: xếp thành bảng số đo ở góc để không che hình
          txt = `${qName(o.id)} = ${fmt(v.val)}`; lx = 14; ly = readTop + 20 * nRead++;
        }
        labelPos.set(o.id, { x: lx, y: ly, w: txt.length * 7.4 });
        lbls += `<text class="mlbl${sel.has(o.id) ? ' sel' : ''}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${esc(txt)}</text>`;
      } else if (k === 'P') {
        const s = toS(v), free = o.type === 'free', gl = o.type === 'glider';
        if (sel.has(o.id)) halos += `<circle class="halo-p" cx="${s.x}" cy="${s.y}" r="11"/>`;
        pts += `<circle class="p${free ? ' free' : gl ? ' glider' : ''}${o.color ? ' c-' + o.color : ''}${hoverId === o.id ? ' hov' : ''}" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${free ? 5.5 : gl ? 5 : 4}"/>`;
        lbls += `<text class="lbl" x="${(s.x + 8).toFixed(1)}" y="${(s.y - 8).toFixed(1)}">${esc(o.name)}</text>`;
      }
    }
    svg.innerHTML = back + halos + curves + marks + pts + lbls;
    svg.style.cursor = hoverId && draggable(hoverId) && (tool === 'move' || needOf() && !needOf().length) ? 'grab' : tool === 'move' ? 'default' : 'crosshair';
    liveUpdate();
  }
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }

  // ---------------- Hoạt hình ----------------
  let animOn = false;
  function animTick() {
    let any = false;
    for (const o of objs) {
      if (o.type !== 'glider' || !o.anim) continue; any = true;
      const k = carrierKind(o);
      if (k === 'circle') o.t = (o.t + 0.012) % (2 * Math.PI);
      else {
        const lo = k === 'segment' ? 0 : -1.5, hi = k === 'segment' ? 1 : 2.5;
        o.dir = o.dir || 1; o.t += (k === 'segment' ? 0.005 : 0.01) * o.dir;
        if (o.t > hi) { o.t = hi; o.dir = -1; } if (o.t < lo) { o.t = lo; o.dir = 1; }
      }
    }
    if (any) { render(); requestAnimationFrame(animTick); } else animOn = false;
  }
  function startAnim() { if (!animOn) { animOn = true; requestAnimationFrame(animTick); } }

  // ---------------- Giao diện bên ----------------
  const $ = s => document.querySelector(s);
  function renderTools() {
    const allow = mission && mission.kind === 'construct' ? new Set(mission.tools) : null;
    $('#tools').innerHTML = TOOLS.filter(t => !allow || allow.has(t.id)).map(t =>
      `<button type="button" class="tool${t.id === tool ? ' on' : ''}" data-tool="${t.id}" aria-pressed="${t.id === tool}" title="${esc(t.name)}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[t.id]}</svg><span>${esc(t.name)}</span></button>`).join('');
  }
  function renderList() {
    const el = $('#objlist');
    if (!objs.length) { el.innerHTML = '<li class="empty">Chưa có đối tượng. Chọn một công cụ bên trái rồi nhấp lên bảng vẽ.</li>'; return; }
    el.innerHTML = objs.map(o => {
      if (o.hidden) return '';
      const b = [];
      if (o.type === 'glider') b.push(`<button type="button" class="ib" data-anim="${o.id}" title="Cho điểm tự chạy" aria-label="Cho ${esc(o.name)} tự chạy">${o.anim ? '⏸' : '▶'}</button>`);
      if (KIND[o.type] === 'P') b.push(`<button type="button" class="ib${o.trace ? ' on' : ''}" data-trace="${o.id}" title="Bật/tắt vết" aria-label="Bật tắt vết ${esc(o.name)}">∴</button>`);
      if (!o.given) b.push(`<button type="button" class="ib" data-del="${o.id}" title="Xóa" aria-label="Xóa ${esc(o.name)}">×</button>`);
      return `<li data-id="${o.id}" class="${o.given ? 'given' : ''}"><span class="ds">${esc(describe(o))}</span><span class="vl" data-val="${o.id}"></span><span class="bs">${b.join('')}</span></li>`;
    }).join('');
  }
  function renderChecks() {
    const el = $('#checklist');
    if (!checks.length) { el.innerHTML = '<li class="empty">Chưa có giả thuyết nào. Chọn quan hệ ở trên rồi chọn các đối tượng trên hình.</li>'; return; }
    el.innerHTML = checks.map(c => `<li data-ck="${c.id}"><div class="hd"><span class="st" data-st="${c.id}"></span><b>${esc(checkText(c))}</b><button type="button" class="ib" data-run="${c.id}" title="Kiểm nghiệm lại" aria-label="Kiểm nghiệm lại">↻</button><button type="button" class="ib" data-rmck="${c.id}" title="Bỏ giả thuyết" aria-label="Bỏ giả thuyết">×</button></div><div class="vd">${verdictHTML(c)}</div></li>`).join('');
  }
  function liveUpdate() {
    for (const el of document.querySelectorAll('[data-val]')) { const o = byId.get(+el.dataset.val); if (o) el.textContent = valueText(o); }
    if (checks.length) {
      const { S } = figureScale(V);
      for (const c of checks) {
        const el = document.querySelector(`[data-st="${c.id}"]`); if (!el) continue;
        let r = null; try { r = REL[c.rel].res(V, c.args, c, S); } catch (e) { r = null; }
        el.className = 'st ' + (r == null ? 'na' : r < TOL ? 'ok' : 'no');
        el.title = r == null ? 'Không xác định ở hình hiện tại' : r < TOL ? 'Đúng ở hình hiện tại' : `Sai ở hình hiện tại (lệch ${fmt(r * 100, 3)}%)`;
        el.textContent = r == null ? '?' : r < TOL ? '✓' : '✗';
      }
    }
    if (mission && mission.optimize && mst) {
      const v = V.get(mst.refs[mission.optimize.measure]);
      if (v && mst.touched) { if (mst.best == null || v.val < mst.best) mst.best = v.val; }
      const el = $('#optnow'); if (el && v) el.innerHTML = `Hiện tại: <b>${fmt(v.val, 3)}</b> · Kỷ lục của bạn: <b>${mst.best == null ? '—' : fmt(mst.best, 3)}</b>`;
    }
  }
  function changed(structure) {
    if (structure) { renderList(); renderChecks(); }
    autosave(); schedule();
  }
  function showTab(id) {
    for (const b of document.querySelectorAll('[data-tab]')) { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }
    for (const p of document.querySelectorAll('.tabp')) p.hidden = p.id !== 'tab-' + id;
  }
  function typeset(el) {
    if (window.renderMathInElement) try { window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { /* bỏ qua lỗi công thức */ }
  }

  // ---------------- Bài toán ----------------
  const MISSIONS = window.HH_MISSIONS || [];
  function missionMenu() {
    const groups = [['explore', 'Khám phá → dự đoán → chứng minh'], ['construct', 'Thử thách dựng hình (thước & compa)']];
    return groups.map(([k, t]) => `<div class="mgroup"><div class="k">${t}</div><div class="mlist">${MISSIONS.filter(m => m.kind === k).map((m, i) =>
      `<button type="button" class="mbtn${mission === m ? ' on' : ''}" data-mission="${m.id}"><small>${k === 'explore' ? 'Bài' : 'Thử thách'} ${i + 1} · ${esc(m.tag)}</small>${esc(m.title)}</button>`).join('')}</div></div>`).join('') +
      `<div class="mgroup"><button type="button" class="mbtn${!mission ? ' on' : ''}" data-mission=""><small>Bảng vẽ tự do</small>Tự đặt bài toán của em</button></div>`;
  }
  function renderMission() {
    const el = $('#tab-bt');
    let h = `<details class="menu"${mission ? '' : ' open'}><summary>${mission ? 'Đổi bài toán' : 'Chọn bài toán'}</summary>${missionMenu()}</details>`;
    if (!mission) {
      h += `<article class="mis"><h3>Bảng vẽ tự do</h3><p>Hãy tự làm nhà nghiên cứu: dựng hình, <b>kéo thả</b> để quan sát, nêu <b>giả thuyết</b>, dùng thẻ <i>Giả thuyết</i> để kiểm nghiệm trên hàng trăm hình ngẫu nhiên, rồi tìm <b>chứng minh</b>.</p>
      <ol class="cycle"><li><b>Quan sát</b> — điều gì không đổi khi hình thay đổi?</li><li><b>Dự đoán</b> — phát biểu thành mệnh đề rõ ràng.</li><li><b>Kiểm nghiệm</b> — tìm phản ví dụ; nếu không có, tin tưởng hơn.</li><li><b>Giải thích</b> — vì sao nó đúng? Viết chứng minh.</li><li><b>Mở rộng</b> — đổi giả thiết, khái quát hóa, đặt bài toán mới.</li></ol>
      <p class="hint">Hình của bảng vẽ tự do được tự lưu trên trình duyệt này. Dùng “Liên kết” ở thanh trên để gửi hình cho bạn bè / giáo viên.</p>
      <div class="row"><button class="btn sm" type="button" id="clearAll">Xóa toàn bộ hình</button></div></article>`;
      el.innerHTML = h; typeset(el); return;
    }
    const m = mission, s = mst;
    h += `<article class="mis"><div class="k">${esc(m.tag)}</div><h3>${esc(m.title)}</h3><p>${m.intro}</p>`;
    if (m.kind === 'construct') {
      h += `<section class="bstep"><h4><span>1</span>Đề bài</h4><p class="goal">${m.goal.text}</p><p class="hint">Chỉ dùng các công cụ hiện trên thanh bên trái (thước thẳng và compa). Lời giải phải <b>đứng vững khi kéo thả</b> các dữ kiện: dựng “bằng mắt” sẽ không được chấp nhận.</p></section>
      <section class="bstep"><h4><span>2</span>Kiểm tra lời giải</h4><p>Số thao tác: <b>${s.ops}</b> · Mục tiêu: ≤ ${m.par}</p><div class="row"><button class="btn primary sm" type="button" id="goalCheck">Kiểm tra lời giải</button></div><div id="goalRes" class="vd">${s.goalRes || ''}</div></section>`;
    } else {
      if (m.todo && m.todo.length) h += `<section class="bstep"><h4><span>1</span>Quan sát</h4><ul>${m.todo.map(t => `<li>${t}</li>`).join('')}</ul></section>`;
      const p = m.predict;
      h += `<section class="bstep"><h4><span>2</span>Dự đoán</h4><p>${p.q}</p><div class="opts">${p.opts.map((o, i) =>
        `<button type="button" class="opt${s.pred === i ? (i === p.ans ? ' right' : ' wrong') : ''}" data-pred="${i}"${s.pred != null ? ' disabled' : ''}>${o}</button>`).join('')}</div>${s.pred != null ? `<p class="fb">${s.pred === p.ans ? 'Dự đoán của em trùng với kết luận đúng.' : 'Chưa đúng — không sao: dự đoán sai rồi tự sửa giúp nhớ lâu hơn.'} ${p.why || ''}</p>` : '<p class="hint">Hãy dự đoán trước khi kiểm nghiệm.</p>'}</section>`;
      if (m.optimize) {
        h += `<section class="bstep"><h4><span>3</span>Thực nghiệm</h4><p id="optnow"></p><div class="row"><button class="btn primary sm" type="button" id="optTrue"${s.pred == null ? ' disabled' : ''}>So với giá trị nhỏ nhất thật</button></div><div class="vd">${s.optRes || ''}</div></section>`;
      } else {
        h += `<section class="bstep"><h4><span>3</span>Kiểm nghiệm</h4><p>${m.verify.text}</p><div class="row"><button class="btn primary sm" type="button" id="verify"${s.pred == null ? ' disabled' : ''}>${s.verified ? 'Kiểm nghiệm lại' : 'Đưa vào danh sách và kiểm nghiệm'}</button></div>${s.verified ? `<div class="vd">${checks.filter(c => s.checkIds.includes(c.id)).map(c => `<p><b>${esc(checkText(c))}</b> — ${verdictHTML(c)}</p>`).join('')}${m.verify.after ? `<p>${m.verify.after}</p>` : ''}</div>` : ''}</section>`;
      }
    }
    const hs = m.hints || [];
    h += `<section class="bstep"><h4><span>${m.kind === 'construct' ? 3 : 4}</span>Vì sao? Thang gợi ý</h4>${hs.slice(0, s.hints).map((x, i) => `<p class="hintc"><b>Gợi ý ${i + 1}.</b> ${x.t}</p>`).join('')}${s.hints < hs.length ? `<div class="row"><button class="btn sm" type="button" id="moreHint">Gợi ý ${s.hints + 1}/${hs.length}</button></div>` : ''}
      <details class="proof"><summary>${m.kind === 'construct' ? 'Xem lời giải mẫu' : 'Xem chứng minh'} (sau khi đã tự thử)</summary><div>${m.proof}</div></details></section>`;
    if (m.extend && m.extend.length) h += `<section class="bstep"><h4><span>${m.kind === 'construct' ? 4 : 5}</span>Mở rộng — đặt câu hỏi mới</h4><ul>${m.extend.map(t => `<li>${t}</li>`).join('')}</ul></section>`;
    h += '</article>';
    el.innerHTML = h; typeset(el);
  }
  function loadMission(id) {
    if (!mission) autosave();
    const m = MISSIONS.find(x => x.id === id) || null;
    objs = []; byId = new Map(); nextId = 1; checks = []; nextCheck = 1; traces.clear(); undoStack = [];
    mission = m;
    if (m) {
      const refs = m.build(builder()) || {};
      mst = { refs, pred: null, hints: 0, verified: false, checkIds: [], ops: 0, best: null, touched: false };
    } else {
      mst = null;
      let d = null;
      try { d = JSON.parse(store.get('hh-tudo') || 'null'); } catch (e) { d = null; }
      if (d) loadData(d);
    }
    tool = 'move'; slots = []; renderTools(); helpText();
    V = computeAll(); fitView(); renderMission(); showTab('bt'); changed(true);
    try { history.replaceState(null, '', m ? '#bai=' + m.id : location.pathname + location.search); } catch (e) { /* tệp cục bộ */ }
  }
  function reveal(keys) { for (const k of keys || []) { const o = byId.get(mst.refs[k]); if (o) o.hidden = false; } }
  function doVerify() {
    const m = mission, s = mst;
    reveal(m.verify.reveal);
    if (!s.verified) {
      for (const [rel, keys] of m.verify.checks) {
        const c = { id: nextCheck++, rel, args: keys.map(k => s.refs[k]) };
        if (rel === 'ratio') { const M = computeAll(); c.r0 = quantity(M, c.args[0]) / quantity(M, c.args[1]); }
        checks.push(c); s.checkIds.push(c.id);
      }
      s.verified = true;
    }
    for (const c of checks) if (s.checkIds.includes(c.id)) runCheck(c);
    renderMission(); changed(true);
  }
  function goalCheck() {
    const m = mission, s = mst, g = m.goal;
    // Điểm tự do / điểm thuộc đường cũng được thử: chúng không bao giờ đạt, nhưng giúp nhận ra lời giải "bằng mắt".
    const cands = objs.filter(o => !o.given && KIND[o.type] === g.kind);
    let soft = null;
    for (const c of cands) {
      const r = robustTest((M, S) => g.res(M, c.id, s.refs, S));
      if (r.fail === 0 && r.pass >= 30 && c.type !== 'free' && c.type !== 'glider') {
        const ok = s.ops <= m.par;
        s.goalRes = `<span class="v good">Đạt! ${esc(describe(c))} thỏa yêu cầu trong ${r.pass}/${r.N - r.undef} hình ngẫu nhiên.</span> ${ok ? `Em dùng ${s.ops} thao tác — bằng hoặc tốt hơn mục tiêu.` : `Em dùng ${s.ops} thao tác; thử tìm cách ngắn hơn (≤ ${m.par}).`}`;
        hoverId = c.id; renderMission(); schedule(); return;
      }
      if (r.cur != null && r.cur < 0.02) soft = { c, r };
    }
    s.goalRes = soft
      ? `<span class="v warn">Nhìn thì đúng, nhưng chưa bền.</span> ${esc(describe(soft.c))} gần đạt ở hình hiện tại, nhưng sai khi kéo dữ kiện (${soft.r.fail}/${soft.r.N - soft.r.undef} hình). Có lẽ em đặt một điểm “bằng mắt”. Hãy kéo các điểm xanh để tự thấy, rồi dựng lại sao cho đối tượng được <b>xác định hoàn toàn</b> bởi dữ kiện.`
      : `<span class="v bad">Chưa thấy đối tượng nào thỏa yêu cầu.</span> Cần dựng ${g.kind === 'P' ? 'một điểm (thường là giao điểm)' : 'một đường thẳng'} được xác định hoàn toàn bởi dữ kiện.`;
    renderMission();
  }
  function optTrue() {
    const m = mission, s = mst, mid = s.refs[m.optimize.measure], drv = byId.get(s.refs[m.optimize.driver]);
    const save = drv.t; let best = Infinity, bt = save;
    const f = t => { drv.t = t; const v = computeAll().get(mid); return v ? v.val : Infinity; };
    for (let i = 0; i <= 3000; i++) { const t = -3 + 7 * i / 3000, y = f(t); if (y < best) { best = y; bt = t; } }
    let a = bt - 7 / 3000, b = bt + 7 / 3000;
    for (let i = 0; i < 60; i++) { const c = a + (b - a) * 0.382, d = a + (b - a) * 0.618; if (f(c) < f(d)) b = d; else a = c; }
    bt = (a + b) / 2; best = f(bt); drv.t = save;
    const gap = s.best == null ? null : 100 * (s.best - best) / best;
    s.optRes = `Giá trị nhỏ nhất thật ≈ <b>${fmt(best, 3)}</b>. ${gap == null ? 'Em chưa thử kéo $M$.' : gap < 0.05 ? `Kỷ lục của em gần như tối ưu (chênh ${fmt(gap, 3)}%). Tuyệt!` : `Kỷ lục của em chênh ${fmt(gap, 2)}%.`} Nhưng tìm được bằng cách thử không giải thích được <i>vì sao</i> đó là nhỏ nhất — hãy xem thang gợi ý.<div class="row"><button class="btn sm" type="button" id="optSet" data-t="${bt}">Đặt M vào vị trí tối ưu</button></div>`;
    renderMission();
  }

  // ---------------- Sự kiện ----------------
  const pointers = new Map(); let down = null, pinch = null;
  const evPt = e => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture(e.pointerId); const p = evPt(e); pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], m = mul(add(a, b), 0.5);
      pinch = { d: dist(a, b) || 1, s: view.s, w: toW(m) }; down = null; return;
    }
    const touch = e.pointerType === 'touch', h = hitPoint(p, touch);
    down = { p0: p, moved: false, touch, target: h && draggable(h) ? h : null, view0: { ox: view.ox, oy: view.oy } };
  });
  svg.addEventListener('pointermove', e => {
    const p = evPt(e); if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()], m = mul(add(a, b), 0.5);
      view.s = clamp(pinch.s * dist(a, b) / pinch.d, 0.08, 12); view.ox = m.x - pinch.w.x * view.s; view.oy = m.y - pinch.w.y * view.s; schedule(); return;
    }
    if (!down) {
      const touch = e.pointerType === 'touch'; let h = hitPoint(p, touch);
      if (!h && tool !== 'move') h = hitCurves(p, touch)[0] || null;
      if (h !== hoverId) { hoverId = h; schedule(); }
      return;
    }
    if (!down.moved && dist(p, down.p0) > (down.touch ? 8 : 4)) { down.moved = true; if (down.target) { pushUndo(); if (mst) mst.touched = true; } }
    if (down.moved) {
      if (down.target) dragTo(down.target, toW(p));
      else { view.ox = down.view0.ox + p.x - down.p0.x; view.oy = down.view0.oy + p.y - down.p0.y; }
      schedule();
    }
  });
  const endPtr = e => {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; down = null; return; }
    if (!down) return; const d = down; down = null;
    if (!d.moved && e.type === 'pointerup') { if (tool !== 'move' && needOf() && needOf().length) { const id = pickFor(d.p0, d.touch); if (id != null) offer(id); } }
    else if (d.target) changed(false);
  };
  svg.addEventListener('pointerup', endPtr);
  svg.addEventListener('pointercancel', endPtr);
  svg.addEventListener('pointerleave', () => { if (!down && hoverId) { hoverId = null; schedule(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), evPt(e)); }, { passive: false });
  svg.addEventListener('dblclick', e => {
    const id = hitPoint(evPt(e), false); if (!id) return; const o = byId.get(id);
    const n = window.prompt(`Đổi tên điểm ${o.name} thành:`, o.name); if (n == null) return;
    const t = n.trim().slice(0, 6);
    if (!t) return; if (objs.some(x => x !== o && x.name === t)) { say(`Tên “${t}” đã được dùng.`); return; }
    pushUndo(); o.name = t; changed(true);
  });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if (e.key === 'Escape') { slots = slots.map(() => null); setTool('move'); }
  });
  window.addEventListener('resize', schedule);

  document.addEventListener('click', e => {
    const t = e.target.closest('button, [data-id]'); if (!t) return;
    const ds = t.dataset;
    if (ds.tool) { if (ds.tool === 'check') { checkRel = $('#rel').value; } setTool(ds.tool); return; }
    if (ds.tab) { showTab(ds.tab); return; }
    if (ds.mission !== undefined) { loadMission(ds.mission); return; }
    if (ds.anim) { const o = byId.get(+ds.anim); o.anim = !o.anim; if (mst) mst.touched = true; renderList(); startAnim(); return; }
    if (ds.trace) { const o = byId.get(+ds.trace); o.trace = !o.trace; traces.delete(o.id); changed(true); return; }
    if (ds.del) { pushUndo(); removeObj(+ds.del); changed(true); return; }
    if (ds.run) { const c = checks.find(x => x.id === +ds.run); runCheck(c); renderChecks(); if (mission) renderMission(); return; }
    if (ds.rmck) { pushUndo(); checks = checks.filter(x => x.id !== +ds.rmck); if (mst) mst.checkIds = mst.checkIds.filter(i => i !== +ds.rmck); changed(true); return; }
    if (ds.cex || ds.ex) { const c = checks.find(x => x.id === +(ds.cex || ds.ex)); if (c && c.result) applyConfig(ds.cex ? c.result.cex : c.result.ex); return; }
    if (ds.pred !== undefined && mst) { mst.pred = +ds.pred; renderMission(); return; }
    if (ds.id && t.tagName === 'LI') { const id = +ds.id; if (tool !== 'move' && needOf() && needOf().length) offer(id); else { hoverId = id; schedule(); } return; }
    switch (t.id) {
      case 'verify': doVerify(); break;
      case 'moreHint': { const h = mission.hints[mst.hints]; mst.hints++; reveal(h.show); renderMission(); changed(true); break; }
      case 'goalCheck': goalCheck(); break;
      case 'optTrue': optTrue(); break;
      case 'optSet': { pushUndo(); byId.get(mst.refs[mission.optimize.driver]).t = +t.dataset.t; changed(false); break; }
      case 'clearAll': if (window.confirm('Xóa toàn bộ hình trên bảng vẽ tự do?')) { pushUndo(); objs = []; checks = []; reindex(); traces.clear(); changed(true); } break;
      case 'undoBtn': undo(); break;
      case 'gridBtn': opts.grid = !opts.grid; t.classList.toggle('on', opts.grid); schedule(); break;
      case 'axesBtn': opts.axes = !opts.axes; t.classList.toggle('on', opts.axes); schedule(); break;
      case 'clearTr': traces.clear(); schedule(); break;
      case 'zin': { const { W, H } = boardSize(); zoomAt(1.25, { x: W / 2, y: H / 2 }); break; }
      case 'zout': { const { W, H } = boardSize(); zoomAt(0.8, { x: W / 2, y: H / 2 }); break; }
      case 'zfit': fitView(); schedule(); break;
      case 'relGo': checkRel = $('#rel').value; setTool('check'); break;
      case 'saveBtn': {
        const blob = new Blob([serialize()], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = (mission ? mission.id : 'hinh-tu-do') + '.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000); break;
      }
      case 'openBtn': $('#fileIn').click(); break;
      case 'linkBtn': {
        const code = btoa(unescape(encodeURIComponent(serialize())));
        const url = location.href.split('#')[0] + '#hinh=' + code;
        const done = () => say('Đã sao chép liên kết chứa hình vẽ. Ai mở liên kết sẽ thấy đúng hình này.');
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => window.prompt('Sao chép liên kết:', url)); else window.prompt('Sao chép liên kết:', url);
        break;
      }
      case 'themeBtn': {
        const root = document.documentElement;
        const dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
        root.setAttribute('data-theme', dark ? 'light' : 'dark'); store.set('tkt-theme', dark ? 'light' : 'dark'); schedule(); break;
      }
    }
  });
  $('#rel').addEventListener('change', e => { checkRel = e.target.value; if (tool === 'check') setTool('check'); });
  $('#fileIn').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(txt => { const d = JSON.parse(txt); mission = null; mst = null; loadData(d); store.set('hh-tudo', serialize()); loadMission(''); })
      .catch(() => say('Không đọc được tệp hình vẽ.'));
    e.target.value = '';
  });

  // ---------------- Khởi động ----------------
  function init() {
    const t = store.get('tkt-theme'); if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    $('#rel').innerHTML = Object.entries(REL).map(([k, r]) => `<option value="${k}">${esc(r.name)}</option>`).join('');
    const hash = location.hash;
    if (hash.startsWith('#hinh=')) {
      try { const d = JSON.parse(decodeURIComponent(escape(atob(hash.slice(6))))); loadData(d); store.set('hh-tudo', serialize()); }
      catch (e) { /* liên kết hỏng: mở bảng trống */ }
      loadMission('');
    } else if (hash.startsWith('#bai=')) loadMission(hash.slice(5));
    else loadMission(MISSIONS.length ? MISSIONS[0].id : '');
  }

  // Giao diện lập trình cho kiểm thử và cho giáo viên muốn viết thêm bài
  window.HH = {
    get objs() { return objs; }, get checks() { return checks; }, get mission() { return mission; }, get state() { return mst; },
    REL, robustTest, computeAll, loadMission, addCheck, runCheck, setTool, describe, intersections, circum, render, fitView, offer,
    screenOf(id) { const v = computeAll().get(id); return v && v.x !== undefined ? toS(v) : null; },
    toScreen: toS
  };
  init();
})();
