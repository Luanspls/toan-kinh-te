/* ngan-hang.js — Ngân hàng câu hỏi Chương 1: Cơ sở của Toán kinh tế.
   Mỗi câu: id · bai (buổi) · muc (mục CTMH) · cdr (chuẩn đầu ra) · md (mức độ) · loai · on (slide để ôn) · gen(r, H).
   Chuẩn đầu ra (theo CTMH C10.KT06, Chương 1):
     KT1 khái niệm ma trận, ma trận nghịch đảo, định thức    KN1 xác định hạng của ma trận
     KT2 phép toán ma trận, tính chất định thức               KN2 thành thạo phép toán ma trận, định thức cấp 2, 3
     KT3 khai triển, phương pháp tính định thức cấp n        KN3 tìm ma trận nghịch đảo
     KT4 không gian véctơ, ĐLTT, cơ sở, số chiều, tọa độ     KN4 điều kiện có nghiệm, giải hệ bằng Gauss
     NL  mô hình hóa bài toán kinh tế                         KN5 chứng tỏ hệ ĐLTT, tìm cơ sở · KN6 tọa độ đối với cơ sở */
(function (K) {
  'use strict';
  const F = K.H.F;
  const ijs = (i, j) => '_{' + i + j + '}';
  const coef = (k, name, first) => (k < 0 ? (first ? '-' : ' - ') : (first ? '' : ' + ')) + (Math.abs(k) === 1 ? '' : Math.abs(k)) + name;
  const mix = (r, pool, k) => { for (let t = 0; t < 50; t++) { const s = r.sample(pool, k); const d = s.filter(x => x.d).length; if (d > 0 && d < k) return s; } return r.sample(pool, k); };
  // Biểu thức tuyến tính có thể chứa hệ số tham số 'm'
  const linM = (c, names) => {
    let s = '';
    c.forEach((a, k) => {
      if (a === 0) return;
      if (a === 'm') { s += (s ? ' + ' : '') + 'm' + names[k]; return; }
      const mag = Math.abs(a) === 1 && names[k] ? '' : Math.abs(a);
      s += (s === '' ? (a < 0 ? '-' : '') : (a < 0 ? ' - ' : ' + ')) + mag + names[k];
    });
    return s || '0';
  };
  const isEchelon = A => {
    const lead = A.map(row => { const j = row.findIndex(x => x !== 0); return j < 0 ? Infinity : j; });
    for (let i = 1; i < lead.length; i++) { if (lead[i - 1] === Infinity && lead[i] !== Infinity) return false; if (lead[i] !== Infinity && lead[i] <= lead[i - 1]) return false; }
    return true;
  };

  /* ===================================================================== BUỔI 1 · MA TRẬN */
  K.item({ id: 'b1.cap-tich', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'NB', loai: 'mc', on: 'buoi1.html#phep-nhan',
    gen(r, H) {
      let m, n, p; do { m = r.int(2, 5); n = r.int(2, 5); p = r.int(2, 5); } while (m === p || (m === n && n === p));
      const d = (a, b) => '$' + a + '\\times ' + b + '$';
      return { q: 'Cho $A$ là ma trận cấp $' + m + '\\times ' + n + '$ và $B$ là ma trận cấp $' + n + '\\times ' + p + '$. Ma trận $AB$ có cấp',
        opts: H.opts(d(m, p), [d(p, m), d(n, n), d(m, n), d(n, p)], k => d(m + 1 + (k % 3), p + (k > 2 ? 1 : 0))),
        giai: '"Trong khớp — ngoài lấy": $(' + m + '\\times\\underline{' + n + '})\\cdot(\\underline{' + n + '}\\times ' + p + ')$ cho ma trận cấp $' + m + '\\times ' + p + '$.' };
    } });

  K.item({ id: 'b1.ds-cap', bai: 'b1', muc: '1.1.1.2', cdr: 'KT2', md: 'TH', loai: 'ds', on: 'buoi1.html#phep-nhan',
    gen(r) {
      const [a, b, c] = r.sample([2, 3, 4, 5], 3);
      const pool = [
        { t: 'Tích $AB$ xác định và có cấp $' + a + '\\times ' + b + '$.', d: true },
        { t: 'Tích $BA$ xác định.', d: false },
        { t: 'Tổng $A+C$ xác định.', d: true },
        { t: 'Tích $AC$ xác định.', d: false },
        { t: 'Tích $A^TC$ xác định và có cấp $' + b + '\\times ' + b + '$.', d: true },
        { t: 'Tích $AD$ có cấp $' + a + '\\times ' + c + '$.', d: true },
        { t: 'Tích $DA$ xác định.', d: false },
        { t: 'Tổng $A+B^T$ xác định.', d: false }
      ];
      return { q: 'Cho các ma trận $A, C$ cấp $' + a + '\\times ' + b + '$; $B$ cấp $' + b + '\\times ' + b + '$; $D$ cấp $' + b + '\\times ' + c + '$. Mỗi khẳng định sau đúng hay sai?',
        y: mix(r, pool, 4),
        giai: 'Cộng: hai ma trận cùng cấp. Nhân $XY$: số cột của $X$ bằng số dòng của $Y$, tích có cấp "ngoài lấy". $A^T$ có cấp $' + b + '\\times ' + a + '$.' };
    } });

  K.item({ id: 'b1.chuyen-vi', bai: 'b1', muc: '1.1.1.2', cdr: 'KT1', md: 'NB', loai: 'so', on: 'buoi1.html#phep-toan',
    gen(r, H) {
      const A = H.randMat(r, 3, 4, -9, 9); const i = r.int(1, 4), j = r.int(1, 3);
      return { q: 'Cho $A=' + H.mat(A) + '$. Tìm phần tử ở dòng ' + i + ', cột ' + j + ' của ma trận chuyển vị $A^T$.',
        a: A[j - 1][i - 1], giai: '$(A^T)' + ijs(i, j) + '=a' + ijs(j, i) + '=' + A[j - 1][i - 1] + '$ (dòng ' + j + ', cột ' + i + ' của $A$).' };
    } });

  K.item({ id: 'b1.to-hop', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'TH', loai: 'mc', on: 'buoi1.html#phep-toan',
    gen(r, H) {
      const A = H.randMat(r, 2, 2, -4, 5), B = H.randMat(r, 2, 2, -4, 5);
      const k = r.pick([2, 3, -2]), l = r.pick([2, 3, -1, -3]);
      const comb = (x, y) => A.map((row, i) => row.map((v, j) => x * v + y * B[i][j]));
      const t = M => '$' + H.mat(M) + '$';
      return { q: 'Cho $A=' + H.mat(A) + ',\\ B=' + H.mat(B) + '$. Ma trận $' + coef(k, 'A', true) + coef(l, 'B') + '$ bằng',
        opts: H.opts(t(comb(k, l)), [t(comb(k, -l)), t(comb(k, 1)), t(comb(l, k)), t(comb(1, l))]),
        giai: 'Nhân số vào mọi phần tử rồi cộng các phần tử cùng vị trí: $' + coef(k, 'A', true) + coef(l, 'B') + '=' + H.mat(comb(k, l)) + '$.' };
    } });

  K.item({ id: 'b1.nhan-phan-tu', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'TH', loai: 'so', on: 'buoi1.html#phep-nhan',
    gen(r, H) {
      const A = H.randMat(r, 2, 3, -3, 5), B = H.randMat(r, 3, 2, -3, 5); const i = r.int(1, 2), j = r.int(1, 2);
      const terms = [0, 1, 2].map(k => '(' + A[i - 1][k] + ')(' + B[k][j - 1] + ')');
      const v = [0, 1, 2].reduce((s, k) => s + A[i - 1][k] * B[k][j - 1], 0);
      return { q: 'Cho $A=' + H.mat(A) + ',\\ B=' + H.mat(B) + '$ và $C=AB$. Tìm phần tử $c' + ijs(i, j) + '$.',
        a: v, giai: '$c' + ijs(i, j) + '$ = dòng ' + i + ' của $A$ nhân cột ' + j + ' của $B$: $' + terms.join('+') + '=' + v + '$.' };
    } });

  K.item({ id: 'b1.nhan-mt', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'TH', loai: 'mc', on: 'buoi1.html#tinh-chat-nhan',
    gen(r, H) {
      let A, B, AB, BA;
      do { A = H.randMat(r, 2, 2, -3, 4); B = H.randMat(r, 2, 2, -3, 4); AB = H.mul(A, B); BA = H.mul(B, A); } while (JSON.stringify(AB) === JSON.stringify(BA));
      const t = M => '$' + H.mat(M) + '$';
      const had = A.map((row, i) => row.map((v, j) => v * B[i][j]));
      return { q: 'Cho $A=' + H.mat(A) + ',\\ B=' + H.mat(B) + '$. Tích $AB$ bằng',
        opts: H.opts(t(AB), [t(BA), t(had), t(H.mul(H.T(A), B))], k => t(AB.map((row, i) => row.map((v, j) => (i * 2 + j === k % 4 ? v + (k % 2 ? -1 : 1) * (1 + (k >> 2)) : v))))),
        giai: 'Dòng của $A$ nhân cột của $B$: $AB=' + H.mat(AB) + '$. Chú ý $BA=' + H.mat(BA) + '\\ne AB$ — phép nhân ma trận không giao hoán.' };
    } });

  K.item({ id: 'b1.doanh-thu', bai: 'b1', muc: '1.1.1.2', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi1.html#khoi-dong',
    gen(r, H) {
      const goods = r.pick([['Bút bi', 'Vở', 'Thước'], ['Áo', 'Quần', 'Mũ'], ['Gạo', 'Đường', 'Muối'], ['Sữa', 'Bánh', 'Nước ngọt']]);
      const Q = H.randMat(r, 2, 3, 5, 40); const p = [0, 1, 2].map(() => r.int(3, 25) * 10);
      const k = r.int(1, 2); const v = Q[k - 1].reduce((s, q, j) => s + q * p[j], 0);
      const tbl = '<table class="tbl"><tr><th>Số lượng bán/tuần</th>' + goods.map(g => '<th class="c">' + g + '</th>').join('') + '</tr>' +
        Q.map((row, i) => '<tr><td>Cửa hàng ' + (i + 1) + '</td>' + row.map(x => '<td class="c">' + x + '</td>').join('') + '</tr>').join('') +
        '<tr><th>Đơn giá (nghìn đồng)</th>' + p.map(x => '<td class="c">' + x + '</td>').join('') + '</tr></table>';
      return { q: 'Bảng số lượng bán và đơn giá của hai cửa hàng:' + tbl + 'Đặt $Q$ là ma trận số lượng, $p$ là véctơ cột đơn giá. Doanh thu một tuần của <b>cửa hàng ' + k + '</b> (nghìn đồng) là phần tử thứ ' + k + ' của $Qp$. Tính doanh thu đó.',
        a: v, giai: 'Dòng ' + k + ' của $Q$ nhân cột $p$: $' + Q[k - 1].map((q, j) => q + '\\cdot' + p[j]).join('+') + '=' + v + '$ (nghìn đồng).' };
    } });

  K.item({ id: 'b1.ds-tinh-chat', bai: 'b1', muc: '1.1.1.2', cdr: 'KT2', md: 'TH', loai: 'ds', on: 'buoi1.html#tinh-chat-nhan',
    gen(r) {
      const pool = [
        { t: '$(A+B)^2=A^2+2AB+B^2$ với mọi $A,B$.', d: false },
        { t: '$(AB)^T=B^TA^T$.', d: true },
        { t: '$(AB)^T=A^TB^T$ với mọi $A,B$.', d: false },
        { t: '$A(B+C)=AB+AC$.', d: true },
        { t: 'Nếu $AB=O$ thì $A=O$ hoặc $B=O$.', d: false },
        { t: '$AI=IA=A$ với $I$ là ma trận đơn vị cùng cấp.', d: true },
        { t: '$AB=BA$ với mọi $A,B$.', d: false },
        { t: '$(kA)^T=kA^T$ với mọi số thực $k$.', d: true },
        { t: '$A^2-B^2=(A-B)(A+B)$ với mọi $A,B$.', d: false },
        { t: '$(A^T)^T=A$.', d: true }
      ];
      return { q: 'Cho $A,B,C$ là các ma trận vuông cùng cấp $n\\ge2$. Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: 'Phép nhân ma trận có tính kết hợp, phân phối nhưng <b>không giao hoán</b>; vì vậy các hằng đẳng thức của số chỉ đúng khi $AB=BA$. $AB=O$ không suy ra $A=O$ hoặc $B=O$, ví dụ $\\begin{pmatrix}1&1\\\\1&1\\end{pmatrix}\\begin{pmatrix}1&-1\\\\-1&1\\end{pmatrix}=O$.' };
    } });

  K.item({ id: 'b1.bdsc', bai: 'b1', muc: '1.1.1.3', cdr: 'KT2', md: 'NB', loai: 'mc', on: 'buoi1.html#bdsc',
    gen(r) {
      const wrong = r.pick(['Nhân một dòng với số $0$.', 'Cộng cùng một số $k\\ne0$ vào mọi phần tử của một dòng.', 'Thay một dòng bằng dòng toàn số $1$.']);
      return { q: 'Phép biến đổi nào sau đây <b>không</b> phải là phép biến đổi sơ cấp trên dòng?',
        opts: [wrong, 'Đổi chỗ hai dòng.', 'Nhân một dòng với số $k\\ne0$.', 'Cộng vào một dòng một bội của dòng khác.'],
        giai: 'Ba phép biến đổi sơ cấp: đổi chỗ hai dòng; nhân một dòng với số khác 0; cộng vào một dòng một bội của dòng khác.' };
    } });

  K.item({ id: 'b1.bac-thang', bai: 'b1', muc: '1.1.1.1', cdr: 'KT1', md: 'NB', loai: 'mc', on: 'buoi1.html#bac-thang',
    gen(r, H) {
      const ech = rk => {
        for (;;) {
          const cols = r.sample([0, 1, 2, 3], rk).sort((a, b) => a - b);
          const A = [0, 1, 2].map(i => [0, 1, 2, 3].map(j => (i < rk && j === cols[i] ? r.nz(-3, 4) : i < rk && j > cols[i] ? r.int(-3, 5) : 0)));
          if (isEchelon(A)) return A;
        }
      };
      const good = ech(r.pick([2, 3]));
      const bad = [];
      for (let t = 0; bad.length < 3 && t < 200; t++) {
        const B = ech(r.pick([2, 3])).map(row => row.slice()); const kind = t % 3;
        if (kind === 0) { const x = B[0]; B[0] = B[1]; B[1] = x; }
        else if (kind === 1) { B[2] = B[1]; B[1] = [0, 0, 0, 0]; }
        else { const j = B[1].findIndex(x => x !== 0); if (j < 0) continue; B[2][j] = r.nz(-3, 3); }
        if (!isEchelon(B) && !bad.some(x => JSON.stringify(x) === JSON.stringify(B))) bad.push(B);
      }
      const t = M => '$' + H.mat(M) + '$';
      return { q: 'Ma trận nào sau đây là ma trận bậc thang?', opts: [t(good)].concat(bad.map(t)),
        giai: 'Ma trận bậc thang: dòng không (nếu có) nằm dưới cùng; phần tử khác 0 đầu tiên của dòng dưới nằm <b>bên phải</b> phần tử đó của dòng trên.' };
    } });

  K.item({ id: 'b1.hang-max', bai: 'b1', muc: '1.1.1.4', cdr: 'KN1', md: 'NB', loai: 'so', on: 'buoi1.html#hang',
    gen(r) {
      let m, n; do { m = r.int(2, 7); n = r.int(2, 7); } while (m === n);
      return { q: 'Hạng của một ma trận cấp $' + m + '\\times ' + n + '$ lớn nhất có thể bằng bao nhiêu?', a: Math.min(m, n),
        giai: '$0\\le r(A)\\le\\min(m,n)=\\min(' + m + ',' + n + ')=' + Math.min(m, n) + '$.' };
    } });

  K.item({ id: 'b1.hang', bai: 'b1', muc: '1.1.1.4', cdr: 'KN1', md: 'TH', loai: 'so', on: 'buoi1.html#hang-vd',
    gen(r, H) {
      const [m, n] = r.pick([[3, 4], [4, 4], [3, 4]]); const rk = r.int(1, 3);
      const A = H.rankMat(r, m, n, rk, 12);
      return { q: 'Tìm hạng của ma trận $A=' + H.mat(A) + '$.', a: rk,
        giai: 'Đưa $A$ về dạng bậc thang bằng biến đổi sơ cấp trên dòng; còn lại ' + rk + ' dòng khác 0 nên $r(A)=' + rk + '$. Kiểm tra bằng Phòng tính ma trận.' };
    } });

  K.item({ id: 'b1.hang-m', bai: 'b1', muc: '1.1.1.4', cdr: 'KN1', md: 'VD', loai: 'so', on: 'buoi1.html#bt14c',
    gen(r, H) {
      const P = H.paramMat(r, 3, 8);
      return { q: 'Cho $A=' + H.mat(P.A) + '$. Tìm giá trị của tham số $m$ để $r(A)=2$.', a: P.m0,
        giai: 'Hai dòng không chứa $m$ độc lập tuyến tính nên $r(A)\\ge2$. Biến đổi (hoặc tính định thức, Buổi 2): $r(A)=2\\iff$ dòng chứa $m$ là tổ hợp của hai dòng kia $\\iff m=' + P.m0 + '$; với $m\\ne' + P.m0 + '$ thì $r(A)=3$.' };
    } });

  K.item({ id: 'b1.luy-thua', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'VD', loai: 'so', on: 'buoi1.html#luy-thua',
    gen(r, H) {
      const v = r.int(0, 2);
      if (v === 2) {
        const a = r.pick([2, -2, 3]), b = r.nz(-3, 3), n = r.int(3, 5);
        return { q: 'Cho $A=' + H.mat([[a, 0], [0, b]]) + '$. Tìm phần tử ở dòng 1, cột 1 của $A^{' + n + '}$.', a: Math.pow(a, n),
          giai: 'Ma trận chéo: $A^n=\\begin{pmatrix}a^n&0\\\\0&b^n\\end{pmatrix}$, nên phần tử cần tìm là $(' + a + ')^{' + n + '}=' + Math.pow(a, n) + '$.' };
      }
      const k = r.nz(-4, 5), n = r.int(5, 20);
      const A = v === 0 ? [[1, k], [0, 1]] : [[1, 0], [k, 1]]; const pos = v === 0 ? '1, cột 2' : '2, cột 1';
      return { q: 'Cho $A=' + H.mat(A) + '$. Tìm phần tử ở dòng ' + pos + ' của $A^{' + n + '}$.', a: n * k,
        giai: 'Tính $A^2, A^3$ rồi quy nạp: phần tử đó của $A^n$ bằng $n\\cdot(' + k + ')$, với $n=' + n + '$ được $' + (n * k) + '$.' };
    } });

  K.item({ id: 'b1.luy-thua-3', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'VDC', loai: 'so', on: 'buoi1.html#bt-luy-thua',
    gen(r, H) {
      const a = r.nz(-3, 3), b = r.int(-3, 3), c = r.nz(-3, 3), n = r.int(3, 8);
      const A = [[1, a, b], [0, 1, c], [0, 0, 1]]; const v = n * b + n * (n - 1) / 2 * a * c;
      return { q: 'Cho $A=' + H.mat(A) + '$. Tìm phần tử ở dòng 1, cột 3 của $A^{' + n + '}$.', a: v,
        giai: 'Viết $A=I+N$ với $N=' + H.mat([[0, a, b], [0, 0, c], [0, 0, 0]]) + '$, $N^2=' + H.mat([[0, 0, a * c], [0, 0, 0], [0, 0, 0]]) + '$, $N^3=O$. Vì $IN=NI$ nên dùng được nhị thức Newton: $A^{' + n + '}=I+' + n + 'N+\\binom{' + n + '}{2}N^2$. Phần tử $(1,3)$: $' + n + '\\cdot(' + b + ')+' + (n * (n - 1) / 2) + '\\cdot(' + (a * c) + ')=' + v + '$.' };
    } });

  K.item({ id: 'b1.giao-hoan', bai: 'b1', muc: '1.1.1.2', cdr: 'KN2', md: 'VD', loai: 'so', on: 'buoi1.html#bt12-13',
    gen(r, H) {
      for (;;) {
        const A = H.randMat(r, 2, 2, -3, 4); if (A[0][1] === 0 || (A[1][0] === 0 && A[0][0] === A[1][1])) continue;
        const al = r.pick([1, 2, -1, 3]), be = r.int(-3, 3);
        const B = A.map((row, i) => row.map((x, j) => al * x + (i === j ? be : 0)));
        if (H.maxAbs(B) > 12) continue;
        const Bq = [[B[0][0], B[0][1]], [B[1][0], 'x']];
        return { q: 'Cho $A=' + H.mat(A) + '$ và $B=' + H.mat(Bq) + '$. Tìm $x$ để $AB=BA$.', a: B[1][1],
          giai: 'Tính $AB$ và $BA$ rồi cân bằng các phần tử. Ma trận giao hoán với $A$ có dạng $\\alpha A+\\beta I$: từ phần tử $(1,2)$ được $\\alpha=' + al + '$, từ phần tử $(1,1)$ được $\\beta=' + be + '$, suy ra $x=' + al + '\\cdot(' + A[1][1] + ')+(' + be + ')=' + B[1][1] + '$.' };
      }
    } });

  /* ===================================================================== BUỔI 2 · ĐỊNH THỨC, NGHỊCH ĐẢO */
  K.item({ id: 'b2.det2', bai: 'b2', muc: '1.1.2.1', cdr: 'KN2', md: 'NB', loai: 'so', on: 'buoi2.html#dinh-nghia',
    gen(r, H) {
      const A = H.randMat(r, 2, 2, -9, 9); const v = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      return { q: 'Tính định thức $' + H.vdet(A) + '$.', a: v, giai: '$ad-bc=(' + A[0][0] + ')(' + A[1][1] + ')-(' + A[0][1] + ')(' + A[1][0] + ')=' + v + '$.' };
    } });

  K.item({ id: 'b2.det3', bai: 'b2', muc: '1.1.2.1', cdr: 'KN2', md: 'TH', loai: 'so', on: 'buoi2.html#sarrus',
    gen(r, H) {
      let A; do { A = H.randMat(r, 3, 3, -4, 5); } while (H.zeros(A) > 2);
      return { q: 'Tính định thức $D=' + H.vdet(A) + '$.', a: H.det(A), giai: 'Dùng quy tắc Sarrus hoặc khai triển theo một dòng: $D=' + H.det(A).tex() + '$.' };
    } });

  K.item({ id: 'b2.det-tam-giac', bai: 'b2', muc: '1.1.2.2', cdr: 'KT3', md: 'NB', loai: 'so', on: 'buoi2.html#tinh-chat',
    gen(r, H) {
      const up = r.bool(); const d = [0, 1, 2, 3].map(() => r.nz(-3, 4));
      const A = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? d[i] : (up ? j > i : j < i) ? r.int(-9, 9) : 0)));
      const v = d.reduce((s, x) => s * x, 1);
      return { q: 'Tính định thức $' + H.vdet(A) + '$.', a: v, giai: 'Ma trận tam giác: định thức bằng tích các phần tử trên đường chéo chính: $' + d.map(x => '(' + x + ')').join('') + '=' + v + '$.' };
    } });

  K.item({ id: 'b2.det4', bai: 'b2', muc: '1.1.2.3', cdr: 'KT3', md: 'VD', loai: 'so', on: 'buoi2.html#chien-luoc',
    gen(r, H) {
      const d = r.pick([2, -2, 3, -3, 4, -4, 6, -6, 8, -9, 12, -12, 5, -5]); const A = H.withDet(r, 4, d, 9);
      return { q: 'Tính định thức cấp 4: $D=' + H.vdet(A) + '$.', a: d,
        giai: 'Dùng biến đổi sơ cấp đưa về dạng tam giác (nhớ đổi dấu mỗi lần đổi chỗ hai dòng), hoặc tạo nhiều số 0 trên một dòng rồi khai triển Laplace. Kết quả $D=' + d + '$.' };
    } });

  K.item({ id: 'b2.phan-bu', bai: 'b2', muc: '1.1.2.3', cdr: 'KT3', md: 'TH', loai: 'so', on: 'buoi2.html#phan-bu',
    gen(r, H) {
      const A = H.randMat(r, 3, 3, -5, 6); const i = r.int(1, 3), j = r.int(1, 3);
      const Mij = A.filter((_, a) => a !== i - 1).map(row => row.filter((_, b) => b !== j - 1));
      const m = H.det(Mij), v = (i + j) % 2 ? m.neg() : m;
      return { q: 'Cho $A=' + H.mat(A) + '$. Tìm phần bù đại số $A' + ijs(i, j) + '$ của phần tử $a' + ijs(i, j) + '$.', a: v,
        giai: '$A' + ijs(i, j) + '=(-1)^{' + i + '+' + j + '}M' + ijs(i, j) + '=' + ((i + j) % 2 ? '-' : '') + H.vdet(Mij) + '=' + v.tex() + '$. Lỗi hay gặp: quên dấu $(-1)^{i+j}$.' };
    } });

  K.item({ id: 'b2.phu-hop', bai: 'b2', muc: '1.1.2.4', cdr: 'KN3', md: 'TH', loai: 'so', on: 'buoi2.html#phu-hop',
    gen(r, H) {
      let A, i, j; do { A = H.randMat(r, 3, 3, -4, 5); i = r.int(1, 3); j = r.int(1, 3); } while (i === j);
      const adj = K.LA.adjugate(H.M(A)); const v = adj[i - 1][j - 1];
      return { q: 'Cho $A=' + H.mat(A) + '$ và $A^*$ là ma trận phụ hợp của $A$. Tìm phần tử ở dòng ' + i + ', cột ' + j + ' của $A^*$.', a: v,
        giai: '$A^*$ là <b>chuyển vị</b> của ma trận các phần bù đại số, nên phần tử $(' + i + ',' + j + ')$ của $A^*$ là $A' + ijs(j, i) + '=' + v.tex() + '$ (không phải $A' + ijs(i, j) + '$).' };
    } });

  K.item({ id: 'b2.ds-tinh-chat', bai: 'b2', muc: '1.1.2.2', cdr: 'KT2', md: 'TH', loai: 'ds', on: 'buoi2.html#tinh-chat',
    gen(r) {
      const pool = [
        { t: '$\\det(A^T)=\\det A$.', d: true },
        { t: '$\\det(kA)=k\\det A$ với mọi số thực $k$.', d: false },
        { t: '$\\det(A+B)=\\det A+\\det B$.', d: false },
        { t: '$\\det(AB)=\\det A\\cdot\\det B$.', d: true },
        { t: 'Đổi chỗ hai dòng của $A$ thì định thức đổi dấu.', d: true },
        { t: 'Cộng vào một dòng một bội của dòng khác thì định thức không đổi.', d: true },
        { t: 'Nếu $A$ có hai cột tỉ lệ thì $\\det A=0$.', d: true },
        { t: 'Nếu $A$ khả nghịch thì $\\det(A^{-1})=-\\det A$.', d: false },
        { t: 'Nhân một dòng của $A$ với số $k$ thì định thức nhân với $k^n$.', d: false },
        { t: 'Nếu $\\det A=0$ thì $A$ có một dòng toàn số $0$.', d: false }
      ];
      return { q: 'Cho $A,B$ là các ma trận vuông cấp $n\\ge2$. Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: '$\\det(kA)=k^n\\det A$; $\\det(A^{-1})=\\dfrac1{\\det A}$; nhân <b>một</b> dòng với $k$ thì định thức nhân $k$; $\\det A=0$ không bắt buộc có dòng 0 (chỉ cần các dòng phụ thuộc tuyến tính).' };
    } });

  K.item({ id: 'b2.det-kA', bai: 'b2', muc: '1.1.2.2', cdr: 'KT2', md: 'TH', loai: 'so', on: 'buoi2.html#tinh-chat',
    gen(r) {
      const n = r.int(2, 4), d = r.pick([2, -2, 3, -3, 5, -1, 4]), k = r.pick([2, -1, 3, -2]); const v = r.int(0, 3);
      const kn = Math.pow(k, n);
      const forms = [
        ['\\det(' + k + 'A)', F(kn * d), '\\det(kA)=k^n\\det A=(' + k + ')^{' + n + '}\\cdot(' + d + ')'],
        ['\\det(' + k + 'A^T)', F(kn * d), '\\det(kA^T)=k^n\\det A=(' + k + ')^{' + n + '}\\cdot(' + d + ')'],
        ['\\det(A^2)', F(d * d), '\\det(A^2)=(\\det A)^2'],
        ['\\det(' + k + 'A^{-1})', F(kn, d), '\\det(kA^{-1})=\\dfrac{k^n}{\\det A}=\\dfrac{' + kn + '}{' + d + '}']
      ];
      const [e, a, w] = forms[v];
      return { q: 'Cho $A$ là ma trận vuông cấp ' + n + ' có $\\det A=' + d + '$. Tính $' + e + '$.', a,
        giai: '$' + w + '=' + a.tex() + '$.' };
    } });

  K.item({ id: 'b2.det-bdsc', bai: 'b2', muc: '1.1.2.2', cdr: 'KT2', md: 'VD', loai: 'so', on: 'buoi2.html#bdsc-dinh-thuc',
    gen(r) {
      const d = r.pick([2, -3, 4, 5, -1, 6, 3]); let v = d; const ops = []; const why = [];
      const cnt = r.int(2, 3);
      for (let t = 0; t < cnt; t++) {
        const kind = r.int(0, 2); const [i, j] = r.sample([1, 2, 3], 2);
        if (kind === 0) { ops.push('đổi chỗ dòng ' + i + ' và dòng ' + j); v = -v; why.push('đổi dấu'); }
        else if (kind === 1) { const k = r.pick([2, 3, -2, 5]); ops.push('nhân dòng ' + i + ' với $' + k + '$'); v *= k; why.push('nhân $' + k + '$'); }
        else { const c = r.pick([2, 3, -1, -4]); ops.push('cộng vào dòng ' + i + ' tích của $' + c + '$ với dòng ' + j); why.push('không đổi'); }
      }
      return { q: 'Ma trận $A$ cấp 3 có $\\det A=' + d + '$. Ma trận $B$ nhận được từ $A$ bằng cách lần lượt: ' + ops.join('; ') + '. Tính $\\det B$.', a: v,
        giai: 'Lần lượt: ' + why.join(', ') + ' ⇒ $\\det B=' + v + '$.' };
    } });

  K.item({ id: 'b2.kha-nghich-m', bai: 'b2', muc: '1.1.2.4', cdr: 'KN3', md: 'TH', loai: 'mc', on: 'buoi2.html#so-sanh',
    gen(r, H) {
      const P = H.paramMat(r, 3, 8); const m0 = P.m0;
      return { q: 'Cho $A=' + H.mat(P.A) + '$. Ma trận $A$ khả nghịch khi và chỉ khi',
        opts: H.opts('$m\\ne' + m0 + '$', ['$m=' + m0 + '$', m0 !== 0 ? '$m\\ne' + (-m0) + '$' : '$m\\ne1$', '$m\\in\\mathbb R$ tùy ý'], k => '$m\\ne' + (m0 + k + 2) + '$'),
        giai: '$\\det A$ là biểu thức bậc nhất theo $m$ và bằng 0 đúng khi $m=' + m0 + '$. $A$ khả nghịch $\\iff\\det A\\ne0\\iff m\\ne' + m0 + '$.' };
    } });

  K.item({ id: 'b2.nghich-dao-2', bai: 'b2', muc: '1.1.2.4', cdr: 'KN3', md: 'TH', loai: 'mc', on: 'buoi2.html#nghich-dao',
    gen(r, H) {
      let A, d; do { A = H.randMat(r, 2, 2, -5, 6); d = A[0][0] * A[1][1] - A[0][1] * A[1][0]; } while ([1, -1, 2, -2, 3].indexOf(d) < 0 || A[0][1] === A[1][0]);
      const [[a, b], [c, e]] = A; const f = M => '$' + H.mat(M.map(row => row.map(x => F(x, 1).div(d)))) + '$';
      const g = M => '$' + H.mat(M.map(row => row.map(x => x * d))) + '$';
      return { q: 'Ma trận nghịch đảo của $A=' + H.mat(A) + '$ là',
        opts: H.opts(f([[e, -b], [-c, a]]), [f([[a, -b], [-c, e]]), f([[e, b], [c, a]]), f([[e, -c], [-b, a]]), g([[e, -b], [-c, a]])], k => f([[e, -b], [-c, a]].map((row, i) => row.map((v, j) => (i * 2 + j === k % 4 ? -v + (v === 0 ? 1 + k : 0) : v))))),
        giai: '$\\det A=' + d + '\\ne0$, $A^{-1}=\\dfrac{1}{\\det A}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}$: đổi chỗ hai phần tử trên đường chéo chính, đổi dấu hai phần tử còn lại, chia cho $\\det A$. Thử lại $AA^{-1}=I$.' };
    } });

  K.item({ id: 'b2.nghich-dao-3', bai: 'b2', muc: '1.1.2.4', cdr: 'KN3', md: 'VD', loai: 'so', on: 'buoi2.html#nghich-dao-gauss',
    gen(r, H) {
      const A = H.unimod(r, 3, 6); const inv = K.LA.inverse(H.M(A)).inv; const i = r.int(1, 3), j = r.int(1, 3);
      return { q: 'Cho $A=' + H.mat(A) + '$. Tìm phần tử ở dòng ' + i + ', cột ' + j + ' của $A^{-1}$.', a: inv[i - 1][j - 1],
        giai: '$\\det A=' + H.det(A).tex() + '$; dùng Gauss – Jordan $(A\\mid I)\\to(I\\mid A^{-1})$ hoặc ma trận phụ hợp: $A^{-1}=' + K.LA.texMatrix(inv) + '$.' };
    } });

  K.item({ id: 'b2.dk-kha-nghich', bai: 'b2', muc: '1.1.2.4', cdr: 'KT1', md: 'NB', loai: 'mc', on: 'buoi2.html#nghich-dao',
    gen(r) {
      return { q: 'Ma trận vuông $A$ khả nghịch khi và chỉ khi',
        opts: ['$\\det A\\ne0$', '$\\det A=0$', '$A\\ne O$', 'mọi phần tử của $A$ đều khác $0$'],
        giai: 'Định lý: $A$ khả nghịch $\\iff\\det A\\ne0$. Ví dụ $\\begin{pmatrix}1&2\\\\2&4\\end{pmatrix}\\ne O$, mọi phần tử khác 0 nhưng vẫn không khả nghịch.' };
    } });

  /* ===================================================================== BUỔI 3 · LUYỆN TẬP, LEONTIEF */
  K.item({ id: 'b3.pt-ax', bai: 'b3', muc: '1.1.2.4', cdr: 'KN3', md: 'VD', loai: 'so', on: 'buoi3.html#dang4',
    gen(r, H) {
      const A = H.unimod(r, 2, 5), B = H.randMat(r, 2, 2, -5, 6); const X = K.LA.mul(K.LA.inverse(H.M(A)).inv, H.M(B));
      const i = r.int(1, 2), j = r.int(1, 2);
      return { q: 'Cho $A=' + H.mat(A) + ',\\ B=' + H.mat(B) + '$. Tìm phần tử $x' + ijs(i, j) + '$ của ma trận $X$ thỏa mãn $AX=B$.', a: X[i - 1][j - 1],
        giai: '$\\det A=' + H.det(A).tex() + '\\ne0$ nên $X=A^{-1}B=' + K.LA.texMatrix(X) + '$ (nhân $A^{-1}$ vào <b>bên trái</b>).' };
    } });

  K.item({ id: 'b3.pt-xa', bai: 'b3', muc: '1.1.2.4', cdr: 'KN3', md: 'VD', loai: 'so', on: 'buoi3.html#dang4',
    gen(r, H) {
      const A = H.unimod(r, 2, 5), B = H.randMat(r, 2, 2, -5, 6); const X = K.LA.mul(H.M(B), K.LA.inverse(H.M(A)).inv);
      const i = r.int(1, 2), j = r.int(1, 2);
      return { q: 'Cho $A=' + H.mat(A) + ',\\ B=' + H.mat(B) + '$. Tìm phần tử $x' + ijs(i, j) + '$ của ma trận $X$ thỏa mãn $XA=B$.', a: X[i - 1][j - 1],
        giai: '$X=BA^{-1}$ (nhân $A^{-1}$ vào <b>bên phải</b>) $=' + K.LA.texMatrix(X) + '$. Lỗi hay gặp: viết $A^{-1}B$.' };
    } });

  K.item({ id: 'b3.pt-dang', bai: 'b3', muc: '1.1.2.4', cdr: 'KT2', md: 'TH', loai: 'mc', on: 'buoi3.html#dang4',
    gen(r) {
      const v = r.pick([
        ['$AXB=C$', '$X=A^{-1}CB^{-1}$', ['$X=CA^{-1}B^{-1}$', '$X=A^{-1}B^{-1}C$', '$X=B^{-1}CA^{-1}$'], 'Nhân $A^{-1}$ bên trái và $B^{-1}$ bên phải hai vế.'],
        ['$XA+B=C$', '$X=(C-B)A^{-1}$', ['$X=A^{-1}(C-B)$', '$X=(C+B)A^{-1}$', '$X=CA^{-1}-B$'], '$XA=C-B$, nhân $A^{-1}$ bên phải.'],
        ['$AX=B+X$ (với $A-I$ khả nghịch)', '$X=(A-I)^{-1}B$', ['$X=B(A-I)^{-1}$', '$X=A^{-1}B-I$', '$X=(A-I)B$'], '$AX-X=B\\iff(A-I)X=B$, nhân $(A-I)^{-1}$ bên trái. Chú ý $AX-X=(A-I)X$ chứ không phải $(A-1)X$.'],
        ['$A^{-1}XA=B$', '$X=ABA^{-1}$', ['$X=A^{-1}BA$', '$X=B$', '$X=BA^{-1}A$'], 'Nhân $A$ bên trái và $A^{-1}$ bên phải: $X=ABA^{-1}$.']
      ]);
      return { q: 'Cho $A,B,C$ là các ma trận vuông cùng cấp, $A,B$ khả nghịch. Nghiệm của phương trình ma trận ' + v[0] + ' là', opts: [v[1]].concat(v[2]), giai: v[3] + ' Phép nhân ma trận không giao hoán nên phải giữ đúng phía.' };
    } });

  K.item({ id: 'b3.ds-det', bai: 'b3', muc: '1.1.2.2', cdr: 'KT2', md: 'VD', loai: 'ds', on: 'buoi3.html#dang2b',
    gen(r) {
      const a = r.pick([1, -1, 2, -2, 3]), b = r.pick([2, -2, 3, 4, -3, 1]);
      const tpl = [
        tr => ({ t: '$\\det(AB)=' + (tr ? a * b : a + b) + '$.', d: tr || a * b === a + b }),
        tr => ({ t: '$\\det(2A)=' + (tr ? 8 * a : 2 * a) + '$.', d: tr }),
        tr => ({ t: '$\\det(A^{-1}B)=' + (tr ? F(b, a) : F(-b, a)).tex() + '$.', d: tr }),
        tr => ({ t: '$\\det(-B)=' + (tr ? -b : b) + '$.', d: tr }),
        tr => ({ t: '$\\det(A^2B^T)=' + (tr ? a * a * b : 2 * a * b) + '$.', d: tr || a * a * b === 2 * a * b }),
        tr => ({ t: '$\\det(A^T)=' + (tr ? a : -a) + '$.', d: tr })
      ];
      const y = r.sample(tpl, 4).map(f => f(r.bool()));
      return { q: 'Cho $A,B$ là các ma trận vuông cấp 3 với $\\det A=' + a + ',\\ \\det B=' + b + '$. Mỗi khẳng định sau đúng hay sai?', y,
        giai: 'Dùng $\\det(AB)=\\det A\\det B$, $\\det(kA)=k^3\\det A$ (cấp 3), $\\det(A^{-1})=\\dfrac1{\\det A}$, $\\det(A^T)=\\det A$: $\\det(AB)=' + a * b + '$, $\\det(2A)=' + 8 * a + '$, $\\det(A^{-1}B)=' + F(b, a).tex() + '$, $\\det(-B)=' + (-b) + '$, $\\det(A^2B^T)=' + a * a * b + '$.' };
    } });

  K.item({ id: 'b3.tham-so-vdc', bai: 'b3', muc: '1.1.2.4', cdr: 'KN3', md: 'VDC', loai: 'so', on: 'buoi3.html#dang2',
    gen(r, H) {
      const a = r.pick([1, 2, 3, -1, -2]); const A = [['m', a, a], [a, 'm', a], [a, a, 'm']];
      return { q: 'Cho $A=' + H.mat(A) + '$. Tính <b>tổng</b> tất cả các giá trị của $m$ để $A$ không khả nghịch.', a: -a,
        giai: 'Cộng các cột vào cột 1 rồi rút thừa số chung: $\\det A=(' + linM([1, 2 * a], ['m', '']) + ')(' + linM([1, -a], ['m', '']) + ')^2$. $A$ không khả nghịch $\\iff m=' + a + '$ hoặc $m=' + (-2 * a) + '$; tổng các giá trị bằng $' + (-a) + '$.' };
    } });

  K.item({ id: 'b3.tinh-chat-vdc', bai: 'b3', muc: '1.1.2.2', cdr: 'KT2', md: 'VDC', loai: 'mc', on: 'buoi3.html#dang5',
    gen(r) {
      const v = r.pick([
        ['$A$ vuông cấp $n$ thỏa mãn $A^2=O$. Khẳng định nào đúng?', '$\\det A=0$', ['$A=O$', '$\\det A=1$', '$A$ khả nghịch'], '$(\\det A)^2=\\det(A^2)=0$ nên $\\det A=0$. Không suy ra được $A=O$: ví dụ $\\begin{pmatrix}0&1\\\\0&0\\end{pmatrix}$.'],
        ['$A$ vuông cấp 3 thỏa mãn $A^TA=I$. Khi đó $\\det A$ bằng', '$1$ hoặc $-1$', ['chỉ có thể bằng $1$', '$0$', '$3$'], '$\\det(A^T)\\det A=(\\det A)^2=1$.'],
        ['$A$ vuông cấp 3 thỏa mãn $A^3=2I$. Khi đó $\\det A$ bằng', '$2$', ['$8$', '$\\sqrt[3]{2}$', '$6$'], '$(\\det A)^3=\\det(2I)=2^3=8$ nên $\\det A=2$.'],
        ['$A$ vuông khả nghịch và $A^2=A$. Khi đó', '$A=I$', ['$A=O$', '$\\det A=0$', '$A=-I$'], 'Nhân $A^{-1}$ vào hai vế của $A^2=A$: $A=I$.']
      ]);
      return { q: v[0], opts: [v[1]].concat(v[2]), giai: v[3] };
    } });

  K.item({ id: 'b3.leontief-hs', bai: 'b3', muc: '1.1.2.4', cdr: 'NL', md: 'NB', loai: 'mc', on: 'buoi3.html#leontief-mo-hinh',
    gen(r) {
      const [i, j] = r.sample([1, 2, 3], 2);
      return { q: 'Trong mô hình cân đối liên ngành (Leontief), hệ số chi phí trực tiếp $a' + ijs(i, j) + '$ cho biết',
        opts: ['giá trị sản phẩm ngành ' + i + ' cần để sản xuất 1 đồng sản phẩm ngành ' + j,
          'giá trị sản phẩm ngành ' + j + ' cần để sản xuất 1 đồng sản phẩm ngành ' + i,
          'cầu cuối cùng đối với sản phẩm ngành ' + i,
          'tổng sản lượng của ngành ' + j],
        giai: '$a_{ij}$: giá trị sản phẩm ngành $i$ (dòng) cần để sản xuất 1 đồng sản phẩm ngành $j$ (cột).' };
    } });

  const leon = (r, H) => {
    for (;;) {
      const A = [[r.int(1, 4) / 10, r.int(1, 4) / 10], [r.int(1, 4) / 10, r.int(1, 3) / 10]];
      if (A[0][0] + A[1][0] > 0.7 || A[0][1] + A[1][1] > 0.7) continue;
      const x = [r.int(10, 50) * 10, r.int(10, 50) * 10];
      const d = [0, 1].map(i => Math.round(x[i] - A[i][0] * x[0] - A[i][1] * x[1]));
      if (d.some(v => v <= 0)) continue;
      return { A, x, d, tA: '\\begin{pmatrix}' + A.map(row => row.map(H.dec).join('&')).join('\\\\') + '\\end{pmatrix}' };
    }
  };
  K.item({ id: 'b3.leontief-d', bai: 'b3', muc: '1.1.2.4', cdr: 'NL', md: 'TH', loai: 'so', on: 'buoi3.html#leontief-mo-hinh',
    gen(r, H) {
      const L = leon(r, H); const k = r.int(1, 2);
      return { q: 'Nền kinh tế có 2 ngành với ma trận hệ số chi phí trực tiếp $A=' + L.tA + '$. Tổng sản lượng (tỷ đồng) của hai ngành là $x=' + H.vec(L.x) + '$. Tính cầu cuối cùng $d_' + k + '$ đối với ngành ' + k + '.', a: L.d[k - 1],
        giai: '$d=(I-A)x$: $d_' + k + '=x_' + k + '-a' + ijs(k, 1) + 'x_1-a' + ijs(k, 2) + 'x_2=' + L.x[k - 1] + '-' + H.dec(L.A[k - 1][0]) + '\\cdot' + L.x[0] + '-' + H.dec(L.A[k - 1][1]) + '\\cdot' + L.x[1] + '=' + L.d[k - 1] + '$.' };
    } });

  K.item({ id: 'b3.leontief-x', bai: 'b3', muc: '1.1.2.4', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi3.html#leontief',
    gen(r, H) {
      const L = leon(r, H); const k = r.int(1, 2);
      return { q: 'Nền kinh tế có 2 ngành với ma trận hệ số chi phí trực tiếp $A=' + L.tA + '$ và cầu cuối cùng $d=' + H.vec(L.d) + '$ (tỷ đồng). Tính tổng sản lượng $x_' + k + '$ mà ngành ' + k + ' cần sản xuất.', a: L.x[k - 1],
        giai: 'Giải $(I-A)x=d$ hay $x=(I-A)^{-1}d$, với $I-A=\\begin{pmatrix}' + H.dec(1 - L.A[0][0]) + '&' + H.dec(-L.A[0][1]) + '\\\\' + H.dec(-L.A[1][0]) + '&' + H.dec(1 - L.A[1][1]) + '\\end{pmatrix}$: $x=' + H.vec(L.x) + '$.' };
    } });

  K.item({ id: 'b3.leontief-toan-bo', bai: 'b3', muc: '1.1.2.4', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi3.html#leontief-mo-hinh',
    gen(r, H) {
      const B = [[r.int(5, 8) / 4, r.int(1, 3) / 4], [r.int(1, 3) / 4, r.int(5, 8) / 4]];
      const i = r.int(1, 2), j = r.int(1, 2), D = r.int(2, 10) * 4;
      return { q: 'Ma trận hệ số chi phí toàn bộ của nền kinh tế hai ngành là $(I-A)^{-1}=\\begin{pmatrix}' + B.map(row => row.map(H.dec).join('&')).join('\\\\') + '\\end{pmatrix}$. Nếu cầu cuối cùng đối với ngành ' + j + ' tăng thêm ' + D + ' tỷ đồng (cầu cuối ngành kia không đổi) thì tổng sản lượng ngành ' + i + ' phải tăng thêm bao nhiêu tỷ đồng?', a: F(B[i - 1][j - 1] * D),
        giai: '$\\Delta x=(I-A)^{-1}\\Delta d$ với $\\Delta d$ chỉ có thành phần thứ ' + j + ' bằng ' + D + ': $\\Delta x_' + i + '=b' + ijs(i, j) + '\\cdot' + D + '=' + H.dec(B[i - 1][j - 1]) + '\\cdot' + D + '=' + H.dec(B[i - 1][j - 1] * D) + '$.' };
    } });

  /* ===================================================================== BUỔI 4 · HỆ PHƯƠNG TRÌNH */
  K.item({ id: 'b4.cap-bs', bai: 'b4', muc: '1.2.1', cdr: 'KT1', md: 'NB', loai: 'mc', on: 'buoi4.html#dang-tong-quat',
    gen(r) {
      let m, n; do { m = r.int(2, 5); n = r.int(2, 6); } while (m === n + 1 || m === n);
      const d = (a, b) => '$' + a + '\\times ' + b + '$';
      return { q: 'Hệ phương trình tuyến tính gồm ' + m + ' phương trình, ' + n + ' ẩn. Ma trận bổ sung $\\overline{A}$ của hệ có cấp',
        opts: K.H.opts(d(m, n + 1), [d(m, n), d(n, m + 1), d(m + 1, n)], k => d(m + 1 + k, n + 1)), giai: '$\\overline A$ gồm ma trận hệ số ($' + m + '\\times ' + n + '$) thêm cột hệ số tự do: cấp $' + m + '\\times ' + (n + 1) + '$.' };
    } });

  K.item({ id: 'b4.cramer2', bai: 'b4', muc: '1.2.2', cdr: 'KN4', md: 'TH', loai: 'so', on: 'buoi4.html#cramer',
    gen(r, H) {
      let A, D; do { A = H.randMat(r, 2, 2, -5, 6); D = A[0][0] * A[1][1] - A[0][1] * A[1][0]; } while (D === 0 || Math.abs(D) > 12);
      const b = [r.int(-9, 12), r.int(-9, 12)]; const Dx = b[0] * A[1][1] - A[0][1] * b[1], Dy = A[0][0] * b[1] - b[0] * A[1][0];
      const ask = r.bool(); const Ab = A.map((row, i) => row.concat([b[i]]));
      return { q: 'Giải hệ $' + H.system(Ab, ['x', 'y']) + '$ bằng quy tắc Cramer. Tìm $' + (ask ? 'x' : 'y') + '$.', a: F(ask ? Dx : Dy, D),
        giai: '$D=' + D + ',\\ D_x=' + Dx + ',\\ D_y=' + Dy + '$. $' + (ask ? 'x=\\dfrac{D_x}{D}=' + F(Dx, D).tex() : 'y=\\dfrac{D_y}{D}=' + F(Dy, D).tex()) + '$.' };
    } });

  K.item({ id: 'b4.cramer-dj', bai: 'b4', muc: '1.2.2', cdr: 'KN4', md: 'TH', loai: 'so', on: 'buoi4.html#cramer',
    gen(r, H) {
      let A; do { A = H.randMat(r, 3, 3, -3, 4); } while (H.det(A).isZero() || H.zeros(A) > 2);
      const b = [r.int(-6, 9), r.int(-6, 9), r.int(-6, 9)]; const j = r.int(1, 3);
      const Aj = A.map((row, i) => row.map((x, c) => (c === j - 1 ? b[i] : x)));
      return { q: 'Cho hệ $' + H.system(A.map((row, i) => row.concat([b[i]]))) + '$. Tính định thức $D_' + j + '$ trong quy tắc Cramer.', a: H.det(Aj),
        giai: '$D_' + j + '$: thay <b>cột ' + j + '</b> của ma trận hệ số bởi cột hệ số tự do: $D_' + j + '=' + H.vdet(Aj) + '=' + H.det(Aj).tex() + '$.' };
    } });

  K.item({ id: 'b4.kc', bai: 'b4', muc: '1.2.4', cdr: 'KN4', md: 'TH', loai: 'mc', on: 'buoi4.html#kronecker',
    gen(r) {
      const n = r.int(3, 5); const t = r.int(0, 2); let ra, rb;
      if (t === 0) { ra = r.int(1, n - 1); rb = ra + 1; } else if (t === 1) { ra = rb = n; } else { ra = rb = r.int(1, n - 1); }
      const k = n - ra; const many = 'Có vô số nghiệm, phụ thuộc ' + k + ' tham số';
      const correct = t === 0 ? 'Vô nghiệm' : t === 1 ? 'Có nghiệm duy nhất' : many;
      const wrong = ['Vô nghiệm', 'Có nghiệm duy nhất', many, 'Có vô số nghiệm, phụ thuộc ' + (t === 2 ? ra : n - ra + 1) + ' tham số'];
      return { q: 'Hệ phương trình tuyến tính ' + n + ' ẩn có $r(A)=' + ra + '$ và $r(\\overline A)=' + rb + '$. Khi đó hệ', opts: K.H.opts(correct, wrong, j => 'Có vô số nghiệm, phụ thuộc ' + (k + j + 1) + ' tham số'),
        giai: 'Định lý Kronecker – Capelli: $r(A)<r(\\overline A)$ ⇒ vô nghiệm; $r(A)=r(\\overline A)=n$ ⇒ nghiệm duy nhất; $r(A)=r(\\overline A)=r<n$ ⇒ vô số nghiệm phụ thuộc $n-r$ tham số.' };
    } });

  K.item({ id: 'b4.gauss3', bai: 'b4', muc: '1.2.3', cdr: 'KN4', md: 'VD', loai: 'so', on: 'buoi4.html#gauss',
    gen(r, H) {
      const A = H.withDet(r, 3, r.pick([1, -1, 2, -2]), 6); const x = [r.int(-5, 6), r.int(-5, 6), r.int(-5, 6)];
      const b = A.map(row => row.reduce((s, a, j) => s + a * x[j], 0)); const k = r.int(1, 3);
      return { q: 'Giải hệ phương trình $' + H.system(A.map((row, i) => row.concat([b[i]]))) + '$. Tìm $x_' + k + '$.', a: x[k - 1],
        giai: 'Khử Gauss trên ma trận bổ sung đưa về bậc thang rồi thế ngược: nghiệm duy nhất $(x_1;x_2;x_3)=' + H.vec(x) + '$. Thử lại vào cả ba phương trình.' };
    } });

  K.item({ id: 'b4.loai-he', bai: 'b4', muc: '1.2.4', cdr: 'KN4', md: 'VD', loai: 'mc', on: 'buoi4.html#gauss-vd2',
    gen(r, H) {
      const t = r.int(0, 2); let Ab;
      if (t === 0) { const A = H.withDet(r, 3, r.pick([1, -1, 2, 3]), 6); const x = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]; Ab = A.map(row => row.concat([row.reduce((s, a, j) => s + a * x[j], 0)])); }
      else {
        let r1, r2; do { r1 = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]; r2 = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]; } while (H.rank([r1, r2]) < 2);
        const u = r.nz(-2, 2), v = r.nz(-2, 2); const b1 = r.int(-6, 8), b2 = r.int(-6, 8);
        const r3 = r1.map((x, j) => u * x + v * r2[j]); const b3 = u * b1 + v * b2 + (t === 2 ? r.nz(-3, 3) : 0);
        Ab = r.shuffle([r1.concat([b1]), r2.concat([b2]), r3.concat([b3])]);
        if (H.maxAbs(Ab) > 14) return this.gen(r, H);
      }
      const names = ['Có nghiệm duy nhất', 'Có vô số nghiệm', 'Vô nghiệm'];
      return { q: 'Hệ phương trình $' + H.system(Ab) + '$', opts: [names[t]].concat(names.filter((_, k) => k !== t), ['Có đúng hai nghiệm']),
        giai: t === 0 ? '$\\det A\\ne0$: hệ Cramer, nghiệm duy nhất.' : 'Một phương trình là tổ hợp tuyến tính của hai phương trình kia ở <b>vế trái</b>; ' + (t === 1 ? 'vế phải cũng khớp nên $r(A)=r(\\overline A)=2<3$: vô số nghiệm.' : 'vế phải không khớp nên $r(A)=2<r(\\overline A)=3$: vô nghiệm.') + ' Hệ tuyến tính không bao giờ có đúng hai nghiệm.' };
    } });

  K.item({ id: 'b4.can-bang', bai: 'b4', muc: '1.2.2', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi4.html#khoi-dong',
    gen(r, H) {
      for (;;) {
        const P1 = r.int(3, 12), P2 = r.int(3, 12);
        const t1 = r.int(2, 4), t2 = r.int(2, 4), s1 = r.int(1, 6), s2 = r.int(1, 6);
        const b1 = r.int(1, 3), c1 = r.int(1, 2), b2 = r.int(1, 3), c2 = r.int(1, 2);
        const Q1 = -s1 + t1 * P1, Q2 = -s2 + t2 * P2; if (Q1 <= 0 || Q2 <= 0) continue;
        const a1 = Q1 + b1 * P1 - c1 * P2, a2 = Q2 - c2 * P1 + b2 * P2; if (a1 <= 0 || a2 <= 0) continue;
        const ask = r.int(0, 3); const names = ['P_1', 'P_2', 'Q_1', 'Q_2'], vals = [P1, P2, Q1, Q2];
        const lbl = ['giá cân bằng của hàng 1', 'giá cân bằng của hàng 2', 'lượng cân bằng của hàng 1', 'lượng cân bằng của hàng 2'];
        return { q: 'Thị trường hai mặt hàng thay thế: hàng 1 có $Q_{d1}=' + a1 + '-' + (b1 === 1 ? '' : b1) + 'P_1+' + (c1 === 1 ? '' : c1) + 'P_2,\\ Q_{s1}=-' + s1 + '+' + t1 + 'P_1$; hàng 2 có $Q_{d2}=' + a2 + '+' + (c2 === 1 ? '' : c2) + 'P_1-' + (b2 === 1 ? '' : b2) + 'P_2,\\ Q_{s2}=-' + s2 + '+' + t2 + 'P_2$. Tìm ' + lbl[ask] + ' $' + names[ask] + '$.', a: vals[ask],
          giai: 'Cân bằng $Q_d=Q_s$: $' + H.system([[b1 + t1, -c1, a1 + s1], [-c2, b2 + t2, a2 + s2]], ['P_1', 'P_2']) + '$, giải được $P_1=' + P1 + ',\\ P_2=' + P2 + '$; lượng cân bằng $Q_1=' + Q1 + ',\\ Q_2=' + Q2 + '$.' };
      }
    } });

  K.item({ id: 'b4.phan-bo', bai: 'b4', muc: '1.2.3', cdr: 'NL', md: 'VD', loai: 'so', on: 'buoi4.html#bt-thuc-te',
    gen(r, H) {
      let A; do { A = H.randMat(r, 3, 3, 1, 4); } while (H.det(A).isZero());
      const x = [r.int(1, 8) * 5, r.int(1, 8) * 5, r.int(1, 8) * 5]; const b = A.map(row => row.reduce((s, a, j) => s + a * x[j], 0));
      const ctx = r.pick([['nguyên liệu', ['N1', 'N2', 'N3'], 'kg', 'Tồn kho (kg)'], ['công đoạn', ['Cắt', 'May', 'Hoàn thiện'], 'giờ', 'Quỹ giờ']]);
      const k = r.int(1, 3);
      const tbl = '<table class="tbl"><tr><th>' + ctx[0] + ' (' + ctx[2] + '/sản phẩm)</th><th class="c">SP I</th><th class="c">SP II</th><th class="c">SP III</th><th class="c">' + ctx[3] + '</th></tr>' +
        A.map((row, i) => '<tr><td>' + ctx[1][i] + '</td>' + row.map(v => '<td class="c">' + v + '</td>').join('') + '<td class="c">' + b[i] + '</td></tr>').join('') + '</table>';
      return { q: 'Một xưởng sản xuất ba loại sản phẩm I, II, III. Định mức sử dụng và lượng sẵn có:' + tbl + 'Cần sản xuất bao nhiêu sản phẩm loại ' + ['I', 'II', 'III'][k - 1] + ' để dùng vừa hết ' + ctx[0] + '?', a: x[k - 1],
        giai: 'Gọi $x_1,x_2,x_3$ là số sản phẩm mỗi loại: $' + H.system(A.map((row, i) => row.concat([b[i]]))) + '$, $D=' + H.det(A).tex() + '\\ne0$, nghiệm $' + H.vec(x) + '$.' };
    } });

  K.item({ id: 'b4.ds-he', bai: 'b4', muc: '1.2.5', cdr: 'KT1', md: 'TH', loai: 'ds', on: 'buoi4.html#thuan-nhat',
    gen(r) {
      const pool = [
        { t: 'Hệ thuần nhất luôn có nghiệm.', d: true },
        { t: 'Hệ thuần nhất $n$ ẩn có nghiệm không tầm thường khi và chỉ khi $r(A)<n$.', d: true },
        { t: 'Hệ thuần nhất có số phương trình nhỏ hơn số ẩn luôn có vô số nghiệm.', d: true },
        { t: 'Hệ thuần nhất vuông có $\\det A\\ne0$ chỉ có nghiệm tầm thường.', d: true },
        { t: 'Hệ có số phương trình nhiều hơn số ẩn thì vô nghiệm.', d: false },
        { t: 'Nếu $r(A)=r(\\overline A)$ thì hệ có nghiệm duy nhất.', d: false },
        { t: 'Nếu $r(A)<r(\\overline A)$ thì hệ vô nghiệm.', d: true },
        { t: 'Hệ có số phương trình bằng số ẩn luôn là hệ Cramer.', d: false },
        { t: 'Hệ không thuần nhất có $\\det A=0$ thì vô nghiệm.', d: false }
      ];
      return { q: 'Xét hệ phương trình tuyến tính với ma trận hệ số $A$, ma trận bổ sung $\\overline A$. Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: 'Hệ Cramer cần thêm $\\det A\\ne0$. $r(A)=r(\\overline A)$ chỉ bảo đảm có nghiệm (duy nhất khi bằng số ẩn). $\\det A=0$ thì hệ có thể vô nghiệm hoặc vô số nghiệm.' };
    } });

  K.item({ id: 'b4.so-tham-so', bai: 'b4', muc: '1.2.5', cdr: 'KN4', md: 'TH', loai: 'so', on: 'buoi4.html#thuan-nhat-vd',
    gen(r, H) {
      const [m, n] = r.pick([[3, 4], [3, 5], [4, 4], [4, 5]]); const rk = r.int(1, Math.min(m, n) - (m === n ? 1 : 0));
      const A = H.rankMat(r, m, n, Math.max(2, rk), 12); const rr = H.rank(A);
      return { q: 'Nghiệm tổng quát của hệ thuần nhất $' + H.system(A.map(row => row.concat([0]))) + '$ phụ thuộc bao nhiêu tham số?', a: n - rr,
        giai: '$r(A)=' + rr + '$, số ẩn $n=' + n + '$: số tham số (số ẩn tự do) bằng $n-r=' + (n - rr) + '$ — cũng là số chiều không gian nghiệm.' };
    } });

  K.item({ id: 'b4.nghiem-tq', bai: 'b4', muc: '1.2.3', cdr: 'KN4', md: 'VDC', loai: 'so', on: 'buoi4.html#gauss-vd2',
    gen(r, H) {
      for (;;) {
        const v = [r.int(-3, 3), r.int(-3, 3), 1]; const p = [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)];
        const row = () => { const a = r.int(-3, 4), b = r.int(-3, 4); return [a, b, -(a * v[0] + b * v[1])]; };
        const r1 = row(), r2 = row(); if (H.rank([r1, r2]) < 2) continue;
        const u = r.nz(-2, 2), w = r.nz(-2, 2); const r3 = r1.map((x, j) => u * x + w * r2[j]);
        const rows = [r1, r2, r3].map(rw => rw.concat([rw.reduce((s, a, j) => s + a * p[j], 0)]));
        if (H.maxAbs(rows) > 15) continue;
        const k = r.int(-5, 6); const x = p.map((pi, j) => pi + (k - p[2]) * v[j]);
        return { q: 'Hệ $' + H.system(r.shuffle(rows)) + '$ có vô số nghiệm. Tìm $x_1$ của nghiệm thỏa mãn $x_3=' + k + '$.', a: x[0],
          giai: 'Khử Gauss: $r(A)=r(\\overline A)=2<3$, chọn $x_3=c$ làm ẩn tự do được $x_1=' + linM([v[0], p[0] - v[0] * p[2]], ['c', '']) + ',\\ x_2=' + linM([v[1], p[1] - v[1] * p[2]], ['c', '']) + '$. Với $c=' + k + '$: nghiệm $' + H.vec(x) + '$.' };
      }
    } });

  /* ===================================================================== BUỔI 5 · KHÔNG GIAN VÉCTƠ */
  K.item({ id: 'b5.kg-con', bai: 'b5', muc: '1.3.1', cdr: 'KT4', md: 'NB', loai: 'mc', on: 'buoi5.html#kg-con',
    gen(r) {
      const a = r.nz(-3, 3), b = r.nz(-3, 3);
      const yes = r.pick(['$\\{(x;y;z)\\in\\mathbb R^3:\\ x' + (a < 0 ? '-' : '+') + Math.abs(a) + 'y' + (b < 0 ? '-' : '+') + Math.abs(b) + 'z=0\\}$', '$\\{(x;y)\\in\\mathbb R^2:\\ y=' + a + 'x\\}$', '$\\{(x;y;z)\\in\\mathbb R^3:\\ x=0,\\ y=z\\}$']);
      const no = r.sample(['$\\{(x;y)\\in\\mathbb R^2:\\ x+y=1\\}$', '$\\{(x;y)\\in\\mathbb R^2:\\ x\\ge0\\}$', '$\\{(x;y)\\in\\mathbb R^2:\\ xy=0\\}$', '$\\{(x;y)\\in\\mathbb R^2:\\ y=x^2\\}$', '$\\{(x;y;z)\\in\\mathbb R^3:\\ x=' + Math.abs(a) + '\\}$'], 3);
      return { q: 'Tập nào sau đây là không gian véctơ con?', opts: [yes].concat(no),
        giai: 'Không gian con phải chứa $\\vec0$ và đóng với phép cộng, nhân số. Tập nghiệm của hệ phương trình tuyến tính <b>thuần nhất</b> luôn là không gian con; tập không chứa $\\vec0$ (như $x+y=1$) hay không đóng với phép cộng/nhân số (như $x\\ge0$, $xy=0$, $y=x^2$) thì không.' };
    } });

  K.item({ id: 'b5.dim', bai: 'b5', muc: '1.3.3', cdr: 'KT4', md: 'NB', loai: 'so', on: 'buoi5.html#co-so',
    gen(r) {
      const v = r.int(0, 2); const n = r.int(2, 6), m = r.int(2, 4);
      const c = [['\\mathbb R^{' + n + '}', n, 'Cơ sở chính tắc gồm ' + n + ' véctơ.'],
        ['\\mathcal M_{' + m + '\\times ' + n + '}(\\mathbb R)', m * n, 'Cơ sở gồm $' + m + '\\cdot' + n + '$ ma trận chỉ có một phần tử bằng 1.'],
        ['\\mathbb R_{' + n + '}[x]', n + 1, 'Cơ sở $\\{1,x,\\dots,x^{' + n + '}\\}$ gồm $' + (n + 1) + '$ véctơ (đa thức bậc không quá ' + n + ').']][v];
      return { q: 'Số chiều của không gian véctơ $' + c[0] + '$ bằng bao nhiêu?', a: c[1], giai: c[2] };
    } });

  K.item({ id: 'b5.dltt3', bai: 'b5', muc: '1.3.2', cdr: 'KN5', md: 'TH', loai: 'mc', on: 'buoi5.html#tieu-chuan',
    gen(r, H) {
      const indep = r.bool(); const A = indep ? H.withDet(r, 3, r.pick([1, -1, 2, -3, 4, 5]), 6) : H.rankMat(r, 3, 3, 2, 9);
      const vs = A.map((row, i) => '\\vec\\alpha_' + (i + 1) + '=' + H.vec(row)).join(',\\ ');
      return { q: 'Trong $\\mathbb R^3$ cho hệ $' + vs + '$. Khẳng định nào đúng?',
        opts: indep ? ['Hệ độc lập tuyến tính và là một cơ sở của $\\mathbb R^3$', 'Hệ phụ thuộc tuyến tính', 'Hệ độc lập tuyến tính nhưng không là cơ sở của $\\mathbb R^3$', 'Không đủ dữ kiện để kết luận']
          : ['Hệ phụ thuộc tuyến tính', 'Hệ độc lập tuyến tính và là một cơ sở của $\\mathbb R^3$', 'Hệ độc lập tuyến tính nhưng không là cơ sở của $\\mathbb R^3$', 'Không đủ dữ kiện để kết luận'],
        giai: 'Lập ma trận có các dòng là véctơ: $\\det=' + H.det(A).tex() + '$. ' + (indep ? 'Khác 0 nên hệ ĐLTT; 3 véctơ ĐLTT trong không gian 3 chiều là một cơ sở.' : 'Bằng 0 nên hệ PTTT.') };
    } });

  K.item({ id: 'b5.pttt-m', bai: 'b5', muc: '1.3.2', cdr: 'KN5', md: 'TH', loai: 'so', on: 'buoi5.html#tieu-chuan',
    gen(r, H) {
      const P = H.paramMat(r, 3, 8);
      return { q: 'Tìm $m$ để hệ véctơ $' + P.A.map((row, i) => '\\vec\\alpha_' + (i + 1) + '=' + H.vec(row)).join(',\\ ') + '$ phụ thuộc tuyến tính.', a: P.m0,
        giai: 'Hệ 3 véctơ trong $\\mathbb R^3$ PTTT $\\iff\\det=0$. Định thức là biểu thức bậc nhất theo $m$, bằng 0 khi $m=' + P.m0 + '$.' };
    } });

  K.item({ id: 'b5.to-hop', bai: 'b5', muc: '1.3.2', cdr: 'KN6', md: 'VD', loai: 'so', on: 'buoi5.html#to-hop',
    gen(r, H) {
      const U = H.unimod(r, 3, 5); const c = [r.nz(-3, 4), r.nz(-3, 4), r.nz(-3, 4)];
      const al = [0, 1, 2].map(j => U.map(row => row[j])); const be = [0, 1, 2].map(i => U[i].reduce((s, u, j) => s + u * c[j], 0));
      const k = r.int(1, 3); const nm = ['x', 'y', 'z'];
      return { q: 'Trong $\\mathbb R^3$ cho $' + al.map((v, j) => '\\vec\\alpha_' + (j + 1) + '=' + H.vec(v)).join(',\\ ') + '$ và $\\vec\\beta=' + H.vec(be) + '$. Biết $\\vec\\beta=x\\vec\\alpha_1+y\\vec\\alpha_2+z\\vec\\alpha_3$. Tìm $' + nm[k - 1] + '$.', a: c[k - 1],
        giai: 'Giải hệ có các <b>cột</b> là $\\vec\\alpha_1,\\vec\\alpha_2,\\vec\\alpha_3$, cột tự do là $\\vec\\beta$: $(x;y;z)=' + H.vec(c) + '$. Thử lại: $' + c.map((x, j) => '(' + x + ')\\vec\\alpha_' + (j + 1)).join('+') + '=\\vec\\beta$.' };
    } });

  K.item({ id: 'b5.hang-he', bai: 'b5', muc: '1.3.3', cdr: 'KN5', md: 'TH', loai: 'so', on: 'buoi5.html#co-so-con',
    gen(r, H) {
      const rk = r.int(2, 3); const A = H.rankMat(r, 4, 4, rk, 10);
      return { q: 'Tìm hạng của hệ véctơ $' + A.map((row, i) => '\\vec\\alpha_' + (i + 1) + '=' + H.vec(row)).join(',\\ ') + '$ trong $\\mathbb R^4$.', a: rk,
        giai: 'Lập ma trận có các dòng là véctơ, đưa về bậc thang: còn ' + rk + ' dòng khác 0 ⇒ hạng của hệ bằng ' + rk + ' (bằng số chiều của không gian sinh bởi hệ).' };
    } });

  K.item({ id: 'b5.toa-do2', bai: 'b5', muc: '1.3.4', cdr: 'KN6', md: 'TH', loai: 'so', on: 'buoi5.html#toa-do',
    gen(r, H) {
      const U = H.unimod(r, 2, 5); const c = [r.nz(-4, 5), r.nz(-4, 5)];
      const u = [U[0][0], U[1][0]], v = [U[0][1], U[1][1]]; const w = [0, 1].map(i => c[0] * u[i] + c[1] * v[i]);
      const k = r.int(1, 2);
      return { q: 'Trong $\\mathbb R^2$ cho cơ sở $\\vec u=' + H.vec(u) + ',\\ \\vec v=' + H.vec(v) + '$ và $\\vec w=' + H.vec(w) + '$. Tọa độ của $\\vec w$ đối với cơ sở $(\\vec u,\\vec v)$ là $(a;b)$. Tìm $' + (k === 1 ? 'a' : 'b') + '$.', a: c[k - 1],
        giai: 'Giải $a\\vec u+b\\vec v=\\vec w$: $' + H.system([[u[0], v[0], w[0]], [u[1], v[1], w[1]]], ['a', 'b']) + '$, được $(a;b)=' + H.vec(c) + '$.' };
    } });

  K.item({ id: 'b5.toa-do3', bai: 'b5', muc: '1.3.4', cdr: 'KN6', md: 'VD', loai: 'so', on: 'buoi5.html#toa-do',
    gen(r, H) {
      const U = H.unimod(r, 3, 4); const c = [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)];
      const xi = [0, 1, 2].map(j => U.map(row => row[j])); const al = [0, 1, 2].map(i => U[i].reduce((s, u, j) => s + u * c[j], 0)); const k = r.int(1, 3);
      return { q: 'Trong $\\mathbb R^3$ cho cơ sở $(\\xi)$: $' + xi.map((v, j) => '\\vec\\xi_' + (j + 1) + '=' + H.vec(v)).join(',\\ ') + '$ và $\\vec\\alpha=' + H.vec(al) + '$. Tìm tọa độ thứ ' + k + ' của $\\vec\\alpha$ đối với cơ sở $(\\xi)$.', a: c[k - 1],
        giai: 'Giải hệ có các cột là $\\vec\\xi_1,\\vec\\xi_2,\\vec\\xi_3$, cột tự do là $\\vec\\alpha$: tọa độ $' + H.vec(c) + '$.' };
    } });

  K.item({ id: 'b5.ds-dltt', bai: 'b5', muc: '1.3.2', cdr: 'KT4', md: 'TH', loai: 'ds', on: 'buoi5.html#dltt',
    gen(r) {
      const pool = [
        { t: 'Hệ chứa véctơ $\\vec0$ luôn phụ thuộc tuyến tính.', d: true },
        { t: 'Hệ con của một hệ độc lập tuyến tính là hệ độc lập tuyến tính.', d: true },
        { t: 'Hệ con của một hệ phụ thuộc tuyến tính là hệ phụ thuộc tuyến tính.', d: false },
        { t: 'Trong $\\mathbb R^3$, mọi hệ gồm 4 véctơ đều phụ thuộc tuyến tính.', d: true },
        { t: 'Trong $\\mathbb R^3$, mọi hệ gồm 3 véctơ đều là một cơ sở.', d: false },
        { t: 'Hệ hai véctơ phụ thuộc tuyến tính khi và chỉ khi chúng tỉ lệ với nhau.', d: true },
        { t: 'Nếu $\\vec\\alpha_3=\\vec\\alpha_1+\\vec\\alpha_2$ thì hệ $\\{\\vec\\alpha_1,\\vec\\alpha_2,\\vec\\alpha_3\\}$ độc lập tuyến tính.', d: false },
        { t: 'Tọa độ của một véctơ đối với một cơ sở cho trước là duy nhất.', d: true },
        { t: 'Không gian $\\mathbb R^n$ chỉ có đúng một cơ sở.', d: false },
        { t: 'Hệ $n$ véctơ trong $\\mathbb R^n$ độc lập tuyến tính khi và chỉ khi định thức của ma trận tạo bởi chúng khác 0.', d: true }
      ];
      return { q: 'Mỗi khẳng định sau đúng hay sai?', y: mix(r, pool, 4),
        giai: 'Hệ con của hệ PTTT có thể ĐLTT (ví dụ bỏ véctơ $\\vec0$). 3 véctơ trong $\\mathbb R^3$ chỉ là cơ sở khi ĐLTT. $\\mathbb R^n$ có vô số cơ sở, nhưng mọi cơ sở đều có $n$ véctơ.' };
    } });

  K.item({ id: 'b5.ma-tran-chuyen', bai: 'b5', muc: '1.3.4', cdr: 'KN6', md: 'VD', loai: 'so', on: 'buoi5.html#ma-tran-chuyen',
    gen(r, H) {
      for (;;) {
        const U = H.unimod(r, 3, 5); let i, j; do { i = r.int(1, 3); j = r.int(1, 3); } while (i === j);
        if (U[i - 1][j - 1] === U[j - 1][i - 1]) continue;
        const xi = [0, 1, 2].map(c => U.map(row => row[c]));
        return { q: 'Trong $\\mathbb R^3$ cho cơ sở $(\\xi)$: $' + xi.map((v, c) => '\\vec\\xi_' + (c + 1) + '=' + H.vec(v)).join(',\\ ') + '$. Gọi $T$ là ma trận chuyển từ cơ sở chính tắc $(\\varepsilon)$ sang cơ sở $(\\xi)$. Tìm phần tử $t' + ijs(i, j) + '$ (dòng ' + i + ', cột ' + j + ').', a: U[i - 1][j - 1],
          giai: 'Cột $j$ của $T$ là tọa độ của $\\vec\\xi_j$ đối với $(\\varepsilon)$, tức chính các thành phần của $\\vec\\xi_j$. $t' + ijs(i, j) + '$ là thành phần thứ ' + i + ' của $\\vec\\xi_' + j + '$: bằng $' + U[i - 1][j - 1] + '$. Lỗi hay gặp: viết tọa độ thành dòng (được $' + U[j - 1][i - 1] + '$).' };
      }
    } });

  K.item({ id: 'b5.he-tham-so', bai: 'b5', muc: '1.2.4', cdr: 'KN4', md: 'VD', loai: 'so', on: 'buoi5.html#bt122',
    gen(r, H) {
      for (;;) {
        const n = r.pick([3, 4]); const r1 = Array.from({ length: n }, () => r.int(-3, 4)), r2 = Array.from({ length: n }, () => r.int(-3, 4));
        if (H.rank([r1, r2]) < 2) continue;
        const u = r.nz(-2, 2), v = r.nz(-2, 2), b1 = r.int(-6, 9), b2 = r.int(-6, 9);
        const r3 = r1.map((x, j) => u * x + v * r2[j]); const a0 = u * b1 + v * b2;
        const rows = [r1.concat([b1]), r2.concat([b2]), r3.concat(['a'])]; if (H.maxAbs([r1, r2, r3]) > 12) continue;
        const vars = Array.from({ length: n }, (_, j) => 'x_{' + (j + 1) + '}');
        const sys = '\\begin{cases}' + rows.map(row => H.lin(row.slice(0, n), vars) + ' = ' + row[n]).join('\\\\ ') + '\\end{cases}';
        return { q: 'Tìm giá trị của tham số $a$ để hệ $' + sys + '$ có nghiệm.', a: a0,
          giai: 'Vế trái: $(\\text{pt }3)=' + coef(u, '(\\text{pt }1)', true) + coef(v, '(\\text{pt }2)') + '$. Hệ có nghiệm $\\iff r(A)=r(\\overline A)\\iff$ vế phải cũng thỏa: $a=' + u + '\\cdot(' + b1 + ')+' + '(' + v + ')\\cdot(' + b2 + ')=' + a0 + '$.' };
      }
    } });

  /* ===================================================================== BUỔI 6 · LUYỆN TẬP, ÔN CHƯƠNG */
  K.item({ id: 'b6.dim-w', bai: 'b6', muc: '1.3.3', cdr: 'KN5', md: 'TH', loai: 'so', on: 'buoi6.html#dang4',
    gen(r, H) {
      const n = r.pick([4, 5]), m = r.pick([2, 3]); const rk = r.int(1, m);
      const A = H.rankMat(r, m, n, rk, 10);
      const vars = Array.from({ length: n }, (_, j) => 'x_' + (j + 1));
      return { q: 'Tìm số chiều của không gian con $W=\\{(' + vars.join(';') + ')\\in\\mathbb R^' + n + ':\\ ' + A.map(row => H.lin(row, vars) + '=0').join(',\\ ') + '\\}$.', a: n - rk,
        giai: '$W$ là không gian nghiệm của hệ thuần nhất: $\\dim W=n-r(A)=' + n + '-' + rk + '=' + (n - rk) + '$; cơ sở là hệ nghiệm cơ bản.' };
    } });

  K.item({ id: 'b6.dim-span', bai: 'b6', muc: '1.3.3', cdr: 'KN5', md: 'TH', loai: 'so', on: 'buoi6.html#dang3',
    gen(r, H) {
      const rk = r.int(2, 4); const A = H.rankMat(r, 4, 5, rk, 10);
      return { q: 'Tìm số chiều của không gian con của $\\mathbb R^5$ sinh bởi các véctơ $' + A.map((row, i) => '\\vec\\alpha_' + (i + 1) + '=' + H.vec(row)).join(',\\ ') + '$.', a: rk,
        giai: '$\\dim\\operatorname{span}\\{\\vec\\alpha_i\\}$ = hạng của hệ = hạng ma trận có các dòng là véctơ $=' + rk + '$. Các dòng khác 0 của dạng bậc thang là một cơ sở.' };
    } });

  K.item({ id: 'b6.da-thuc-pttt', bai: 'b6', muc: '1.3.2', cdr: 'KN5', md: 'VD', loai: 'so', on: 'buoi6.html#dang5b',
    gen(r, H) {
      const P = H.paramMat(r, 3, 7);
      const fs = P.A.map((row, i) => 'f_' + (i + 1) + '=' + polyM(row));
      return { q: 'Trong $\\mathbb R_2[x]$ cho $' + fs.join(',\\ ') + '$. Tìm $m$ để hệ $\\{f_1,f_2,f_3\\}$ phụ thuộc tuyến tính.', a: P.m0,
        giai: 'Đồng nhất mỗi đa thức với véctơ hệ số theo $1,x,x^2$; hệ PTTT $\\iff\\det' + H.mat(P.A) + '=0\\iff m=' + P.m0 + '$.' };
    } });
  function polyM(c) { return linM(c, ['', 'x', 'x^2']); }   // đa thức có thể chứa tham số m

  K.item({ id: 'b6.toa-do-dt', bai: 'b6', muc: '1.3.4', cdr: 'KN6', md: 'VD', loai: 'so', on: 'buoi6.html#dang5b',
    gen(r, H) {
      const U = H.unimod(r, 3, 5); const c = [r.nz(-4, 5), r.nz(-4, 5), r.int(-4, 5)];
      const fs = [0, 1, 2].map(j => U.map(row => row[j])); const f = [0, 1, 2].map(i => U[i].reduce((s, u, j) => s + u * c[j], 0)); const k = r.int(1, 3);
      return { q: 'Trong $\\mathbb R_2[x]$ cho cơ sở $' + fs.map((v, j) => 'f_' + (j + 1) + '=' + H.poly(v)).join(',\\ ') + '$ và $f=' + H.poly(f) + '$. Tìm tọa độ thứ ' + k + ' của $f$ đối với cơ sở $\\{f_1,f_2,f_3\\}$.', a: c[k - 1],
        giai: 'Đồng nhất hệ số của $1,x,x^2$ trong $f=y_1f_1+y_2f_2+y_3f_3$, giải hệ: $(y_1;y_2;y_3)=' + H.vec(c) + '$.' };
    } });

  K.item({ id: 'b6.doi-co-so', bai: 'b6', muc: '1.3.4', cdr: 'KN6', md: 'VD', loai: 'so', on: 'buoi6.html#dang5',
    gen(r, H) {
      const U = H.unimod(r, 3, 4); const c = [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)]; const x = [0, 1, 2].map(i => U[i].reduce((s, u, j) => s + u * c[j], 0));
      const k = r.int(1, 3);
      return { q: 'Ma trận chuyển từ cơ sở chính tắc $(\\varepsilon)$ sang cơ sở $(\\xi)$ của $\\mathbb R^3$ là $T=' + H.mat(U) + '$. Véctơ $\\vec x$ có tọa độ đối với $(\\xi)$ là $' + H.vec(c) + '$. Tìm tọa độ thứ ' + k + ' của $\\vec x$ đối với cơ sở chính tắc.', a: x[k - 1],
        giai: '$[\\vec x]_{\\varepsilon}=T\\,[\\vec x]_{\\xi}=' + H.mat(U) + H.mat(c.map(v => [v])) + '=' + H.mat(x.map(v => [v])) + '$.' };
    } });

  K.item({ id: 'b6.soi-chi', bai: 'b6', muc: '1.1 – 1.3', cdr: 'KT1', md: 'TH', loai: 'mc', on: 'buoi6.html#so-do',
    gen(r) {
      const wrongs = ['Các dòng của $A$ phụ thuộc tuyến tính.', '$r(A)<n$.', 'Hệ $Ax=0$ có nghiệm không tầm thường.', 'Hệ $Ax=b$ có vô số nghiệm với mọi $b$.'];
      const eqs = ['$r(A)=n$.', '$A$ khả nghịch.', 'Hệ $Ax=b$ có nghiệm duy nhất với mọi $b$.', 'Các cột của $A$ độc lập tuyến tính.', 'Hệ $Ax=0$ chỉ có nghiệm tầm thường.'];
      return { q: 'Cho $A$ là ma trận vuông cấp $n$. Khẳng định nào sau đây <b>không</b> tương đương với $\\det A\\ne0$?', opts: [r.pick(wrongs)].concat(r.sample(eqs, 3)),
        giai: 'Sợi chỉ xuyên suốt Chương 1: $\\det A\\ne0\\iff r(A)=n\\iff A$ khả nghịch $\\iff Ax=b$ có nghiệm duy nhất $\\iff Ax=0$ chỉ có nghiệm tầm thường $\\iff$ các dòng (cột) của $A$ ĐLTT.' };
    } });

  K.item({ id: 'b6.ds-tong-hop', bai: 'b6', muc: '1.1 – 1.3', cdr: 'KN4', md: 'VD', loai: 'ds', on: 'buoi6.html#so-do',
    gen(r, H) {
      const sing = r.bool(); const A = sing ? H.rankMat(r, 3, 3, 2, 8) : H.withDet(r, 3, r.pick([1, -1, 2, -2, 3, 5, -4]), 7);
      const d = H.det(A); const showTrue = r.bool(); const shown = showTrue ? d : d.add(r.pick([1, -1, 2]));
      const y = [
        { t: '$\\det A=' + shown.tex() + '$.', d: showTrue },
        r.bool() ? { t: '$r(A)=3$.', d: !sing } : { t: '$r(A)=2$.', d: sing },
        r.bool() ? { t: 'Ma trận $A$ khả nghịch.', d: !sing } : { t: 'Các dòng của $A$ phụ thuộc tuyến tính.', d: sing },
        r.bool() ? { t: 'Hệ $Ax=0$ chỉ có nghiệm tầm thường.', d: !sing } : { t: 'Hệ $Ax=0$ có vô số nghiệm.', d: sing }
      ];
      return { q: 'Cho $A=' + H.mat(A) + '$. Mỗi khẳng định sau đúng hay sai?', y,
        giai: '$\\det A=' + d.tex() + (sing ? '=0$ nên $r(A)=2$, $A$ không khả nghịch, các dòng PTTT, hệ $Ax=0$ có vô số nghiệm.' : '\\ne0$ nên $r(A)=3$, $A$ khả nghịch, các dòng ĐLTT, hệ $Ax=0$ chỉ có nghiệm tầm thường.') };
    } });

  K.item({ id: 'b6.thuan-nhat-m', bai: 'b6', muc: '1.2.5', cdr: 'KN4', md: 'VDC', loai: 'so', on: 'buoi6.html#so-do',
    gen(r, H) {
      const P = H.paramMat(r, 3, 7); const vars = ['x', 'y', 'z'];
      const sys = '\\begin{cases}' + P.A.map(row => linM(row, vars) + ' = 0').join('\\\\ ') + '\\end{cases}';
      return { q: 'Tìm $m$ để hệ phương trình $' + sys + '$ có nghiệm không tầm thường.', a: P.m0,
        giai: 'Hệ thuần nhất vuông có nghiệm không tầm thường $\\iff\\det A=0$. $\\det A$ bậc nhất theo $m$, bằng 0 khi $m=' + P.m0 + '$.' };
    } });

  /* ===================================================================== CÁC BÀI KIỂM TRA */
  const L = (NB, TH, VD, VDC) => ({ NB, TH, VD, VDC });
  const ten = ['Ma trận', 'Định thức và ma trận nghịch đảo', 'Luyện tập định thức, nghịch đảo, Leontief', 'Hệ phương trình tuyến tính', 'Không gian véctơ', 'Không gian véctơ, ôn tập chương'];
  const plan = [
    [[{ tu: ['b1'], md: L(3, 4, 2, 1) }], 20],
    [[{ tu: ['b2'], md: L(3, 4, 3, 0) }], 20],
    [[{ tu: ['b3'], md: L(1, 3, 3, 1) }, { tu: ['b2'], md: L(0, 1, 1, 0) }], 25],
    [[{ tu: ['b4'], md: L(1, 4, 4, 1) }], 25],
    [[{ tu: ['b5'], md: L(2, 4, 4, 0) }], 20],
    [[{ tu: ['b6'], md: L(0, 3, 4, 1) }, { tu: ['b5'], md: L(1, 1, 0, 0) }], 25]
  ];
  plan.forEach(([cau, phut], k) => {
    const b = 'b' + (k + 1);
    K.test(b, { ten: 'Kiểm tra sau Buổi ' + (k + 1), mo_ta: ten[k], chuong: 'chuong1', buoi: 'buoi' + (k + 1) + '.html', loai: 'buoi', phut, so_lan: 3, xem_giai: true, cau });
  });
  plan.forEach((_, k) => {
    const b = 'b' + (k + 1);
    K.test('lt-' + b, { ten: 'Luyện tập Buổi ' + (k + 1), mo_ta: ten[k], chuong: 'chuong1', buoi: 'buoi' + (k + 1) + '.html', loai: 'luyen', phut: 0, so_lan: 0, xem_giai: true, cau: [{ tu: [b], md: L(1, 2, 2, 0) }] });
  });
  K.test('c1', { ten: 'Kiểm tra Chương 1', mo_ta: 'Ma trận · Định thức · Hệ phương trình · Không gian véctơ', chuong: 'chuong1', loai: 'chuong', phut: 45, so_lan: 1, xem_giai: false,
    cau: [
      { tu: ['b1'], md: L(1, 1, 1, 0) }, { tu: ['b2'], md: L(1, 1, 1, 0) }, { tu: ['b3'], md: L(0, 1, 1, 1) },
      { tu: ['b4'], md: L(1, 1, 2, 1) }, { tu: ['b5'], md: L(1, 1, 1, 0) }, { tu: ['b6'], md: L(0, 1, 2, 0) }
    ] });
})(typeof window !== 'undefined' ? window.TKTKT : globalThis.TKTKT);

TKTKT.version = '9f18138af2';
