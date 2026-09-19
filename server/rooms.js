/**
 * rooms.js (خادم)
 * يدير غرف اللعب الجماعي (2-8 لاعبين) ومباريات Online 1v1 (بالضبط 2).
 *
 * قواعد مهمة لمنع الغش (راجع القسم 26 من متطلبات المشروع):
 * - "correctAnswer" لا يُرسل للاعبين إلا بعد إغلاق وقت السؤال.
 * - وقت كل إجابة يُقاس بالفارق الزمني على الخادم (Date.now())، وليس بما
 *   يرسله المتصفح.
 * - النقاط النهائية تُحسب وتُخزَّن هنا فقط؛ العميل لا يحسب شيئًا حاسمًا.
 */
'use strict';

const { getRandomQuestions } = require('./questions');
const leaderboard = require('./leaderboard');

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف/أرقام متشابهة
const rooms = new Map(); // code -> room

function genRoomCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, function () {
      return ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }).join('');
  } while (rooms.has(code));
  return code;
}

function genPlayerId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function publicPlayers(room) {
  return Array.from(room.players.values()).map(function (p) {
    return { id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, connected: p.connected, score: p.score, isHost: p.id === room.hostId };
  });
}

function send(ws, payload) {
  if (ws && ws.readyState === 1 /* OPEN */) {
    try { ws.send(JSON.stringify(payload)); } catch (e) { /* تجاهل */ }
  }
}

function broadcast(room, payload, exceptPlayerId) {
  room.players.forEach(function (p) {
    if (p.id !== exceptPlayerId) send(p.ws, payload);
  });
}

function calcPoints(question, correct, elapsedMs, timeLimitSec, streak) {
  if (!correct) return { total: 0, speedBonus: 0, streakBonus: 0 };
  const remainingRatio = Math.max(0, Math.min(1, 1 - elapsedMs / (timeLimitSec * 1000)));
  const speedBonus = Math.round(50 * remainingRatio);
  const streakBonus = streak >= 10 ? 500 : streak >= 5 ? 200 : streak >= 3 ? 50 : 0;
  return { total: question.points + speedBonus + streakBonus, speedBonus, streakBonus };
}

function createRoom(ws, { name, avatar, mode, config }) {
  const code = genRoomCode();
  const playerId = genPlayerId();
  const maxPlayers = mode === 'duel' ? 2 : 8;

  const room = {
    code: code,
    mode: mode === 'duel' ? 'duel' : 'room',
    maxPlayers: maxPlayers,
    hostId: playerId,
    status: 'lobby', // lobby | playing | finished
    config: {
      questionCount: Math.min(50, Math.max(5, Number(config?.questionCount) || 10)),
      timerDuration: Math.min(60, Math.max(5, Number(config?.timerDuration) || 15))
    },
    players: new Map(),
    questions: [],
    currentIndex: -1,
    questionStartedAt: 0,
    roundAnswers: new Map(), // playerId -> {selectedIndex, elapsedMs}
    roundTimeout: null
  };

  room.players.set(playerId, { id: playerId, ws: ws, name: (name || 'لاعب').slice(0, 20), avatar: avatar || '🙂', ready: false, connected: true, score: 0, streak: 0 });
  rooms.set(code, room);
  ws.roomCode = code;
  ws.playerId = playerId;

  send(ws, { type: 'roomCreated', code: code, playerId: playerId, mode: room.mode, maxPlayers: room.maxPlayers, players: publicPlayers(room) });
}

function joinRoom(ws, { code, name, avatar }) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return send(ws, { type: 'error', message: 'رمز الغرفة غير صحيح أو انتهت الغرفة.' });
  if (room.status !== 'lobby') return send(ws, { type: 'error', message: 'اللعبة بدأت بالفعل في هذه الغرفة.' });
  if (room.players.size >= room.maxPlayers) return send(ws, { type: 'error', message: 'الغرفة ممتلئة.' });

  const playerId = genPlayerId();
  room.players.set(playerId, { id: playerId, ws: ws, name: (name || 'لاعب').slice(0, 20), avatar: avatar || '🙂', ready: false, connected: true, score: 0, streak: 0 });
  ws.roomCode = room.code;
  ws.playerId = playerId;

  send(ws, { type: 'joinedRoom', code: room.code, playerId: playerId, mode: room.mode, maxPlayers: room.maxPlayers, players: publicPlayers(room) });
  broadcast(room, { type: 'playersUpdate', players: publicPlayers(room) }, playerId);
}

