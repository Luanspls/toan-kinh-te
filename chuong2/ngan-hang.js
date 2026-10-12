/* ngan-hang.js — Ngân hàng câu hỏi Chương 2: Quy hoạch tuyến tính và ứng dụng.
   Mỗi câu: id · bai (buổi) · muc (mục CTMH) · cdr (chuẩn đầu ra) · md (mức độ) · loai · on (slide để ôn) · gen(r, H).
   Đáp số tính bằng thư viện qhtt.js (phân số chính xác); câu có số liệu QHTT/vận tải trả thêm _v để bộ kiểm chứng độc lập
   (DongGoi/kiem-thu/qhtt_doc_lap.py — vét cạn phương án cực biên) đối chiếu lại.
   Chuẩn đầu ra (theo CTMH C10.KT06, Chương 2):
     KT5 bài toán QHTT, các dạng, tính chất tập phương án     KN7 lập mô hình QHTT cho bài toán kinh tế
     KT6 phương pháp đồ thị, đơn hình, biến giả               KN8 giải QHTT bằng đồ thị, đơn hình
     KT7 bài toán đối ngẫu, các định lý đối ngẫu              KN9 lập và giải bài toán đối ngẫu, độ lệch bù
     KT8 bài toán vận tải, các dạng đặc biệt                  KN10 giải bài toán vận tải (thế vị)
     NL  diễn giải kết quả tối ưu, giá bóng thành quyết định kinh tế */
