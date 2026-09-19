/**
 * leaderboard.js (خادم)
 * متصدرون عالميون مبسّطون، محفوظون في ملف JSON على القرص.
 * ملاحظة: هذا كافٍ للتجربة والنشر الصغير. للإنتاج الحقيقي استبدله بقاعدة
 * بيانات فعلية (PostgreSQL/MongoDB) كما هو موضح في التوثيق الرئيسي، لأن
 * أغلب استضافات النشر المجانية لا تضمن بقاء نظام الملفات دائمًا.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAX_ENTRIES = 100;

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

function readAll() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeAll(list) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(list.slice(0, MAX_ENTRIES), null, 2), 'utf8');
}

/** يضيف نتيجة مباراة جماعية/1v1 منتهية إلى المتصدرين. */
function submitScore({ name, avatar, score, mode }) {
  const list = readAll();
  list.push({ name: String(name || 'لاعب').slice(0, 20), avatar: avatar || '🙂', score: Number(score) || 0, mode: mode || 'room', date: Date.now() });
  list.sort(function (a, b) { return b.score - a.score; });
  writeAll(list);
  return list.slice(0, 20);
}

function getTop(limit) {
  const list = readAll();
  list.sort(function (a, b) { return b.score - a.score; });
  return list.slice(0, limit || 20);
}

module.exports = { submitScore, getTop };
