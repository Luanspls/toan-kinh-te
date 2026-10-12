/* kiemtra.js — giao diện kiểm tra – đánh giá: danh sách bài, làm bài (đồng hồ, tự lưu), nộp, xem lại;
   công cụ giảng viên (bảng đặc tả, ngân hàng câu hỏi, tạo đề in) khi mở ở bản giảng viên.
   Dựa vào: TKTKT (kiemtra-core.js + ngan-hang.js), TKT.renderMath (deck.js), TKTAcct (taikhoan.js, nếu có máy chủ). */
(function () {
  'use strict';
  const K = window.TKTKT, root = document.documentElement;
  const HV = root.dataset.mode === 'hv';
  const ACC = window.TKTAcct && window.TKTAcct.enabled ? window.TKTAcct : null;
  const CH = root.dataset.chapter || 'chuong1';
  const PFX = 'tkt:v1:';
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const math = el => { if (window.TKT && TKT.renderMath) TKT.renderMath(el); };
  const MD = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' };
  const LOAI = { mc: 'Trắc nghiệm', ds: 'Đúng/Sai', so: 'Trả lời ngắn' };
  const L = 'ABCDEF';
  const fmt = d => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const num10 = x => (x == null || x === '' ? '—' : (Math.round(x * 100) / 100).toString().replace('.', ','));
  const randSeed = () => { const a = new Uint32Array(2); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 4294967296; }); return Array.from(a, x => x.toString(16).padStart(8, '0')).join('').slice(0, 12); };
  const tests = () => K.bank.order.map(id => K.bank.tests[id]).filter(T => T.chuong === CH);
  const nCau = T => T.cau.reduce((s, p) => s + Object.values(p.md).reduce((a, b) => a + b, 0), 0);

  let app, cfg = null, timerId = null, cur = null;

  /* ---------- Dữ liệu bài làm trên máy ---------- */
  const hist = () => LS.get(PFX + 'kt') || {};
  function saveAttempt(bai, a) { const h = hist(); const list = h[bai] = h[bai] || []; const i = list.findIndex(x => x.luot === a.luot && x.seed === a.seed); if (i >= 0) list[i] = Object.assign(list[i], a); else list.push(a); LS.set(PFX + 'kt', h); }
  function bestOf(bai) { const v = (hist()[bai] || []).filter(x => x.diem != null).map(x => x.diem); return v.length ? Math.max.apply(null, v) : null; }
  function settings(T) {
    const s = cfg && cfg.tests && cfg.tests[T.id];
    return { mo: s ? s.mo : true, so_lan: s ? s.so_lan : (ACC ? T.so_lan : 0), phut: s ? s.phut : T.phut, xem_giai: s ? s.xem_giai : T.xem_giai, han: s ? s.han : 0 };
  }

  /* ---------- Hiển thị một câu hỏi ---------- */
  function qHtml(ins, i, mode, ans, res) {
    // mode: 'lam' (đang làm) | 'xem' (xem lại, có đáp án) | 'kq' (chỉ đúng/sai) | 'in' (đề in) | 'gv' (xem trước kèm đáp án)
    const showKey = mode === 'xem' || mode === 'gv';
    const dis = mode !== 'lam' ? ' disabled' : '';
    let h = '<article class="kq-q' + (res ? (res.s === 1 ? ' dung' : res.s > 0 ? ' mot-phan' : ' sai') : '') + '" id="cau' + (i + 1) + '" data-i="' + i + '">' +
      '<header><b>Câu ' + (i + 1) + '</b><span class="tag">' + LOAI[ins.loai] + '</span>' + (mode === 'gv' || mode === 'in' ? '' : '') +
      (mode === 'gv' ? '<span class="tag">' + MD[ins.md] + '</span><span class="tag">' + esc(ins.id) + '</span>' : '') +
      (res && mode !== 'lam' ? '<span class="mark">' + (res.s === 1 ? '✓ Đúng' : res.s > 0 ? '◐ ' + String(res.s).replace('.', ',') + ' điểm' : '✗ Chưa đúng') + '</span>' : '') + '</header>' +
      '<div class="kq-stem">' + ins.q + '</div>';
    if (ins.loai === 'mc') {
      h += '<div class="kq-opts">' + ins.opts.map((o, k) => {
        const chosen = ans === k, key = showKey && k === ins.a;
        return '<label class="op' + (chosen ? ' chon' : '') + (key ? ' khoa' : '') + (showKey && chosen && k !== ins.a ? ' sai' : '') + '"><input type="radio" name="q' + i + '" value="' + k + '"' + (chosen ? ' checked' : '') + dis + '><b>' + L[k] + '.</b><span>' + o + '</span></label>';
      }).join('') + '</div>';
    } else if (ins.loai === 'ds') {
      h += '<table class="kq-ds"><tr><th></th><th>Khẳng định</th><th class="c">Đúng</th><th class="c">Sai</th>' + (showKey ? '<th class="c">Đáp án</th>' : '') + '</tr>' + ins.y.map((y, k) => {
        const v = Array.isArray(ans) ? ans[k] : null;
        const cell = val => '<td class="c"><input type="radio" name="q' + i + '_' + k + '" value="' + (val ? 1 : 0) + '"' + (v === val ? ' checked' : '') + dis + ' aria-label="' + (val ? 'Đúng' : 'Sai') + '"></td>';
        return '<tr class="' + (showKey && v != null ? (v === y.d ? 'ok' : 'no') : '') + '"><td>' + 'abcd'[k] + ')</td><td>' + y.t + '</td>' + cell(true) + cell(false) + (showKey ? '<td class="c"><b>' + (y.d ? 'Đ' : 'S') + '</b></td>' : '') + '</tr>';
      }).join('') + '</table>';
    } else {
      h += '<div class="kq-so"><label>Đáp số: <input type="text" name="q' + i + '" value="' + esc(ans == null ? '' : ans) + '" autocomplete="off" spellcheck="false"' + dis + (mode === 'in' ? ' placeholder="……………"' : '') + '></label>' +
        (mode === 'lam' ? '<span class="hint">Số nguyên, phân số tối giản (vd <code>-3/2</code>) hoặc số thập phân làm tròn 2 chữ số (vd <code>1,67</code>).</span>' : '') +
        (showKey ? '<span class="key">Đáp án: <b>$' + K.LA.F(ins.a).tex() + '$</b></span>' : '') + '</div>';
    }
    if (showKey && ins.giai) h += '<details class="kq-giai"' + (mode === 'gv' ? ' open' : '') + '><summary>Lời giải</summary><div>' + ins.giai + '</div></details>';
    if (mode === 'xem' && ins.on && res && res.s < 1) h += '<a class="xref" href="' + ins.on + '">Ôn lại slide liên quan</a>';
    return h + '</article>';
  }

  /* ---------- Danh sách bài ---------- */
  async function showList(focus) {
    stopTimer(); cur = null;
    if (ACC && !cfg) { cfg = await ACC.config(); }
    const s = ACC && ACC.session(); const logged = !!(s && s.token);
    const pending = LS.get(PFX + 'ktdang');
    let h = '';
    if (ACC && !logged) h += '<div class="kq-note">Bạn chưa đăng nhập: vẫn làm được bài để <b>tự kiểm tra</b>, nhưng kết quả <b>không được ghi nhận</b> cho giảng viên. Bài kiểm tra chương cần đăng nhập.</div>';
    if (!ACC) h += '<div class="kq-note">Bản ngoại tuyến: kết quả chỉ lưu trên máy này để bạn tự theo dõi.</div>';
    if (pending && K.bank.tests[pending.bai]) h += '<div class="kq-note warn">Bạn có bài <b>' + esc(K.bank.tests[pending.bai].ten) + '</b> đang làm dở. <button class="btn primary" data-act="resume">Làm tiếp</button></div>';
    const groups = [['buoi', 'Kiểm tra sau mỗi buổi học', 'Đánh giá từng phần nội dung. Mỗi lượt là một đề khác (số liệu sinh ngẫu nhiên, cùng độ khó); điểm ghi nhận là <b>điểm cao nhất</b>. Sau khi nộp được xem lời giải và slide cần ôn.'],
      ['chuong', 'Kiểm tra cả chương', 'Đánh giá tổng hợp sau khi học xong chương. Giảng viên mở bài theo lịch; thường chỉ làm một lượt, có giới hạn thời gian.']];
    groups.forEach(([loai, title, desc]) => {
      const list = tests().filter(T => T.loai === loai); if (!list.length) return;
      h += '<section class="kq-group"><h2 class="sec">' + title + '</h2><p class="lead">' + desc + '</p><div class="kq-cards">';
      list.forEach(T => {
        const st = settings(T), mine = hist()[T.id] || [], used = mine.length, best = bestOf(T.id);
        const lt = K.bank.tests['lt-' + T.id];
        const locked = !st.mo || (st.han && Date.now() > st.han) || (ACC && T.loai === 'chuong' && !logged) || (logged && st.so_lan && used >= st.so_lan);
        const why = !st.mo ? 'Chưa mở' : st.han && Date.now() > st.han ? 'Đã hết hạn' : ACC && T.loai === 'chuong' && !logged ? 'Cần đăng nhập' : 'Đã hết lượt';
        h += '<article class="kq-card" id="' + T.id + '"><div class="k">' + esc(T.ten) + '</div><h3>' + esc(T.mo_ta || '') + '</h3>' +
          '<p class="meta">' + nCau(T) + ' câu · ' + (st.phut ? st.phut + ' phút' : 'không giới hạn thời gian') + ' · ' + (st.so_lan ? 'tối đa ' + st.so_lan + ' lượt' : 'không giới hạn lượt') + (st.han ? ' · hạn ' + fmt(st.han) : '') + '</p>' +
          '<div class="kq-stat">' + (best != null ? '<b>' + num10(best) + '</b><span>điểm cao nhất · ' + used + ' lượt</span>' : '<span>Chưa làm</span>') + '</div>' +
          '<div class="kq-act">' + (locked ? '<button class="btn" disabled>' + why + '</button>' : '<button class="btn primary" data-act="start" data-id="' + T.id + '">' + (used ? 'Làm lượt mới' : 'Làm bài') + '</button>') +
          (lt ? '<button class="btn" data-act="start" data-id="' + lt.id + '" title="5 câu, không giới hạn lượt, không tính điểm">Luyện tập</button>' : '') +
          (mine.length ? '<button class="btn" data-act="hist" data-id="' + T.id + '">Lịch sử</button>' : '') + '</div>' +
          '<div class="kq-hist" hidden></div></article>';
      });
      h += '</div></section>';
    });
    app.innerHTML = h; math(app);
    if (focus && document.getElementById(focus)) { const el = document.getElementById(focus); el.classList.add('focus'); el.scrollIntoView({ block: 'center' }); }
  }
  function histHtml(bai) {
    const list = (hist()[bai] || []).slice().sort((a, b) => (b.nop || b.bd || 0) - (a.nop || a.bd || 0));
    return '<table class="tbl"><tr><th>Lượt</th><th>Thời gian</th><th class="c">Điểm</th><th>Trạng thái</th><th></th></tr>' + list.map(a =>
      '<tr><td>' + a.luot + '</td><td>' + (a.nop ? fmt(a.nop) : a.bd ? fmt(a.bd) : '') + '</td><td class="c"><b>' + num10(a.diem) + '</b></td><td>' + esc(a.trangThai || (a.daGui ? 'Đã ghi nhận' : ACC ? 'Chưa gửi / làm thử' : 'Trên máy này')) + '</td><td>' +
      (a.traLoi ? '<button class="btn" data-act="review" data-id="' + bai + '" data-luot="' + a.luot + '" data-seed="' + esc(a.seed) + '">Xem lại</button>' : '') + '</td></tr>').join('') + '</table>';
  }

  /* ---------- Làm bài ---------- */
  async function start(id, resume) {
    const T = K.bank.tests[id]; const st = settings(T);
    const s = ACC && ACC.session(); const logged = !!(s && s.token);
    let att;
    if (resume) att = resume;
    else if (logged && T.loai !== 'luyen') {
      try {
        const j = await ACC.call('batDau', { bai: id });
        att = { bai: id, seed: j.seed, luot: j.luot, bd: j.batDau, phut: j.phut, xemGiai: j.xemGiai, server: true, traLoi: [] };
        if (j.tiepTuc) { const p = LS.get(PFX + 'ktdang'); if (p && p.seed === j.seed) att.traLoi = p.traLoi; }
      } catch (e) {
        if (!e.net) { alert(e.message); return showList(id); }
        if (!confirm(e.message + '\n\nLàm thử ngay trên máy (kết quả KHÔNG được ghi nhận)?')) return;
        att = null;
      }
    }
    if (!att) {
      const used = (hist()[id] || []).length;
      att = { bai: id, seed: randSeed(), luot: used + 1, bd: Date.now(), phut: T.loai === 'luyen' ? 0 : st.phut, xemGiai: T.loai === 'luyen' ? true : st.xem_giai, server: false, practice: T.loai === 'luyen', traLoi: [] };
    }
    const ins = K.build(id, att.seed);
    att.traLoi = att.traLoi && att.traLoi.length === ins.length ? att.traLoi : ins.map(x => (x.loai === 'ds' ? [null, null, null, null] : null));
    LS.set(PFX + 'ktdang', att);
    cur = { T, ins, att };
    app.innerHTML = '<div class="kq-bar"><div><b>' + esc(T.ten) + '</b><span>' + esc(T.mo_ta || '') + (att.server ? ' · lượt ' + att.luot : T.loai === 'luyen' ? ' · luyện tập' : ACC ? ' · làm thử' : ' · tự kiểm tra') + '</span></div>' +
      '<div class="kq-nav">' + ins.map((_, i) => '<a href="#cau' + (i + 1) + '" data-n="' + i + '">' + (i + 1) + '</a>').join('') + '</div>' +
      '<div class="kq-time" aria-live="off"></div><button class="btn primary" data-act="submit">Nộp bài</button></div>' +
      '<form class="kq-form" autocomplete="off">' + ins.map((x, i) => qHtml(x, i, 'lam', att.traLoi[i])).join('') + '</form>' +
      '<div class="kq-foot"><span class="kq-count"></span><button class="btn primary" data-act="submit">Nộp bài</button><button class="btn" data-act="leave">Thoát (lưu bài làm dở)</button></div>';
    math(app); refreshCount(); app.scrollIntoView({ block: 'start' });
    app.querySelector('.kq-form').addEventListener('input', onAnswer);
    app.querySelector('.kq-form').addEventListener('change', onAnswer);
    app.querySelector('.kq-form').addEventListener('submit', e => e.preventDefault());
    if (att.phut) startTimer(att.bd + att.phut * 60000);
  }
  function onAnswer(e) {
    const t = e.target; if (!cur || !t.name) return;
    const m = t.name.match(/^q(\d+)(?:_(\d))?$/); if (!m) return;
    const i = +m[1], ins = cur.ins[i], a = cur.att.traLoi;
    if (ins.loai === 'mc') a[i] = +t.value;
    else if (ins.loai === 'ds') { a[i] = (a[i] || [null, null, null, null]).slice(); a[i][+m[2]] = t.value === '1'; }
    else a[i] = t.value;
    t.closest('.kq-q').querySelectorAll('.op').forEach(o => o.classList.toggle('chon', o.querySelector('input').checked));
    LS.set(PFX + 'ktdang', cur.att); refreshCount();
  }
  const answered = (ins, a) => (ins.loai === 'ds' ? Array.isArray(a) && a.every(v => v != null) : ins.loai === 'so' ? a != null && String(a).trim() !== '' : a != null);
  function refreshCount() {
    if (!cur) return; const n = cur.ins.filter((x, i) => answered(x, cur.att.traLoi[i])).length;
    app.querySelectorAll('.kq-nav a').forEach(a => a.classList.toggle('xong', answered(cur.ins[+a.dataset.n], cur.att.traLoi[+a.dataset.n])));
    app.querySelectorAll('.kq-count').forEach(el => { el.textContent = 'Đã trả lời ' + n + '/' + cur.ins.length + ' câu'; });
    const so = cur.ins.map((x, i) => (x.loai === 'so' && cur.att.traLoi[i] && !K.parseNum(cur.att.traLoi[i]) ? i + 1 : 0)).filter(Boolean);
    app.querySelectorAll('.kq-q').forEach(q => q.classList.toggle('loi-so', so.indexOf(+q.dataset.i + 1) >= 0));
  }
  function startTimer(deadline) {
    stopTimer();
    const el = app.querySelector('.kq-time');
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      el.textContent = '⏱ ' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
      el.classList.toggle('gap', left <= 120);
      if (left === 0) { stopTimer(); alert('Hết giờ làm bài. Bài làm được nộp tự động.'); submit(true); }
    };
    tick(); timerId = setInterval(tick, 1000);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

  async function submit(auto) {
    if (!cur) return;
    const { T, ins, att } = cur;
    const miss = ins.filter((x, i) => !answered(x, att.traLoi[i])).length;
    if (!auto && miss && !confirm('Còn ' + miss + ' câu chưa trả lời đủ. Vẫn nộp bài?')) return;
    stopTimer();
    const g = K.grade(ins, att.traLoi);
    const rec = { bai: T.id, luot: att.luot, seed: att.seed, bd: att.bd, nop: Date.now(), diem: g.diem, dung: g.dung, tong: g.tong, traLoi: att.traLoi, chi: g.chi.map(c => c.s), daGui: false, thu: !att.server && !att.practice };
    let serverRes = null, note = '';
    const s = ACC && ACC.session(); const logged = !!(s && s.token);
    const payload = { bai: T.id, luot: att.luot, seed: att.seed, traLoi: att.traLoi, diem: g.diem, dung: g.dung, tong: g.tong, phienBan: K.version, batDau: att.bd };
    if (logged && (att.server || att.practice)) {
      try { serverRes = await ACC.call('nopBai', payload); rec.daGui = true; rec.diem = serverRes.diem; rec.trangThai = serverRes.trangThai; }
      catch (e) {
        if (e.net) { ACC.queue('nopBai', payload); note = 'Chưa gửi được bài lên máy chủ (mất mạng). Bài đã được lưu và sẽ tự gửi khi có mạng — đừng đăng xuất trước khi gửi xong.'; }
        else note = 'Máy chủ không nhận bài: ' + e.message;
      }
    }
    if (!att.server && !att.practice) rec.trangThai = ACC ? 'Làm thử (không ghi nhận)' : 'Trên máy này';
    saveAttempt(T.id, rec); LS.del(PFX + 'ktdang');
    showResult(T, ins, att, g, rec, serverRes, note);
  }

  function showResult(T, ins, att, g, rec, serverRes, note) {
    const show = att.xemGiai !== false;
    const chi = g.chi;
    app.innerHTML = '<section class="kq-result"><div class="k">' + esc(T.ten) + ' · ' + (att.server ? 'lượt ' + att.luot : T.loai === 'luyen' ? 'luyện tập' : ACC ? 'làm thử' : 'tự kiểm tra') + '</div>' +
      '<div class="kq-score"><b>' + num10(rec.diem) + '</b><span>/ 10 điểm<br>' + String(serverRes ? serverRes.dung : g.dung).replace('.', ',') + '/' + g.tong + ' câu (tính cả điểm thành phần câu Đúng/Sai)</span></div>' +
      (note ? '<div class="kq-note warn">' + esc(note) + '</div>' : '') +
      (rec.trangThai === 'Nộp muộn' ? '<div class="kq-note warn">Bài được ghi nhận là <b>nộp muộn</b>.</div>' : '') +
      (serverRes ? '<div class="kq-note ok">Kết quả đã được ghi nhận cho giảng viên.</div>' : '') +
      '<div class="kq-act"><button class="btn primary" data-act="list">Về danh sách bài</button>' + (T.buoi ? '<a class="btn" href="' + T.buoi + '">Ôn lại ' + esc(T.ten.replace('Kiểm tra sau ', '').replace('Luyện tập ', '')) + '</a>' : '') + '</div></section>' +
      (show ? '<h2 class="sec">Xem lại bài làm</h2><div class="kq-review">' + ins.map((x, i) => qHtml(x, i, 'xem', att.traLoi[i], chi[i])).join('') + '</div>'
        : '<p class="lead">Bài kiểm tra này không hiển thị lời giải sau khi nộp. Giảng viên sẽ chữa bài trên lớp.</p>');
    math(app); app.scrollIntoView({ block: 'start' });
  }
  function review(bai, luot, seed) {
    const a = (hist()[bai] || []).find(x => String(x.luot) === String(luot) && x.seed === seed); if (!a) return;
    const T = K.bank.tests[bai]; const st = settings(T); const ins = K.build(bai, seed); const g = K.grade(ins, a.traLoi);
    const att = { bai, seed, luot: a.luot, server: a.daGui, xemGiai: T.loai === 'luyen' || st.xem_giai, practice: T.loai === 'luyen' };
    showResult(T, ins, att, g, a, a.daGui ? { dung: a.dung } : null, '');
  }

  /* ---------- Công cụ giảng viên ---------- */
  function teacher(box) {
    const items = K.bank.items.filter(it => tests().some(T => T.cau.some(p => p.tu.indexOf(it.bai) >= 0)));
    const bais = Array.from(new Set(items.map(it => it.bai)));
    const tid = { b: k => (K.bank.tests[k] ? K.bank.tests[k].ten.replace('Kiểm tra sau ', '') : k) };
    // Bảng đặc tả
    let h = '<h2 class="sec">Bảng đặc tả ngân hàng câu hỏi</h2><p class="lead">Mỗi ô là số <b>bộ sinh câu hỏi</b> (mỗi bộ sinh ra vô số biến thể cùng dạng, cùng độ khó). Đáp án các bộ sinh có tính toán đã được kiểm chứng độc lập.</p>' +
      '<div class="tblwrap"><table class="tbl"><tr><th>Nội dung</th>' + K.LEVELS.map(l => '<th class="c">' + MD[l] + '</th>').join('') + '<th class="c">Tổng</th><th>Chuẩn đầu ra</th></tr>' +
      bais.map(b => {
        const its = items.filter(it => it.bai === b); const T = K.bank.tests[b];
        return '<tr><td><b>' + tid.b(b) + '</b> · ' + esc(T ? T.mo_ta : '') + '</td>' + K.LEVELS.map(l => '<td class="c">' + (its.filter(it => it.md === l).length || '') + '</td>').join('') + '<td class="c"><b>' + its.length + '</b></td><td>' + Array.from(new Set(its.map(it => it.cdr))).sort().join(', ') + '</td></tr>';
      }).join('') + '<tr><th>Tổng</th>' + K.LEVELS.map(l => '<th class="c">' + items.filter(it => it.md === l).length + '</th>').join('') + '<th class="c">' + items.length + '</th><th></th></tr></table></div>';
    // Cấu trúc đề
    h += '<h2 class="sec">Cấu trúc các bài kiểm tra</h2><div class="tblwrap"><table class="tbl"><tr><th>Bài</th><th class="c">Số câu</th><th class="c">Phút</th><th class="c">Lượt</th><th>Lấy câu từ (NB – TH – VD – VDC)</th></tr>' +
      tests().filter(T => T.loai !== 'luyen').map(T => '<tr><td><b>' + esc(T.ten) + '</b><br><span class="muted">' + esc(T.mo_ta || '') + '</span></td><td class="c">' + nCau(T) + '</td><td class="c">' + T.phut + '</td><td class="c">' + (T.so_lan || '∞') + '</td><td>' +
        T.cau.map(p => p.tu.map(tid.b).join(', ') + ': ' + K.LEVELS.map(l => p.md[l] || 0).join(' – ')).join('<br>') + '</td></tr>').join('') + '</table></div>';
    // Ngân hàng
    h += '<h2 class="sec">Ngân hàng câu hỏi</h2><p class="lead">Bấm "Xem biến thể" để sinh một đề mẫu kèm đáp án và lời giải; bấm lại để có biến thể khác.</p><div class="kq-bank">' +
      bais.map(b => '<details><summary><b>' + tid.b(b) + '</b> — ' + items.filter(it => it.bai === b).length + ' bộ sinh</summary><table class="tbl"><tr><th>Mã</th><th>Mục</th><th>CĐR</th><th>Mức độ</th><th>Loại</th><th>Slide ôn</th><th></th></tr>' +
        items.filter(it => it.bai === b).map(it => '<tr><td><code>' + it.id + '</code></td><td>' + it.muc + '</td><td>' + it.cdr + '</td><td>' + MD[it.md] + '</td><td>' + LOAI[it.loai] + '</td><td><a href="' + it.on + '">' + it.on.replace('.html', '') + '</a></td><td><button class="btn" data-act="sample" data-id="' + it.id + '">Xem biến thể</button></td></tr><tr class="kq-sample" data-for="' + it.id + '" hidden><td colspan="7"></td></tr>').join('') + '</table></details>').join('') + '</div>';
    // Tạo đề in
    h += '<h2 class="sec">Tạo đề in (kiểm tra trên giấy)</h2><p class="lead">Sinh đề theo cấu trúc của bài đã chọn, nhiều mã đề cùng độ khó, kèm đáp án và lời giải. Ghi lại <b>hạt giống</b> để tạo lại đúng đề này khi cần.</p>' +
      '<div class="kq-print-form"><label>Bài <select id="pt-bai">' + tests().filter(T => T.loai !== 'luyen').map(T => '<option value="' + T.id + '">' + esc(T.ten) + '</option>').join('') + '</select></label>' +
      '<label>Số mã đề <select id="pt-n"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>' +
      '<label>Hạt giống <input id="pt-seed" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<button class="btn primary" data-act="print">Tạo đề và in</button></div><div id="pt-out" class="kq-print"></div>';
    box.innerHTML = h;
  }
  function printTests() {
    const bai = $('#pt-bai').value, n = +$('#pt-n').value, seed = $('#pt-seed').value.trim() || 'de';
    const T = K.bank.tests[bai]; const codes = Array.from({ length: n }, (_, k) => 101 + k);
    const sets = codes.map(c => ({ c, ins: K.build(bai, seed + '-' + c) }));
    const head = c => '<div class="pt-head"><div><b>' + esc((window.TKT_COURSE && TKT_COURSE.truong) || 'Trường Cao đẳng Lạng Sơn') + '</b><br>Học phần: Toán kinh tế (C10.KT06)</div><div class="c"><b>' + esc(T.ten.toUpperCase()) + '</b><br>' + esc(T.mo_ta || '') + '<br>Thời gian: ' + T.phut + ' phút</div><div class="c"><b>Mã đề ' + c + '</b></div></div><p>Họ và tên: ……………………………………… Lớp: ……………… Mã SV: ………………</p>';
    let h = sets.map(s => '<section class="pt-page">' + head(s.c) + s.ins.map((x, i) => qHtml(x, i, 'in')).join('') + '<p class="c">— Hết —</p></section>').join('');
    h += '<section class="pt-page"><h3>ĐÁP ÁN · ' + esc(T.ten) + ' · hạt giống "' + esc(seed) + '"</h3><p>Thang điểm: mỗi câu 1 điểm, quy về thang 10. Câu Đúng/Sai: đúng 1 ý 0,1; 2 ý 0,25; 3 ý 0,5; 4 ý 1 điểm.</p><table class="tbl"><tr><th>Câu</th>' + codes.map(c => '<th>Mã ' + c + '</th>').join('') + '</tr>' +
      sets[0].ins.map((_, i) => '<tr><td>' + (i + 1) + '</td>' + sets.map(s => { const x = s.ins[i]; return '<td>' + (x.loai === 'mc' ? L[x.a] : x.loai === 'ds' ? x.y.map((y, k) => 'abcd'[k] + (y.d ? 'Đ' : 'S')).join(' ') : '$' + K.LA.F(x.a).tex() + '$') + '</td>'; }).join('') + '</tr>').join('') + '</table>' +
      sets.map(s => '<h4>Lời giải mã đề ' + s.c + '</h4><ol>' + s.ins.map(x => '<li>' + x.giai + '</li>').join('') + '</ol>').join('') + '</section>';
    const out = $('#pt-out'); out.innerHTML = h; math(out);
    document.body.classList.add('in-de'); setTimeout(() => { window.print(); }, 300);
  }
  window.addEventListener('afterprint', () => document.body.classList.remove('in-de'));

  /* ---------- Sự kiện ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !b.closest('#kt-app, #kt-gv')) return;
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'start') start(id);
    else if (a === 'resume') { const p = LS.get(PFX + 'ktdang'); if (p) start(p.bai, p); }
    else if (a === 'submit') submit(false);
    else if (a === 'leave') { stopTimer(); showList(cur && cur.T.id); }
    else if (a === 'list') showList(cur && cur.T.id);
    else if (a === 'hist') { const box = b.closest('.kq-card').querySelector('.kq-hist'); box.hidden = !box.hidden; if (!box.hidden) { box.innerHTML = histHtml(id); } }
    else if (a === 'review') review(id, b.dataset.luot, b.dataset.seed);
    else if (a === 'sample') {
      const row = document.querySelector('.kq-sample[data-for="' + id + '"]'); const it = K.bank.items.find(x => x.id === id);
      const ins = K.instantiate(it, randSeed()); row.hidden = false; row.firstChild.innerHTML = qHtml(ins, 0, 'gv'); math(row);
    }
    else if (a === 'print') printTests();
  });
  window.addEventListener('beforeunload', e => { if (cur && cur.att && cur.att.phut) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('tkt:acct', () => { cfg = null; if (!cur) showList(); });

  function boot() {
    app = $('#kt-app'); if (!app) return;
    if (!HV) { const gv = $('#kt-gv'); if (gv) teacher(gv), math(gv); }
    showList((location.hash || '').slice(1));
  }
  window.TKTKTUI = { qHtml };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