function setReady(ws, ready) {
  const room = rooms.get(ws.roomCode);
  if (!room || room.status !== 'lobby') return;
  const player = room.players.get(ws.playerId);
  if (!player) return;
  player.ready = !!ready;
  broadcast(room, { type: 'playersUpdate', players: publicPlayers(room) });

  const connectedPlayers = Array.from(room.players.values()).filter(function (p) { return p.connected; });
  const enoughPlayers = connectedPlayers.length >= 2;
  const allReady = connectedPlayers.every(function (p) { return p.ready; });
  if (enoughPlayers && allReady) startGame(room);
}

function startGame(room) {
  room.status = 'playing';
  room.questions = getRandomQuestions(room.config.questionCount);
  room.currentIndex = -1;
  room.players.forEach(function (p) { p.score = 0; p.streak = 0; });
  broadcast(room, { type: 'gameStarting' });
  setTimeout(function () { nextQuestion(room); }, 1200);
}

function nextQuestion(room) {
  room.currentIndex++;
  if (room.currentIndex >= room.questions.length) return endGame(room);

  const q = room.questions[room.currentIndex];
  room.questionStartedAt = Date.now();
  room.roundAnswers = new Map();

  broadcast(room, {
    type: 'question',
    index: room.currentIndex,
    total: room.questions.length,
    question: q.question,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: room.config.timerDuration
  });

  clearTimeout(room.roundTimeout);
  room.roundTimeout = setTimeout(function () { endRound(room); }, room.config.timerDuration * 1000 + 400);
}

function submitAnswer(ws, selectedIndex) {
  const room = rooms.get(ws.roomCode);
  if (!room || room.status !== 'playing') return;
  if (room.roundAnswers.has(ws.playerId)) return; // إجابة واحدة فقط لكل جولة
  const elapsedMs = Date.now() - room.questionStartedAt;
  room.roundAnswers.set(ws.playerId, { selectedIndex: selectedIndex, elapsedMs: elapsedMs });
  send(ws, { type: 'answerReceived' });

  const connectedPlayers = Array.from(room.players.values()).filter(function (p) { return p.connected; });
  if (room.roundAnswers.size >= connectedPlayers.length) {
    clearTimeout(room.roundTimeout);
    endRound(room);
  }
}

function endRound(room) {
  if (room.status !== 'playing') return;
  const q = room.questions[room.currentIndex];
  const results = [];

  room.players.forEach(function (p) {
    const answer = room.roundAnswers.get(p.id);
    const selectedIndex = answer ? answer.selectedIndex : null;
    const correct = selectedIndex === q.correctAnswer;
    if (correct) { p.streak++; } else { p.streak = 0; }
    const points = calcPoints(q, correct, answer ? answer.elapsedMs : q_timeLimitMs(room), room.config.timerDuration, p.streak);
    p.score += points.total;
    results.push({ id: p.id, name: p.name, avatar: p.avatar, answered: !!answer, correct: correct, roundPoints: points.total, totalScore: p.score });
  });

  broadcast(room, {
    type: 'roundResult',
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    players: results.sort(function (a, b) { return b.totalScore - a.totalScore; })
  });

  setTimeout(function () { nextQuestion(room); }, 4200);
}

function q_timeLimitMs(room) { return room.config.timerDuration * 1000; }

function endGame(room) {
  room.status = 'finished';
  const finalPlayers = Array.from(room.players.values())
    .sort(function (a, b) { return b.score - a.score; })
    .map(function (p) { return { id: p.id, name: p.name, avatar: p.avatar, score: p.score }; });

  finalPlayers.forEach(function (p) {
    leaderboard.submitScore({ name: p.name, avatar: p.avatar, score: p.score, mode: room.mode });
  });

  broadcast(room, { type: 'gameOver', players: finalPlayers });
  setTimeout(function () { rooms.delete(room.code); }, 5 * 60 * 1000); // تنظيف الغرفة بعد 5 دقائق
}

function handleDisconnect(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  const player = room.players.get(ws.playerId);
  if (!player) return;

  if (room.status === 'lobby') {
    room.players.delete(ws.playerId);
    if (room.players.size === 0) { rooms.delete(room.code); return; }
    if (room.hostId === ws.playerId) {
      room.hostId = Array.from(room.players.keys())[0];
    }
    broadcast(room, { type: 'playersUpdate', players: publicPlayers(room) });
  } else {
    player.connected = false;
    broadcast(room, { type: 'playersUpdate', players: publicPlayers(room) });
    const stillConnected = Array.from(room.players.values()).some(function (p) { return p.connected; });
    if (!stillConnected) rooms.delete(room.code);
  }
}

function handleMessage(ws, raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  switch (data.type) {
    case 'createRoom': return createRoom(ws, data);
    case 'joinRoom': return joinRoom(ws, data);
    case 'setReady': return setReady(ws, data.ready);
    case 'answer': return submitAnswer(ws, data.selectedIndex);
    default: return;
  }
}

module.exports = { handleMessage, handleDisconnect, rooms };
