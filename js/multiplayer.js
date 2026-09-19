/**
 * multiplayer.js
 * عميل WebSocket خفيف لوضعي "اللعب مع الأصدقاء" (Rooms) و"Online 1v1".
 * يتصل بخادم Node.js منفصل (انظر /server) — GitHub Pages لا يستضيف هذا
 * الخادم، لذا يجب نشره على استضافة تدعم Node.js وإدخال رابطه من الإعدادات.
 */
(function (global) {
  'use strict';

  let ws = null;
  let playerId = null;
  let roomCode = null;
  const listeners = {};

  function on(type, handler) {
    (listeners[type] = listeners[type] || []).push(handler);
  }
  function off(type, handler) {
    if (!listeners[type]) return;
    listeners[type] = listeners[type].filter(function (h) { return h !== handler; });
  }
  function emit(type, data) {
    (listeners[type] || []).forEach(function (h) { h(data); });
  }

  function toWsUrl(url) {
    let u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://')) return 'ws://' + u.slice(7);
    if (u.startsWith('https://')) return 'wss://' + u.slice(8);
    if (!u.startsWith('ws://') && !u.startsWith('wss://')) return 'wss://' + u;
    return u;
  }

  function connect(serverUrl) {
    return new Promise(function (resolve, reject) {
      const wsUrl = toWsUrl(serverUrl);
      if (!wsUrl) return reject(new Error('لم يتم إدخال رابط خادم صالح.'));
      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        return reject(e);
      }
      const timeout = setTimeout(function () { reject(new Error('انتهت مهلة الاتصال بالخادم.')); }, 8000);

      ws.onopen = function () { clearTimeout(timeout); resolve(); };
      ws.onerror = function () { clearTimeout(timeout); reject(new Error('تعذر الاتصال بالخادم. تأكد من الرابط ومن أن الخادم يعمل.')); };
      ws.onclose = function () { emit('disconnected', {}); };
      ws.onmessage = function (evt) {
        let data;
        try { data = JSON.parse(evt.data); } catch (e) { return; }
        if (data.type === 'roomCreated' || data.type === 'joinedRoom') {
          playerId = data.playerId;
          roomCode = data.code;
        }
        emit(data.type, data);
      };
    });
  }

  function send(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }

  function createRoom({ name, avatar, mode, config }) {
    send({ type: 'createRoom', name: name, avatar: avatar, mode: mode, config: config });
  }
  function joinRoom({ code, name, avatar }) {
    send({ type: 'joinRoom', code: code, name: name, avatar: avatar });
  }
  function setReady(ready) {
    send({ type: 'setReady', ready: ready });
  }
  function answer(selectedIndex) {
    send({ type: 'answer', selectedIndex: selectedIndex });
  }
  function disconnect() {
    if (ws) { try { ws.close(); } catch (e) { /* تجاهل */ } }
    ws = null; playerId = null; roomCode = null;
  }

  global.Multiplayer = {
    connect, disconnect,
    createRoom, joinRoom, setReady, answer,
    on, off,
    getPlayerId: function () { return playerId; },
    getRoomCode: function () { return roomCode; },
    isConnected: function () { return !!ws && ws.readyState === WebSocket.OPEN; }
  };
})(window);
