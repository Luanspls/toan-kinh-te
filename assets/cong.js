/* cong.js — cổng học tập: tổng quan tiến độ, danh sách chương/buổi, tra cứu, chuyển tiến độ giữa thiết bị.
   Dữ liệu: window.TKT_COURSE (khoa-hoc.js), window.TKT_INDEX (tim-kiem.js) do build.py sinh ra. */
(function () {
  'use strict';
  const C = window.TKT_COURSE; if (!C) return;
  const $ = id => document.getElementById(id);
  const PFX = 'tkt:v1:';
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(PFX + k) || 'null'); } catch (e) { return null; } },
    keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(PFX) === 0) out.push(k); } } catch (e) { /* bỏ qua */ } return out; }
  };
  const KIND = { 'khoi-dong': 'Khởi động', 'ly-thuyet': 'Lý thuyết', 'vi-du': 'Ví dụ', 'bai-tap': 'Bài tập', 'kiem-tra': 'Kiểm tra', 'on-tap': 'Ôn tập', 'tong-ket': 'Tổng kết', 'nhiem-vu': 'Nhiệm vụ', 'muc-tieu': 'Mục tiêu' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const math = el => { if (window.TKT && TKT.renderMath) TKT.renderMath(el); };

  /* ---------- Tiến độ ---------- */
  function sessStats(ch, b) {
    const seen = (ls.get('seen:' + ch.id + '/' + b.tep) || { ids: {} }).ids;
    const q = ls.get('quiz:' + ch.id + '/' + b.tep) || {};
    const qv = Object.values(q);
    return { seen: b.ids.filter(id => seen[id]).length, n: b.slides, q: qv.length, qok: qv.filter(Boolean).length };
  }
  function totals() {
    const t = { seen: 0, n: 0, q: 0, qok: 0, done: 0, sess: 0 };
    C.chuong.forEach(ch => (ch.buoi || []).forEach(b => {
      const s = sessStats(ch, b); t.seen += s.seen; t.n += s.n; t.q += s.q; t.qok += s.qok; t.sess++; if (s.seen >= s.n) t.done++;
    }));
    return t;
  }

  /* ---------- Trang chủ ---------- */
  function renderHome() {
    if (!$('chapters')) return;
    $('kicker').textContent = C.ten + ' · ' + C.ma + ' · ' + C.trinh_do + ' ' + C.nganh;
    const t = totals();
    $('stats').innerHTML =
      '<div class="stat"><b>' + (t.n ? Math.round(t.seen / t.n * 100) : 0) + '%</b><span>nội dung đã xem (' + t.seen + '/' + t.n + ' slide)</span></div>' +
      '<div class="stat"><b>' + t.done + '/' + t.sess + '</b><span>buổi học đã xem hết</span></div>' +
      '<div class="stat"><b>' + (t.q ? t.qok + '/' + t.q : '—') + '</b><span>câu tự kiểm tra đúng ngay lần đầu</span></div>' +
      '<div class="stat"><b>' + C.tong_gio + '</b><span>giờ học theo chương trình (' + C.chuong.length + ' chương)</span></div>';

    const last = ls.get('last');
    if (last && last.page) {
      const a = $('resume'); a.href = last.page + '#' + encodeURIComponent(last.id);
      a.textContent = 'Học tiếp: ' + (last.unit || '').replace(/^(Buổi \d+).*/, '$1') + ' · ' + last.title;
      a.title = a.textContent;
    }

    $('chapters').innerHTML = C.chuong.map(ch => {
      const ready = ch.trang_thai === 'san-sang' && ch.buoi;
      let h = '<article class="chap' + (ready ? '' : ' soon') + '"><header><h3><small>Chương ' + ch.so + ' · ' + ch.gio + ' giờ (' + ch.ly_thuyet + ' LT, ' + ch.bai_tap + ' BT)</small>' + esc(ch.ten) + '</h3>' +
        (ready ? '<span class="badge ok">Sẵn sàng</span>' : '<span class="badge soon">Đang biên soạn</span>') + '</header><p>' + esc(ch.mo_ta || '') + '</p>';
      if (ready) {
        h += '<ul class="sess">' + ch.buoi.map(b => {
          const s = sessStats(ch, b), pct = Math.round(s.seen / s.n * 100), done = s.seen >= s.n;
          return '<li><div class="n"><small>' + (b.tuan || 'Buổi') + '</small>' + String(b.so).padStart(2, '0') + '</div>' +
            '<div class="tt"><b>' + esc(b.ten) + '</b><span>' + (b.tiet ? b.tiet + ' tiết · ' : '') + b.slides + ' slide · ' + (b.kinds['bai-tap'] || 0) + ' bài tập</span></div>' +
            '<div class="pg"><span class="pbar"><i style="width:' + pct + '%"></i></span>' + (s.seen ? pct + '% đã xem' + (s.q ? ' · trắc nghiệm ' + s.qok + '/' + s.q : '') : 'Chưa học') + '</div>' +
            '<a class="go' + (done ? ' done' : '') + '" href="' + ch.id + '/' + b.tep + '">' + (done ? 'Ôn lại' : s.seen ? 'Học tiếp' : 'Vào học') + '</a></li>';
        }).join('') + '</ul><div class="links"><a class="xref" href="' + ch.id + '/index.html">Trang chương: lộ trình, bản đồ kiến thức</a><a class="xref" href="' + ch.id + '/lab.html">Phòng tính ma trận</a></div>';
      } else if (ch.de_cuong) {
        h += '<div class="outline">' + ch.de_cuong.map(m => '<div><small>' + m.muc + ' · ' + m.tuan + '</small><b>' + esc(m.ten) + '</b><ul>' + m.y.map(y => '<li>' + esc(y) + '</li>').join('') + '</ul></div>').join('') + '</div>';
      }
      return h + '</article>';
    }).join('');

    $('danh-gia').innerHTML = '<tr><th>Hình thức</th><th>Thời lượng</th><th>Nội dung</th><th>Thời điểm</th></tr>' +
      C.danh_gia.map(d => '<tr><td><b>' + esc(d.ten) + '</b></td><td>' + esc(d.hinh_thuc) + '</td><td>' + esc(d.noi_dung) + '</td><td>' + esc(d.khi_nao) + '</td></tr>').join('');
    $('refs').innerHTML = C.tai_lieu.map(r => '<li>' + r + '</li>').join('');
  }

  /* ---------- Tra cứu ---------- */
  const RANK = { 'ly-thuyet': .6, 'vi-du': .4, 'bai-tap': .3, 'kiem-tra': .2 };     // ưu tiên lý thuyết khi điểm bằng nhau
  const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  function initSearch() {
    const q = $('q'); if (!q || !window.TKT_INDEX) return;
    const chapNo = {}; C.chuong.forEach(ch => { chapNo[ch.id] = ch.so; (ch.buoi || []).forEach(b => { chapNo[ch.id + '/' + b.tep] = b.so; }); });
    const items = window.TKT_INDEX.map(it => Object.assign({}, it, {
      ft: fold(it.t), fe: fold(it.e + ' ' + it.s + ' ' + (KIND[it.k] || '')), fx: fold(it.x)
    }));
    const res = $('results');
    function run() {
      const terms = fold(q.value).split(/\s+/).filter(w => w.length > 0);
      if (!terms.length) { res.innerHTML = ''; return; }
      const hits = [];
      items.forEach(it => {
        let sc = 0;
        for (const w of terms) {
          const a = it.ft.includes(w) ? 3 : 0, b = it.fe.includes(w) ? 2 : 0, c = it.fx.includes(w) ? 1 : 0;
          if (!(a || b || c)) return;
          sc += a + b + c;
        }
        hits.push([sc + (RANK[it.k] || 0), it]);
      });
      hits.sort((x, y) => y[0] - x[0]);
      res.innerHTML = hits.length ? hits.slice(0, 40).map(([, it]) =>
        '<li><a href="' + it.c + '/' + it.f + '#' + it.id + '"><span class="wh">C' + chapNo[it.c] + ' · B' + chapNo[it.c + '/' + it.f] + '<small>' + (KIND[it.k] || '') + '</small></span>' +
        '<span class="t">' + esc(it.t) + '</span><span class="e">' + esc(it.e || it.s) + '</span></a></li>').join('') +
        (hits.length > 40 ? '<li class="none">… và ' + (hits.length - 40) + ' kết quả khác — thêm từ khóa để thu hẹp.</li>' : '')
        : '<li class="none">Không tìm thấy. Thử từ khóa ngắn hơn hoặc xem mục lục từng buổi.</li>';
      math(res);
    }
    let tm = null; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 120); });
    const chips = $('chips');
    if (chips) {
      ['hạng', 'định thức', 'nghịch đảo', 'Cramer', 'Gauss', 'thuần nhất', 'độc lập tuyến tính', 'tọa độ', 'Leontief', 'kiểm tra'].forEach(w => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = w;
        b.addEventListener('click', () => { q.value = w; run(); q.focus(); }); chips.appendChild(b);
      });
    }
    if (location.hash.indexOf('#q=') === 0) { q.value = decodeURIComponent(location.hash.slice(3)); run(); }
  }

  /* ---------- Chuyển / xóa tiến độ (trang hướng dẫn) ---------- */
  function initTransfer() {
    const box = $('pcode'); if (!box) return;
    const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
    const msg = t => { $('pmsg').textContent = t; };
    $('pexport').addEventListener('click', () => {
      const o = {}; ls.keys().forEach(k => { o[k.slice(PFX.length)] = localStorage.getItem(k); });
      box.value = 'TKT1:' + enc(o); box.select();
      try { navigator.clipboard.writeText(box.value).then(() => msg('Đã sao chép mã tiến độ — dán vào trang này trên thiết bị kia.'), () => msg('Hãy chọn và sao chép mã trong ô.')); } catch (e) { msg('Hãy chọn và sao chép mã trong ô.'); }
    });
    $('pimport').addEventListener('click', () => {
      let o; try { o = dec(box.value.replace(/^TKT1:/, '')); } catch (e) { msg('Mã không hợp lệ. Hãy sao chép lại toàn bộ mã (bắt đầu bằng TKT1:).'); return; }
      let n = 0;
      Object.keys(o).forEach(k => {
        try {
          const cur = JSON.parse(localStorage.getItem(PFX + k) || 'null'), inc = JSON.parse(o[k]);
          let v = inc;
          if (k.indexOf('seen:') === 0 && cur) v = { ids: Object.assign({}, inc.ids, cur.ids), n: Math.max(cur.n || 0, inc.n || 0), at: Math.max(cur.at || 0, inc.at || 0) };
          else if (k.indexOf('quiz:') === 0 && cur) v = Object.assign({}, inc, cur);
          else if (k === 'last' && cur && (cur.at || 0) > (inc.at || 0)) v = cur;
          localStorage.setItem(PFX + k, JSON.stringify(v)); n++;
        } catch (e) { /* bỏ qua mục lỗi */ }
      });
      msg('Đã nhập ' + n + ' mục tiến độ.');
    });
    $('pclear').addEventListener('click', () => {
      if (!confirm('Xóa toàn bộ tiến độ học tập trên thiết bị này? Không thể hoàn tác.')) return;
      ls.keys().forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } });
      msg('Đã xóa tiến độ trên thiết bị này.');
    });
  }

  const tb = $('themeBtn');
  if (tb) tb.addEventListener('click', () => {
    const r = document.documentElement;
    const dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const t = dark ? 'light' : 'dark'; r.setAttribute('data-theme', t);
    try { localStorage.setItem('tkt-theme', t); } catch (e) { /* bỏ qua */ }
  });

  renderHome();
  initSearch();
  initTransfer();
  math(document.body);
})();
