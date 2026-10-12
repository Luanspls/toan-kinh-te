/* taikhoan.js — tài khoản sinh viên và đồng bộ với máy chủ của giảng viên (Google Apps Script).
   Chỉ hoạt động khi khoa-hoc.js có địa chỉ máy chủ (TKT_COURSE.may_chu); nếu không, bài giảng chạy như cũ (lưu trên máy).
   - Đăng nhập bằng mã sinh viên + mật khẩu giảng viên cấp; đổi mật khẩu được.
   - Đồng bộ hai chiều tiến độ (slide đã xem, trắc nghiệm, thời gian học) mỗi 2 phút và khi rời trang.
   - Hàng đợi gửi: bài làm nộp lúc mất mạng được gửi lại tự động.
   - Máy dùng chung: đăng xuất xóa dữ liệu học tập khỏi máy; người khác đăng nhập không thấy dữ liệu của bạn. */
(function () {
  'use strict';
  const C = window.TKT_COURSE || {};
  const SERVER = C.may_chu || '';
  const PFX = 'tkt:v1:';
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } },
    keys(p) { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(p) === 0) o.push(k); } } catch (e) { /* bỏ qua */ } return o; }
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const emit = () => window.dispatchEvent(new CustomEvent('tkt:acct', { detail: A.session() }));

  const A = {
    enabled: !!SERVER,
    session() { return LS.get('tkt:acct'); },

    async call(act, data, opt) {
      if (!SERVER) throw new Error('Chưa cấu hình máy chủ');
      const s = A.session();
      const body = Object.assign({ act }, s ? { ma: s.ma, token: s.token } : {}, data || {});
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const tm = setTimeout(() => ctl && ctl.abort(), (opt && opt.timeout) || 25000);
      let res;
      try { res = await fetch(SERVER, { method: 'POST', body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, redirect: 'follow' }); }
      catch (e) { const err = new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); err.net = true; throw err; }
      finally { clearTimeout(tm); }
      let j; try { j = await res.json(); } catch (e) { const err = new Error('Máy chủ trả lời không hợp lệ.'); err.net = true; throw err; }
      if (!j.ok) {
        const err = new Error(j.loi || 'Lỗi máy chủ'); err.code = j.ma_loi;
        if (j.ma_loi === 'het_phien') { const ss = A.session(); if (ss) { ss.token = null; LS.set('tkt:acct', ss); } emit(); }
        throw err;
      }
      return j;
    },

    /* ---------- Đăng nhập / đăng xuất ---------- */
    async login(ma, mk) {
      ma = String(ma || '').trim().toUpperCase();
      const j = await A.call('dangNhap', { ma, mk });
      const owner = LS.get(PFX + 'owner');
      if (owner && owner !== j.sv.ma) wipeLocal();                      // dữ liệu của người khác trên máy dùng chung
      LS.set('tkt:acct', { ma: j.sv.ma, ten: j.sv.ten, lop: j.sv.lop, token: j.token, at: Date.now() });
      LS.set(PFX + 'owner', j.sv.ma);
      A.cfg = null;
      try { await A.pull(); await A.syncProgress(true); await A.flush(); } catch (e) { /* đồng bộ sau */ }
      emit();
      return j;
    },
    async logout() {
      try { await Promise.race([Promise.all([A.syncProgress(true), A.flush()]), new Promise(r => setTimeout(r, 6000))]); } catch (e) { /* bỏ qua */ }
      const left = (LS.get('tkt:outbox') || []).length;
      if (left && !confirm('Còn ' + left + ' bài làm chưa gửi được lên máy chủ (đang mất mạng?). Đăng xuất sẽ xóa chúng khỏi máy này. Vẫn đăng xuất?')) return false;
      wipeLocal(); LS.del('tkt:acct'); LS.del('tkt:outbox'); emit();
      return true;
    },
    async changePassword(cu, moi) { await A.call('doiMatKhau', { mkCu: cu, mkMoi: moi }); },

    /* ---------- Dữ liệu từ máy chủ ---------- */
    async pull() {
      const j = await A.call('layDuLieu', {});
      Object.keys(j.tienDo || {}).forEach(page => {
        const sv = j.tienDo[page]; const k = PFX + 'seen:' + page; const loc = LS.get(k) || { ids: {}, n: 0 };
        (sv.ids || []).forEach(id => { loc.ids[id] = 1; });
        loc.n = Math.max(loc.n || 0, sv.n || 0); loc.t = Math.max(loc.t || 0, sv.t || 0); loc.at = Math.max(loc.at || 0, sv.at || 0);
        LS.set(k, loc);
        const kq = PFX + 'quiz:' + page; LS.set(kq, Object.assign({}, sv.q || {}, LS.get(kq) || {}));
      });
      if (j.baiLam) {
        const kt = {};
        j.baiLam.forEach(b => { (kt[b.bai] = kt[b.bai] || []).push(b); });
        const loc = LS.get(PFX + 'kt') || {};
        Object.keys(loc).forEach(bai => (loc[bai] || []).forEach(b => {     // giữ bài làm chưa gửi lên
          if (!b.daGui && !(kt[bai] || []).some(x => x.luot === b.luot)) (kt[bai] = kt[bai] || []).push(b);
        }));
        LS.set(PFX + 'kt', kt);
      }
      if (j.cauHinh) A.cfg = j.cauHinh;
      return j;
    },
    async config() {
      if (A.cfg) return A.cfg;
      if (!SERVER) return null;
      try { const j = await A.call('cauHinh', {}, { timeout: 12000 }); A.cfg = j.cauHinh; } catch (e) { A.cfg = null; }
      return A.cfg;
    },

    /* ---------- Đồng bộ tiến độ ---------- */
    snapshot() {
      const td = {};
      LS.keys(PFX + 'seen:').forEach(k => {
        const page = k.slice((PFX + 'seen:').length); const s = LS.get(k) || {};
        td[page] = { ids: Object.keys(s.ids || {}), n: s.n || 0, t: Math.round(s.t || 0), at: s.at || 0, q: LS.get(PFX + 'quiz:' + page) || {} };
      });
      return td;
    },
    async syncProgress(force) {
      const s = A.session(); if (!SERVER || !s || !s.token) return;
      const td = A.snapshot(); const sig = JSON.stringify(td);
      if (!force && sig === LS.get('tkt:lastsync')) return;
      await A.call('dongBo', { tienDo: td });
      LS.set('tkt:lastsync', sig); LS.set('tkt:lastsyncAt', Date.now());
      renderAll();
    },
    beacon() {
      const s = A.session(); if (!SERVER || !s || !s.token || !navigator.sendBeacon) return;
      const td = A.snapshot(); const sig = JSON.stringify(td); if (sig === LS.get('tkt:lastsync')) return;
      try { navigator.sendBeacon(SERVER, new Blob([JSON.stringify({ act: 'dongBo', ma: s.ma, token: s.token, tienDo: td })], { type: 'text/plain' })); LS.set('tkt:lastsync', sig); } catch (e) { /* bỏ qua */ }
    },

    /* ---------- Hàng đợi gửi (bài làm) ---------- */
    queue(act, data) { const q = LS.get('tkt:outbox') || []; q.push({ act, data, t: Date.now() }); LS.set('tkt:outbox', q); },
    async flush() {
      const s = A.session(); if (!SERVER || !s || !s.token) return;
      let q = LS.get('tkt:outbox') || [];
      while (q.length) {
        const it = q[0];
        try { const j = await A.call(it.act, it.data); markSent(it, j); }
        catch (e) { if (e.net || e.code === 'het_phien') break; /* lỗi nghiệp vụ: bỏ mục này */ console.warn('Bỏ mục không gửi được:', e.message); }
        q = (LS.get('tkt:outbox') || []).slice(1); LS.set('tkt:outbox', q);
      }
      renderAll();
    },

    /* ---------- Giao diện ---------- */
    mount(el) { el.classList.add('acct'); mounts.add(el); render(el); },
    openLogin
  };

  function markSent(it, j) {
    if (it.act !== 'nopBai' || !j) return;
    const kt = LS.get(PFX + 'kt') || {}; const list = kt[it.data.bai] || [];
    const b = list.find(x => x.luot === it.data.luot && x.seed === it.data.seed);
    if (b) { b.daGui = true; b.diem = j.diem; LS.set(PFX + 'kt', kt); }
  }
  function wipeLocal() {
    LS.keys(PFX).forEach(k => LS.del(k)); LS.del('tkt:lastsync'); LS.del('tkt:lastsyncAt');
  }

  /* Nhãn tài khoản: [Đăng nhập] hoặc [Tên · menu] */
  const mounts = new Set();
  function renderAll() { mounts.forEach(render); }
  function render(el) {
    if (!SERVER) { el.hidden = true; return; }
    const s = A.session(); const ob = (LS.get('tkt:outbox') || []).length;
    if (!s || !s.token) {
      el.innerHTML = '<button type="button" class="acct-btn main" data-a="login">Đăng nhập</button>' + (s && !s.token ? '<span class="acct-note">Phiên đăng nhập đã hết hạn</span>' : '<span class="acct-note">để giảng viên ghi nhận quá trình học</span>');
    } else {
      const at = LS.get('tkt:lastsyncAt');
      el.innerHTML = '<span class="acct-who"><b>' + esc(s.ten) + '</b><small>' + esc(s.ma) + (s.lop ? ' · ' + esc(s.lop) : '') + '</small></span>' +
        '<span class="acct-note">' + (ob ? '⏳ ' + ob + ' bài chờ gửi' : at ? '✓ Đã đồng bộ ' + new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '') + '</span>' +
        '<button type="button" class="acct-btn" data-a="sync" title="Đồng bộ ngay">Đồng bộ</button><button type="button" class="acct-btn" data-a="pw">Đổi mật khẩu</button><button type="button" class="acct-btn" data-a="out">Đăng xuất</button>';
    }
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('.acct [data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'login') openLogin();
    else if (a === 'out') { if (await A.logout()) location.reload(); }
    else if (a === 'pw') openPassword(false);
    else if (a === 'sync') { b.disabled = true; try { await A.flush(); await A.syncProgress(true); await A.pull(); emit(); } catch (err) { alert(err.message); } b.disabled = false; renderAll(); }
  });

  function modal(html) {
    const d = document.createElement('div'); d.className = 'acct-modal'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<form class="acct-box" autocomplete="on">' + html + '</form>';
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) d.remove(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { d.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(d); const f = d.querySelector('input'); if (f) f.focus();
    return d;
  }
  function openLogin() {
    const d = modal('<h3>Đăng nhập học tập</h3>' +
      '<label>Mã sinh viên<input name="ma" required autocomplete="username" autocapitalize="characters" spellcheck="false"></label>' +
      '<label>Mật khẩu<input name="mk" type="password" required autocomplete="current-password"></label>' +
      '<p class="acct-small">Mật khẩu do giảng viên cấp. Khi đăng nhập, slide đã xem, thời gian học và bài kiểm tra của bạn được gửi về bảng theo dõi của giảng viên phụ trách môn học.</p>' +
      '<p class="acct-err" role="alert"></p><div class="acct-row"><button class="acct-btn main" type="submit">Đăng nhập</button><button class="acct-btn" type="button" data-x>Để sau</button></div>');
    const f = d.querySelector('form');
    f.addEventListener('submit', async e => {
      e.preventDefault(); const btn = f.querySelector('[type=submit]'); btn.disabled = true; f.querySelector('.acct-err').textContent = 'Đang đăng nhập…';
      try {
        const j = await A.login(f.ma.value, f.mk.value); d.remove(); renderAll();
        if (j.doiMK) openPassword(true);
      } catch (err) { f.querySelector('.acct-err').textContent = err.message; btn.disabled = false; }
    });
  }
  function openPassword(first) {
    const d = modal('<h3>' + (first ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu') + '</h3>' + (first ? '<p class="acct-small">Bạn đang dùng mật khẩu giảng viên cấp. Nên đổi sang mật khẩu riêng (ít nhất 6 ký tự).</p>' : '') +
      '<label>Mật khẩu hiện tại<input name="cu" type="password" required autocomplete="current-password"></label>' +
      '<label>Mật khẩu mới<input name="moi" type="password" required minlength="6" autocomplete="new-password"></label>' +
      '<label>Nhập lại mật khẩu mới<input name="lai" type="password" required minlength="6" autocomplete="new-password"></label>' +
      '<p class="acct-err" role="alert"></p><div class="acct-row"><button class="acct-btn main" type="submit">Đổi mật khẩu</button><button class="acct-btn" type="button" data-x>' + (first ? 'Để sau' : 'Hủy') + '</button></div>');
    const f = d.querySelector('form');
    f.addEventListener('submit', async e => {
      e.preventDefault(); const er = f.querySelector('.acct-err');
      if (f.moi.value !== f.lai.value) { er.textContent = 'Hai lần nhập mật khẩu mới không khớp.'; return; }
      try { await A.changePassword(f.cu.value, f.moi.value); d.remove(); alert('Đã đổi mật khẩu.'); } catch (err) { er.textContent = err.message; }
    });
  }

  /* CSS tự chứa, dùng các biến màu của deck.css */
  const css = document.createElement('style');
  css.textContent =
    '.acct{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font:14px var(--f-body,sans-serif)}' +
    '.acct-btn{cursor:pointer;font:600 13px var(--f-body,sans-serif);border:1.5px solid var(--ink,#1b2a4a);background:var(--surface,#fff);color:var(--ink,#1b2a4a);border-radius:6px;padding:6px 10px}' +
    '.acct-btn.main{background:var(--ink,#1b2a4a);color:var(--surface,#fff)}.acct-btn:hover{border-color:var(--blue,#2456c7)}.acct-btn[disabled]{opacity:.5}' +
    '.acct-who{display:flex;flex-direction:column;line-height:1.2}.acct-who small{font:12px var(--f-mono,monospace);color:var(--ink-2,#51607d)}' +
    '.acct-note{font-size:12.5px;color:var(--ink-2,#51607d)}' +
    '.acct-modal{position:fixed;inset:0;z-index:60;background:rgba(10,18,32,.45);display:grid;place-items:center;padding:16px}' +
    '.acct-box{background:var(--surface,#fff);color:var(--ink,#1b2a4a);border:2px solid var(--ink,#1b2a4a);border-radius:10px;padding:18px;width:min(380px,100%);display:grid;gap:10px;font:15px var(--f-body,sans-serif)}' +
    '.acct-box h3{margin:0;font:700 21px var(--f-display,serif)}.acct-box label{display:grid;gap:4px;font-weight:600;font-size:14px}' +
    '.acct-box input{font:16px var(--f-body,sans-serif);padding:9px 10px;border:1.5px solid var(--line,#cdd6e6);border-radius:6px;background:var(--paper,#fafbfd);color:var(--ink,#1b2a4a)}' +
    '.acct-small{margin:0;font-size:13px;color:var(--ink-2,#51607d);line-height:1.5}.acct-err{margin:0;min-height:1.2em;font-size:13.5px;color:var(--bad,#b3261e)}.acct-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '.drawer .acct{padding:8px 0 0}.drawer .acct .acct-btn{padding:4px 8px;font-size:12px}';
  document.head.appendChild(css);

  function boot() {
    if (!SERVER) return;
    document.querySelectorAll('[data-acct]').forEach(A.mount);
    const dh = document.querySelector('.drawer header');
    if (dh && !dh.querySelector('.acct')) { const el = document.createElement('div'); dh.appendChild(el); A.mount(el); }
    const s = A.session();
    if (s && s.token) {
      A.flush().catch(() => {}); A.syncProgress().catch(() => {});
      setInterval(() => { A.flush().catch(() => {}); A.syncProgress().catch(() => {}); }, 120000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') A.beacon(); });
      window.addEventListener('pagehide', A.beacon);
    }
    window.addEventListener('online', () => A.flush().catch(() => {}));
  }
  window.TKTAcct = A;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
