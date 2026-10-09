/* deck.js — bộ máy trình chiếu: điều hướng, hiện từng bước, mục lục, ghi chú, chế độ đọc,
   liên kết sâu (#id-slide) giữa các buổi.
   Hai đối tượng dùng chung một nguồn (xem QUY_CHUAN_BAI_GIANG.md):
   - Giảng viên (mặc định): ghi chú giảng viên <aside class="note">, giữ phần data-aud="gv".
   - Người học (<html data-mode="hv">): gợi ý tự học <aside class="tuhoc">, giữ phần data-aud="hv",
     tự sinh slide "Lộ trình tự học", ẩn lời giải trong chế độ đọc, theo dõi tiến độ. */
(function () {
  'use strict';
  const W = 1280, H = 720;
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  };
  const MODE = root.dataset.mode === 'hv' ? 'hv' : 'gv';
  const HV = MODE === 'hv';
  const PRINT = /[?&](in|print)(=|&|$)/.test(location.search);
  if (PRINT) root.classList.add('print');

  // Giao diện sáng/tối: áp dụng sớm
  const savedTheme = store.get('tkt-theme');
  if (!PRINT && (savedTheme === 'dark' || savedTheme === 'light')) root.setAttribute('data-theme', savedTheme);
  if (PRINT) root.setAttribute('data-theme', 'light');

  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/></svg>',
    hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/></svg>',
    read: '<svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 013 3v11a2 2 0 00-2-2H4zM20 5h-6"/><path d="M20 5v12h-6"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    theme: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 000 16z" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7M6 10v10h12V10"/></svg>'
  };
  const KIND = {
    'bia': 'Bìa', 'muc-tieu': 'Mục tiêu', 'tien-trinh': 'Tiến trình', 'lo-trinh': 'Lộ trình', 'khoi-dong': 'Khởi động',
    'ly-thuyet': 'Lý thuyết', 'vi-du': 'Ví dụ', 'bai-tap': 'Bài tập', 'kiem-tra': 'Kiểm tra', 'on-tap': 'Ôn tập',
    'tong-ket': 'Tổng kết', 'nhiem-vu': 'Nhiệm vụ'
  };
  // Loại slide mà người học nên tự làm trước khi xem lời giải
  const GATED = new Set(['khoi-dong', 'vi-du', 'bai-tap', 'kiem-tra']);

  function renderMath(root) {
    if (window.renderMathInElement) {
      renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false }
        ],
        ignoredClasses: ['nomath'],
        throwOnError: false,
        trust: c => c.command === '\\htmlClass',
        strict: 'ignore'
      });
    }
  }

  /* ---------- Tiến độ học tập (lưu trên máy người học) ----------
     tkt:v1:seen:<chương>/<tệp>  {ids:{id:1}, n:<số slide>, at}
     tkt:v1:quiz:<chương>/<tệp>  {"<slide>#<công cụ>.<câu>": 1|0}  (lần trả lời đầu tiên)
     tkt:v1:last                 {page, id, title, unit, at}                                  */
  const fileName = () => decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  const chapterId = () => root.dataset.chapter || 'chuong1';
  const progress = {
    key: k => 'tkt:v1:' + k,
    read(k) { try { return JSON.parse(store.get(this.key(k)) || 'null'); } catch (e) { return null; } },
    write(k, v) { store.set(this.key(k), JSON.stringify(v)); },
    page(file) { return chapterId() + '/' + (file || fileName()); },
    seen(file) { return this.read('seen:' + this.page(file)) || { ids: {}, n: 0 }; },
    quiz(file) { return this.read('quiz:' + this.page(file)) || {}; },
    markSeen(id, n) {
      const k = 'seen:' + this.page(); const d = this.seen(); d.ids[id] = 1; d.n = n; d.at = Date.now(); this.write(k, d);
    },
    answer(key, ok) {
      const k = 'quiz:' + this.page(); const d = this.quiz(); if (key in d) return; d[key] = ok ? 1 : 0; this.write(k, d);
    },
    stats(file) {
      const s = this.seen(file), q = this.quiz(file);
      const qv = Object.values(q);
      return { seen: Object.keys(s.ids).length, n: s.n, q: qv.length, qok: qv.filter(Boolean).length };
    }
  };

  window.TKT = window.TKT || {};
  window.TKT.renderMath = renderMath;
  window.TKT.mode = MODE;
  window.TKT.progress = progress;

  // Lọc nội dung theo đối tượng: phần tử data-aud khác chế độ hiện tại bị gỡ bỏ
  function applyAudience(scope) {
    scope.querySelectorAll('[data-aud]').forEach(el => { if (el.dataset.aud !== MODE) el.remove(); });
    if (HV) scope.querySelectorAll('.eyebrow').forEach(e => {
      if (e.textContent.indexOf('Mục tiêu bài dạy') >= 0) e.textContent = e.textContent.replace('Mục tiêu bài dạy', 'Mục tiêu bài học');
    });
  }

  /* Trang không phải bài trình chiếu (trang chương, phòng tính): lọc đối tượng, công thức, tiến độ */
  function initPage() {
    applyAudience(document.body);
    renderMath(document.body);
    document.querySelectorAll('[data-prog]').forEach(el => {
      const f = el.dataset.prog, st = progress.stats(f);
      const n = st.n || +el.dataset.total || 0;
      const pct = n ? Math.round(st.seen / n * 100) : 0;
      el.innerHTML = '<span class="pbar"><i style="width:' + pct + '%"></i></span><span class="ptxt">' +
        (st.seen ? st.seen + '/' + n + ' slide' + (st.q ? ' · trắc nghiệm ' + st.qok + '/' + st.q : '') : 'Chưa học') + '</span>';
      el.classList.toggle('done', pct >= 100);
    });
    const last = progress.read('last');
    document.querySelectorAll('[data-resume]').forEach(a => {
      if (last && last.page && last.page.indexOf(chapterId() + '/') === 0) {
        a.href = last.page.slice(chapterId().length + 1) + '#' + last.id;
        a.innerHTML = 'Học tiếp: ' + (last.unit || '').replace(/^Buổi (\d+).*/, 'Buổi $1') + ' · ' + last.title;
      }
    });
  }

  function init() {
    const deck = document.querySelector('.deck');
    if (!deck) { initPage(); return; }
    const stage = deck.querySelector('.stage');

    /* --- Lộ trình tự học (chỉ bản người học): thay cho slide tiến trình theo tiết --- */
    let tietInfo = '';
    if (HV) {
      const tt = stage.querySelector(':scope > section.slide[data-kind="tien-trinh"]');
      if (tt) {
        const m = (tt.querySelector('.eyebrow') || tt).textContent.match(/(\d+)\s*tiết/); if (m) tietInfo = m[1];
        const ls = document.createElement('section');
        ls.className = 'slide'; ls.id = 'lo-trinh'; ls.dataset.kind = 'lo-trinh'; ls.dataset.sec = tt.dataset.sec || 'Mở đầu';
        ls.innerHTML = '<div class="head"><div class="eyebrow">Lộ trình tự học' + (tietInfo ? ' · tương ứng ' + tietInfo + ' tiết trên lớp' : '') + '</div><h2>Học theo từng phần, tự làm trước — xem lời giải sau</h2></div>' +
          '<div class="cols w64"><div class="lt-list"></div><div class="box key small" data-tag="Cách học hiệu quả"><ol>' +
          '<li><b>Lý thuyết:</b> đọc slide, thao tác các công cụ, mở <b>Gợi ý</b> (phím <kbd>N</kbd>) khi cần.</li>' +
          '<li><b>Ví dụ, bài tập:</b> chép đề ra giấy, tự làm trước; sau đó hiện lời giải <b>từng bước</b> để đối chiếu.</li>' +
          '<li><b>Kiểm tra nhanh:</b> trả lời hết rồi mới đọc giải thích; câu sai thì mở lại slide lý thuyết.</li>' +
          '<li><b>Tổng kết:</b> tự tóm tắt bằng lời của mình, làm phần nhiệm vụ.</li></ol>' +
          '<p class="tiny muted">Dấu ✓ cho biết slide đã xem. Tiến độ chỉ lưu trên thiết bị này.</p></div></div>';
        tt.after(ls);
      }
    }
    applyAudience(stage);

    const slides = Array.from(stage.querySelectorAll(':scope > section.slide'));
    const meta = { course: deck.dataset.course || 'Toán kinh tế', unit: deck.dataset.unit || '', prev: deck.dataset.prev, next: deck.dataset.next, home: deck.dataset.home || 'index.html', portal: root.dataset.portal };
    slides.forEach((s, i) => { if (!s.id) s.id = 's' + (i + 1); });
    const titleOf = (s, i) => {
      if (s.dataset.title) return s.dataset.title;
      const h = s.querySelector('h2, h1'); if (!h) return 'Slide ' + (i + 1);
      const c = h.cloneNode(true); c.querySelectorAll('.katex-mathml').forEach(x => x.remove());
      return c.textContent.replace(/\s+/g, ' ').trim();
    };
    const stepsOf = s => Array.from(s.querySelectorAll('.step'));
    const gated = s => HV && !PRINT && GATED.has(s.dataset.kind) && stepsOf(s).length > 0;

    renderMath(stage);
    if (window.TKTWidgets) window.TKTWidgets.initAll(stage);

    /* --- Nút hiện lời giải từng bước trong chế độ đọc (người học) --- */
    slides.forEach(s => {
      if (!gated(s)) return;
      s.classList.add('gated');
      const g = document.createElement('div'); g.className = 'gate';
      g.innerHTML = '<span class="gi"></span><button type="button" class="btn primary" data-g="next">Hiện bước tiếp ▶</button><button type="button" class="btn" data-g="all">Hiện tất cả</button><button type="button" class="btn" data-g="hide">Ẩn lại</button>';
      s.appendChild(g);
      const sync = () => {
        const st = stepsOf(s), k = st.filter(x => x.classList.contains('shown')).length;
        g.querySelector('.gi').textContent = k === 0 ? 'Lời giải có ' + st.length + ' bước — hãy tự làm trước.' : 'Đã hiện ' + k + '/' + st.length + ' bước';
        g.querySelector('[data-g=next]').disabled = k === st.length; g.querySelector('[data-g=all]').disabled = k === st.length;
        g.querySelector('[data-g=hide]').hidden = k === 0;
      };
      g.addEventListener('click', e => {
        const b = e.target.closest('[data-g]'); if (!b) return;
        const st = stepsOf(s);
        if (b.dataset.g === 'next') { const x = st.find(y => !y.classList.contains('shown')); if (x) x.classList.add('shown'); }
        else st.forEach(x => x.classList.toggle('shown', b.dataset.g === 'all'));
        sync();
      });
      s._syncGate = sync; sync();
    });
    const syncGate = s => { if (s._syncGate) s._syncGate(); };

    /* --- Thanh điều khiển --- */
    const noteLbl = HV ? 'Gợi ý' : 'Ghi chú';
    const bar = document.createElement('div'); bar.className = 'bar';
    bar.innerHTML =
      '<button class="ib" data-act="toc" title="Mục lục (M)" aria-label="Mục lục">' + ICON.menu + '<span class="lbl">Mục lục</span></button>' +
      '<a class="ib" href="' + meta.home + '" title="Trang chương" aria-label="Trang chương">' + ICON.home + '</a>' +
      '<div class="who"><b>' + meta.course + '</b> · ' + meta.unit + '</div>' +
      '<div class="prog" aria-hidden="true"><i></i></div>' +
      '<span class="cnt" aria-live="polite"></span>' +
      '<div class="tools">' +
      '<button class="ib" data-act="notes" title="' + (HV ? 'Gợi ý tự học' : 'Ghi chú giảng viên') + ' (N)" aria-label="' + (HV ? 'Gợi ý tự học' : 'Ghi chú giảng viên') + '">' + (HV ? ICON.hint : ICON.note) + '<span class="lbl">' + noteLbl + '</span></button>' +
      '<button class="ib" data-act="read" title="Chế độ đọc (R)" aria-label="Chế độ đọc">' + ICON.read + '</button>' +
      '<button class="ib" data-act="theme" title="Sáng / tối (T)" aria-label="Đổi giao diện sáng tối">' + ICON.theme + '</button>' +
      '<button class="ib" data-act="full" title="Toàn màn hình (F)" aria-label="Toàn màn hình">' + ICON.full + '</button>' +
      '<button class="ib" data-act="prev" title="Lùi (←)" aria-label="Lùi">' + ICON.prev + '</button>' +
      '<button class="ib" data-act="next" title="Tiến (→ hoặc Space)" aria-label="Tiến">' + ICON.next + '</button>' +
      '</div>';
    document.body.appendChild(bar);
    const cnt = bar.querySelector('.cnt'), progI = bar.querySelector('.prog i');

    /* --- Mục lục --- */
    const drawer = document.createElement('aside'); drawer.className = 'drawer'; drawer.setAttribute('aria-label', 'Mục lục');
    let navHtml = ''; let lastSec = null;
    slides.forEach((s, i) => {
      const sec = s.dataset.sec || '';
      if (sec && sec !== lastSec) { navHtml += '<div class="sec">' + sec + '</div>'; lastSec = sec; }
      const kd = s.dataset.kind && KIND[s.dataset.kind] ? '<em class="kd kd-' + s.dataset.kind + '">' + KIND[s.dataset.kind] + '</em>' : '';
      navHtml += '<a href="#' + s.id + '" data-i="' + i + '"><span>' + (i + 1) + '</span><b>' + titleOf(s, i) + kd + '</b></a>';
    });
    let links = '';
    if (meta.portal) links += '<a href="' + meta.portal + '">Cổng học tập</a>';
    links += '<a href="' + meta.home + '">Trang chương</a>';
    if (meta.prev) links += '<a href="' + meta.prev + '">← Buổi trước</a>';
    if (meta.next) links += '<a href="' + meta.next + '">Buổi sau →</a>';
    links += '<a href="lab.html">Phòng tính ma trận</a>';
    drawer.innerHTML = '<header><div class="k">' + meta.course + '</div><h3>' + meta.unit + '</h3>' + (HV ? '<div class="pstat"></div>' : '') + '</header><nav>' + navHtml + '</nav><div class="links">' + links + '</div>' +
      '<div class="links keys"><span><kbd>→</kbd>/<kbd>Space</kbd> tiến · <kbd>←</kbd> lùi · <kbd>M</kbd> mục lục · <kbd>N</kbd> ' + (HV ? 'gợi ý' : 'ghi chú') + ' · <kbd>F</kbd> toàn màn hình · <kbd>R</kbd> chế độ đọc · <kbd>T</kbd> sáng/tối</span></div>';
    document.body.appendChild(drawer);
    drawer.addEventListener('click', e => {
      const a = e.target.closest('a[data-i]'); if (!a) return;
      e.preventDefault(); go(+a.dataset.i, 'all'); toggleDrawer(false);
    });

    /* --- Ghi chú giảng viên / gợi ý tự học --- */
    const notes = document.createElement('div'); notes.className = 'notes'; notes.hidden = true; document.body.appendChild(notes);

    /* --- Tiến độ --- */
    function refreshProgress() {
      const sn = progress.seen().ids;
      drawer.querySelectorAll('a[data-i]').forEach(a => a.classList.toggle('seen', !!sn[slides[+a.dataset.i].id]));
      const ps = drawer.querySelector('.pstat');
      if (ps) {
        const st = progress.stats();
        ps.innerHTML = '<span class="pbar"><i style="width:' + Math.round(st.seen / slides.length * 100) + '%"></i></span>Đã xem ' + st.seen + '/' + slides.length + ' slide' + (st.q ? ' · trắc nghiệm đúng ' + st.qok + '/' + st.q + ' (lần đầu)' : '');
      }
      const lt = stage.querySelector('#lo-trinh .lt-list');
      if (lt) {
        const groups = []; slides.forEach((s, i) => {
          const sec = s.dataset.sec || ''; let g = groups[groups.length - 1];
          if (!g || g.sec !== sec) { g = { sec, items: [] }; groups.push(g); }
          g.items.push(i);
        });
        lt.innerHTML = '<table class="tbl"><tr><th>Phần</th><th>Nội dung</th><th class="c">Đã xem</th></tr>' + groups.map(g => {
          const kinds = {}; g.items.forEach(i => { const k = KIND[slides[i].dataset.kind]; if (k) kinds[k] = (kinds[k] || 0) + 1; });
          const done = g.items.filter(i => sn[slides[i].id]).length;
          return '<tr><td><a href="#' + slides[g.items[0]].id + '">' + g.sec + '</a></td><td class="muted">' + Object.keys(kinds).map(k => k + (kinds[k] > 1 ? ' ×' + kinds[k] : '')).join(', ') +
            '</td><td class="c">' + (done === g.items.length ? '<b class="ok">✓</b>' : done + '/' + g.items.length) + '</td></tr>';
        }).join('') + '</table>';
      }
    }
    let seenTimer = null;
    function trackSeen() {
      clearTimeout(seenTimer);
      const s = slides[cur], idx = cur;
      seenTimer = setTimeout(() => {
        if (idx !== cur) return;
        progress.markSeen(s.id, slides.length);
        progress.write('last', { page: progress.page(), id: s.id, title: titleOf(s, idx).slice(0, 80), unit: meta.unit, at: Date.now() });
        refreshProgress();
      }, 2500);
    }
    document.addEventListener('tkt:answer', e => {
      const s = e.target.closest('section.slide'); if (!s) return;
      const ws = Array.from(s.querySelectorAll('[data-widget]')); const w = e.target.closest('[data-widget]');
      progress.answer(s.id + '#' + ws.indexOf(w) + '.' + (e.detail.sub || 0), e.detail.correct);
      refreshProgress();
    });

    let cur = 0;
    let readMode = false, manualRead = false;
    const isNarrow = () => window.innerWidth < 760 || window.innerHeight < 420 || (window.innerWidth < 1100 && window.innerHeight > window.innerWidth * 1.1);

    function go(i, stepState) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      slides[cur].classList.remove('active');
      cur = i; const s = slides[cur];
      s.classList.add('active');
      if (!(readMode && gated(s))) stepsOf(s).forEach(x => x.classList.toggle('shown', stepState === 'all'));
      syncGate(s);
      update();
      if (readMode) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    function update() {
      const s = slides[cur];
      cnt.textContent = (cur + 1) + ' / ' + slides.length;
      progI.style.width = ((cur + 1) / slides.length * 100) + '%';
      try { history.replaceState(null, '', location.search + '#' + s.id); } catch (e) { /* khung nhúng có thể chặn */ }
      drawer.querySelectorAll('a[data-i]').forEach(a => a.classList.toggle('cur', +a.dataset.i === cur));
      const n = s.querySelector(HV ? 'aside.tuhoc' : 'aside.note');
      notes.innerHTML = '<div class="k">' + (HV ? 'Gợi ý tự học' : 'Ghi chú giảng viên') + ' · slide ' + (cur + 1) + '</div>' + (n ? n.innerHTML : '<p class="keys">' + (HV ? 'Không có gợi ý thêm cho slide này.' : 'Không có ghi chú cho slide này.') + '</p>');
      if (n) renderMath(notes);
      bar.querySelector('[data-act=notes]').classList.toggle('has', !!n);
      document.title = titleOf(s, cur).slice(0, 48) + ' · ' + meta.unit;
      if (!PRINT) trackSeen();
    }
    function next() {
      if (readMode) { go(cur + 1, 'all'); return; }
      const st = stepsOf(slides[cur]).filter(x => !x.classList.contains('shown'));
      if (st.length) { st[0].classList.add('shown'); syncGate(slides[cur]); return; }
      if (cur < slides.length - 1) go(cur + 1, 'none');
    }
    function prev() {
      if (readMode) { go(cur - 1, 'all'); return; }
      const st = stepsOf(slides[cur]).filter(x => x.classList.contains('shown'));
      if (st.length) { st[st.length - 1].classList.remove('shown'); syncGate(slides[cur]); return; }
      if (cur > 0) go(cur - 1, 'all');
    }
    function fit() {
      if (readMode) return;
      const vw = deck.clientWidth, vh = deck.clientHeight;
      const k = Math.min(vw / W, vh / H) * 0.985;
      stage.style.transform = 'translate(-50%, -50%) scale(' + k + ')';
    }
    function setRead(on) {
      readMode = on; deck.classList.toggle('read', on);
      document.body.style.overflow = on ? 'auto' : 'hidden';
      slides.forEach(s => s.classList.toggle('active', on || s === slides[cur]));
      if (on) { slides.forEach(s => { if (!gated(s)) stepsOf(s).forEach(x => x.classList.add('shown')); syncGate(s); }); slides[cur].scrollIntoView({ block: 'start' }); }
      else { slides.forEach((s, i) => { if (i !== cur) s.classList.remove('active'); }); fit(); }
      bar.querySelector('[data-act=read]').classList.toggle('on', on);
    }
    function toggleDrawer(force) { drawer.classList.toggle('open', force === undefined ? !drawer.classList.contains('open') : force); }
    function toggleNotes() { notes.hidden = !notes.hidden; bar.querySelector('[data-act=notes]').classList.toggle('on', !notes.hidden); }
    function toggleTheme() {
      const isDark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      const t = isDark ? 'light' : 'dark'; root.setAttribute('data-theme', t); store.set('tkt-theme', t);
    }
    function toggleFull() {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      } catch (e) { /* không hỗ trợ */ }
    }

    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      ({ toc: () => toggleDrawer(), notes: toggleNotes, read: () => { manualRead = true; setRead(!readMode); }, theme: toggleTheme, full: toggleFull, prev, next })[b.dataset.act]();
    });
    document.addEventListener('keydown', e => {
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) && e.key === ' ')) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown') { if (readMode && (k === ' ' || k === 'ArrowDown')) return; e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') { if (readMode && k === 'ArrowUp') return; e.preventDefault(); prev(); }
      else if (k === 'Home') go(0, 'none');
      else if (k === 'End') go(slides.length - 1, 'all');
      else if (k === 'm' || k === 'M') toggleDrawer();
      else if (k === 'n' || k === 'N') toggleNotes();
      else if (k === 'r' || k === 'R') { manualRead = true; setRead(!readMode); }
      else if (k === 't' || k === 'T') toggleTheme();
      else if (k === 'f' || k === 'F') toggleFull();
      else if (k === 'Escape') { toggleDrawer(false); notes.hidden = true; }
    });
    // Vuốt trên màn hình cảm ứng
    let sx = null;
    deck.addEventListener('touchstart', e => { if (!readMode) sx = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', e => {
      if (sx === null || readMode) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
    });
    // Liên kết nội bộ #id
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'); if (!a || drawer.contains(a)) return;
      const id = a.getAttribute('href').slice(1); const i = slides.findIndex(s => s.id === id);
      if (i >= 0) { e.preventDefault(); go(i, 'all'); }
    });
    // Theo dõi slide khi cuộn ở chế độ đọc
    const io = new IntersectionObserver(ents => {
      if (!readMode) return;
      ents.forEach(en => { if (en.isIntersecting) { const i = slides.indexOf(en.target); if (i >= 0 && i !== cur) { cur = i; update(); } } });
    }, { rootMargin: '-40% 0px -55% 0px' });
    slides.forEach(s => io.observe(s));

    window.addEventListener('resize', () => { if (!manualRead && !PRINT && isNarrow() !== readMode) setRead(isNarrow()); fit(); });
    window.addEventListener('hashchange', () => {
      const i = slides.findIndex(s => s.id === location.hash.slice(1)); if (i >= 0 && i !== cur) go(i, 'all');
    });

    /* --- In ấn: hiện mọi slide, mọi bước, đáp án; công cụ chuyển sang dạng tĩnh --- */
    let beforePrintRead = null;
    function preparePrint() {
      if (window.TKTWidgets && window.TKTWidgets.printAll) window.TKTWidgets.printAll(stage);
      slides.forEach(s => stepsOf(s).forEach(x => x.classList.add('shown')));
    }
    window.addEventListener('beforeprint', () => { beforePrintRead = readMode; if (!readMode) setRead(true); preparePrint(); });
    window.addEventListener('afterprint', () => { if (beforePrintRead === false) setRead(false); beforePrintRead = null; });

    // Khởi động
    const startIdx = Math.max(0, slides.findIndex(s => s.id === decodeURIComponent(location.hash.slice(1))));
    slides[0].classList.add('active');
    const narrow = PRINT || isNarrow();
    go(startIdx, startIdx > 0 ? 'all' : 'none');
    if (narrow) setRead(true); else { document.body.style.overflow = 'hidden'; fit(); }
    if (PRINT) preparePrint();
    refreshProgress();
    window.TKT.go = go;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
