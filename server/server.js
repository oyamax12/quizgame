/**
 * server.js (خادم)
 * نقطة الدخول: خادم HTTP بسيط (فحص الحالة + المتصدرون) + خادم WebSocket
 * لإدارة اللعب الجماعي (Rooms) وOnline 1v1.
 *
 * التشغيل محليًا:  npm install && npm start
 * النشر: أي استضافة تدعم Node.js طويل الأمد (Render, Railway, Fly.io...).
 * لا يعمل هذا الملف على GitHub Pages لأنها استضافة ملفات ثابتة فقط.
 */
'use strict';

const http = require('http');
const { WebSocketServer } = require('ws');
const rooms = require('./rooms');
const leaderboard = require('./leaderboard');

const PORT = process.env.PORT || 3001;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(function (req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.rooms.size }));
  }

  if (req.url.startsWith('/leaderboard')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(leaderboard.getTop(20)));
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('خادم لعبة فيصل يعمل ✅ — هذا خادم WebSocket/API فقط وليس الواجهة.');
});

const wss = new WebSocketServer({ server: server });

wss.on('connection', function (ws) {
  ws.isAlive = true;
  ws.on('pong', function () { ws.isAlive = true; });
  ws.on('message', function (raw) { rooms.handleMessage(ws, raw); });
  ws.on('close', function () { rooms.handleDisconnect(ws); });
});

// نبضات دورية لتنظيف الاتصالات الميتة
setInterval(function () {
  wss.clients.forEach(function (ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, function () {
  console.log('🚀 خادم فيصل يعمل على المنفذ ' + PORT);
});
