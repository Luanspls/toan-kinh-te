/* giaovien.js — trang Theo dõi lớp: tổng hợp tự học và kết quả đánh giá của sinh viên.
   Dữ liệu lấy từ máy chủ Apps Script (gvTongHop) bằng mật khẩu giảng viên; không lưu lâu dài trên máy (chỉ trong phiên trình duyệt). */
(function () {
  'use strict';
  const C = window.TKT_COURSE || {}, K = window.TKTKT, SERVER = C.may_chu || '';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const math = el => { if (window.TKT && TKT.renderMath) TKT.renderMath(el); };
  const n2 = x => (x == null || x === '' || isNaN(x) ? '—' : (Math.round(x * 100) / 100).toString().replace('.', ','));
  const day = t => (t ? new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—');
  const pages = []; (C.chuong || []).forEach(ch => (ch.buoi || []).forEach(b => pages.push({ key: ch.id + '/' + b.tep, label: 'C' + ch.so + 'B' + b.so, n: b.slides, ten: b.ten })));
  const testIds = K ? K.bank.order.filter(id => K.bank.tests[id].loai !== 'luyen') : [];
  let D = null, view = 'tong-hop', filt = { lop: '', q: '' };

  async function call(act, data) {
    const res = await fetch(SERVER, { method: 'POST', body: JSON.stringify(Object.assign({ act, mk: sessionStorage.getItem('tkt-gv') || '' }, data || {})) });
    const j = await res.json(); if (!j.ok) throw new Error(j.loi || 'Lỗi máy chủ'); return j;
  }

  /* ---------- Tính toán ---------- */
  function compute() {
    const w = D.cauHinh, ws = (w.trong_so_tien_do || 0) + (w.trong_so_kt_buoi || 0) + (w.trong_so_kt_chuong || 0);
    const tcfg = D.tests || {};
    D.rows = D.sv.map(s => {
      const td = D.tienDo.filter(t => t.ma === s.ma);
      const pct = pages.map(p => { const t = td.find(x => x.trang === p.key); return t ? Math.min(100, Math.round(t.xem / (p.n || t.tong || 1) * 100)) : 0; });
      const phut = td.reduce((a, t) => a + t.phut, 0);
      const att = D.baiLam.filter(b => b.ma === s.ma);
      const best = {}; att.forEach(b => { if (b.diem != null && (best[b.bai] == null || b.diem > best[b.bai])) best[b.bai] = b.diem; });
      const buoi = testIds.filter(id => K.bank.tests[id].loai === 'buoi' && (tcfg[id] || {}).tinh_diem !== false);
      const chuong = testIds.filter(id => K.bank.tests[id].loai === 'chuong' && (tcfg[id] || {}).tinh_diem !== false);
      const tb = buoi.length ? buoi.reduce((a, id) => a + (best[id] || 0), 0) / buoi.length : 0;
      const tc = chuong.length ? chuong.reduce((a, id) => a + (best[id] || 0), 0) / chuong.length : 0;
      const xem = pct.length ? pct.reduce((a, v) => a + v, 0) / pct.length / 10 : 0;
      const dqt = ws ? ((w.trong_so_tien_do || 0) * xem + (w.trong_so_kt_buoi || 0) * tb + (w.trong_so_kt_chuong || 0) * tc) / ws : 0;
      let last = Math.max(0, ...td.map(t => t.capNhat || 0), ...att.map(b => b.nop || b.bd || 0));
      const luyen = att.filter(b => K.bank.tests[b.bai] && K.bank.tests[b.bai].loai === 'luyen').length;
      const warn = [];
      if (!s.dnCuoi) warn.push('Chưa đăng nhập');
      else if (Date.now() - last > 7 * 86400000) warn.push('Không hoạt động 7 ngày');
      if (s.dnCuoi && xem < 3) warn.push('Xem < 30% nội dung');
      if (buoi.some(id => best[id] != null && best[id] < 5)) warn.push('Có bài KT < 5');
      if (att.some(b => b.trangThai === 'Nộp muộn')) warn.push('Nộp muộn');
      if (att.some(b => /phiên bản/.test(b.ghiChu || ''))) warn.push('Cần kiểm tra phiên bản');
      return { s, pct, phut, best, tb, tc, xem, dqt, last, luyen, att, warn };
    });
  }

  /* ---------- Hiển thị ---------- */
  function shown() {
    const q = filt.q.trim().toLowerCase();
    return D.rows.filter(r => (!filt.lop || String(r.s.lop) === filt.lop) && (!q || (r.s.ma + ' ' + r.s.ten).toLowerCase().includes(q)));
  }
  function render() {
    const R = shown();
    const lops = Array.from(new Set(D.sv.map(s => String(s.lop || '')))).filter(Boolean).sort();
    const logged = R.filter(r => r.s.dnCuoi).length;
    const avg = f => (R.length ? R.reduce((a, r) => a + f(r), 0) / R.length : 0);
    $('#gv-head').innerHTML = '<div class="stats">' +
      '<div class="stat"><b>' + R.length + '</b><span>sinh viên' + (filt.lop ? ' lớp ' + esc(filt.lop) : '') + '</span></div>' +
      '<div class="stat"><b>' + logged + '</b><span>đã đăng nhập học</span></div>' +
      '<div class="stat"><b>' + Math.round(avg(r => r.xem * 10)) + '%</b><span>nội dung đã xem (TB)</span></div>' +
      '<div class="stat"><b>' + n2(avg(r => r.phut) / 60) + '</b><span>giờ tự học / SV (TB)</span></div>' +
      '<div class="stat"><b>' + n2(avg(r => r.dqt)) + '</b><span>điểm quá trình đề xuất (TB)</span></div></div>' +
      '<div class="tools"><label>Lớp <select id="f-lop"><option value="">Tất cả</option>' + lops.map(l => '<option' + (l === filt.lop ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>' +
      '<label>Tìm <input id="f-q" value="' + esc(filt.q) + '" placeholder="Mã SV hoặc tên"></label>' +
      '<button class="btn" data-a="csv">Tải CSV</button><button class="btn" data-a="reload">Tải lại dữ liệu</button><span class="muted">Ngân hàng: ' + esc(D.nganHang) + (D.nganHang !== K.version ? ' <b class="pen">(khác bản trên trang: ' + esc(K.version) + ')</b>' : '') + '</span></div>' +
      '<nav class="tabs">' + [['tong-hop', 'Tổng hợp sinh viên'], ['bai-kt', 'Bài kiểm tra'], ['cau-hoi', 'Phân tích câu hỏi'], ['cach-tinh', 'Cách tính điểm']].map(([k, t]) => '<button data-v="' + k + '"' + (view === k ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</nav>';
    const body = $('#gv-body');
    if (view === 'tong-hop') body.innerHTML = tableStudents(R);
    else if (view === 'bai-kt') body.innerHTML = tableTests(R);
    else if (view === 'cau-hoi') body.innerHTML = tableItems(R);
    else body.innerHTML = $('#tpl-cach-tinh').innerHTML.replace('{{W}}', 'xem nội dung ' + n2(D.cauHinh.trong_so_tien_do) + ' · KT sau buổi ' + n2(D.cauHinh.trong_so_kt_buoi) + ' · KT chương ' + n2(D.cauHinh.trong_so_kt_chuong));
    math(body);
  }
  const bar = v => '<span class="mb" title="' + v + '%"><i style="width:' + v + '%"></i></span>';
  const cell = v => '<td class="c sc' + (v == null ? '' : v >= 8 ? ' g' : v >= 5 ? ' m' : ' b') + '">' + n2(v) + '</td>';
  function tableStudents(R) {
    return '<div class="tblwrap"><table class="tbl gv"><thead><tr><th>Mã SV</th><th>Họ và tên</th><th>Lớp</th>' + pages.map(p => '<th class="c" title="' + esc(p.ten) + '">' + p.label + '</th>').join('') +
      '<th class="c">Giờ học</th><th class="c">Luyện</th>' + testIds.map(id => '<th class="c" title="' + esc(K.bank.tests[id].ten) + '">' + id + '</th>').join('') +
      '<th class="c">ĐQT</th><th>Hoạt động cuối</th><th>Lưu ý</th></tr></thead><tbody>' +
      R.map((r, i) => '<tr data-i="' + D.rows.indexOf(r) + '"><td><a href="#" data-a="sv">' + esc(r.s.ma) + '</a></td><td>' + esc(r.s.ten) + '</td><td>' + esc(r.s.lop) + '</td>' + r.pct.map(v => '<td class="c">' + bar(v) + '</td>').join('') +
        '<td class="c">' + n2(r.phut / 60) + '</td><td class="c">' + r.luyen + '</td>' + testIds.map(id => cell(r.best[id])).join('') +
        '<td class="c"><b>' + n2(r.dqt) + '</b></td><td>' + day(r.last || r.s.dnCuoi) + '</td><td class="warn">' + r.warn.map(esc).join('<br>') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="muted small">Cột C1B1…: % slide đã xem của từng buổi. Cột b1…c1: điểm cao nhất của bài kiểm tra (thang 10). ĐQT: điểm quá trình đề xuất — xem thẻ "Cách tính điểm". Bấm mã SV để xem chi tiết và bài làm.</p>';
  }
  function tableTests(R) {
    const ids = new Set(R.map(r => r.s.ma));
    return testIds.map(id => {
      const T = K.bank.tests[id]; const cfg = (D.tests || {})[id] || {};
      const best = R.map(r => r.best[id]).filter(v => v != null);
      const att = D.baiLam.filter(b => b.bai === id && ids.has(b.ma));
      const hist = Array(11).fill(0); best.forEach(v => { hist[Math.min(10, Math.floor(v))]++; });
      const mx = Math.max(1, ...hist);
      return '<section class="tcard"><h3>' + esc(T.ten) + ' <small>' + esc(T.mo_ta || '') + '</small></h3><p class="muted small">' + (cfg.mo ? 'Đang mở' : 'Đang đóng') + ' · ' + (cfg.so_lan || '∞') + ' lượt · ' + (cfg.phut || 0) + ' phút · ' + (cfg.tinh_diem === false ? 'không tính điểm' : 'tính điểm') + '</p>' +
        '<div class="tstat"><span><b>' + best.length + '</b>/' + R.length + ' SV đã làm</span><span><b>' + att.length + '</b> lượt</span><span>TB (điểm cao nhất) <b>' + n2(best.length ? best.reduce((a, b) => a + b, 0) / best.length : null) + '</b></span><span>Đạt ≥ 5: <b>' + (best.length ? Math.round(best.filter(v => v >= 5).length / best.length * 100) : 0) + '%</b></span></div>' +
        '<div class="hist">' + hist.map((h, k) => '<div><i style="height:' + (h / mx * 100) + '%"></i><span>' + (k === 10 ? '10' : k + '–' + (k + 1)) + '</span><b>' + (h || '') + '</b></div>').join('') + '</div></section>';
    }).join('');
  }
  // chương của một câu hỏi: mã buổi 'c2b3' → Chương 2; 'b3' → Chương 1
  function chOf(it) { const m = /^c(\d+)b/.exec(it.bai); const so = m ? +m[1] : 1; const ch = (C.chuong || []).find(c => c.so === so); return ch ? ch.id : 'chuong' + so; }
  function tableItems(R) {
    const ids = new Set(R.map(r => r.s.ma)); const st = {};
    D.baiLam.filter(b => ids.has(b.ma) && b.chi).forEach(b => b.chi.forEach(([id, s]) => { const x = st[id] = st[id] || { n: 0, s: 0 }; x.n++; x.s += Number(s) || 0; }));
    const MD = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' };
    const items = K.bank.items.slice().sort((a, b) => (a.bai + a.id).localeCompare(b.bai + b.id));
    return '<p class="muted">Độ khó thực tế $p$ = tỉ lệ điểm trung bình của câu qua mọi lượt làm (kể cả luyện tập). Câu có $p<0{,}3$ (tô đỏ) là nội dung lớp còn yếu — nên chữa trên lớp; câu có $p>0{,}9$ có thể quá dễ so với mức độ dự kiến.</p>' +
      '<div class="tblwrap"><table class="tbl gv"><thead><tr><th>Mã câu</th><th>Mục</th><th>CĐR</th><th>Mức độ</th><th class="c">Số lượt</th><th>Độ khó thực tế p</th><th>Slide ôn</th></tr></thead><tbody>' +
      items.map(it => {
        const x = st[it.id]; const p = x ? x.s / x.n : null;
        return '<tr class="' + (p != null && x.n >= 3 ? (p < 0.3 ? 'kho' : p > 0.9 ? 'de' : '') : '') + '"><td><code>' + it.id + '</code></td><td>' + it.muc + '</td><td>' + it.cdr + '</td><td>' + MD[it.md] + '</td><td class="c">' + (x ? x.n : 0) + '</td><td>' + (p == null ? '—' : bar(Math.round(p * 100)) + ' ' + n2(p)) + '</td><td><a href="' + chOf(it) + '/' + it.on + '" target="_blank">' + it.on.replace('.html', '') + '</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function showStudent(r) {
    const box = $('#gv-detail');
    const att = r.att.slice().sort((a, b) => (b.nop || b.bd) - (a.nop || a.bd));
    box.innerHTML = '<div class="panel"><button class="btn close" data-a="close">Đóng</button><h3>' + esc(r.s.ten) + ' <small>' + esc(r.s.ma) + ' · ' + esc(r.s.lop) + '</small></h3>' +
      '<p class="muted small">Đăng nhập lần cuối: ' + day(r.s.dnCuoi) + ' · ' + (r.s.doiMK ? 'đã đổi mật khẩu' : 'còn dùng mật khẩu được cấp') + ' · ĐQT đề xuất <b>' + n2(r.dqt) + '</b></p>' +
      '<h4>Tiến độ từng buổi</h4><table class="tbl"><tr><th>Buổi</th><th>Đã xem</th><th class="c">Phút học</th><th class="c">Trắc nghiệm trong bài</th><th>Cập nhật</th></tr>' +
      pages.map((p, k) => { const t = D.tienDo.find(x => x.ma === r.s.ma && x.trang === p.key); return '<tr><td>' + p.label + ' · ' + esc(p.ten) + '</td><td>' + bar(r.pct[k]) + ' ' + r.pct[k] + '%</td><td class="c">' + (t ? t.phut : 0) + '</td><td class="c">' + (t ? t.tnDung + '/' + t.tnLam : '—') + '</td><td>' + day(t && t.capNhat) + '</td></tr>'; }).join('') + '</table>' +
      '<h4>Bài làm (' + att.length + ' lượt)</h4><table class="tbl"><tr><th>Bài</th><th class="c">Lượt</th><th>Bắt đầu</th><th class="c">Phút</th><th class="c">Điểm</th><th>Trạng thái</th><th></th></tr>' +
      att.map(b => '<tr><td>' + esc(K.bank.tests[b.bai] ? K.bank.tests[b.bai].ten : b.bai) + '</td><td class="c">' + b.luot + '</td><td>' + day(b.bd) + '</td><td class="c">' + n2(b.phutLam) + '</td>' + cell(b.diem) + '<td>' + esc(b.trangThai) + (b.ghiChu ? '<br><small class="pen">' + esc(b.ghiChu) + '</small>' : '') + '</td><td>' + (b.trangThai === 'Đã nộp' || b.trangThai === 'Nộp muộn' ? '<button class="btn" data-a="bai" data-ml="' + esc(b.maLuot) + '">Xem bài làm</button>' : '') + '</td></tr>').join('') + '</table><div id="gv-bai"></div></div>';
    box.hidden = false; box.scrollIntoView({ block: 'start' });
  }
  async function showAttempt(ml) {
    const out = $('#gv-bai'); out.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const j = await call('gvBaiLam', { maLuot: ml });
      const ins = K.build(j.bai, j.seed); const g = K.grade(ins, j.traLoi);
      out.innerHTML = '<h4>Bài làm ' + esc(ml) + ' · điểm ' + n2(j.diem) + '</h4>' + (j.phienBan !== K.version ? '<p class="pen">Lượt này làm trên phiên bản ngân hàng "' + esc(j.phienBan) + '", khác bản hiện tại — đề hiển thị có thể không trùng đề sinh viên đã làm.</p>' : '') +
        ins.map((x, i) => TKTKTUI.qHtml(x, i, 'xem', j.traLoi[i], g.chi[i])).join('');
      math(out);
    } catch (e) { out.innerHTML = '<p class="pen">' + esc(e.message) + '</p>'; }
  }
  function csv() {
    const R = shown();
    const head = ['Mã SV', 'Họ và tên', 'Lớp'].concat(pages.map(p => '% xem ' + p.label), ['Giờ tự học', 'Lượt luyện tập'], testIds.map(id => 'Điểm ' + id), ['Điểm quá trình đề xuất', 'Hoạt động cuối', 'Lưu ý']);
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = R.map(r => [r.s.ma, r.s.ten, r.s.lop].concat(r.pct, [Math.round(r.phut / 6) / 10, r.luyen], testIds.map(id => (r.best[id] == null ? '' : r.best[id])), [Math.round(r.dqt * 100) / 100, r.last ? new Date(r.last).toLocaleString('vi-VN') : '', r.warn.join('; ')]));
    const blob = new Blob(['﻿' + [head].concat(rows).map(x => x.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'theo-doi-tu-hoc_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }

  /* ---------- Đăng nhập, sự kiện ---------- */
  async function load() {
    $('#gv-msg').textContent = 'Đang tải dữ liệu…';
    try { D = await call('gvTongHop'); compute(); $('#gv-login').hidden = true; $('#gv-app').hidden = false; $('#gv-msg').textContent = ''; if (D.cauHinh.ten_lop) $('#gv-title').textContent = 'Theo dõi lớp ' + D.cauHinh.ten_lop; render(); }
    catch (e) { $('#gv-msg').textContent = e.message; $('#gv-login').hidden = false; $('#gv-app').hidden = true; if (/mật khẩu/i.test(e.message)) sessionStorage.removeItem('tkt-gv'); }
  }
  document.addEventListener('submit', e => { if (e.target.id !== 'gv-form') return; e.preventDefault(); sessionStorage.setItem('tkt-gv', e.target.mk.value); load(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-v]'); if (!b) return;
    if (b.dataset.v) { view = b.dataset.v; render(); return; }
    const a = b.dataset.a;
    if (a === 'sv') { e.preventDefault(); showStudent(D.rows[+b.closest('tr').dataset.i]); }
    else if (a === 'bai') showAttempt(b.dataset.ml);
    else if (a === 'close') $('#gv-detail').hidden = true;
    else if (a === 'csv') csv();
    else if (a === 'reload') load();
    else if (a === 'logout') { sessionStorage.removeItem('tkt-gv'); location.reload(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'f-q') { filt.q = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#f-q'); el.focus(); el.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'f-lop') { filt.lop = e.target.value; render(); } });

  if (!SERVER) { $('#gv-msg').innerHTML = 'Hệ thống chưa được kết nối máy chủ theo dõi. Làm theo <b>DongGoi/HUONG_DAN_TAI_KHOAN.md</b> rồi đóng gói lại.'; $('#gv-form').hidden = true; return; }
  if (sessionStorage.getItem('tkt-gv')) load();
})();
