/* Ngân hàng bài toán của Xưởng Hình học.
   Mỗi bài "khám phá" đi theo chu trình: Quan sát → Dự đoán → Kiểm nghiệm → Vì sao (gợi ý, chứng minh) → Mở rộng.
   Mỗi "thử thách dựng hình" có mục tiêu được chấm bằng phép thử kéo thả (biến đổi ngẫu nhiên các dữ kiện).

   Cách viết thêm bài: thêm một phần tử vào mảng, hàm build(K) dựng hình bằng bộ dựng K và trả về
   các đối tượng được đặt tên để phần kiểm nghiệm / gợi ý tham chiếu. Tọa độ tính bằng điểm ảnh
   (40 điểm ảnh = 1 đơn vị), trục y hướng xuống. Tùy chọn: {aux:true} nét đứt, {hidden:true} ẩn tới khi gợi ý,
   {color:'pen'|'blue'|'ok'} màu. */
window.HH_MISSIONS = [
  {
    id: 'euler', kind: 'explore', title: 'Đường thẳng Euler', tag: 'Tam giác · Lớp 10',
    intro: 'Tam giác $ABC$ có trọng tâm $G$ (giao hai trung tuyến), trực tâm $H$ (giao hai đường cao) và tâm đường tròn ngoại tiếp $O$.',
    todo: ['Kéo các đỉnh $A, B, C$: tạo tam giác nhọn, tam giác tù, tam giác gần vuông.', 'Quan sát vị trí của ba điểm $O, G, H$ và hai số đo $GH$, $GO$.'],
    build(K) {
      const A = K.pt('A', -50, -160), B = K.pt('B', -210, 110), C = K.pt('C', 200, 110);
      const bc = K.seg(B, C), ca = K.seg(C, A); K.seg(A, B);
      const M = K.mid('M', B, C), N = K.mid('N', C, A), P = K.mid('P', A, B, { hidden: true });
      const G = K.inter('G', K.seg(A, M, { aux: true }), K.seg(B, N, { aux: true }), 0, { color: 'ok' });
      const H = K.inter('H', K.perp(A, bc, { aux: true }), K.perp(B, ca, { aux: true }), 0, { color: 'pen' });
      const O = K.center('O', K.circ3(A, B, C, { aux: true }), { color: 'blue' });
      const GH = K.len(G, H), GO = K.len(G, O);
      return { A, B, C, M, N, P, G, H, O, GH, GO };
    },
    predict: {
      q: 'Ba điểm $O, G, H$ có quan hệ gì?',
      opts: ['Luôn thẳng hàng, và $GH = 2\\,GO$', 'Chỉ thẳng hàng khi tam giác cân', 'Luôn thẳng hàng, nhưng tỉ số $GH : GO$ thay đổi', 'Không có quan hệ đặc biệt'],
      ans: 0, why: 'Leonhard Euler phát hiện điều này năm 1765. Nhưng đừng tin vì “sách nói vậy” — hãy kiểm nghiệm.'
    },
    verify: { text: 'Hai giả thuyết: “$O, G, H$ thẳng hàng” và “tỉ số $GH : GO$ không đổi”. Công cụ sẽ thử trên 300 tam giác ngẫu nhiên.', checks: [['collinear', ['O', 'G', 'H']], ['ratio', ['GH', 'GO']]] },
    hints: [
      { t: 'Phép biến hình nào biến tam giác $ABC$ thành tam giác có ba đỉnh là trung điểm ba cạnh (tam giác trung bình $MNP$)?', show: ['P'] },
      { t: 'Phép vị tự tâm $G$ tỉ số $-\\tfrac12$ biến $A \\mapsto M$, $B \\mapsto N$, $C \\mapsto P$. Đường cao kẻ từ $A$ (vuông góc $BC$) biến thành đường thẳng nào?' },
      { t: 'Ảnh của đường cao từ $A$ đi qua $M$ và vẫn vuông góc với $BC$: đó là <b>đường trung trực</b> của $BC$. Vậy trực tâm $H$ biến thành điểm nào?' }
    ],
    proof: 'Gọi $V$ là phép vị tự tâm $G$, tỉ số $-\\tfrac12$. Vì $\\overrightarrow{GM} = -\\tfrac12\\overrightarrow{GA}$ nên $V(A) = M$; tương tự $V(B) = N$, $V(C) = P$. Phép vị tự biến một đường thẳng thành đường thẳng song song với nó, nên đường cao qua $A$ ($\\perp BC$) biến thành đường thẳng qua $M$ vuông góc $BC$ — trung trực của $BC$. Tương tự, đường cao qua $B$ biến thành trung trực của $CA$. Do đó $V(H)$ là giao của hai trung trực, tức $V(H) = O$. Vậy $\\overrightarrow{GO} = -\\tfrac12\\overrightarrow{GH}$: ba điểm $O, G, H$ thẳng hàng và $GH = 2\\,GO$. $\\blacksquare$',
    extend: [
      'Khi nào $O, G, H$ trùng nhau? Chứng minh cả chiều ngược lại.',
      'Chứng minh hệ thức $\\overrightarrow{OH} = \\overrightarrow{OA} + \\overrightarrow{OB} + \\overrightarrow{OC}$ rồi suy ra kết quả trên bằng véctơ.',
      'Bài 2 sẽ cho thấy trung điểm của $OH$ là tâm của một đường tròn rất đặc biệt.'
    ]
  },
  {
    id: 'chin-diem', kind: 'explore', title: 'Đường tròn chín điểm', tag: 'Tam giác · Nâng cao',
    intro: 'Trong tam giác $ABC$ có trực tâm $H$: $M, N, P$ là trung điểm ba cạnh; $D, E, F$ là chân ba đường cao; $I, J, K$ là trung điểm của $AH, BH, CH$.',
    todo: ['Dùng công cụ <b>Tròn qua 3 điểm</b> để vẽ đường tròn qua $M, N, P$.', 'Kéo các đỉnh, kể cả thành tam giác tù. Đường tròn đó còn đi qua những điểm nào?'],
    build(K) {
      const A = K.pt('A', -40, -170), B = K.pt('B', -220, 110), C = K.pt('C', 210, 110);
      const bc = K.seg(B, C), ca = K.seg(C, A), ab = K.seg(A, B);
      const M = K.mid('M', B, C), N = K.mid('N', C, A), P = K.mid('P', A, B);
      const D = K.foot('D', A, bc, { color: 'blue' }), E = K.foot('E', B, ca, { color: 'blue' }), F = K.foot('F', C, ab, { color: 'blue' });
      const ad = K.seg(A, D, { aux: true }), be = K.seg(B, E, { aux: true }); K.seg(C, F, { aux: true });
      const H = K.inter('H', ad, be, 0, { color: 'pen' });
      const I = K.mid('I', A, H, { color: 'ok' }), J = K.mid('J', B, H, { color: 'ok' }), Kk = K.mid('K', C, H, { color: 'ok' });
      const IM = K.seg(I, M, { aux: true, hidden: true, color: 'pen' });
      return { A, B, C, M, N, P, D, E, F, H, I, J, K: Kk, IM };
    },
    predict: {
      q: 'Trong 9 điểm $M, N, P, D, E, F, I, J, K$, bao nhiêu điểm nằm trên đường tròn qua $M, N, P$?',
      opts: ['Cả 9 điểm', 'Chỉ 6 điểm $M, N, P, D, E, F$', 'Chỉ 3 điểm $M, N, P$'], ans: 0,
      why: 'Kết quả này thường gắn với tên Feuerbach, Poncelet và Brianchon (đầu thế kỷ XIX).'
    },
    verify: { text: 'Kiểm nghiệm đại diện bốn giả thuyết: $D$, $E$, $I$, $K$ đều nằm trên đường tròn qua $M, N, P$.', checks: [['concyclic', ['M', 'N', 'P', 'D']], ['concyclic', ['M', 'N', 'P', 'E']], ['concyclic', ['M', 'N', 'P', 'I']], ['concyclic', ['M', 'N', 'P', 'K']]] },
    hints: [
      { t: 'Chứng minh một điều yếu hơn trước: $P$, $N$, $D$ cùng nhìn đoạn $IM$ dưới góc vuông. Khi đó chúng nằm trên đường tròn đường kính $IM$.', show: ['IM'] },
      { t: 'Trong tam giác $ABH$, $PI$ là đường trung bình nên $PI \\parallel BH$. Trong tam giác $ABC$, $PM \\parallel AC$. Mà $BH \\perp AC$, suy ra $\\widehat{IPM} = 90^\\circ$. Tương tự $\\widehat{INM} = 90^\\circ$.' },
      { t: '$D$ thuộc $BC$ còn $I$ thuộc đường cao $AD$, nên $\\widehat{IDM} = 90^\\circ$. Đường tròn đường kính $IM$ đi qua $M, N, P$ — nó là đường tròn nào?' }
    ],
    proof: 'Theo các gợi ý, $P, N, D$ cùng nhìn $IM$ dưới góc vuông, nên $M, N, P, D, I$ thuộc đường tròn đường kính $IM$. Đường tròn này đi qua $M, N, P$ nên chính là đường tròn (duy nhất) qua $M, N, P$. Lặp lại lập luận với đỉnh $B$ (đường kính $JN$, chứa $E$, $J$) và đỉnh $C$ (đường kính $KP$, chứa $F$, $K$): cả chín điểm cùng thuộc đường tròn qua $M, N, P$. $\\blacksquare$',
    extend: [
      'Dự đoán và kiểm nghiệm: tâm đường tròn chín điểm là trung điểm của $OH$, bán kính bằng $\\tfrac R2$. Chứng minh bằng phép vị tự tâm $H$ tỉ số $\\tfrac12$ (ảnh của đường tròn ngoại tiếp).',
      'Định lý Feuerbach: đường tròn chín điểm tiếp xúc với đường tròn nội tiếp và ba đường tròn bàng tiếp.'
    ]
  },
  {
    id: 'simson', kind: 'explore', title: 'Đường thẳng Simson', tag: 'Tứ giác nội tiếp · HSG',
    intro: 'Điểm $P$ chạy trên đường tròn ngoại tiếp tam giác $ABC$. $D, E, F$ là hình chiếu của $P$ lên các đường thẳng $BC, CA, AB$.',
    todo: ['Kéo $P$ trên đường tròn, hoặc bấm ▶ cạnh $P$ ở thẻ <i>Dựng hình</i> để $P$ tự chạy.', 'Quan sát ba điểm $D, E, F$.'],
    build(K) {
      const A = K.pt('A', -60, -150), B = K.pt('B', -200, 100), C = K.pt('C', 190, 100);
      K.seg(A, B); K.seg(B, C); K.seg(C, A);
      const lab = K.line(A, B, { aux: true }), lbc = K.line(B, C, { aux: true }), lca = K.line(C, A, { aux: true });
      const w = K.circ3(A, B, C);
      const P = K.glider('P', w, 2.4, { color: 'pen' });
      const D = K.foot('D', P, lbc, { color: 'blue' }), E = K.foot('E', P, lca, { color: 'blue' }), F = K.foot('F', P, lab, { color: 'blue' });
      K.seg(P, D, { aux: true }); K.seg(P, E, { aux: true }); K.seg(P, F, { aux: true });
      return { A, B, C, P, D, E, F, w };
    },
    predict: {
      q: 'Ba điểm $D, E, F$ có quan hệ gì?',
      opts: ['Luôn thẳng hàng', 'Chỉ thẳng hàng khi $P$ là điểm chính giữa cung $BC$', 'Luôn là ba đỉnh của một tam giác vuông', 'Không có quan hệ cố định'], ans: 0,
      why: 'Đường thẳng chứa $D, E, F$ mang tên Robert Simson, dù người công bố đầu tiên là William Wallace (1799).'
    },
    verify: { text: 'Giả thuyết: “$D, E, F$ thẳng hàng”, thử với 300 tam giác và 300 vị trí của $P$ trên đường tròn.', checks: [['collinear', ['D', 'E', 'F']]] },
    hints: [
      { t: 'Tìm các tứ giác nội tiếp có đỉnh $P$: hai góc vuông cùng nhìn một đoạn thẳng.' },
      { t: '$PDBF$ nội tiếp (đường kính $PB$) nên $\\widehat{BFD} = \\widehat{BPD}$. $PEAF$ nội tiếp (đường kính $PA$) nên $\\widehat{AFE} = \\widehat{APE}$.' },
      { t: 'Biểu diễn $\\widehat{BPD}$ và $\\widehat{APE}$ qua các góc của tứ giác nội tiếp $ABCP$. Muốn $D, F, E$ thẳng hàng, cần $\\widehat{BFD}$ và $\\widehat{AFE}$ có quan hệ gì?' }
    ],
    proof: 'Xét hình như vị trí ban đầu. Ta có $\\widehat{BPD} = 90^\\circ - \\widehat{PBD}$ và $\\widehat{APE} = 90^\\circ - \\widehat{PAE}$. Vì $ABCP$ nội tiếp, $\\widehat{PBC} = \\widehat{PAC}$ (cùng chắn cung $PC$), tức là $\\widehat{PBD} = \\widehat{PAE}$. Do đó $\\widehat{BFD} = \\widehat{BPD} = \\widehat{APE} = \\widehat{AFE}$. Vì $A, F, B$ thẳng hàng, hai góc bằng nhau này ở vị trí đối đỉnh, nên $D, F, E$ thẳng hàng. $\\blacksquare$<br><i>Lưu ý tư duy:</i> khi $P$ đổi cung, hình vẽ đổi dạng và một số góc trên phải thay bằng góc bù. Chứng minh chặt chẽ cho mọi vị trí dùng <b>góc định hướng giữa hai đường thẳng</b> (theo mod $180^\\circ$). Công cụ kiểm nghiệm giúp em thấy ngay có bao nhiêu “dạng hình” cần xét.',
    extend: [
      'Mệnh đề đảo: nếu hình chiếu của $P$ lên ba cạnh thẳng hàng thì $P$ thuộc đường tròn ngoại tiếp. Bài 4 sẽ thử thách trực giác của em về điều này.',
      'Dựng trực tâm $H$ và kiểm nghiệm: đường thẳng Simson của $P$ đi qua trung điểm của $PH$.',
      'Khi $P$ chạy, các đường thẳng Simson “bao” một đường cong ba múi (deltoid Steiner). Thử bật vết cho trung điểm $PH$ — nó chạy trên đường nào?'
    ]
  },
  {
    id: 'bay', kind: 'explore', title: 'Bẫy trực giác: trông thẳng hàng?', tag: 'Tư duy phản biện',
    intro: 'Hình giống Bài 3, nhưng lần này $P$ là <b>điểm tự do</b>, đặt rất gần đường tròn ngoại tiếp. Đường nét đứt nối $D$ và $F$.',
    todo: ['Chưa kéo gì cả. Phóng to (lăn chuột) vùng quanh $E$.', 'Chỉ nhìn bằng mắt: $E$ có nằm trên đường $DF$ không?'],
    build(K) {
      const a = { x: -60, y: -150 }, b = { x: -200, y: 100 }, c = { x: 190, y: 100 }, w0 = K.circum(a, b, c);
      const A = K.pt('A', a.x, a.y), B = K.pt('B', b.x, b.y), C = K.pt('C', c.x, c.y);
      K.seg(A, B); K.seg(B, C); K.seg(C, A);
      const lab = K.line(A, B, { aux: true }), lbc = K.line(B, C, { aux: true }), lca = K.line(C, A, { aux: true });
      const w = K.circ3(A, B, C);
      const th = 2.4, P = K.pt('P', w0.c.x + 1.03 * w0.r * Math.cos(th), w0.c.y + 1.03 * w0.r * Math.sin(th), { color: 'pen' });
      const D = K.foot('D', P, lbc, { color: 'blue' }), E = K.foot('E', P, lca, { color: 'blue' }), F = K.foot('F', P, lab, { color: 'blue' });
      K.seg(P, D, { aux: true }); K.seg(P, E, { aux: true }); K.seg(P, F, { aux: true });
      K.line(D, F, { aux: true, color: 'pen' });
      return { A, B, C, P, D, E, F, w };
    },
    predict: {
      q: 'Dựa vào hình vẽ, kết luận nào đáng tin?',
      opts: ['$D, E, F$ thẳng hàng — nhìn là thấy', 'Chưa thể kết luận — cần kiểm nghiệm và chứng minh'], ans: 1,
      why: 'Một hình vẽ chỉ là một trường hợp, và mắt người không phân biệt được sai lệch cỡ 1%.'
    },
    verify: {
      text: 'Giả thuyết “$D, E, F$ thẳng hàng” — lần này $P$ cũng bị biến đổi ngẫu nhiên.', checks: [['collinear', ['D', 'E', 'F']]],
      after: 'Một phản ví dụ là đủ để <b>bác bỏ</b> một giả thuyết; còn hàng nghìn ví dụ đúng vẫn <b>chưa đủ để chứng minh</b>. Hãy bấm “Xem phản ví dụ”.'
    },
    hints: [
      { t: 'Kéo $P$ ra xa đường tròn: tam giác $DEF$ “phồng” lên. Kéo $P$ lại gần: nó “xẹp” xuống. Vậy khi nào nó xẹp hẳn thành đoạn thẳng?' },
      { t: 'Ở thẻ <i>Giả thuyết</i>, thêm quan hệ “Điểm thuộc đường” cho $P$ và đường tròn ngoại tiếp, rồi kéo $P$ chạm vào đường tròn: cả hai giả thuyết cùng chuyển sang ✓.' },
      { t: 'Định lý: $D, E, F$ thẳng hàng $\\iff$ $P$ nằm trên đường tròn ngoại tiếp tam giác $ABC$.' }
    ],
    proof: 'Định lý Euler về tam giác bàn đạp: $S_{DEF} = \\dfrac{|R^2 - OP^2|}{4R^2}\\, S_{ABC}$, với $O, R$ là tâm và bán kính đường tròn ngoại tiếp. Vì thế $S_{DEF} = 0 \\iff OP = R$. Ở hình ban đầu $OP = 1{,}03R$ nên $S_{DEF} \\approx 0{,}015\\,S_{ABC}$ — quá nhỏ để mắt thấy, nhưng khác $0$.',
    extend: [
      'Quỹ tích các điểm $P$ sao cho diện tích tam giác bàn đạp $DEF$ không đổi là gì? (Dùng công thức trên.)',
      'Tự tìm một “định lý giả” trông đúng trên hình vẽ, rồi dùng kiểm nghiệm ngẫu nhiên để bác bỏ nó. Gửi liên kết cho bạn để đố.'
    ]
  },
  {
    id: 'varignon', kind: 'explore', title: 'Hình bình hành Varignon', tag: 'Tứ giác · Lớp 8–10',
    intro: 'Tứ giác $ABCD$ bất kỳ; $M, N, P, Q$ lần lượt là trung điểm các cạnh $AB, BC, CD, DA$.',
    todo: ['Kéo các đỉnh, kể cả khi tứ giác lõm hoặc tự cắt.', 'Quan sát tứ giác $MNPQ$ (màu đỏ).'],
    build(K) {
      const A = K.pt('A', -210, -50), B = K.pt('B', -40, -170), C = K.pt('C', 220, -20), D = K.pt('D', 10, 150);
      K.seg(A, B); K.seg(B, C); K.seg(C, D); K.seg(D, A);
      const M = K.mid('M', A, B), N = K.mid('N', B, C), P = K.mid('P', C, D), Q = K.mid('Q', D, A);
      const MN = K.seg(M, N, { color: 'pen' }), NP = K.seg(N, P, { color: 'pen' }), PQ = K.seg(P, Q, { color: 'pen' }), QM = K.seg(Q, M, { color: 'pen' });
      const AC = K.seg(A, C, { aux: true, hidden: true });
      return { A, B, C, D, M, N, P, Q, MN, NP, PQ, QM, AC };
    },
    predict: {
      q: 'Tứ giác $MNPQ$ luôn là hình gì?',
      opts: ['Hình bình hành', 'Hình thang (chỉ có một cặp cạnh song song)', 'Hình chữ nhật', 'Tùy tứ giác $ABCD$, không có quy luật'], ans: 0,
      why: 'Pierre Varignon (1654–1722) phát biểu kết quả này.'
    },
    verify: { text: 'Hai giả thuyết: $MN \\parallel PQ$ và $NP \\parallel QM$.', checks: [['parallel', ['MN', 'PQ']], ['parallel', ['NP', 'QM']]] },
    hints: [
      { t: 'Kẻ đường chéo $AC$. Xét riêng tam giác $ABC$ và tam giác $ACD$.', show: ['AC'] },
      { t: 'Đường trung bình: $MN \\parallel AC$, $MN = \\tfrac12 AC$; và $QP \\parallel AC$, $QP = \\tfrac12 AC$.' }
    ],
    proof: 'Theo tính chất đường trung bình trong tam giác $ABC$ và $ACD$: $MN$ và $QP$ cùng song song và bằng $\\tfrac12 AC$, nên $MNPQ$ là hình bình hành. Lời giải véctơ còn gọn hơn và đúng cả khi tứ giác lõm hay tự cắt: $\\overrightarrow{MN} = \\overrightarrow{MB} + \\overrightarrow{BN} = \\tfrac12\\overrightarrow{AB} + \\tfrac12\\overrightarrow{BC} = \\tfrac12\\overrightarrow{AC}$, tương tự $\\overrightarrow{QP} = \\tfrac12\\overrightarrow{AC}$. $\\blacksquare$',
    extend: [
      '$MNPQ$ là hình thoi khi nào? Hình chữ nhật khi nào? Hình vuông khi nào? Dựng hai đường chéo và dùng Kiểm nghiệm (“Hai đường thẳng vuông góc”, “Hai độ dài bằng nhau”) để thử giả thuyết của em.',
      'Với tứ giác lồi, chứng minh $S_{MNPQ} = \\tfrac12 S_{ABCD}$.'
    ]
  },
  {
    id: 'quy-tich', kind: 'explore', title: 'Quỹ tích trung điểm', tag: 'Phép vị tự · Lớp 11',
    intro: 'Đường tròn $(O)$ có bán kính $OR$; điểm $A$ cố định; $M$ chạy trên $(O)$; $I$ là trung điểm $AM$. Đường màu đỏ là <b>quỹ tích</b> của $I$.',
    todo: ['Kéo $M$, hoặc bấm ▶ cạnh $M$ ở thẻ <i>Dựng hình</i>.', 'Kéo $A$ vào trong rồi ra ngoài đường tròn; kéo $R$ để đổi bán kính.'],
    build(K) {
      const O = K.pt('O', 40, 0), R = K.pt('R', 190, 0), A = K.pt('A', -230, 70);
      const w = K.circle(O, R);
      const M = K.glider('M', w, -1.0, { color: 'blue' });
      K.seg(A, M, { aux: true });
      const I = K.mid('I', A, M, { color: 'pen' });
      K.locus(I, M);
      const Kc = K.mid('K', A, O, { hidden: true, color: 'ok' });
      const KI = K.len(Kc, I, { hidden: true }), OM = K.len(O, M, { hidden: true });
      return { O, R, A, M, I, K: Kc, KI, OM };
    },
    predict: {
      q: 'Quỹ tích của $I$ là gì?',
      opts: ['Một đường tròn có bán kính bằng nửa bán kính $(O)$', 'Một đường tròn có cùng bán kính với $(O)$', 'Một đường elip', 'Tùy vị trí của $A$: khi thì đường tròn, khi thì elip'], ans: 0
    },
    verify: {
      text: 'Cụ thể hóa thành giả thuyết đo được: gọi $K$ là trung điểm $AO$; tỉ số $KI : OM$ luôn không đổi (bằng $\\tfrac12$).',
      checks: [['ratio', ['KI', 'OM']]], reveal: ['K', 'KI', 'OM']
    },
    hints: [
      { t: '$I$ nhận được từ $M$ bằng phép biến hình nào? (Chú ý: $\\overrightarrow{AI} = \\tfrac12\\overrightarrow{AM}$.)' },
      { t: 'Phép vị tự tâm $A$ tỉ số $\\tfrac12$ biến $M \\mapsto I$. Nó biến tâm $O$ thành điểm nào, biến đường tròn $(O; R)$ thành đường tròn nào?' }
    ],
    proof: 'Phép vị tự $V(A; \\tfrac12)$ biến $M$ thành $I$. Khi $M$ chạy trên $(O; R)$, $I$ chạy trên ảnh của đường tròn này: đường tròn tâm $K = V(O)$ — trung điểm $AO$ — bán kính $\\tfrac R2$. Đảo lại, mỗi điểm của đường tròn ảnh là ảnh của đúng một điểm $M \\in (O)$. Vậy quỹ tích là đường tròn $(K; \\tfrac R2)$. $\\blacksquare$',
    extend: [
      'Nếu $\\overrightarrow{AI} = k\\,\\overrightarrow{AM}$ thì quỹ tích là gì? Trường hợp $k = -1$ cho ta phép biến hình nào?',
      'Cho $A, B$ cố định và $M$ chạy trên một đường tròn qua $A, B$. Dựng trọng tâm, trực tâm tam giác $ABM$ rồi dùng công cụ <b>Quỹ tích</b> để dự đoán quỹ tích của chúng.'
    ]
  },
  {
    id: 'heron', kind: 'explore', title: 'Đường đi ngắn nhất (bài toán Heron)', tag: 'Cực trị hình học',
    intro: 'Hai điểm $A, B$ nằm cùng phía với đường thẳng $d$. Tìm $M \\in d$ để tổng $AM + MB$ nhỏ nhất — như tia sáng đi từ $A$, phản xạ trên gương $d$ rồi tới $B$.',
    todo: ['Kéo $M$ trên $d$ để làm $AM + MB$ nhỏ nhất có thể. Kỷ lục của em được ghi lại ở bước 3.'],
    build(K) {
      const U = K.pt('U', -280, 120), W = K.pt('W', 280, 120);
      const d = K.line(U, W, { name: 'd' });
      const A = K.pt('A', -160, -70), B = K.pt('B', 140, -150);
      const M = K.glider('M', d, 0.75, { color: 'blue' });
      K.seg(A, M, { color: 'pen' }); K.seg(M, B, { color: 'pen' });
      const path = K.path(A, M, B);
      const B1 = K.refl('B′', B, d, { hidden: true, color: 'ok' });
      const AB1 = K.seg(A, B1, { aux: true, hidden: true });
      K.seg(B, B1, { aux: true, hidden: true });
      const M0 = K.inter('M₀', AB1, d, 0, { hidden: true, color: 'ok' });
      return { A, B, M, d, path, B1, AB1, M0 };
    },
    predict: {
      q: 'Tại vị trí tối ưu, điều gì đúng?',
      opts: ['Hai góc tạo bởi $MA$ và $MB$ với $d$ bằng nhau', '$M$ là trung điểm đoạn nối hai hình chiếu của $A$ và $B$ lên $d$', '$M$ là hình chiếu của $A$ (điểm gần $d$ hơn) lên $d$'], ans: 0,
      why: 'Heron thành Alexandria (thế kỷ I) đã dùng chính bài toán này để giải thích định luật phản xạ ánh sáng.'
    },
    optimize: { measure: 'path', driver: 'M' },
    hints: [
      { t: 'Nếu $A$ và $B$ nằm <i>khác phía</i> với $d$ thì bài toán dễ: $M$ là giao điểm của $AB$ với $d$. Làm sao đưa về trường hợp đó?' },
      { t: 'Lấy $B\'$ đối xứng với $B$ qua $d$. Với mọi $M \\in d$: $MB = MB\'$.', show: ['B1'] },
      { t: 'Vậy $AM + MB = AM + MB\' \\ge AB\'$. Dấu bằng xảy ra khi nào?', show: ['AB1', 'M0'] }
    ],
    proof: 'Với mọi $M \\in d$: $AM + MB = AM + MB\' \\ge AB\'$ (bất đẳng thức tam giác), dấu bằng xảy ra $\\iff M$ trùng $M_0 = AB\' \\cap d$. Tại $M_0$, góc giữa $M_0A$ và $d$ bằng góc giữa $M_0B\'$ và $d$ (đối đỉnh), bằng góc giữa $M_0B$ và $d$ (đối xứng trục): góc tới bằng góc phản xạ. $\\blacksquare$<br><i>Bài học:</i> thực nghiệm cho biết <b>ở đâu</b> có cực tiểu; chỉ lập luận mới cho biết <b>vì sao</b> — và cách dựng chính xác điểm đó.',
    extend: [
      'Bài toán Fagnano: trong tam giác nhọn, tìm tam giác nội tiếp có chu vi nhỏ nhất. (Đáp án bất ngờ: tam giác có đỉnh là chân ba đường cao — thử dựng và dùng đối xứng hai lần.)',
      'Tìm $M \\in d$ để $|MA - MB|$ lớn nhất. Khi nào bài toán vô nghiệm?'
    ]
  },
  {
    id: 'tam-giac-deu', kind: 'construct', title: 'Dựng tam giác đều', tag: 'Euclid I.1',
    intro: 'Cho đoạn thẳng $AB$.',
    tools: ['move', 'point', 'segment', 'line', 'circle', 'intersect', 'delete'], par: 3,
    build(K) { const A = K.pt('A', -80, 40), B = K.pt('B', 80, 40); K.seg(A, B); return { A, B }; },
    goal: {
      kind: 'P', text: 'Dựng điểm $C$ sao cho $ABC$ là tam giác đều.',
      res(M, c, r) { const A = M.get(r.A), B = M.get(r.B), C = M.get(c); if (!A || !B || !C) return null; const s = Math.hypot(A.x - B.x, A.y - B.y); return Math.max(Math.abs(Math.hypot(C.x - A.x, C.y - A.y) - s), Math.abs(Math.hypot(C.x - B.x, C.y - B.y) - s)) / s; }
    },
    hints: [{ t: '$C$ cách $A$ một khoảng bằng $AB$. Tập hợp những điểm như vậy là gì?' }, { t: '$C$ cũng cách $B$ một khoảng bằng $AB$. Hai tập hợp đó giao nhau ở đâu?' }],
    proof: 'Vẽ đường tròn tâm $A$ qua $B$ và đường tròn tâm $B$ qua $A$; gọi $C$ là một giao điểm. Khi đó $CA = AB$ (bán kính đường tròn thứ nhất), $CB = BA$ (bán kính đường tròn thứ hai), nên $CA = CB = AB$. Đây là Mệnh đề 1, Quyển I bộ <i>Cơ sở</i> của Euclid (khoảng 300 TCN). Số thao tác: 2 đường tròn + 1 giao điểm = 3.',
    extend: ['Dựng hình vuông có cạnh $AB$.', 'Dựng lục giác đều có cạnh $AB$ với ít thao tác nhất có thể.']
  },
  {
    id: 'trung-diem', kind: 'construct', title: 'Dựng trung điểm', tag: 'Thước & compa',
    intro: 'Cho hai điểm $A$ và $B$. Công cụ <i>Trung điểm</i> đã bị khóa!',
    tools: ['move', 'point', 'segment', 'line', 'circle', 'intersect', 'delete'], par: 5,
    build(K) { const A = K.pt('A', -110, 20), B = K.pt('B', 120, -10); K.seg(A, B); return { A, B }; },
    goal: {
      kind: 'P', text: 'Dựng trung điểm của đoạn $AB$ chỉ bằng thước thẳng và compa.',
      res(M, c, r) { const A = M.get(r.A), B = M.get(r.B), X = M.get(c); if (!A || !B || !X) return null; const s = Math.hypot(A.x - B.x, A.y - B.y); return Math.hypot(X.x - (A.x + B.x) / 2, X.y - (A.y + B.y) / 2) / s; }
    },
    hints: [{ t: 'Trung điểm nằm trên đường trung trực của $AB$. Đường trung trực là tập hợp những điểm nào?' }, { t: 'Hai đường tròn bán kính bằng nhau, tâm $A$ và tâm $B$, cắt nhau tại hai điểm cách đều $A$ và $B$.' }],
    proof: 'Vẽ đường tròn tâm $A$ qua $B$ và đường tròn tâm $B$ qua $A$ (1–2); lấy hai giao điểm $P, Q$ (3); vẽ đường thẳng $PQ$ — đó là trung trực của $AB$ (4); giao của $PQ$ với $AB$ là trung điểm cần dựng (5). Vì sao $PQ$ là trung trực? Vì $PA = PB$ và $QA = QB$.',
    extend: ['Định lý Mohr–Mascheroni: mọi phép dựng bằng thước và compa đều làm được <b>chỉ bằng compa</b>. Thử dựng trung điểm $AB$ mà không dùng thước (khó!).']
  },
  {
    id: 'ha-vuong-goc', kind: 'construct', title: 'Hạ đường vuông góc', tag: 'Thước & compa',
    intro: 'Cho đường thẳng $d$ (qua $U$, $V$) và điểm $P$ không thuộc $d$. Công cụ <i>Vuông góc</i> đã bị khóa!',
    tools: ['move', 'point', 'segment', 'line', 'circle', 'intersect', 'delete'], par: 6,
    build(K) { const U = K.pt('U', -220, 90), Vv = K.pt('V', 230, 60), P = K.pt('P', -20, -120, { color: 'pen' }); const d = K.line(U, Vv, { name: 'd' }); return { U, V: Vv, P, d }; },
    goal: {
      kind: 'L', text: 'Dựng đường thẳng đi qua $P$ và vuông góc với $d$.',
      res(M, c, r, S) {
        const l = M.get(c), d = M.get(r.d), P = M.get(r.P); if (!l || !d || !P) return null;
        const u1 = Math.hypot(l.v.x, l.v.y), u2 = Math.hypot(d.v.x, d.v.y);
        const off = Math.abs((P.x - l.p.x) * l.v.y - (P.y - l.p.y) * l.v.x) / u1;
        return Math.max(off / S, Math.abs((l.v.x * d.v.x + l.v.y * d.v.y) / (u1 * u2)));
      }
    },
    hints: [{ t: 'Vẽ một đường tròn tâm $P$ cắt $d$ tại hai điểm $X, Y$. Đường cần dựng có quan hệ gì với đoạn $XY$?' }, { t: 'Nó là trung trực của $XY$ (vì $PX = PY$). Dựng trung trực như ở Thử thách 2 — và lưu ý $P$ đã là một điểm cách đều $X, Y$.' }],
    proof: 'Lấy một điểm $X$ trên $d$ rồi vẽ đường tròn tâm $P$ qua $X$ (1); giao với $d$ cho thêm điểm $Y$ (2). Vẽ đường tròn tâm $X$ qua $P$ (3) và tâm $Y$ qua $P$ (4); chúng cắt nhau tại $P$ và $P\'$ (5). Đường thẳng $PP\'$ (6) vuông góc với $d$ vì $X$ và $Y$ đều cách đều $P$ và $P\'$ (nên $XY$ là trung trực của $PP\'$). Lưu ý: điểm $X$ chọn tùy ý trên $d$ — lời giải phải đúng với <i>mọi</i> cách chọn, và phép thử kéo thả kiểm tra đúng điều đó.',
    extend: ['Dựng đường thẳng qua $P$ song song với $d$ bằng thước và compa.', 'Chia đoạn thẳng $AB$ thành ba phần bằng nhau.']
  }
];
