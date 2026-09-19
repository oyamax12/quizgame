/**
 * multiplayer.js
 * محجوز للمرحلتين 5 و6 (Multiplayer Rooms و Online 1v1).
 *
 * عند البدء بهذه المرحلة:
 * - أنشئ خادمًا في /server (Node.js + WebSocket أو Socket.IO) يدير:
 *   إنشاء الغرف، انضمام اللاعبين، مزامنة الأسئلة، واحتساب النقاط
 *   والتحقق من الوقت على الخادم (انظر ملاحظات الأمان في ai-service.js).
 * - استبدل الكائن أدناه باتصال WebSocket فعلي، مع الحفاظ على نفس الواجهة
 *   (connectToRoom / createRoom / joinRoom / onGameEvent) حتى لا يتأثر
 *   بقية كود app.js و game.js.
 */
(function (global) {
  'use strict';

  function notReady() {
    console.info('وضع اللعب الجماعي غير مفعّل بعد في هذه المرحلة من المشروع.');
  }

  global.Multiplayer = {
    createRoom: notReady,
    joinRoom: notReady,
    connectToRoom: notReady,
    onGameEvent: notReady
  };
})(window);
