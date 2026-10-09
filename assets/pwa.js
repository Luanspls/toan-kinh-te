/* pwa.js — đăng ký service worker để cài ứng dụng và học ngoại tuyến (chỉ khi phục vụ qua http/https). */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  if (window.top !== window.self) return;                       // trong khung LMS: không dùng
  const base = document.currentScript.src.replace(/assets\/pwa\.js.*$/, '');
  window.addEventListener('load', () => { navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => {}); });
  // Có phiên bản bài giảng mới: mời tải lại (không tự tải lại để khỏi làm gián đoạn khi đang học)
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || document.getElementById('tkt-update')) return;
    const d = document.createElement('div'); d.id = 'tkt-update'; d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:50;display:flex;gap:10px;align-items:center;' +
      'background:var(--ink,#1b2a4a);color:var(--surface,#fff);padding:8px 10px 8px 14px;border-radius:8px;font:14px var(--f-body,sans-serif);box-shadow:0 4px 16px rgba(0,0,0,.2);max-width:calc(100vw - 24px)';
    d.innerHTML = '<span>Đã có bản cập nhật bài giảng.</span>';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Tải lại';
    b.style.cssText = 'font-weight:600;font-size:14px;white-space:nowrap;border:0;border-radius:6px;padding:6px 10px;background:var(--marker,#ffe27a);color:#1b2a4a;cursor:pointer';
    b.addEventListener('click', () => location.reload());
    d.appendChild(b); document.body.appendChild(d);
  });
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    document.querySelectorAll('[data-install]').forEach(b => { b.hidden = false; });
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-install]'); if (!b || !deferred) return;
    deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; b.hidden = true; });
  });
  window.addEventListener('appinstalled', () => document.querySelectorAll('[data-install]').forEach(b => { b.hidden = true; }));
})();
