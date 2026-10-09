/* sw.js — sinh tự động bởi DongGoi/build.py. Lưu toàn bộ bài giảng để học ngoại tuyến. */
const CACHE = 'tkt-1.0-45bf62e6';
const FILES = ["./", "./DOC_TRUOC.txt", "./assets/cong.js", "./assets/deck.css", "./assets/deck.js", "./assets/icon-180.png", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-maskable-512.png", "./assets/icon.svg", "./assets/khoa-hoc.js", "./assets/linalg.js", "./assets/pwa.js", "./assets/tim-kiem.js", "./assets/widgets.js", "./chuong1/buoi1.html", "./chuong1/buoi2.html", "./chuong1/buoi3.html", "./chuong1/buoi4.html", "./chuong1/buoi5.html", "./chuong1/buoi6.html", "./chuong1/index.html", "./chuong1/lab.html", "./huong-dan.html", "./index.html", "./lib/katex/auto-render.min.js", "./lib/katex/fonts/KaTeX_AMS-Regular.woff2", "./lib/katex/fonts/KaTeX_Caligraphic-Bold.woff2", "./lib/katex/fonts/KaTeX_Caligraphic-Regular.woff2", "./lib/katex/fonts/KaTeX_Fraktur-Bold.woff2", "./lib/katex/fonts/KaTeX_Fraktur-Regular.woff2", "./lib/katex/fonts/KaTeX_Main-Bold.woff2", "./lib/katex/fonts/KaTeX_Main-BoldItalic.woff2", "./lib/katex/fonts/KaTeX_Main-Italic.woff2", "./lib/katex/fonts/KaTeX_Main-Regular.woff2", "./lib/katex/fonts/KaTeX_Math-BoldItalic.woff2", "./lib/katex/fonts/KaTeX_Math-Italic.woff2", "./lib/katex/fonts/KaTeX_SansSerif-Bold.woff2", "./lib/katex/fonts/KaTeX_SansSerif-Italic.woff2", "./lib/katex/fonts/KaTeX_SansSerif-Regular.woff2", "./lib/katex/fonts/KaTeX_Script-Regular.woff2", "./lib/katex/fonts/KaTeX_Size1-Regular.woff2", "./lib/katex/fonts/KaTeX_Size2-Regular.woff2", "./lib/katex/fonts/KaTeX_Size3-Regular.woff2", "./lib/katex/fonts/KaTeX_Size4-Regular.woff2", "./lib/katex/fonts/KaTeX_Typewriter-Regular.woff2", "./lib/katex/katex.min.css", "./lib/katex/katex.min.js", "./manifest.webmanifest"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('tkt-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Ưu tiên bộ nhớ đệm (nội dung đã đóng gói theo phiên bản); bỏ qua tham số ?in=1 khi tra
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)).catch(() => caches.match('./index.html')));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Phông chữ: dùng bản đã lưu, nếu chưa có thì tải và lưu lại
    e.respondWith(caches.open('fonts-tkt').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }))).catch(() => new Response('', { status: 504 })));
  }
});