(function (K) {
  'use strict';
  const H = K.H, F = H.F;
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const Q = () => ROOT.QH;
  const vx = (n, v) => Array.from({ length: n }, (_, j) => (v || 'x') + '_{' + (j + 1) + '}');
  const OP = { '<=': '\\le', '>=': '\\ge', '=': '=' };
  const num = x => H.num(x);
  const mk = (type, c, rows, signs) => ({ type, c, rows, signs: signs || c.map(() => '>=0') });
  const toLP = p => Q().lpFromArrays(p.type, p.c, p.rows, p.signs);
  const solveP = p => Q().solve(toLP(p));
  const dot = (a, x) => a.reduce((s, v, j) => s + v * x[j], 0);
  function signTex(signs, v) {
    const g = { '>=0': [], '<=0': [], free: [] };
    signs.forEach((s, j) => g[s].push(v[j]));
    const out = [];
    if (g['>=0'].length) out.push(g['>=0'].join(', ') + '\\ge 0');
    if (g['<=0'].length) out.push(g['<=0'].join(', ') + '\\le 0');
    if (g.free.length) out.push(g.free.join(', ') + '\\ \\text{tùy ý}');
    return out.join(';\\ ');
  }
  // Bài toán QHTT dạng TeX (đặt trong $…$)
  function lpTex(p, v, fn) {
    v = v || vx(p.c.length);
    return '\\begin{gathered}' + (fn || 'f') + '=' + H.lin(p.c, v) + '\\to\\' + p.type + '\\\\ \\begin{cases}' +
      p.rows.map(r => H.lin(r[0], v) + ' ' + OP[r[1]] + ' ' + r[2]).join('\\\\ ') + '\\\\ ' + signTex(p.signs, v) + '\\end{cases}\\end{gathered}';
  }
  const consTex = (row, v) => H.lin(row[0], v || vx(row[0].length)) + ' ' + OP[row[1]] + ' ' + row[2];
  // Bảng vận tải: hàng = điểm phát, cột = điểm thu, ô = cước phí
  function tpTex(a, b, C) {
    return '\\begin{array}{c|' + 'c'.repeat(b.length) + '}\\text{Phát}\\backslash\\text{Thu}&' + b.join('&') + '\\\\\\hline ' +
      C.map((row, i) => a[i] + '&' + row.join('&')).join('\\\\ ') + '\\end{array}';
  }
  function planTex(X, C) {
    return '\\begin{array}{|' + 'c|'.repeat(X[0].length) + '}\\hline ' + X.map((row, i) => row.map((x, j) => (x === null ? '\\cdot' : '\\mathbf{' + num(x) + '}') + '\\,{\\scriptstyle(' + C[i][j] + ')}').join('&')).join('\\\\\\hline ') + '\\\\\\hline\\end{array}';
  }
  const mix = (r, pool, k) => { for (let t = 0; t < 50; t++) { const s = r.sample(pool, k); const d = s.filter(x => x.d).length; if (d > 0 && d < k) return s; } return r.sample(pool, k); };

  /* ---------- Bộ sinh bài toán có lời giải đẹp (dựng ngược từ điều kiện tối ưu) ---------- */
  // Bài max 2 biến, ràng buộc "≤", phương án tối ưu nguyên duy nhất tại giao của hai ràng buộc chặt.
  function prod2(r) {
    for (let t = 0; t < 400; t++) {
      const x = [r.int(1, 8), r.int(1, 8)];
      const a1 = [r.int(1, 4), r.int(0, 3)], a2 = [r.int(0, 3), r.int(1, 4)];
      if (a1[0] * a2[1] - a1[1] * a2[0] <= 0) continue;
      const a3 = [r.int(1, 3), r.int(1, 3)]; const s3 = r.int(1, 6);
      const l1 = r.int(1, 3), l2 = r.int(1, 3);
      const c = [l1 * a1[0] + l2 * a2[0], l1 * a1[1] + l2 * a2[1]];
      const rows = r.shuffle([[a1, '<=', dot(a1, x)], [a2, '<=', dot(a2, x)], [a3, '<=', dot(a3, x) + s3]]);
      if (rows.some(rw => rw[2] > 60) || c.some(v => v > 15)) continue;
      const p = mk('max', c, rows); const s = solveP(p);
      if (s.status !== 'toi-uu' || !s.x[0].eq(x[0]) || !s.x[1].eq(x[1])) continue;
      return { p, s, x, f: dot(c, x), y: rows.map(rw => (rw[0] === a1 ? l1 : rw[0] === a2 ? l2 : 0)) };
    }
    throw new Error('prod2');
  }
  // Bài min 2 biến, ràng buộc "≥" hệ số dương (khẩu phần), tối ưu nguyên duy nhất.
  function diet2(r) {
    for (let t = 0; t < 400; t++) {
      const x = [r.int(1, 8), r.int(1, 8)];
      const a1 = [r.int(1, 4), r.int(1, 3)], a2 = [r.int(1, 3), r.int(1, 4)];
      if (a1[0] * a2[1] - a1[1] * a2[0] <= 0) continue;
      const a3 = [r.int(1, 3), r.int(1, 3)]; const s3 = r.int(1, 5);
      const l1 = r.int(1, 3), l2 = r.int(1, 3);
      const c = [l1 * a1[0] + l2 * a2[0], l1 * a1[1] + l2 * a2[1]];
      if (dot(a3, x) - s3 < 1) continue;
      const rows = r.shuffle([[a1, '>=', dot(a1, x)], [a2, '>=', dot(a2, x)], [a3, '>=', dot(a3, x) - s3]]);
      const p = mk('min', c, rows); const s = solveP(p);
      if (s.status !== 'toi-uu' || !s.x[0].eq(x[0]) || !s.x[1].eq(x[1])) continue;
      return { p, s, x, f: dot(c, x) };
    }
    throw new Error('diet2');
  }
  // Bài max 3 biến, 3 ràng buộc "≤" hệ số không âm; nghiệm nguyên, không suy biến (giá bóng duy nhất).
  function prod3(r, opts) {
    opts = opts || {};
    for (let t = 0; t < 2000; t++) {
      const A = Array.from({ length: 3 }, () => [r.int(0, 4), r.int(0, 4), r.int(0, 4)]);
      if (A.some(row => row.every(v => v === 0)) || [0, 1, 2].some(j => A.every(row => row[j] === 0))) continue;
      const b = [r.int(4, 30), r.int(4, 30), r.int(4, 30)]; const c = [r.int(1, 9), r.int(1, 9), r.int(1, 9)];
      const p = mk('max', c, A.map((row, i) => [row, '<=', b[i]])); const s = solveP(p);
      if (s.status !== 'toi-uu' || s.nhieuPA || !s.f.isInt() || !s.x.every(v => v.isInt())) continue;
      const L = s.steps[s.steps.length - 1];
      if (L.x.some(v => v.isZero())) continue;                                   // không suy biến
      if (s.steps.length < 2 || s.steps.length > (opts.maxSteps || 4)) continue;
      const y = [0, 1, 2].map(i => L.d[3 + i].a.neg());                            // giá bóng = −Δ biến phụ (giải −f → min)
      if (opts.yInt && !y.every(v => v.isInt())) continue;
      if (opts.needSlack && !y.some(v => v.isZero())) continue;
      return { p, s, y, f: s.f };
    }
    throw new Error('prod3');
  }
  // Bài min 3 biến, 2 ràng buộc "≥" hệ số dương — cần biến giả; dựng ngược để nghiệm nguyên.
  function diet3(r) {
    for (let t = 0; t < 600; t++) {
      const A = Array.from({ length: 2 }, () => [r.int(1, 5), r.int(1, 5), r.int(1, 5)]);
      const B = r.sample([0, 1, 2], 2).sort(); const N = [0, 1, 2].find(j => B.indexOf(j) < 0);
      const det = A[0][B[0]] * A[1][B[1]] - A[0][B[1]] * A[1][B[0]]; if (det === 0) continue;
      const xb = [r.int(1, 9), r.int(1, 9)]; const x = [0, 0, 0]; x[B[0]] = xb[0]; x[B[1]] = xb[1];
      const b = A.map(row => dot(row, x)); const y = [r.int(1, 4), r.int(1, 4)];
      const c = [0, 1, 2].map(j => y[0] * A[0][j] + y[1] * A[1][j] + (j === N ? r.int(1, 4) : 0));
      if (c.some(v => v > 30) || b.some(v => v > 80)) continue;
      const p = mk('min', c, A.map((row, i) => [row, '>=', b[i]])); const s = solveP(p);
      if (s.status !== 'toi-uu' || !s.x.every((v, j) => v.eq(x[j]))) continue;
      return { p, s, x, f: dot(c, x), y };
    }
    throw new Error('diet3');
  }
  // Bài vận tải cân bằng m×n, cước 1..9
  function tpRand(r, m, n, lo, hi, total) {
    const S = total || r.pick([60, 80, 90, 100, 120]);
    const split = (k, sum) => { for (let t = 0; t < 200; t++) { const cut = r.sample(Array.from({ length: sum / 5 - 1 }, (_, i) => (i + 1) * 5), k - 1).sort((u, v) => u - v); const parts = cut.map((c, i) => c - (i ? cut[i - 1] : 0)).concat([sum - (cut.length ? cut[cut.length - 1] : 0)]); if (parts.every(x => x >= 5)) return parts; } return Array(k).fill(sum / k); };
    const a = split(m, S), b = split(n, S);
    const C = Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(lo || 1, hi || 9)));
    return { a, b, C };
  }
  const tpSolve = (t, sense) => Q().transport(t.a, t.b, t.C, { sense: sense || 'min' });

  /* ===================================================================== BUỔI 1 · MÔ HÌNH, DẠNG, ĐỒ THỊ */
  K.item({ id: 'c2b1.qhtt', bai: 'c2b1', muc: '2.1.1', cdr: 'KT5', md: 'NB', loai: 'mc', on: 'buoi1.html#dinh-nghia',
    gen(r, H) {
      const a = r.int(2, 6), b = r.int(1, 5), c = r.int(2, 9), d = r.int(1, 4);
      const ok = '$f=' + a + 'x_1-' + b + 'x_2\\to\\max$, $\\ ' + d + 'x_1+x_2\\le ' + c + '$, $x_1,x_2\\ge0$';
      return { q: 'Bài toán nào sau đây là bài toán quy hoạch tuyến tính?',
        opts: [ok, '$f=' + a + 'x_1x_2\\to\\max$, $\\ x_1+' + d + 'x_2\\le ' + c + '$, $x_1,x_2\\ge0$', '$f=x_1^2+' + b + 'x_2\\to\\min$, $\\ x_1+x_2\\ge ' + d + '$', '$f=' + a + '\\sqrt{x_1}+x_2\\to\\max$, $\\ x_1\\le ' + c + '$, $x_2\\ge0$'],
        giai: 'Bài toán QHTT: hàm mục tiêu và mọi ràng buộc đều là hàm bậc nhất (tuyến tính) của các biến. Các phương án còn lại có tích $x_1x_2$, bình phương hoặc căn.' };
    } });

  K.item({ id: 'c2b1.bien-phu', bai: 'c2b1', muc: '2.1.2.4', cdr: 'KT5', md: 'NB', loai: 'mc', on: 'buoi1.html#bien-doi',
    gen(r, H) {
      const a = [r.nz(-5, 6), r.nz(-5, 6)], b = r.int(2, 20), le = r.bool(); const L = H.lin(a, ['x_1', 'x_2']);
      const pl = '$' + L + '+x_3=' + b + '$, $x_3\\ge0$', mi = '$' + L + '-x_3=' + b + '$, $x_3\\ge0$';
      return { q: 'Đưa ràng buộc $' + L + (le ? '\\le ' : '\\ge ') + b + '$ về dạng đẳng thức bằng biến phụ $x_3$, ta được',
        opts: [le ? pl : mi, le ? mi : pl, '$' + L + '=' + b + '$', '$' + L + '+x_3=' + b + '$, $x_3\\le0$'],
        giai: 'Ràng buộc "$\\le$" <b>cộng</b> biến phụ, ràng buộc "$\\ge$" <b>trừ</b> biến phụ; biến phụ luôn không âm.' };
    } });

  K.item({ id: 'c2b1.chinh-tac', bai: 'c2b1', muc: '2.1.2.2', cdr: 'KT5', md: 'NB', loai: 'mc', on: 'buoi1.html#dang-bai-toan',
    gen(r, H) {
      const v = vx(3); const row = () => [r.nz(-3, 4), r.nz(-3, 4), r.int(0, 3)]; const R1 = row(), R2 = row(); const b1 = r.int(1, 9), b2 = r.int(1, 9); const c = [r.nz(-4, 5), r.nz(-4, 5), r.int(-3, 3)];
      const sys = (o1, o2, sg) => '$f=' + H.lin(c, v) + '\\to\\min$, $\\ ' + H.lin(R1, v) + o1 + b1 + '$, $\\ ' + H.lin(R2, v) + o2 + b2 + '$, $\\ ' + sg + '$';
      return { q: 'Bài toán nào sau đây ở <b>dạng chính tắc</b>?',
        opts: [sys('=', '=', 'x_1,x_2,x_3\\ge0'), sys('\\le ', '=', 'x_1,x_2,x_3\\ge0'), sys('=', '=', 'x_1,x_3\\ge0,\\ x_2\\ \\text{tùy ý}'), sys('\\ge ', '\\ge ', 'x_1,x_2,x_3\\ge0')],
        giai: 'Dạng chính tắc: mọi ràng buộc chính là <b>đẳng thức</b> và mọi biến <b>không âm</b>.' };
    } });

  K.item({ id: 'c2b1.max-min', bai: 'c2b1', muc: '2.1.2.4', cdr: 'KT5', md: 'NB', loai: 'so', on: 'buoi1.html#bien-doi',
    gen(r) {
      const v = r.nz(-60, 60);
      return { q: 'Để giải bài toán $f\\to\\max$, ta giải bài toán $g=-f\\to\\min$ (cùng ràng buộc) và được $g_{\\min}=' + v + '$. Tìm $f_{\\max}$.', a: -v,
        giai: '$f\\to\\max\\iff g=-f\\to\\min$, cùng phương án tối ưu và $f_{\\max}=-g_{\\min}=' + (-v) + '$.' };
    } });

  K.item({ id: 'c2b1.so-bien', bai: 'c2b1', muc: '2.1.2.4', cdr: 'KN7', md: 'TH', loai: 'so', on: 'buoi1.html#bien-doi',
    gen(r, H) {
      for (;;) {
        const n = r.int(2, 4), m = r.int(2, 3); const v = vx(n);
        const signs = Array.from({ length: n }, () => r.pick(['>=0', '>=0', '<=0', 'free']));
        const ops = Array.from({ length: m }, () => r.pick(['<=', '>=', '=']));
        const rows = ops.map(op => [Array.from({ length: n }, () => r.nz(-4, 5)), op, r.int(1, 15)]);
        const free = signs.filter(s => s === 'free').length, ineq = ops.filter(o => o !== '=').length;
        if (free + ineq === 0) continue;
        const p = mk('min', Array.from({ length: n }, () => r.nz(-5, 6)), rows, signs);
        return { q: 'Đưa bài toán $$' + lpTex(p, v) + '$$ về dạng chính tắc (thay biến $\\le0$ bằng $x\'_j=-x_j$, biến tùy ý bằng $x_j^+-x_j^-$, thêm biến phụ cho mỗi bất đẳng thức). Bài toán dạng chính tắc có bao nhiêu biến?',
          a: n + free + ineq, giai: 'Số biến $=' + n + '$ (biến gốc) $+\\ ' + free + '$ (mỗi biến tùy ý tách thành hai) $+\\ ' + ineq + '$ (biến phụ của các bất đẳng thức) $=' + (n + free + ineq) + '$.' };
      }
    } });

  K.item({ id: 'c2b1.chuan-tac', bai: 'c2b1', muc: '2.1.2.4', cdr: 'KT5', md: 'TH', loai: 'mc', on: 'buoi1.html#bien-doi',
    gen(r, H) {
      const a = [r.nz(-5, 6), r.nz(-5, 6), r.nz(-4, 5)], b = r.nz(-9, 12); const v = vx(3); const isMax = r.bool();
      const L = H.lin(a, v), Ln = H.lin(a.map(x => -x), v);
      const want = isMax ? '$' + Ln + '\\le ' + (-b) + '$' : '$' + L + '\\ge ' + b + '$';
      const op = isMax ? '\\ge ' : '\\le ';
      const right = isMax ? want : '$' + Ln + '\\ge ' + (-b) + '$';
      return { q: 'Bài toán $f\\to\\' + (isMax ? 'max' : 'min') + '$ có ràng buộc $' + L + op + b + '$. Khi đưa về <b>dạng chuẩn tắc</b>, ràng buộc này trở thành',
        opts: [right, '$' + L + '\\le ' + b + '$', '$' + Ln + op + (-b) + '$', '$' + L + (isMax ? '-x_4=' : '+x_4=') + b + '$'],
        giai: 'Dạng chuẩn tắc: bài <b>max</b> chỉ có ràng buộc "$\\le$", bài <b>min</b> chỉ có "$\\ge$" (mọi biến $\\ge0$). Đổi chiều bằng cách nhân hai vế với $-1$: ' + right + '.' };
    } });

  K.item({ id: 'c2b1.mo-hinh-sx', bai: 'c2b1', muc: '2.1.2.1', cdr: 'KN7', md: 'TH', loai: 'mc', on: 'buoi1.html#mo-hinh-san-xuat',
    gen(r, H) {
      const A = [[r.int(1, 5), r.int(1, 5)], [r.int(1, 5), r.int(1, 5)]]; if (A[0][0] === A[1][0] && A[0][1] === A[1][1]) A[1][1]++;
      if (A[0][1] === A[1][0]) A[0][1]++;
      const b = [r.int(20, 90), r.int(20, 90)], c = [r.int(2, 9), r.int(2, 9)]; if (c[0] === c[1]) c[1]++;
      const v = ['x_1', 'x_2'];
      const sys = (cc, AA, op, typ) => '$f=' + H.lin(cc, v) + '\\to\\' + typ + '$; $\\ ' + AA.map((row, i) => H.lin(row, v) + op + b[i]).join(';\\ ') + '$; $x_1,x_2\\ge0$';
      const AT = [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
      return { q: 'Một xưởng sản xuất hai sản phẩm P1, P2 từ hai loại nguyên liệu N1, N2. Mỗi đơn vị P1 cần ' + A[0][0] + ' đơn vị N1 và ' + A[1][0] + ' đơn vị N2; mỗi đơn vị P2 cần ' + A[0][1] + ' đơn vị N1 và ' + A[1][1] + ' đơn vị N2. Hiện có ' + b[0] + ' đơn vị N1 và ' + b[1] + ' đơn vị N2. Lãi mỗi đơn vị P1, P2 lần lượt là ' + c[0] + ' và ' + c[1] + ' (trăm nghìn đồng). Gọi $x_1,x_2$ là số đơn vị P1, P2. Mô hình đúng là',
        opts: [sys(c, A, '\\le ', 'max'), sys(c, AT, '\\le ', 'max'), sys(c, A, '\\ge ', 'max'), sys(c, A, '\\le ', 'min')],
        giai: 'Mỗi nguyên liệu một ràng buộc "lượng dùng $\\le$ lượng có": N1: $' + H.lin(A[0], v) + '\\le ' + b[0] + '$; N2: $' + H.lin(A[1], v) + '\\le ' + b[1] + '$; lãi $f=' + H.lin(c, v) + '\\to\\max$.' };
    } });

  K.item({ id: 'c2b1.mo-hinh-kp', bai: 'c2b1', muc: '2.1.2.1', cdr: 'KN7', md: 'TH', loai: 'mc', on: 'buoi1.html#mo-hinh-khau-phan',
    gen(r, H) {
      const A = [[r.int(1, 6), r.int(1, 6)], [r.int(1, 6), r.int(1, 6)]]; if (A[0][1] === A[1][0]) A[0][1]++;
      const b = [r.int(10, 60), r.int(10, 60)], c = [r.int(5, 30), r.int(5, 30)];
      const v = ['x_1', 'x_2'];
      const sys = (AA, op, typ) => '$f=' + H.lin(c, v) + '\\to\\' + typ + '$; $\\ ' + AA.map((row, i) => H.lin(row, v) + op + b[i]).join(';\\ ') + '$; $x_1,x_2\\ge0$';
      const AT = [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
      return { q: 'Mỗi kg thức ăn T1 chứa ' + A[0][0] + ' đơn vị chất D1 và ' + A[1][0] + ' đơn vị chất D2; mỗi kg T2 chứa ' + A[0][1] + ' đơn vị D1 và ' + A[1][1] + ' đơn vị D2. Khẩu phần cần ít nhất ' + b[0] + ' đơn vị D1 và ' + b[1] + ' đơn vị D2. Giá 1 kg T1, T2 là ' + c[0] + ' và ' + c[1] + ' nghìn đồng. Gọi $x_1,x_2$ là số kg T1, T2 cần mua. Mô hình đúng là',
        opts: [sys(A, '\\ge ', 'min'), sys(A, '\\le ', 'min'), sys(A, '\\ge ', 'max'), sys(AT, '\\ge ', 'min')],
        giai: 'Yêu cầu "ít nhất" cho ràng buộc "$\\ge$", mỗi chất dinh dưỡng một ràng buộc; chi phí $f=' + H.lin(c, v) + '\\to\\min$.' };
    } });

  K.item({ id: 'c2b1.dinh', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KN8', md: 'TH', loai: 'so', on: 'buoi1.html#do-thi',
    gen(r, H) {
      for (;;) {
        const x = [r.int(0, 9), r.int(0, 9)]; const a1 = [r.int(1, 5), r.int(-3, 4)], a2 = [r.int(-3, 4), r.int(1, 5)];
        if (a1[0] * a2[1] - a1[1] * a2[0] === 0) continue;
        const c = [r.nz(-5, 8), r.nz(-5, 8)]; const v = ['x_1', 'x_2'];
        return { q: 'Đỉnh $A$ của miền phương án là giao điểm của hai đường thẳng $' + H.lin(a1, v) + '=' + dot(a1, x) + '$ và $' + H.lin(a2, v) + '=' + dot(a2, x) + '$. Tính giá trị của $f=' + H.lin(c, v) + '$ tại $A$.',
          a: dot(c, x), giai: 'Giải hệ hai phương trình được $A(' + x[0] + ';' + x[1] + ')$, nên $f(A)=' + dot(c, x) + '$.' };
      }
    } });

  K.item({ id: 'c2b1.diem-pa', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KT5', md: 'TH', loai: 'ds', on: 'buoi1.html#do-thi',
    gen(r, H) {
      const P = prod2(r); const v = ['x_1', 'x_2']; const p = P.p;
      const feas = pt => pt.every(t => t >= 0) && p.rows.every(rw => dot(rw[0], pt) <= rw[2]);
      const pool = [];
      for (let t = 0; t < 60 && pool.length < 12; t++) { const pt = [r.int(0, 10), r.int(0, 10)]; pool.push({ t: 'Điểm $(' + pt[0] + ';' + pt[1] + ')$ là một phương án.', d: feas(pt) }); }
      pool.push({ t: 'Điểm $(' + P.x[0] + ';' + P.x[1] + ')$ là một phương án.', d: true }); pool.push({ t: 'Điểm $(-1;' + P.x[1] + ')$ là một phương án.', d: false });
      const uniq = []; const seen = new Set(); pool.forEach(z => { if (!seen.has(z.t)) { seen.add(z.t); uniq.push(z); } });
      return { q: 'Cho bài toán $$' + lpTex(p, v) + '$$. Mỗi khẳng định sau đúng hay sai?', y: mix(r, uniq, 4),
        giai: 'Một điểm là phương án khi thỏa <b>mọi</b> ràng buộc, kể cả $x_1,x_2\\ge0$: thay tọa độ vào từng bất phương trình để kiểm tra.' };
    } });

  K.item({ id: 'c2b1.do-thi-max', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi1.html#do-thi-vd',
    gen(r) {
      const P = prod2(r); const p = P.p;
      return { q: 'Giải bằng phương pháp đồ thị bài toán $$' + lpTex(p) + '$$. Tìm $f_{\\max}$.', a: P.f, _v: { lp: p, hoi: 'f' },
        giai: 'Vẽ miền phương án, tịnh tiến đường mức theo hướng $c=(' + p.c.join(';') + ')$: điểm cuối cùng còn chạm miền là $(' + P.x.join(';') + ')$, $f_{\\max}=' + P.f + '$.' };
    } });

  K.item({ id: 'c2b1.do-thi-min', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi1.html#do-thi',
    gen(r) {
      const P = diet2(r); const p = P.p;
      return { q: 'Giải bằng phương pháp đồ thị bài toán $$' + lpTex(p) + '$$. Tìm $f_{\\min}$.', a: P.f, _v: { lp: p, hoi: 'f' },
        giai: 'Miền phương án không bị chặn (về phía $x_1,x_2$ lớn) nhưng $f$ có hệ số dương nên bị chặn dưới. Tịnh tiến đường mức <b>ngược</b> hướng $c$: tối ưu tại $(' + P.x.join(';') + ')$, $f_{\\min}=' + P.f + '$.' };
    } });

  K.item({ id: 'c2b1.do-thi-x', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi1.html#do-thi-vd',
    gen(r) {
      const P = prod2(r); const p = P.p; const j = r.int(1, 2);
      return { q: 'Bài toán $$' + lpTex(p) + '$$ có phương án tối ưu duy nhất $x^*=(x_1^*;x_2^*)$. Tìm $x_' + j + '^*$.', a: P.x[j - 1], _v: { lp: p, hoi: 'x', j: j - 1 },
        giai: 'Đỉnh tối ưu là giao của hai ràng buộc chặt; giải hệ được $x^*=(' + P.x.join(';') + ')$, $f_{\\max}=' + P.f + '$.' };
    } });

  K.item({ id: 'c2b1.kha-nang', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KT5', md: 'VDC', loai: 'mc', on: 'buoi1.html#ba-kha-nang',
    gen(r, H) {
      const opts = ['Có phương án tối ưu duy nhất', 'Có vô số phương án tối ưu', 'Hàm mục tiêu không bị chặn trên tập phương án', 'Tập phương án rỗng'];
      for (;;) {
        const kind = r.int(0, 3); let p;
        if (kind === 0) p = prod2(r).p;
        else if (kind === 1) { const a = [r.int(1, 4), r.int(1, 4)], k = r.int(1, 3), b = r.int(6, 24); const a2 = [1, 0]; p = mk('max', [k * a[0], k * a[1]], r.shuffle([[a, '<=', b], [a2, '<=', r.int(1, Math.max(1, Math.floor(b / a[0]) - 1))]])); }
        else if (kind === 2) { const k = r.int(2, 4); p = mk('max', [r.int(1, 5), r.int(1, 5)], [[[1, -k], '<=', r.int(1, 6)], [[-1, 1], '<=', r.int(1, 6)]]); }
        else { const a = [r.int(1, 4), r.int(1, 4)], b = r.int(3, 12); p = mk(r.pick(['max', 'min']), [r.nz(-4, 6), r.nz(-4, 6)], r.shuffle([[a, '<=', b], [a, '>=', b + r.int(2, 6)]])); }
        const s = solveP(p);
        const got = s.status === 'vo-nghiem' ? 3 : s.status === 'khong-bi-chan' ? 2 : s.nhieuPA ? 1 : 0;
        if (got !== kind) continue;
        return { q: 'Bài toán $$' + lpTex(p) + '$$ rơi vào trường hợp nào?', opts, keep: true, a: kind, _v: { lp: p, hoi: 'loai', so: kind },
          giai: ['Miền phương án là đa giác; đường mức chạm miền lần cuối tại đúng một đỉnh' + (s.f ? ' ($f_{\\max}=' + num(s.f) + '$)' : '') + '.',
            'Hàm mục tiêu tỉ lệ với vế trái của một ràng buộc chặt: đường mức song song với một cạnh của miền, mọi điểm trên cạnh đó đều tối ưu.',
            'Miền phương án không bị chặn và theo hướng tăng của $f$ luôn còn phương án: $f$ tăng mãi.',
            'Hai ràng buộc có cùng vế trái nhưng đòi vừa $\\le$ vừa $\\ge$ hai số mâu thuẫn ⇒ không có điểm nào thỏa.'][kind] };
      }
    } });

  K.item({ id: 'c2b1.ds-do-thi', bai: 'c2b1', muc: '2.1.2.3', cdr: 'KN8', md: 'VD', loai: 'ds', on: 'buoi1.html#do-thi-vd',
    gen(r, H) {
      const P = prod2(r); const p = P.p;
      const tight = p.rows.map(rw => dot(rw[0], P.x) === rw[2]); const it = tight.indexOf(true), il = tight.indexOf(false);
      const wrongX = [P.x[0] + 1, Math.max(0, P.x[1] - 1)];
      const pool = [
        { t: 'Gốc tọa độ $O(0;0)$ là một phương án.', d: true },
        r.bool() ? { t: 'Phương án tối ưu là $(' + P.x.join(';') + ')$.', d: true } : { t: 'Phương án tối ưu là $(' + wrongX.join(';') + ')$.', d: false },
        r.bool() ? { t: '$f_{\\max}=' + P.f + '$.', d: true } : { t: '$f_{\\max}=' + (P.f + r.pick([1, 2, -1, -2])) + '$.', d: false },
        r.bool() ? { t: 'Tại phương án tối ưu, ràng buộc $' + consTex(p.rows[it]) + '$ thỏa chặt (xảy ra dấu bằng).', d: true } : { t: 'Tại phương án tối ưu, ràng buộc $' + consTex(p.rows[il]) + '$ thỏa chặt (xảy ra dấu bằng).', d: false }
      ];
      return { q: 'Cho bài toán $$' + lpTex(p) + '$$. Mỗi khẳng định sau đúng hay sai?', y: pool, _v: { lp: p, hoi: 'f', so: P.f },
        giai: 'Đỉnh tối ưu $(' + P.x.join(';') + ')$ là giao của hai ràng buộc chặt; $f_{\\max}=' + P.f + '$. Ràng buộc $' + consTex(p.rows[il]) + '$ thỏa lỏng tại đó.' };
    } });

  /* ===================================================================== BUỔI 2 · PACB, ĐƠN HÌNH */
  K.item({ id: 'c2b2.so-duong', bai: 'c2b2', muc: '2.1.3', cdr: 'KT5', md: 'NB', loai: 'so', on: 'buoi2.html#dinh-ly-pacb',
    gen(r) {
      const m = r.int(2, 5), n = m + r.int(2, 4);
      return { q: 'Bài toán QHTT dạng chính tắc có ' + m + ' ràng buộc chính (ma trận ràng buộc có hạng ' + m + ') và ' + n + ' biến. Một phương án cực biên có <b>nhiều nhất</b> bao nhiêu tọa độ dương?', a: m,
        giai: 'Các cột ứng với tọa độ dương của PACB độc lập tuyến tính, mà hạng $A=' + m + '$ nên có nhiều nhất $' + m + '$ tọa độ dương (Hệ quả 2.3).' };
    } });

  K.item({ id: 'c2b2.so-pacb', bai: 'c2b2', muc: '2.1.3', cdr: 'KT5', md: 'TH', loai: 'so', on: 'buoi2.html#dinh-ly-pacb',
    gen(r) {
      const m = r.int(2, 3), n = m + r.int(1, 3); const C = (nn, k) => { let s = 1; for (let i = 0; i < k; i++) s = s * (nn - i) / (i + 1); return Math.round(s); };
      return { q: 'Bài toán dạng chính tắc có ' + m + ' ràng buộc chính (hạng ' + m + ') và ' + n + ' biến. Theo Hệ quả 2.3, số phương án cực biên <b>không vượt quá</b> bao nhiêu? (Cho biết cận trên tổng quát.)', a: C(n, m),
        giai: 'Mỗi PACB ứng với một cơ sở gồm $' + m + '$ trong $' + n + '$ cột, nên số PACB không quá $C_{' + n + '}^{' + m + '}=' + C(n, m) + '$.' };
    } });

  K.item({ id: 'c2b2.pacb-ds', bai: 'c2b2', muc: '2.1.3', cdr: 'KN8', md: 'TH', loai: 'ds', on: 'buoi2.html#pacb-vd',
    gen(r, H) {
      for (;;) {
        const A = [[r.int(1, 3), r.int(-2, 3), r.int(-2, 3), r.int(0, 3)], [r.int(0, 3), r.int(-2, 3), r.int(1, 3), r.int(-2, 3)]];
        const b = [r.int(2, 9), r.int(2, 9)];
        const bs = Q().basicSolutions(H.M(A), b.map(v => F(v))).filter(s => s.x);
        const good = bs.filter(s => s.kha && !s.suyBien), bad = bs.filter(s => !s.kha);
        if (good.length < 2 || bad.length < 1) continue;
        const [g1, g2] = r.sample(good, 2); const mid = g1.x.map((v, j) => v.add(g2.x[j]).div(2));
        if (mid.some(v => v.d > 2)) continue;
        const vt = x => '$(' + x.map(num).join(';') + ')$';
        const pool = [
          { t: vt(g1.x) + ' là phương án cực biên.', d: true },
          { t: vt(g2.x) + ' là phương án cực biên.', d: true },
          { t: vt(mid) + ' là phương án cực biên.', d: false },
          { t: vt(r.pick(bad).x) + ' là phương án cực biên.', d: false }
        ];
        return { q: 'Cho hệ ràng buộc $\\begin{cases}' + A.map((row, i) => H.lin(row, vx(4)) + '=' + b[i]).join('\\\\ ') + '\\\\ x_1,x_2,x_3,x_4\\ge0\\end{cases}$. Mỗi khẳng định sau đúng hay sai?', y: r.shuffle(pool),
          giai: 'PACB: thỏa hệ, không âm, và các cột ứng với tọa độ dương độc lập tuyến tính (tối đa 2 tọa độ dương). ' + vt(mid) + ' là trung điểm của hai PACB nên không là PACB; một nghiệm có tọa độ âm thì không phải phương án.' };
      }
    } });

  K.item({ id: 'c2b2.tim-pacb', bai: 'c2b2', muc: '2.1.3', cdr: 'KN8', md: 'TH', loai: 'so', on: 'buoi2.html#pacb-vd',
    gen(r, H) {
      for (;;) {
        const A = [[r.int(1, 4), r.int(-2, 4), r.int(-2, 4)], [r.int(-2, 4), r.int(1, 4), r.int(-2, 4)]]; const b = [r.int(2, 12), r.int(2, 12)];
        const z = r.int(0, 2); const bs = Q().basicSolutions(H.M(A), b.map(v => F(v))).find(s => s.x && s.B.indexOf(z) < 0);
        if (!bs || !bs.kha || bs.suyBien || bs.x.some(v => v.d > 3)) continue;
        const j = bs.B[r.int(0, 1)];
        return { q: 'Cho hệ $\\begin{cases}' + A.map((row, i) => H.lin(row, vx(3)) + '=' + b[i]).join('\\\\ ') + '\\\\ x_1,x_2,x_3\\ge0\\end{cases}$. Tìm phương án cực biên có $x_' + (z + 1) + '=0$ rồi cho biết giá trị $x_' + (j + 1) + '$.', a: bs.x[j],
          giai: 'Cho $x_' + (z + 1) + '=0$, giải hệ hai phương trình còn lại được $x=(' + bs.x.map(num).join(';') + ')$, không âm nên là PACB; $x_' + (j + 1) + '=' + num(bs.x[j]) + '$.' };
      }
    } });

  // bài toán chuẩn: cơ sở đơn vị x_1..x_m, có hệ số mục tiêu khác 0
  function chuan(r) {
    const m = r.int(2, 3), k = r.int(2, 3), n = m + k;
    const A = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (j < m ? (i === j ? 1 : 0) : r.int(-3, 4))));
    const b = Array.from({ length: m }, () => r.int(1, 12)); const c = Array.from({ length: n }, () => r.int(-4, 5));
    return { m, k, n, A, b, c, p: mk('min', c, A.map((row, i) => [row, '=', b[i]])) };
  }
  K.item({ id: 'c2b2.delta', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'TH', loai: 'so', on: 'buoi2.html#y-tuong',
    gen(r) {
      const P = chuan(r); const j = r.int(P.m, P.n - 1);
      const d = P.A.reduce((s, row, i) => s + P.c[i] * row[j], 0) - P.c[j];
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có cơ sở xuất phát $\\{' + Array.from({ length: P.m }, (_, i) => 'a_' + (i + 1)).join(',') + '\\}$. Tính ước lượng $\\Delta_' + (j + 1) + '$ ở bảng đơn hình đầu tiên.', a: d,
        giai: '$\\Delta_' + (j + 1) + '=\\sum c_it_{i' + (j + 1) + '}-c_' + (j + 1) + '=' + P.A.map((row, i) => '(' + P.c[i] + ')(' + row[j] + ')').join('+') + '-(' + P.c[j] + ')=' + d + '$.' };
    } });

  K.item({ id: 'c2b2.f0', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'NB', loai: 'so', on: 'buoi2.html#bang-don-hinh',
    gen(r) {
      const P = chuan(r); const f = P.b.reduce((s, v, i) => s + P.c[i] * v, 0);
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có PACB xuất phát với cơ sở $\\{' + Array.from({ length: P.m }, (_, i) => 'a_' + (i + 1)).join(',') + '\\}$. Tính giá trị hàm mục tiêu tại PACB đó.', a: f,
        giai: 'PACB xuất phát: biến cơ sở bằng vế phải, biến khác bằng 0. $f=\\sum c_ix_i=' + P.b.map((v, i) => '(' + P.c[i] + ')\\cdot' + v).join('+') + '=' + f + '$.' };
    } });

  K.item({ id: 'c2b2.cot-xoay', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KT6', md: 'NB', loai: 'mc', on: 'buoi2.html#thuat-toan',
    gen(r) {
      for (;;) {
        const d = Array.from({ length: 6 }, () => r.int(-6, 6)); const basis = r.sample([0, 1, 2, 3, 4, 5], 3); basis.forEach(j => { d[j] = 0; });
        const pos = d.map((v, j) => [v, j]).filter(z => z[0] > 0); if (pos.length < 2) continue;
        const mx = Math.max.apply(null, pos.map(z => z[0])); if (pos.filter(z => z[0] === mx).length > 1) continue;
        const k = pos.find(z => z[0] === mx)[1];
        const others = [0, 1, 2, 3, 4, 5].filter(j => j !== k);
        const wr = [pos.find(z => z[1] !== k)[1], d.indexOf(Math.min.apply(null, d)), r.pick(others), r.pick(others)];
        return { q: 'Bài toán min, bảng đơn hình có dòng ước lượng $(\\Delta_1;\\dots;\\Delta_6)=(' + d.join(';') + ')$ và chưa phát hiện cột không bị chặn. Theo quy tắc của giáo trình, véctơ nào được đưa vào cơ sở?',
          opts: H.opts('$a_' + (k + 1) + '$', wr.map(j => '$a_' + (j + 1) + '$'), t => '$a_' + ((t % 6) + 1) + '$'),
          giai: 'Chọn cột có $\\Delta_k$ dương <b>lớn nhất</b>: $\\Delta_' + (k + 1) + '=' + mx + '$ ⇒ đưa $a_' + (k + 1) + '$ vào cơ sở.' };
      }
    } });

  K.item({ id: 'c2b2.hang-xoay', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KT6', md: 'TH', loai: 'mc', on: 'buoi2.html#thuat-toan',
    gen(r) {
      for (;;) {
        const t = [r.int(-3, 5), r.int(-3, 5), r.int(-3, 5)], x = [r.int(1, 20), r.int(1, 20), r.int(1, 20)];
        const R = t.map((v, i) => (v > 0 ? F(x[i]).div(v) : null)); const ok = R.filter(Boolean); if (ok.length < 2) continue;
        const mn = ok.reduce((a, b) => (b.sub(a).n < 0 ? b : a)); if (ok.filter(v => v.eq(mn)).length > 1) continue;
        const i0 = R.findIndex(v => v && v.eq(mn));
        const opt = i => 'Dòng ' + (i + 1) + ' (biến cơ sở thứ ' + (i + 1) + ')';
        return { q: 'Cột xoay $a_k$ có các phần tử $(t_{1k};t_{2k};t_{3k})=(' + t.join(';') + ')$, cột phương án $(x_1;x_2;x_3)=(' + x.join(';') + ')$. Hàng xoay là',
          opts: [opt(i0)].concat([0, 1, 2].filter(i => i !== i0).map(opt), ['Không có — bài toán không bị chặn']),
          giai: 'Chỉ xét $t_{ik}\\gt 0$: ' + R.map((v, i) => (v ? '$\\theta_' + (i + 1) + '=' + x[i] + '/' + t[i] + '=' + num(v) + '$' : null)).filter(Boolean).join(', ') + '. Tỉ số nhỏ nhất ở dòng ' + (i0 + 1) + '.' };
      }
    } });

  K.item({ id: 'c2b2.theta', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'TH', loai: 'so', on: 'buoi2.html#bang-don-hinh',
    gen(r) {
      for (;;) {
        const t = [r.int(-2, 6), r.int(-2, 6), r.int(-2, 6)], x = [r.int(1, 24), r.int(1, 24), r.int(1, 24)];
        const R = t.map((v, i) => (v > 0 ? F(x[i]).div(v) : null)).filter(Boolean); if (R.length < 2) continue;
        const mn = R.reduce((a, b) => (b.sub(a).n < 0 ? b : a));
        return { q: 'Cột xoay có $(t_{1k};t_{2k};t_{3k})=(' + t.join(';') + ')$, cột phương án $(' + x.join(';') + ')$. Tính $\\theta=\\min\\{x_i/t_{ik}:t_{ik}\\gt 0\\}$.', a: mn,
          giai: 'Bỏ các dòng có $t_{ik}\\le0$; tỉ số nhỏ nhất bằng $' + num(mn) + '$.' };
      }
    } });

  K.item({ id: 'c2b2.ket-luan', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KT6', md: 'TH', loai: 'mc', on: 'buoi2.html#y-tuong',
    gen(r) {
      const kind = r.int(0, 2); const n = 5; const d = Array.from({ length: n }, () => r.int(-6, -1)); const B = r.sample([0, 1, 2, 3, 4], 2); B.forEach(j => { d[j] = 0; });
      const N = [0, 1, 2, 3, 4].filter(j => B.indexOf(j) < 0); const k = r.pick(N); let col = [r.int(-4, 4), r.int(-4, 4)];
      if (kind > 0) d[k] = r.int(1, 7);
      if (kind === 1) col = [r.int(-4, 0), r.int(-4, 0)];
      if (kind === 2) col = [r.int(1, 4), r.int(-3, 3)];
      const opts = ['Phương án đang xét là tối ưu', 'Hàm mục tiêu không bị chặn dưới, bài toán không có phương án tối ưu', 'Chưa tối ưu: đưa $a_' + (k + 1) + '$ vào cơ sở và lập bảng mới', 'Bài toán không có phương án'];
      return { q: 'Bài toán min, bảng đơn hình (2 dòng) có $(\\Delta_1;\\dots;\\Delta_5)=(' + d.join(';') + ')$; cột $a_' + (k + 1) + '$ có các phần tử $(' + col.join(';') + ')$. Kết luận đúng là',
        opts: [opts[kind]].concat(opts.filter((_, i) => i !== kind)),
        giai: ['Mọi $\\Delta_j\\le0$ ⇒ tối ưu (Định lý 2.10).', '$\\Delta_' + (k + 1) + '\\gt 0$ mà cột $a_' + (k + 1) + '$ không có phần tử dương ⇒ không bị chặn (Định lý 2.13).', '$\\Delta_' + (k + 1) + '\\gt 0$ và cột có phần tử dương ⇒ xây dựng được PACB tốt hơn (Định lý 2.14).'][kind] };
    } });

  // Bài min 3 biến ràng buộc "≤" (cơ sở biến phụ), nghiệm đẹp
  function minLe3(r) {
    for (let t = 0; t < 2000; t++) {
      const P = prod3(r, { maxSteps: 4 });
      const p = mk('min', P.p.c.map(v => -v), P.p.rows);
      return { p, f: P.f.neg(), s: solveP(p), P };
    }
    throw new Error('minLe3');
  }
  K.item({ id: 'c2b2.f-sau-xoay', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi2.html#bang-don-hinh',
    gen(r) {
      const M = minLe3(r); const s = M.s; const st = s.steps[0], st1 = s.steps[1]; const k = st.pivot.k;
      return { q: 'Giải bài toán $$' + lpTex(M.p) + '$$ bằng phương pháp đơn hình (cơ sở xuất phát là ba biến phụ). Sau <b>lần xoay đầu tiên</b>, giá trị hàm mục tiêu bằng bao nhiêu?', a: st1.f.a,
        giai: 'Bảng I: $f=0$, đưa $a_' + (k + 1) + '$ vào ($\\Delta_' + (k + 1) + '=' + st.d[k].tex() + '$ lớn nhất), $\\theta=' + num(st.pivot.theta) + '$. Giá trị mới $f=0-\\theta\\Delta_' + (k + 1) + '=' + num(st1.f.a) + '$.' };
    } });

  K.item({ id: 'c2b2.giai-min', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi2.html#bt-214a',
    gen(r) {
      const M = minLe3(r);
      return { q: 'Giải bằng phương pháp đơn hình bài toán $$' + lpTex(M.p) + '$$. Tìm $f_{\\min}$.', a: M.f, _v: { lp: M.p, hoi: 'f' },
        giai: 'Thêm ba biến phụ làm cơ sở xuất phát; sau ' + (M.s.steps.length - 1) + ' lần xoay mọi $\\Delta_j\\le0$: $x^*=(' + M.s.x.map(num).join(';') + ')$, $f_{\\min}=' + num(M.f) + '$.' };
    } });

  K.item({ id: 'c2b2.giai-max', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi2.html#vd-max',
    gen(r) {
      const P = prod3(r);
      return { q: 'Giải bằng phương pháp đơn hình bài toán $$' + lpTex(P.p) + '$$. Tìm $f_{\\max}$.', a: P.f, _v: { lp: P.p, hoi: 'f' },
        giai: 'Giải $g=-f\\to\\min$ với cơ sở biến phụ; bảng tối ưu cho $x^*=(' + P.s.x.map(num).join(';') + ')$, $g_{\\min}=' + num(P.f.neg()) + '$ ⇒ $f_{\\max}=' + num(P.f) + '$.' };
    } });

  K.item({ id: 'c2b2.x-toi-uu', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi2.html#vd-max',
    gen(r) {
      const P = prod3(r); const j = r.int(0, 2);
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có phương án tối ưu duy nhất. Tìm $x_' + (j + 1) + '^*$.', a: P.s.x[j], _v: { lp: P.p, hoi: 'x', j },
        giai: 'Đơn hình (giải $-f\\to\\min$): $x^*=(' + P.s.x.map(num).join(';') + ')$, $f_{\\max}=' + num(P.f) + '$.' };
    } });

  K.item({ id: 'c2b2.ds-bang', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KN8', md: 'VD', loai: 'ds', on: 'buoi2.html#bang-don-hinh',
    gen(r) {
      const M = minLe3(r); const st = M.s.steps[0]; const k = st.pivot.k, rr = st.pivot.r; const kk = [0, 1, 2].filter(j => j !== k);
      const dk = st.d[k].a;
      const pool = [
        { t: 'Phương án cực biên xuất phát có $f=0$.', d: true },
        r.bool() ? { t: 'Ở bảng I, $\\Delta_' + (k + 1) + '=' + num(dk) + '$.', d: true } : { t: 'Ở bảng I, $\\Delta_' + (k + 1) + '=' + num(dk.neg()) + '$.', d: false },
        r.bool() ? { t: 'Véctơ đưa vào cơ sở đầu tiên là $a_' + (k + 1) + '$.', d: true } : { t: 'Véctơ đưa vào cơ sở đầu tiên là $a_' + (r.pick(kk) + 1) + '$.', d: false },
        r.bool() ? { t: 'Ở lần xoay đầu, $\\theta=' + num(st.pivot.theta) + '$ và biến phụ của ràng buộc thứ ' + (rr + 1) + ' rời cơ sở.', d: true } : { t: 'Ở lần xoay đầu, $\\theta=' + num(st.pivot.theta.add(1)) + '$.', d: false }
      ];
      return { q: 'Giải bài toán $$' + lpTex(M.p) + '$$ bằng đơn hình, cơ sở xuất phát gồm các biến phụ $x_4,x_5,x_6$. Mỗi khẳng định sau đúng hay sai?', y: pool,
        giai: 'Bảng I: $x=(0;0;0;' + M.p.rows.map(rw => rw[2]).join(';') + ')$, $f=0$, $\\Delta_j=-c_j$ với $j=1,2,3$. Chọn $a_' + (k + 1) + '$ ($\\Delta$ lớn nhất $=' + num(dk) + '$), $\\theta=' + num(st.pivot.theta) + '$ ở dòng ' + (rr + 1) + '.' };
    } });

  K.item({ id: 'c2b2.vo-so', bai: 'c2b2', muc: '2.1.4.2', cdr: 'KT6', md: 'TH', loai: 'mc', on: 'buoi2.html#bt-kha-nang',
    gen(r) {
      const j = r.int(3, 6);
      return { q: 'Bảng đơn hình của bài toán min có mọi $\\Delta_j\\le0$, trong đó biến <b>ngoài cơ sở</b> $x_' + j + '$ có $\\Delta_' + j + '=0$ và cột $a_' + j + '$ có phần tử dương. Kết luận nào đúng?',
        opts: ['Phương án đang xét tối ưu, và bài toán còn phương án tối ưu khác (thường là vô số)', 'Phương án đang xét chưa tối ưu', 'Hàm mục tiêu không bị chặn', 'Bài toán có phương án tối ưu duy nhất'],
        giai: 'Mọi $\\Delta_j\\le0$ ⇒ tối ưu. Đưa $a_' + j + '$ vào cơ sở không làm thay đổi $f$ (vì $\\Delta_' + j + '=0$) ⇒ được PACB tối ưu khác; theo Định lý 2.7 có vô số phương án tối ưu.' };
    } });

  /* ===================================================================== BUỔI 3 · BIẾN GIẢ, LẬP ĐỐI NGẪU */
  K.item({ id: 'c2b3.so-bien-gia', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KT6', md: 'TH', loai: 'so', on: 'buoi3.html#bien-gia',
    gen(r, H) {
      const m = r.int(3, 4); const v = vx(3);
      const rows = Array.from({ length: m }, () => { const op = r.pick(['<=', '>=', '=']); const neg = op !== '=' && r.f() < 0.3; return [[r.int(1, 5), r.int(1, 5), r.int(1, 5)], op, neg ? -r.int(1, 9) : r.int(1, 20)]; });
      const need = rows.filter(rw => rw[1] === '=' || (rw[1] === '>=' && rw[2] > 0) || (rw[1] === '<=' && rw[2] < 0)).length;
      return { q: 'Cho các ràng buộc $\\begin{cases}' + rows.map(rw => consTex(rw, v)).join('\\\\ ') + '\\\\ x_1,x_2,x_3\\ge0\\end{cases}$. Sau khi đưa về dạng chính tắc với vế phải không âm, cần thêm ít nhất bao nhiêu biến giả để có cơ sở đơn vị xuất phát?', a: need,
        giai: 'Ràng buộc "$\\le$" với vế phải dương có biến phụ làm cột đơn vị. Ràng buộc "$\\ge$" với vế phải âm, nhân $-1$ thành "$\\le$" vế phải dương: cũng có sẵn. Còn lại (đẳng thức; "$\\ge$" vế phải dương; "$\\le$" vế phải âm) mỗi dòng cần một biến giả: $' + need + '$ biến giả.' };
    } });

  K.item({ id: 'c2b3.he-so-M', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KT6', md: 'NB', loai: 'mc', on: 'buoi3.html#bien-gia',
    gen(r) {
      const mx = r.bool();
      return { q: 'Khi lập bài toán M cho bài toán <b>' + (mx ? 'max' : 'min') + '</b> (giải trực tiếp, không đổi dấu hàm mục tiêu), biến giả có hệ số trong hàm mục tiêu là',
        opts: mx ? ['$-M$ ($M$ dương rất lớn)', '$M$', '$0$', '$1$'] : ['$M$ ($M$ dương rất lớn)', '$-M$', '$0$', '$1$'],
        giai: 'Biến giả phải bị "phạt": bài min cộng $Mx_{n+i}$, bài max trừ $Mx_{n+i}$ — để phương án tối ưu đẩy biến giả về 0.' };
    } });

  K.item({ id: 'c2b3.so-sanh-M', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KT6', md: 'TH', loai: 'mc', on: 'buoi3.html#bien-gia',
    gen(r) {
      for (;;) {
        const e = Array.from({ length: 4 }, () => [r.int(-30, 30), r.int(-2, 3)]);
        const key = z => z[1] * 1e6 + z[0]; const best = e.reduce((a, b) => (key(b) > key(a) ? b : a));
        if (e.filter(z => key(z) === key(best)).length > 1 || new Set(e.map(key)).size < 4) continue;
        const tx = z => '$' + (z[1] === 0 ? String(z[0]) : (z[0] === 0 ? '' : z[0]) + (z[1] === 1 ? (z[0] === 0 ? '' : '+') + 'M' : z[1] === -1 ? '-M' : (z[1] > 0 && z[0] !== 0 ? '+' : '') + z[1] + 'M')) + '$';
        return { q: 'Bảng đơn hình của bài toán M ($M$ dương rất lớn) có bốn ước lượng dưới đây. Ước lượng nào <b>lớn nhất</b>?', opts: [tx(best)].concat(e.filter(z => z !== best).map(tx)),
          giai: 'So sánh $\\alpha+\\beta M$: xét hệ số $\\beta$ của $M$ trước, chỉ khi $\\beta$ bằng nhau mới so sánh $\\alpha$. Lớn nhất: ' + tx(best) + '.' };
      }
    } });

  K.item({ id: 'c2b3.vo-nghiem', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KT6', md: 'NB', loai: 'mc', on: 'buoi3.html#bien-gia',
    gen(r) {
      const j = r.int(5, 8), v = r.int(1, 9);
      return { q: 'Giải bài toán M, bảng cuối có mọi $\\Delta_j\\le0$ nhưng biến giả $x_' + j + '=' + v + '$ vẫn ở trong cơ sở. Kết luận về bài toán gốc:',
        opts: ['Bài toán gốc không có phương án (tập phương án rỗng)', 'Bài toán gốc có phương án tối ưu chứa $x_' + j + '=' + v + '$', 'Hàm mục tiêu không bị chặn', 'Cần tăng $M$ rồi giải lại'],
        giai: 'Định lý 2.15b: bài toán M tối ưu mà còn biến giả dương ⇒ tập phương án của bài toán gốc rỗng.' };
    } });

  K.item({ id: 'c2b3.beta', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KN8', md: 'TH', loai: 'so', on: 'buoi3.html#vd-212',
    gen(r) {
      const P = diet3(r); const s = P.s; const j = r.int(0, 2);
      return { q: 'Lập bài toán M cho bài toán $$' + lpTex(P.p) + '$$ (trừ biến phụ $x_4,x_5$, thêm biến giả $x_6,x_7$). Ở bảng đơn hình đầu tiên, $\\Delta_' + (j + 1) + '=\\alpha_' + (j + 1) + '+\\beta_' + (j + 1) + 'M$. Tìm $\\beta_' + (j + 1) + '$.', a: s.steps[0].d[j].b,
        giai: '$\\beta_j$ = tổng các phần tử cột $j$ ở những dòng có biến giả (hệ số $M$): $\\beta_' + (j + 1) + '=' + P.p.rows.map(rw => rw[0][j]).join('+') + '=' + num(s.steps[0].d[j].b) + '$.' };
    } });

  K.item({ id: 'c2b3.giai-M', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi3.html#khau-phan',
    gen(r) {
      const P = diet3(r);
      return { q: 'Giải bằng phương pháp đơn hình (biến giả) bài toán $$' + lpTex(P.p) + '$$. Tìm $f_{\\min}$.', a: P.f, _v: { lp: P.p, hoi: 'f' },
        giai: 'Bài toán M với hai biến giả; sau khi các biến giả rời cơ sở và mọi $\\Delta_j\\le0$: $x^*=(' + P.x.join(';') + ')$, $f_{\\min}=' + P.f + '$.' };
    } });

  K.item({ id: 'c2b3.giai-M-x', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KN8', md: 'VDC', loai: 'so', on: 'buoi3.html#khau-phan',
    gen(r) {
      const P = diet3(r); const j = r.int(0, 2);
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có phương án tối ưu duy nhất. Giải bằng phương pháp đơn hình (biến giả) và cho biết $x_' + (j + 1) + '^*$.', a: P.x[j], _v: { lp: P.p, hoi: 'x', j },
        giai: '$x^*=(' + P.x.join(';') + ')$, $f_{\\min}=' + P.f + '$.' };
    } });

  K.item({ id: 'c2b3.giai-M-max', bai: 'c2b3', muc: '2.1.4.3', cdr: 'KN8', md: 'VD', loai: 'so', on: 'buoi3.html#bt-215c',
    gen(r) {
      const P = diet3(r); const p = mk('max', P.p.c.map(v => -v), P.p.rows);
      return { q: 'Giải bằng phương pháp đơn hình bài toán $$' + lpTex(p) + '$$. Tìm $f_{\\max}$.', a: -P.f, _v: { lp: p, hoi: 'f' },
        giai: 'Giải $g=-f=' + H.lin(P.p.c, vx(3)) + '\\to\\min$ bằng bài toán M (hai ràng buộc "$\\ge$" cần hai biến giả): $g_{\\min}=' + P.f + '$ tại $(' + P.x.join(';') + ')$ ⇒ $f_{\\max}=' + (-P.f) + '$.' };
    } });

  K.item({ id: 'c2b3.dau-y', bai: 'c2b3', muc: '2.2.1', cdr: 'KN9', md: 'NB', loai: 'mc', on: 'buoi3.html#lap-dn',
    gen(r) {
      const typ = r.pick(['min', 'max']), op = r.pick(['<=', '>=', '=']); const i = r.int(1, 4);
      const res = op === '=' ? 2 : (typ === 'min') === (op === '>=') ? 0 : 1;
      const o = ['$y_' + i + '\\ge0$', '$y_' + i + '\\le0$', '$y_' + i + '$ tùy ý', '$y_' + i + '=0$'];
      return { q: 'Bài toán gốc $f\\to\\' + typ + '$ có ràng buộc chính thứ ' + i + ' dạng "$' + OP[op] + '$". Trong bài toán đối ngẫu, biến $y_' + i + '$ thỏa',
        opts: [o[res]].concat(o.filter((_, k) => k !== res)),
        giai: 'Bảng 2.11 — mẹo "thuận – thuận": bài min thuận là "$\\ge$", bài max thuận là "$\\le$". Ràng buộc thuận ↔ $y_i\\ge0$, ngược ↔ $y_i\\le0$, đẳng thức ↔ $y_i$ tùy ý.' };
    } });

  K.item({ id: 'c2b3.rb-dn', bai: 'c2b3', muc: '2.2.1', cdr: 'KN9', md: 'TH', loai: 'mc', on: 'buoi3.html#lap-dn',
    gen(r, H) {
      const typ = r.pick(['min', 'max']); const sg = r.pick(['>=0', '<=0', 'free']); const m = 3, n = 3; const j = r.int(0, 2);
      const A = Array.from({ length: m }, () => Array.from({ length: n }, () => r.nz(-4, 5))); const c = Array.from({ length: n }, () => r.nz(-5, 6));
      if (A.every((row, i) => row[j] === A[j][i])) A[(j + 1) % 3][j] += A[(j + 1) % 3][j] === 4 ? -1 : 1;
      const yv = vx(3, 'y'); const colj = A.map(row => row[j]); const rowj = A[j];
      const op = sg === 'free' ? '=' : typ === 'min' ? (sg === '>=0' ? '\\le' : '\\ge') : (sg === '>=0' ? '\\ge' : '\\le');
      const inv = { '\\le': '\\ge', '\\ge': '\\le', '=': '\\le' };
      const f = (co, o) => '$' + H.lin(co, yv) + ' ' + o + ' ' + c[j] + '$';
      return { q: 'Bài toán gốc $f=' + H.lin(c, vx(3)) + '\\to\\' + typ + '$ có ma trận ràng buộc chính $A=' + H.mat(A) + '$ và biến $x_' + (j + 1) + (sg === 'free' ? '$ tùy ý' : sg === '>=0' ? '\\ge0$' : '\\le0$') + '. Ràng buộc thứ ' + (j + 1) + ' của bài toán đối ngẫu (biến $y_1,y_2,y_3$) là',
        opts: [f(colj, op), f(colj, inv[op]), f(rowj, op), f(colj, op === '=' ? '\\ge' : '=')],
        giai: 'Ràng buộc thứ ' + (j + 1) + ' của đối ngẫu dùng <b>cột</b> ' + (j + 1) + ' của $A$ và vế phải $c_' + (j + 1) + '$; dấu theo Bảng 2.11: ' + (sg === 'free' ? 'biến tùy ý ⇒ đẳng thức' : 'bài ' + typ + ', $x_' + (j + 1) + (sg === '>=0' ? '\\ge0' : '\\le0') + '$ ⇒ "$' + op + '$"') + '.' };
    } });

  K.item({ id: 'c2b3.ds-dn', bai: 'c2b3', muc: '2.2.1', cdr: 'KN9', md: 'TH', loai: 'ds', on: 'buoi3.html#vd-214',
    gen(r, H) {
      const typ = r.pick(['min', 'max']); const n = 3, m = 2;
      const rows = Array.from({ length: m }, () => [Array.from({ length: n }, () => r.nz(-4, 5)), r.pick(['<=', '>=', '=']), r.int(1, 12)]);
      const signs = Array.from({ length: n }, () => r.pick(['>=0', '>=0', '<=0', 'free']));
      const p = mk(typ, Array.from({ length: n }, () => r.nz(-5, 6)), rows, signs); const D = Q().dual(toLP(p)); const yv = vx(2, 'y');
      const dRows = D.rows.map(rw => [rw.a.map(x => x.val ? x.val() : +x), rw.op, rw.b.val ? rw.b.val() : +rw.b]);
      const i = r.int(0, 1), j = r.int(0, 2);
      const sgT = s => (s === 'free' ? 'tùy ý' : s === '>=0' ? '$\\ge0$' : '$\\le0$');
      const flip = { '>=0': '<=0', '<=0': '>=0', free: '>=0' };
      const flipOp = { '<=': '>=', '>=': '<=', '=': '<=' };
      const bvals = rows.map(rw => rw[2]);
      const pool = [
        r.bool() ? { t: 'Bài toán đối ngẫu có hàm mục tiêu $g=' + H.lin(bvals, yv) + '\\to\\' + D.type + '$.', d: true } : { t: 'Bài toán đối ngẫu có hàm mục tiêu $g=' + H.lin(bvals, yv) + '\\to\\' + typ + '$.', d: false },
        r.bool() ? { t: 'Biến $y_' + (i + 1) + '$ ' + sgT(D.signs[i]) + '.', d: true } : { t: 'Biến $y_' + (i + 1) + '$ ' + sgT(flip[D.signs[i]]) + '.', d: false },
        r.bool() ? { t: 'Ràng buộc thứ ' + (j + 1) + ' của đối ngẫu: $' + consTex(dRows[j], yv) + '$.', d: true } : { t: 'Ràng buộc thứ ' + (j + 1) + ' của đối ngẫu: $' + consTex([dRows[j][0], flipOp[dRows[j][1]], dRows[j][2]], yv) + '$.', d: false },
        r.bool() ? { t: 'Bài toán đối ngẫu có ' + n + ' ràng buộc chính và ' + m + ' biến.', d: true } : { t: 'Bài toán đối ngẫu có ' + m + ' ràng buộc chính và ' + n + ' biến.', d: false }
      ];
      return { q: 'Cho bài toán gốc $$' + lpTex(p) + '$$. Mỗi khẳng định sau về bài toán đối ngẫu đúng hay sai?', y: pool,
        giai: 'Đối ngẫu: $g=' + H.lin(bvals, yv) + '\\to\\' + D.type + '$; ' + dRows.map((rw, k) => '$' + consTex(rw, yv) + '$').join('; ') + '; ' + D.signs.map((s, k) => '$y_' + (k + 1) + '$ ' + sgT(s)).join(', ') + '.' };
    } });

  K.item({ id: 'c2b3.so-rb-dn', bai: 'c2b3', muc: '2.2.1', cdr: 'KT7', md: 'NB', loai: 'so', on: 'buoi3.html#lap-dn',
    gen(r) {
      const m = r.int(2, 6), n = r.int(2, 7); const ask = r.bool();
      return { q: 'Bài toán gốc có ' + m + ' ràng buộc chính và ' + n + ' biến. Bài toán đối ngẫu có bao nhiêu ' + (ask ? 'biến' : 'ràng buộc chính (không kể ràng buộc dấu)') + '?', a: ask ? m : n,
        giai: 'Mỗi ràng buộc chính của bài gốc ↔ một biến đối ngẫu ($' + m + '$ biến); mỗi biến của bài gốc ↔ một ràng buộc chính của đối ngẫu ($' + n + '$ ràng buộc).' };
    } });

  K.item({ id: 'c2b3.he-so-dn', bai: 'c2b3', muc: '2.2.1', cdr: 'KN9', md: 'TH', loai: 'so', on: 'buoi3.html#lap-dn',
    gen(r, H) {
      const m = 3, n = 3; const A = Array.from({ length: m }, () => Array.from({ length: n }, () => r.nz(-6, 7))); const b = [r.int(1, 20), r.int(1, 20), r.int(1, 20)], c = [r.nz(-9, 9), r.nz(-9, 9), r.nz(-9, 9)];
      const p = mk(r.pick(['min', 'max']), c, A.map((row, i) => [row, r.pick(['<=', '>=', '=']), b[i]]));
      const kind = r.int(0, 2); const i = r.int(0, 2), j = r.int(0, 2);
      const qs = ['hệ số của $y_' + (i + 1) + '$ trong ràng buộc chính thứ ' + (j + 1), 'vế phải của ràng buộc chính thứ ' + (j + 1), 'hệ số của $y_' + (i + 1) + '$ trong hàm mục tiêu'];
      const as = [A[i][j], c[j], b[i]];
      return { q: 'Cho bài toán gốc $$' + lpTex(p) + '$$. Trong bài toán đối ngẫu (biến $y_1,y_2,y_3$ ứng với ba ràng buộc theo thứ tự), tìm ' + qs[kind] + '.', a: as[kind],
        giai: 'Ma trận ràng buộc của đối ngẫu là $A^T$ (ràng buộc thứ $j$ dùng cột $j$ của $A$, vế phải $c_j$); hệ số hàm mục tiêu là vế phải $b_i$. Đáp số: $' + as[kind] + '$.' };
    } });

  /* ===================================================================== BUỔI 4 · ĐỊNH LÝ ĐỐI NGẪU, GIÁ BÓNG */
  K.item({ id: 'c2b4.manh', bai: 'c2b4', muc: '2.2.2', cdr: 'KT7', md: 'NB', loai: 'so', on: 'buoi4.html#dl-yeu-manh',
    gen(r) {
      const v = r.int(-50, 200); const mx = r.bool();
      return { q: 'Bài toán gốc ' + (mx ? 'max' : 'min') + ' có phương án tối ưu với ' + (mx ? '$f_{\\max}' : '$f_{\\min}') + '=' + v + '$. Giá trị tối ưu của bài toán đối ngẫu bằng bao nhiêu?', a: v,
        giai: 'Định lý đối ngẫu mạnh: hai bài toán cùng có phương án tối ưu và giá trị tối ưu bằng nhau: $' + v + '$.' };
    } });

  K.item({ id: 'c2b4.yeu', bai: 'c2b4', muc: '2.2.2', cdr: 'KT7', md: 'TH', loai: 'mc', on: 'buoi4.html#dl-yeu-manh',
    gen(r) {
      const lo = r.int(10, 60), hi = lo + r.int(2, 20);
      return { q: 'Bài toán gốc <b>min</b> có một phương án $x^0$ với $f(x^0)=' + hi + '$; bài toán đối ngẫu có một phương án $y^0$ với $g(y^0)=' + lo + '$. Khẳng định nào chắc chắn đúng?',
        opts: ['$' + lo + '\\le f_{\\min}=g_{\\max}\\le ' + hi + '$', '$f_{\\min}=' + hi + '$', '$g_{\\max}=' + lo + '$', 'Bài toán gốc không bị chặn'],
        giai: 'Cả hai có phương án ⇒ cả hai có tối ưu và $f_{\\min}=g_{\\max}$. Đối ngẫu yếu: $g(y)\\le f(x)$ ⇒ $' + lo + '\\le g_{\\max}=f_{\\min}\\le ' + hi + '$.' };
    } });

  K.item({ id: 'c2b4.ba-th', bai: 'c2b4', muc: '2.2.2', cdr: 'KT7', md: 'TH', loai: 'mc', on: 'buoi4.html#dl-yeu-manh',
    gen(r) {
      const k = r.int(0, 2);
      const q = ['Bài toán gốc có phương án, còn bài toán đối ngẫu <b>không có</b> phương án. Khi đó', 'Hàm mục tiêu của bài toán gốc <b>không bị chặn</b> trên tập phương án. Khi đó', 'Cả bài toán gốc và bài toán đối ngẫu đều có phương án. Khi đó'][k];
      const o = ['hàm mục tiêu của bài toán gốc không bị chặn', 'bài toán đối ngẫu không có phương án', 'cả hai đều có phương án tối ưu và giá trị tối ưu bằng nhau', 'bài toán gốc có phương án tối ưu duy nhất'];
      return { q, opts: [o[k]].concat(o.filter((_, i) => i !== k)),
        giai: 'Chú ý 2.5: chỉ xảy ra một trong ba trường hợp — cả hai không có phương án; cả hai có phương án (⇒ cả hai tối ưu, bằng nhau); một bài có phương án, bài kia không (⇒ bài có phương án không bị chặn).' };
    } });

  K.item({ id: 'c2b4.g-y', bai: 'c2b4', muc: '2.2.2', cdr: 'KN9', md: 'NB', loai: 'so', on: 'buoi4.html#khoi-dong',
    gen(r, H) {
      const P = prod2(r); const y = P.y.map(v => v + r.int(0, 2));
      const g = P.p.rows.reduce((s, rw, i) => s + rw[2] * y[i], 0);
      return { q: 'Bài toán gốc $$' + lpTex(P.p) + '$$. Tính giá trị hàm mục tiêu của bài toán đối ngẫu tại $y=(' + y.join(';') + ')$.', a: g,
        giai: '$g(y)=\\sum b_iy_i=' + P.p.rows.map((rw, i) => rw[2] + '\\cdot' + y[i]).join('+') + '=' + g + '$.' };
    } });

  K.item({ id: 'c2b4.dlb-ds', bai: 'c2b4', muc: '2.2.2', cdr: 'KN9', md: 'VD', loai: 'ds', on: 'buoi4.html#do-lech-bu',
    gen(r) {
      const P = prod3(r, { needSlack: true }); const x = P.s.x, y = P.y; const A = P.p.rows;
      const loose = A.map(rw => F(dot(rw[0], x.map(v => v.val()))).sub(rw[2]).n < 0);
      const iL = loose.indexOf(true); const iT = y.findIndex(v => v.n > 0);
      const jP = x.findIndex(v => v.n > 0), jZ = x.findIndex(v => v.isZero());
      const pool = [
        { t: 'Vì $x_' + (jP + 1) + '^*\\gt 0$ nên ràng buộc thứ ' + (jP + 1) + ' của bài toán đối ngẫu thỏa chặt.', d: true },
        iL >= 0 ? { t: 'Vì ràng buộc thứ ' + (iL + 1) + ' của bài gốc thỏa lỏng tại $x^*$ nên $y_' + (iL + 1) + '^*=0$.', d: true } : null,
        iT >= 0 ? { t: '$y_' + (iT + 1) + '^*=0$.', d: false } : null,
        { t: '$g_{\\min}=' + num(P.f.add(r.pick([1, 2, 3]))) + '$.', d: false },
        { t: '$g_{\\min}=' + num(P.f) + '$.', d: true },
        jZ >= 0 ? { t: 'Vì $x_' + (jZ + 1) + '^*=0$ nên ràng buộc thứ ' + (jZ + 1) + ' của bài toán đối ngẫu chắc chắn thỏa chặt.', d: false } : null
      ].filter(Boolean);
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có phương án tối ưu $x^*=(' + x.map(num).join(';') + ')$. Gọi $y^*$ là phương án tối ưu của bài toán đối ngẫu ($g\\to\\min$). Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: 'Độ lệch bù: $x_j^*\\gt 0$ ⇒ ràng buộc $j$ của đối ngẫu chặt; ràng buộc gốc lỏng ⇒ $y_i^*=0$. Ở đây $y^*=(' + y.map(num).join(';') + ')$, $g_{\\min}=f_{\\max}=' + num(P.f) + '$. Khi $x_j^*=0$, ràng buộc $j$ của đối ngẫu có thể chặt hoặc lỏng.' };
    } });

  K.item({ id: 'c2b4.tim-y', bai: 'c2b4', muc: '2.2.2', cdr: 'KN9', md: 'VD', loai: 'so', on: 'buoi4.html#vd-215',
    gen(r) {
      const P = prod3(r); const i = r.int(0, 2); const D = mk('min', P.p.rows.map(rw => rw[2]), [0, 1, 2].map(j => [P.p.rows.map(rw => rw[0][j]), '>=', P.p.c[j]]));
      return { q: 'Bài toán $$' + lpTex(P.p) + '$$ có phương án tối ưu $x^*=(' + P.s.x.map(num).join(';') + ')$. Dùng định lý độ lệch bù, tìm $y_' + (i + 1) + '^*$ của bài toán đối ngẫu.', a: P.y[i], _v: { lp: D, hoi: 'x', j: i },
        giai: 'Các $x_j^*\\gt 0$ cho ràng buộc đối ngẫu tương ứng chặt; ràng buộc gốc lỏng cho $y_i=0$. Giải hệ: $y^*=(' + P.y.map(num).join(';') + ')$ (cũng đọc được: $y_i^*=-\\Delta$ của biến phụ thứ $i$ ở bảng cuối). Thử lại $g=' + num(P.f) + '=f_{\\max}$.' };
    } });

  K.item({ id: 'c2b4.gia-bong', bai: 'c2b4', muc: '2.2.3', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi4.html#gia-bong',
    gen(r) {
      for (;;) {
        const P = prod3(r); const i = r.int(0, 2);
        const p2 = mk('max', P.p.c, P.p.rows.map((rw, k) => [rw[0], rw[1], rw[2] + (k === i ? 1 : 0)])); const s2 = solveP(p2);
        if (s2.status !== 'toi-uu' || !s2.f.eq(P.f.add(P.y[i]))) continue;
        return { q: 'Một xưởng lập kế hoạch theo bài toán $$' + lpTex(P.p) + '$$ (ràng buộc là ba loại nguyên liệu), được $f_{\\max}=' + num(P.f) + '$ với giá bóng $y^*=(' + P.y.map(num).join(';') + ')$. Nếu lượng nguyên liệu thứ ' + (i + 1) + ' tăng thêm 1 đơn vị (các yếu tố khác giữ nguyên) thì lãi tối ưu mới bằng bao nhiêu?', a: s2.f, _v: { lp: p2, hoi: 'f' },
          giai: 'Trong phạm vi cơ sở tối ưu chưa đổi, lãi tối ưu tăng đúng giá bóng: $' + num(P.f) + '+' + num(P.y[i]) + '=' + num(s2.f) + '$.' };
      }
    } });

  K.item({ id: 'c2b4.doc-bang', bai: 'c2b4', muc: '2.2.3', cdr: 'KN9', md: 'TH', loai: 'so', on: 'buoi4.html#doc-y',
    gen(r) {
      const d = [F(-r.int(0, 12)).div(r.pick([1, 1, 2, 3])), F(-r.int(0, 12)).div(r.pick([1, 2])), F(-r.int(0, 9))]; const i = r.int(0, 2);
      return { q: 'Bài toán sản xuất $f\\to\\max$ với ba ràng buộc "$\\le$" (biến phụ $x_4,x_5,x_6$) được giải bằng đơn hình qua $g=-f\\to\\min$. Bảng cuối có $\\Delta_4=' + num(d[0]) + '$, $\\Delta_5=' + num(d[1]) + '$, $\\Delta_6=' + num(d[2]) + '$. Tìm giá bóng $y_' + (i + 1) + '^*$ của nguồn lực thứ ' + (i + 1) + '.', a: d[i].neg(),
        giai: 'Với bài max có ràng buộc "$\\le$" giải qua $-f\\to\\min$: $y_i^*=-\\Delta$ (biến phụ thứ $i$) $=' + num(d[i].neg()) + '$.' };
    } });

  K.item({ id: 'c2b4.mua-them', bai: 'c2b4', muc: '2.2.3', cdr: 'NL', md: 'VD', loai: 'mc', on: 'buoi4.html#xuong-may',
    gen(r) {
      for (;;) {
        const P = prod3(r); const posI = [0, 1, 2].filter(i => P.y[i].n > 0); if (!posI.length) continue;
        const i0 = r.pick(posI); const price = [0, 1, 2].map(i => (i === i0 ? P.y[i].sub(F(P.y[i].val() > 1 ? 1 : P.y[i].val() / 2)) : P.y[i].add(r.int(1, 4))));
        const o = k => 'Nguyên liệu ' + (k + 1);
        return { q: 'Bài toán sản xuất $$' + lpTex(P.p) + '$$ có giá bóng của ba nguyên liệu $y^*=(' + P.y.map(num).join(';') + ')$. Thị trường bán thêm nguyên liệu với giá lần lượt $' + price.map(num).join(';\\ ') + '$ (cùng đơn vị với lãi). Nên mua thêm (một lượng nhỏ) nguyên liệu nào?',
          opts: [o(i0)].concat([0, 1, 2].filter(k => k !== i0).map(o), ['Không nên mua nguyên liệu nào']),
          giai: 'Chỉ có lợi khi giá mua thấp hơn giá bóng (mức tăng lãi tối ưu trên một đơn vị): chỉ nguyên liệu ' + (i0 + 1) + ' có $' + num(price[i0]) + '\\lt ' + num(P.y[i0]) + '$.' };
      }
    } });

  K.item({ id: 'c2b4.kiem-tra-pa', bai: 'c2b4', muc: '2.2.3', cdr: 'KN9', md: 'VDC', loai: 'ds', on: 'buoi4.html#bt-219',
    gen(r) {
      const P = prod2(r); const vs = Q().vertices(toLP(P.p)).map(v => v.p).filter(v => !(v[0].eq(P.x[0]) && v[1].eq(P.x[1])));
      const other = r.pick(vs.filter(v => v.every(z => z.isInt())).length ? vs.filter(v => v.every(z => z.isInt())) : vs);
      const yW = P.y.map((v, i) => (i === P.y.indexOf(0) ? 1 : v));
      const pool = [
        { t: '$(' + P.x.join(';') + ')$ là phương án tối ưu.', d: true },
        { t: '$(' + other.map(num).join(';') + ')$ là phương án tối ưu.', d: false },
        { t: '$y=(' + P.y.join(';') + ')$ là phương án tối ưu của bài toán đối ngẫu.', d: true },
        { t: '$y=(' + yW.join(';') + ')$ là phương án tối ưu của bài toán đối ngẫu.', d: false }
      ];
      return { q: 'Cho bài toán $$' + lpTex(P.p) + '$$. Mỗi khẳng định sau đúng hay sai? (Gợi ý: dùng đối ngẫu để kiểm tra.)', y: pool,
        giai: '$y=(' + P.y.join(';') + ')$ thỏa mọi ràng buộc đối ngẫu và $g=' + P.f + '=f(' + P.x.join(';') + ')$ ⇒ cả hai tối ưu (Hệ quả 2.6). Đỉnh còn lại cho $f$ nhỏ hơn. Ràng buộc gốc thỏa lỏng phải có $y_i=0$.' };
    } });

  K.item({ id: 'c2b4.y-nghia', bai: 'c2b4', muc: '2.2.3', cdr: 'NL', md: 'TH', loai: 'mc', on: 'buoi4.html#gia-bong',
    gen(r) {
      const v = r.int(2, 20), i = r.int(1, 3);
      return { q: 'Trong bài toán lập kế hoạch sản xuất (max lãi, ràng buộc nguyên liệu "$\\le$"), giá bóng của nguyên liệu ' + i + ' là $y_' + i + '^*=' + v + '$. Ý nghĩa đúng là',
        opts: ['Tăng thêm 1 đơn vị nguyên liệu ' + i + ' thì lãi tối ưu tăng khoảng ' + v + ' (trong phạm vi nhỏ)', 'Nguyên liệu ' + i + ' còn thừa ' + v + ' đơn vị', 'Giá thị trường của nguyên liệu ' + i + ' là ' + v, 'Phải dùng đúng ' + v + ' đơn vị nguyên liệu ' + i],
        giai: 'Giá bóng là giá trị biên của nguồn lực: mức tăng của lãi tối ưu khi nguồn lực tăng 1 đơn vị (khi cơ sở tối ưu chưa đổi). Nguyên liệu còn thừa có giá bóng 0.' };
    } });

  /* ===================================================================== BUỔI 5 · BÀI TOÁN VẬN TẢI */
  K.item({ id: 'c2b5.so-o', bai: 'c2b5', muc: '2.3.1', cdr: 'KT8', md: 'NB', loai: 'so', on: 'buoi5.html#o-chon',
    gen(r) {
      const m = r.int(2, 6), n = r.int(2, 7);
      return { q: 'Bài toán vận tải cân bằng có ' + m + ' điểm phát và ' + n + ' điểm thu. Một phương án cực biên không suy biến có bao nhiêu ô chọn?', a: m + n - 1,
        giai: 'Hạng ma trận ràng buộc bằng $m+n-1$ ⇒ PACB không suy biến có $' + m + '+' + n + '-1=' + (m + n - 1) + '$ ô chọn.' };
    } });

  K.item({ id: 'c2b5.can-bang', bai: 'c2b5', muc: '2.3.1', cdr: 'KT8', md: 'NB', loai: 'mc', on: 'buoi5.html#mo-hinh-vt',
    gen(r) {
      const a = [r.int(2, 9) * 10, r.int(2, 9) * 10, r.int(2, 9) * 10], b = [r.int(2, 9) * 10, r.int(2, 9) * 10];
      const SA = a[0] + a[1] + a[2], SB = b[0] + b[1]; if (SA === SB) b[1] += 10;
      const sb = b[0] + b[1], d = Math.abs(SA - sb);
      const o = ['Thêm điểm thu giả nhận ' + d + ' đơn vị, cước phí 0', 'Thêm điểm phát giả phát ' + d + ' đơn vị, cước phí 0', 'Thêm điểm thu giả nhận ' + d + ' đơn vị, cước phí $M$', 'Bớt đều lượng phát của các kho cho cân bằng'];
      const k = SA > sb ? 0 : 1;
      return { q: 'Ba kho có lượng hàng $' + a.join(';\\ ') + '$; hai cửa hàng cần $' + b.join(';\\ ') + '$. Để đưa về bài toán vận tải cân bằng, ta',
        opts: [o[k]].concat(o.filter((_, i) => i !== k)),
        giai: 'Tổng phát $' + SA + '$, tổng thu $' + sb + '$. ' + (SA > sb ? 'Phát &gt; thu ⇒ thêm điểm <b>thu</b> giả (tồn kho)' : 'Phát &lt; thu ⇒ thêm điểm <b>phát</b> giả (ghi nợ)') + ' với lượng $' + d + '$, cước phí 0.' };
    } });

  K.item({ id: 'c2b5.o-dau', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#pa-xuat-phat',
    gen(r) {
      for (;;) {
        const t = tpRand(r, 3, 3, 1, 9); const flat = [].concat.apply([], t.C); const mn = Math.min.apply(null, flat); if (flat.filter(v => v === mn).length > 1) continue;
        const k = flat.indexOf(mn), i = Math.floor(k / 3), j = k % 3;
        return { q: 'Bài toán vận tải $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Theo phương pháp cước phí nhỏ nhất, ô được phân phối đầu tiên nhận bao nhiêu đơn vị hàng?', a: Math.min(t.a[i], t.b[j]),
          giai: 'Ô cước nhỏ nhất là $(' + (i + 1) + ',' + (j + 1) + ')$ với $c=' + mn + '$; phân phối tối đa $\\min\\{' + t.a[i] + ';' + t.b[j] + '\\}=' + Math.min(t.a[i], t.b[j]) + '$.' };
      }
    } });

  K.item({ id: 'c2b5.f-dau', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'VD', loai: 'so', on: 'buoi5.html#vd-221',
    gen(r) {
      for (;;) {
        const t = tpRand(r, 3, r.int(3, 4), 1, 9); const flat = [].concat.apply([], t.C);
        if (new Set(flat).size < flat.length - 1) continue;                 // tránh hòa nhiều khi chọn ô
        const R = tpSolve(t); const f0 = R.steps[0].f.a;
        return { q: 'Bài toán vận tải $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Lập phương án xuất phát bằng phương pháp <b>cước phí nhỏ nhất</b> và tính tổng chi phí của phương án đó.', a: f0,
          giai: 'Thứ tự phân phối: ' + R.init.map(z => '$x_{' + (z[0] + 1) + (z[1] + 1) + '}=' + num(z[2]) + '$').join(', ') + '. Tổng chi phí $=' + num(f0) + '$.' };
      }
    } });

  K.item({ id: 'c2b5.vogel', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#pa-xuat-phat',
    gen(r) {
      const t = tpRand(r, 3, 4, 1, 12); const i = r.int(0, 2); const row = t.C[i].slice().sort((u, v) => u - v);
      return { q: 'Bảng cước phí $$' + tpTex(t.a, t.b, t.C) + '$$. Theo phương pháp Vogel, tính <b>chênh lệch</b> của hàng ' + (i + 1) + ' ở bước đầu tiên.', a: row[1] - row[0],
        giai: 'Chênh lệch = cước nhỏ nhì − cước nhỏ nhất trên hàng: $' + row[1] + '-' + row[0] + '=' + (row[1] - row[0]) + '$.' };
    } });

  K.item({ id: 'c2b5.the-vi', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#the-vi',
    gen(r) {
      for (;;) {
        const t = tpRand(r, 3, 3, 1, 9); const R = tpSolve(t); const st = R.steps[0];
        if (st.u.some(u => !u) || st.v.some(v => !v)) continue;
        const ask = r.bool() ? ['v', r.int(0, 2)] : ['u', r.int(1, 2)]; const val = (ask[0] === 'u' ? st.u : st.v)[ask[1]].a;
        return { q: 'Bài toán vận tải có phương án cực biên (số in đậm là lượng hàng ở ô chọn, số trong ngoặc là cước phí): $$' + planTex(st.X, t.C) + '$$. Chọn $u_1=0$ và giải $u_i+v_j=c_{ij}$ tại các ô chọn. Tìm $' + ask[0] + '_' + (ask[1] + 1) + '$.', a: val,
          giai: 'Từ $u_1=0$ lần lượt suy ra: $u=(' + st.u.map(x => x.tex()).join(';') + ')$, $v=(' + st.v.map(x => x.tex()).join(';') + ')$.' };
      }
    } });

  K.item({ id: 'c2b5.uoc-luong', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#the-vi',
    gen(r) {
      const u = r.int(-6, 6), v = r.int(-2, 12), c = r.int(1, 12); const i = r.int(1, 4), j = r.int(1, 5);
      return { q: 'Trong phương pháp thế vị (bài toán min), ô loại $(' + i + ',' + j + ')$ có cước $c_{' + i + j + '}=' + c + '$, các thế vị $u_' + i + '=' + u + '$, $v_' + j + '=' + v + '$. Tính ước lượng $\\Delta_{' + i + j + '}$.', a: u + v - c,
        giai: '$\\Delta_{ij}=u_i+v_j-c_{ij}=' + u + '+' + v + '-' + c + '=' + (u + v - c) + '$' + (u + v - c > 0 ? ' — dương, phương án chưa tối ưu.' : '.') };
    } });

  K.item({ id: 'c2b5.theta', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#the-vi',
    gen(r) {
      const L = r.pick([4, 6]); const xs = Array.from({ length: L - 1 }, () => r.int(1, 40)) ;
      const minus = xs.filter((_, k) => k % 2 === 0);
      const cells = ['(+)\\ \\text{ô đưa vào}'].concat(xs.map((x, k) => (k % 2 === 0 ? '(-)\\ ' : '(+)\\ ') + x));
      return { q: 'Chu trình xuất phát từ ô đưa vào gồm ' + L + ' ô, đánh dấu xen kẽ và lượng hàng hiện có: $' + cells.join(';\\ ') + '$. Tính lượng điều chỉnh $\\theta$.', a: Math.min.apply(null, minus),
        giai: '$\\theta$ = lượng hàng nhỏ nhất ở các ô mang dấu "$-$": $\\min\\{' + minus.join(';') + '\\}=' + Math.min.apply(null, minus) + '$.' };
    } });

  K.item({ id: 'c2b5.f-moi', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'TH', loai: 'so', on: 'buoi5.html#the-vi',
    gen(r) {
      const f = r.int(200, 900), th = r.int(1, 30), d = r.int(1, 8);
      return { q: 'Phương án vận chuyển hiện có chi phí $' + f + '$. Đưa ô có $\\Delta=' + d + '$ vào, lượng điều chỉnh $\\theta=' + th + '$. Chi phí của phương án mới bằng bao nhiêu?', a: f - th * d,
        giai: 'Định lý 2.30: $f(x^1)=f(x^0)-\\theta\\Delta_{rk}=' + f + '-' + th + '\\cdot' + d + '=' + (f - th * d) + '$.' };
    } });

  K.item({ id: 'c2b5.toi-uu', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'VD', loai: 'so', on: 'buoi5.html#vd-223',
    gen(r) {
      const t = tpRand(r, 3, r.int(3, 4), 1, 9); const R = tpSolve(t);
      return { q: 'Giải bài toán vận tải $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Tìm chi phí vận chuyển nhỏ nhất.', a: R.f.a, _v: { tp: { a: t.a, b: t.b, C: t.C, sense: 'min' }, hoi: 'f' },
        giai: 'Phương án xuất phát (cước phí nhỏ nhất) có chi phí $' + num(R.steps[0].f.a) + '$; sau ' + (R.steps.length - 1) + ' vòng thế vị mọi $\\Delta_{ij}\\le0$: $f_{\\min}=' + num(R.f.a) + '$.' };
    } });

  K.item({ id: 'c2b5.ds', bai: 'c2b5', muc: '2.3.2', cdr: 'KN10', md: 'VD', loai: 'ds', on: 'buoi5.html#vd-221',
    gen(r) {
      const n = r.int(3, 4); const t = tpRand(r, 3, n, 1, 9); const R = tpSolve(t); const f0 = R.steps[0].f.a, f = R.f.a; const opt0 = R.steps.length === 1;
      const pool = [
        r.bool() ? { t: 'Phương án cực biên không suy biến có ' + (2 + n) + ' ô chọn.', d: true } : { t: 'Phương án cực biên không suy biến có ' + (3 * n) + ' ô chọn.', d: false },
        r.bool() ? { t: 'Phương án xuất phát theo phương pháp cước phí nhỏ nhất có chi phí ' + num(f0) + '.', d: true } : { t: 'Phương án xuất phát theo phương pháp cước phí nhỏ nhất có chi phí ' + num(f0.add(r.pick([5, 10, -5]))) + '.', d: false },
        { t: 'Phương án xuất phát đó đã là phương án tối ưu.', d: opt0 },
        r.bool() ? { t: 'Chi phí vận chuyển nhỏ nhất bằng ' + num(f) + '.', d: true } : { t: 'Chi phí vận chuyển nhỏ nhất bằng ' + num(f.add(r.pick([5, 10, 15]))) + '.', d: false }
      ];
      return { q: 'Cho bài toán vận tải $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Mỗi khẳng định sau đúng hay sai?', y: pool, _v: { tp: { a: t.a, b: t.b, C: t.C, sense: 'min' }, hoi: 'f', so: f },
        giai: 'Cân bằng thu phát; $m+n-1=' + (2 + n) + '$. Cước phí nhỏ nhất cho phương án chi phí $' + num(f0) + '$; ' + (opt0 ? 'mọi $\\Delta\\le0$ ngay ⇒ đã tối ưu.' : 'thế vị ' + (R.steps.length - 1) + ' vòng tới $f_{\\min}=' + num(f) + '$.') };
    } });

  K.item({ id: 'c2b5.chu-trinh', bai: 'c2b5', muc: '2.3.1', cdr: 'KT8', md: 'NB', loai: 'mc', on: 'buoi5.html#o-chon',
    gen(r) {
      const k = r.int(0, 1);
      const qs = ['Số ô của một chu trình trong bảng vận tải', 'Thêm một ô loại vào tập $m+n-1$ ô chọn của một PACB thì'];
      const os = [['luôn là số chẵn, không nhỏ hơn 4', 'luôn bằng 4', 'có thể là số lẻ', 'bằng $m+n-1$'], ['tạo ra đúng một chu trình', 'không tạo chu trình nào', 'tạo ra nhiều chu trình', 'tập ô chọn vẫn là cơ sở của một PACB']];
      return { q: qs[k] + ':', opts: os[k],
        giai: k === 0 ? 'Mỗi hàng, cột mà chu trình đi qua có đúng hai ô ⇒ số ô chẵn, ít nhất 4 (Nhận xét 2.1).' : 'Định lý 2.28: $G\\cup\\{(p,q)\\}$ chứa một chu trình duy nhất — chính là chu trình dùng để điều chỉnh phương án.' };
    } });

  /* ===================================================================== BUỔI 6 · VẬN TẢI ĐẶC BIỆT, ÔN TẬP */
  K.item({ id: 'c2b6.luong-gia', bai: 'c2b6', muc: '2.3.3', cdr: 'KT8', md: 'NB', loai: 'so', on: 'buoi6.html#khong-can-bang',
    gen(r) {
      const a = [r.int(2, 9) * 10, r.int(2, 9) * 10], b = [r.int(1, 6) * 10, r.int(1, 6) * 10, r.int(1, 6) * 10];
      let SA = a[0] + a[1], SB = b[0] + b[1] + b[2]; if (SA === SB) { a[0] += 10; SA += 10; }
      return { q: 'Hai kho có $' + a.join(';\\ ') + '$ tấn hàng; ba cửa hàng cần $' + b.join(';\\ ') + '$ tấn. Điểm ' + (SA > SB ? 'thu' : 'phát') + ' giả cần thêm có lượng hàng bao nhiêu tấn?', a: Math.abs(SA - SB),
        giai: '$|\\sum a_i-\\sum b_j|=|' + SA + '-' + SB + '|=' + Math.abs(SA - SB) + '$.' };
    } });

  K.item({ id: 'c2b6.y-nghia-gia', bai: 'c2b6', muc: '2.3.3', cdr: 'NL', md: 'TH', loai: 'mc', on: 'buoi6.html#khong-can-bang',
    gen(r) {
      const phat = r.bool(); const q = r.int(2, 30), j = r.int(1, 4);
      return { q: 'Phương án tối ưu của bài toán vận tải (đã thêm điểm ' + (phat ? 'phát' : 'thu') + ' giả) có ' + (phat ? 'điểm phát giả "giao" ' + q + ' đơn vị cho cửa hàng ' + j : 'kho ' + j + ' "giao" ' + q + ' đơn vị cho điểm thu giả') + '. Ý nghĩa là',
        opts: phat ? ['Cửa hàng ' + j + ' bị thiếu ' + q + ' đơn vị hàng', 'Kho ' + j + ' còn tồn ' + q + ' đơn vị', 'Cửa hàng ' + j + ' nhận thừa ' + q + ' đơn vị', 'Chi phí tăng thêm ' + q] : ['Kho ' + j + ' còn tồn ' + q + ' đơn vị hàng chưa chuyển đi', 'Cửa hàng ' + j + ' bị thiếu ' + q + ' đơn vị', 'Kho ' + j + ' phải mua thêm ' + q + ' đơn vị', 'Chi phí tăng thêm ' + q],
        giai: phat ? 'Điểm phát giả là "ghi nợ": lượng nó "giao" cho cửa hàng chính là nhu cầu không được đáp ứng.' : 'Điểm thu giả là "tồn kho": lượng kho giao cho nó là hàng còn lại trong kho.' };
    } });

  K.item({ id: 'c2b6.o-cam', bai: 'c2b6', muc: '2.3.3', cdr: 'KT8', md: 'NB', loai: 'mc', on: 'buoi6.html#o-cam',
    gen(r) {
      const mx = r.bool();
      return { q: 'Trong bài toán ' + (mx ? 'phân phối (max năng suất)' : 'vận tải (min chi phí)') + ', tuyến $(i,j)$ bị cấm. Ta ghi vào ô $(i,j)$',
        opts: mx ? ['năng suất $-M$ ($M$ dương rất lớn)', 'năng suất $M$', 'năng suất $0$', 'lượng hàng $x_{ij}=0$ và giữ năng suất cũ'] : ['cước phí $M$ ($M$ dương rất lớn)', 'cước phí $-M$', 'cước phí $0$', 'lượng hàng $x_{ij}=0$ và giữ cước cũ'],
        giai: 'Ô cấm được "phạt" để phương án tối ưu không dùng: bài min cước $M$, bài max năng suất $-M$.' };
    } });

  K.item({ id: 'c2b6.dau-hieu-max', bai: 'c2b6', muc: '2.3.3', cdr: 'KT8', md: 'NB', loai: 'mc', on: 'buoi6.html#phan-phoi',
    gen(r) {
      return { q: 'Giải bài toán phân phối (max) bằng phương pháp thế vị với $\\Delta_{ij}=u_i+v_j-c_{ij}$. Phương án đang xét là tối ưu khi',
        opts: ['mọi $\\Delta_{ij}\\ge0$', 'mọi $\\Delta_{ij}\\le0$', 'mọi $\\Delta_{ij}=0$', 'có ít nhất một $\\Delta_{ij}\\gt 0$'],
        giai: 'Bài max đổi chiều so với bài min: tối ưu khi mọi $\\Delta_{ij}\\ge0$; nếu còn $\\Delta\\lt 0$ thì đưa ô có $\\Delta$ âm nhất vào.' };
    } });

  K.item({ id: 'c2b6.khong-can-bang', bai: 'c2b6', muc: '2.3.3', cdr: 'KN10', md: 'VD', loai: 'so', on: 'buoi6.html#khong-can-bang',
    gen(r) {
      const t = tpRand(r, 2, 3, 1, 9, r.pick([60, 80, 100])); const k = r.int(0, 1); const d = r.pick([10, 20]);
      if (r.bool()) t.a[k] += d; else t.b[r.int(0, 2)] += d;
      const R = tpSolve(t);
      return { q: 'Giải bài toán vận tải (không cân bằng thu phát) $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Tìm chi phí vận chuyển nhỏ nhất.', a: R.f.a, _v: { tp: { a: t.a, b: t.b, C: t.C, sense: 'min' }, hoi: 'f' },
        giai: 'Thêm điểm ' + (R.dummy && R.dummy.row !== undefined ? 'phát' : 'thu') + ' giả $' + d + '$ đơn vị, cước 0; giải bằng thế vị: $f_{\\min}=' + num(R.f.a) + '$.' };
    } });

  K.item({ id: 'c2b6.phan-phoi', bai: 'c2b6', muc: '2.3.3', cdr: 'KN10', md: 'VD', loai: 'so', on: 'buoi6.html#phan-phoi',
    gen(r) {
      const t = tpRand(r, 3, 3, 1, 9, r.pick([30, 45, 60])); const R = tpSolve(t, 'max');
      return { q: 'Phân công lao động: ba nhóm có $' + t.a.join(';\\ ') + '$ người, ba công việc cần $' + t.b.join(';\\ ') + '$ người, năng suất một người (nhóm $i$, việc $j$) cho trong bảng $$' + tpTex(t.a, t.b, t.C) + '$$. Tìm tổng năng suất lớn nhất.', a: R.f.a, _v: { tp: { a: t.a, b: t.b, C: t.C, sense: 'max' }, hoi: 'f' },
        giai: 'Bài toán phân phối (max): phương án xuất phát chọn ô năng suất lớn nhất, thế vị đến khi mọi $\\Delta_{ij}\\ge0$: $f_{\\max}=' + num(R.f.a) + '$.' };
    } });

  K.item({ id: 'c2b6.o-cam-giai', bai: 'c2b6', muc: '2.3.3', cdr: 'KN10', md: 'VDC', loai: 'so', on: 'buoi6.html#o-cam',
    gen(r) {
      for (;;) {
        const t = tpRand(r, 3, 3, 1, 9); const i = r.int(0, 2), j = r.int(0, 2); const C = t.C.map(row => row.slice()); C[i][j] = 'M';
        const R = Q().transport(t.a, t.b, C, { sense: 'min' }); if (!R.feasible || R.f.hasM()) continue;
        const show = C.map(row => row.map(v => (v === 'M' ? '\\times' : v)));
        return { q: 'Bài toán vận tải $$' + tpTex(t.a, t.b, show) + '$$ (ô ghi cước phí; ô $\\times$ là tuyến bị cấm). Tìm chi phí vận chuyển nhỏ nhất.', a: R.f.a, _v: { tp: { a: t.a, b: t.b, C, sense: 'min' }, hoi: 'f' },
          giai: 'Ghi cước $M$ vào ô cấm $(' + (i + 1) + ',' + (j + 1) + ')$ rồi giải như thường; phương án tối ưu không dùng ô cấm: $f_{\\min}=' + num(R.f.a) + '$.' };
      }
    } });

  K.item({ id: 'c2b6.phuong-phap', bai: 'c2b6', muc: '2.1 – 2.3', cdr: 'KT6', md: 'NB', loai: 'mc', on: 'buoi6.html#so-do',
    gen(r) {
      const T = [
        ['Bài toán QHTT chỉ có 2 biến, cần minh họa trực quan', 'Phương pháp đồ thị'],
        ['Bài toán dạng chính tắc không có sẵn cơ sở đơn vị', 'Phương pháp biến giả (bài toán M)'],
        ['Biết phương án tối ưu của bài gốc, cần tìm phương án tối ưu của bài đối ngẫu', 'Định lý độ lệch bù'],
        ['Bài toán vận tải cân bằng, đã có phương án cực biên xuất phát', 'Phương pháp thế vị']
      ];
      const k = r.int(0, 3);
      return { q: 'Tình huống: ' + T[k][0] + '. Công cụ phù hợp nhất là', opts: [T[k][1]].concat(T.filter((_, i) => i !== k).map(z => z[1])),
        giai: 'Đồ thị cho 2 biến; biến giả khi thiếu cơ sở đơn vị; độ lệch bù để suy $y^*$ từ $x^*$; thế vị cho bài toán vận tải.' };
    } });

  K.item({ id: 'c2b6.ds-tong-hop', bai: 'c2b6', muc: '2.1 – 2.3', cdr: 'KT7', md: 'TH', loai: 'ds', on: 'buoi6.html#sai-lam',
    gen(r) {
      const pool = [
        { t: 'Nếu bài toán QHTT có phương án tối ưu thì có ít nhất một phương án cực biên tối ưu.', d: true },
        { t: 'Bài toán QHTT có hai phương án tối ưu khác nhau thì có vô số phương án tối ưu.', d: true },
        { t: 'Bài toán vận tải cân bằng thu phát luôn có phương án tối ưu.', d: true },
        { t: 'Ràng buộc "$\\ge$" được đưa về đẳng thức bằng cách cộng thêm biến phụ không âm.', d: false },
        { t: 'Khi chọn hàng xoay, ta chọn tỉ số $x_i/t_{ik}$ lớn nhất.', d: false },
        { t: 'Với bài gốc min, mọi phương án đối ngẫu cho một cận trên của $f_{\\min}$.', d: false },
        { t: 'Nguyên liệu còn thừa ở phương án tối ưu có giá bóng bằng 0.', d: true },
        { t: 'Trong phương pháp thế vị, $\\theta$ là lượng hàng nhỏ nhất ở các ô mang dấu "+".', d: false },
        { t: 'Bài toán M tối ưu mà còn biến giả dương thì bài toán gốc không bị chặn.', d: false },
        { t: 'Đối ngẫu của bài toán đối ngẫu là bài toán gốc.', d: true }
      ];
      return { q: 'Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: 'Ôn lại: tồn tại PACB tối ưu; vô số PATU; vận tải cân bằng luôn có tối ưu; "$\\ge$" trừ biến phụ; hàng xoay theo $\\theta$ nhỏ nhất; với gốc min, đối ngẫu cho cận <b>dưới</b>; giá bóng nguồn lực thừa bằng 0; $\\theta$ lấy ở ô "−"; biến giả dương ⇒ bài gốc <b>vô nghiệm</b>; đối ngẫu có tính đối xứng.' };
    } });

  K.item({ id: 'c2b6.gia-yeu-cau', bai: 'c2b6', muc: '2.3.3', cdr: 'NL', md: 'VDC', loai: 'so', on: 'buoi6.html#o-cam',
    gen(r) {
      for (;;) {
        const t = tpRand(r, 2, 3, 1, 9, r.pick([60, 80])); t.b[r.int(0, 2)] += 10;          // phát < thu: thêm điểm phát giả
        const R0 = tpSolve(t); const X = R0.X; const dumRow = X.length - 1;
        const j = X[dumRow].findIndex(v => v.n > 0); if (j < 0) continue;
        const C = t.C.map(row => row.slice()).concat([t.b.map((_, k) => (k === j ? 'M' : 0))]); const a2 = t.a.concat([10]);
        const R1 = Q().transport(a2, t.b, C, { sense: 'min' }); if (!R1.feasible || R1.f.hasM()) continue;
        const d = R1.f.a.sub(R0.f.a); if (d.n <= 0) continue;
        return { q: 'Hai kho giao hàng cho ba cửa hàng, bảng $$' + tpTex(t.a, t.b, t.C) + '$$ (ô ghi cước phí). Tổng phát nhỏ hơn tổng thu nên có một cửa hàng bị thiếu hàng. Nếu yêu cầu cửa hàng ' + (j + 1) + ' phải nhận <b>đủ</b> hàng thì chi phí nhỏ nhất tăng thêm bao nhiêu so với khi không có yêu cầu này?', a: d,
          _v: { tp2: [{ a: t.a, b: t.b, C: t.C, sense: 'min' }, { a: a2, b: t.b, C, sense: 'min' }], hoi: 'hieu' },
          giai: 'Không ràng buộc: thêm điểm phát giả 10 đơn vị, $f_{\\min}=' + num(R0.f.a) + '$. Có yêu cầu: cấm ô (phát giả, cửa hàng ' + (j + 1) + ') bằng cước $M$, $f_{\\min}=' + num(R1.f.a) + '$. Chênh lệch $' + num(d) + '$.' };
      }
    } });

  /* ===================================================================== CÁC BÀI KIỂM TRA */
  const L = (NB, TH, VD, VDC) => ({ NB, TH, VD, VDC });
  const ten = ['Mô hình, các dạng, phương pháp đồ thị', 'Phương án cực biên, phương pháp đơn hình', 'Biến giả, lập bài toán đối ngẫu', 'Định lý đối ngẫu, giá bóng', 'Bài toán vận tải, thế vị', 'Vận tải đặc biệt, ôn tập chương'];
  const plan = [
    [[{ tu: ['c2b1'], md: L(3, 4, 2, 1) }], 25],
    [[{ tu: ['c2b2'], md: L(2, 5, 3, 0) }], 30],
    [[{ tu: ['c2b3'], md: L(3, 4, 2, 1) }], 30],
    [[{ tu: ['c2b4'], md: L(2, 4, 3, 1) }], 30],
    [[{ tu: ['c2b5'], md: L(2, 5, 3, 0) }], 30],
    [[{ tu: ['c2b6'], md: L(3, 2, 2, 1) }, { tu: ['c2b5'], md: L(0, 1, 1, 0) }], 30]
  ];
  plan.forEach(([cau, phut], k) => {
    const b = 'c2b' + (k + 1);
    K.test(b, { ten: 'Kiểm tra sau Buổi ' + (k + 1), mo_ta: ten[k], chuong: 'chuong2', buoi: 'buoi' + (k + 1) + '.html', loai: 'buoi', phut, so_lan: 3, xem_giai: true, cau });
  });
  plan.forEach((_, k) => {
    const b = 'c2b' + (k + 1);
    K.test('lt-' + b, { ten: 'Luyện tập Buổi ' + (k + 1), mo_ta: ten[k], chuong: 'chuong2', buoi: 'buoi' + (k + 1) + '.html', loai: 'luyen', phut: 0, so_lan: 0, xem_giai: true, cau: [{ tu: [b], md: L(1, 2, 2, 0) }] });
  });
  K.test('c2dk', { ten: 'Kiểm tra định kỳ thử', mo_ta: 'QHTT và bài toán đối ngẫu (cấu trúc bài kiểm tra định kỳ 45 phút)', chuong: 'chuong2', loai: 'chuong', phut: 45, so_lan: 2, xem_giai: true,
    cau: [{ tu: ['c2b1'], md: L(0, 1, 2, 0) }, { tu: ['c2b2'], md: L(1, 1, 2, 0) }, { tu: ['c2b3'], md: L(1, 1, 1, 1) }, { tu: ['c2b4'], md: L(0, 2, 2, 0) }] });
  K.test('c2', { ten: 'Kiểm tra Chương 2', mo_ta: 'Mô hình · Đơn hình · Đối ngẫu · Vận tải', chuong: 'chuong2', loai: 'chuong', phut: 50, so_lan: 1, xem_giai: false,
    cau: [
      { tu: ['c2b1'], md: L(1, 1, 1, 0) }, { tu: ['c2b2'], md: L(0, 2, 1, 0) }, { tu: ['c2b3'], md: L(1, 1, 1, 0) },
      { tu: ['c2b4'], md: L(1, 1, 1, 1) }, { tu: ['c2b5'], md: L(1, 1, 2, 0) }, { tu: ['c2b6'], md: L(0, 1, 1, 1) }
    ] });
})(typeof window !== 'undefined' ? window.TKTKT : globalThis.TKTKT);

TKTKT.version = '9f18138af2';
