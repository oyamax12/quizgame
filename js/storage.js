/**
 * storage.js
 * طبقة موحّدة للتعامل مع localStorage.
 * كل البيانات تُحفظ داخل كائنات JSON منظمة تحت مفاتيح واضحة.
 * لا يوجد هنا أي API Key ثابت — المفتاح يُكتب فقط من صفحة الإعدادات.
 */
(function (global) {
  'use strict';

  const KEYS = {
    PLAYER_NAME: 'quiz.playerName',
    PLAYER_AVATAR: 'quiz.playerAvatar',
    SETTINGS: 'quiz.settings',
    API_KEY: 'quiz.apiKey',
    MODEL: 'quiz.selectedModel',
    AI_PROVIDER: 'quiz.aiProvider',
    SERVER_URL: 'quiz.serverUrl',
    XP: 'quiz.xp',
    STATS: 'quiz.stats',
    ACHIEVEMENTS: 'quiz.achievements',
    GAME_SETTINGS: 'quiz.gameSettings'
  };

  const DEFAULT_SETTINGS = {
    darkMode: true,
    sound: true,
    language: 'ar' // ar | en | fr (en/fr محجوزتان لمرحلة لاحقة)
  };

  const DEFAULT_GAME_SETTINGS = {
    category: 'general',
    difficulty: 'auto', // easy | medium | hard | auto
    questionCount: 10,
    timerDuration: 15,
    mode: 'normal' // normal | chaos
  };

  const DEFAULT_STATS = {
    gamesPlayed: 0,
    wins: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    bestStreak: 0,
    totalAnswerTimeMs: 0,
    answeredCount: 0,
    missedByCategory: {}
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('تعذر قراءة', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('تعذر الحفظ', key, e);
      return false;
    }
  }

  // --- إعدادات عامة ---
  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, readJSON(KEYS.SETTINGS, {}));
  }
  function saveSettings(partial) {
    const merged = Object.assign({}, getSettings(), partial);
    writeJSON(KEYS.SETTINGS, merged);
    return merged;
  }

  // --- إعدادات اللعبة ---
  function getGameSettings() {
    return Object.assign({}, DEFAULT_GAME_SETTINGS, readJSON(KEYS.GAME_SETTINGS, {}));
  }
  function saveGameSettings(partial) {
    const merged = Object.assign({}, getGameSettings(), partial);
    writeJSON(KEYS.GAME_SETTINGS, merged);
    return merged;
  }

  // --- اللاعب ---
  function getPlayerName() {
    return localStorage.getItem(KEYS.PLAYER_NAME) || 'لاعب مجهول';
  }
  function setPlayerName(name) {
    localStorage.setItem(KEYS.PLAYER_NAME, name);
  }
  function getPlayerAvatar() {
    return localStorage.getItem(KEYS.PLAYER_AVATAR) || '🙂';
  }
  function setPlayerAvatar(avatar) {
    localStorage.setItem(KEYS.PLAYER_AVATAR, avatar);
  }

  // --- مفتاح الذكاء الاصطناعي ---
  // يُخزَّن محليًا فقط على جهاز المستخدم، ولا يُدرج أبدًا داخل ملفات الكود.
  function getApiKey() {
    return localStorage.getItem(KEYS.API_KEY) || '';
  }
  function setApiKey(key) {
    if (!key) return clearApiKey();
    localStorage.setItem(KEYS.API_KEY, key.trim());
  }
  function clearApiKey() {
    localStorage.removeItem(KEYS.API_KEY);
  }
  function hasApiKey() {
    return getApiKey().length > 0;
  }
  function maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(Math.max(4, key.length - 8)) + key.slice(-4);
  }

  function getModel() {
    return localStorage.getItem(KEYS.MODEL) || '';
  }
  function setModel(model) {
    localStorage.setItem(KEYS.MODEL, (model || '').trim());
  }

  // --- مزوّد الذكاء الاصطناعي: 'puter' (بدون مفتاح، افتراضي) أو 'gemini' (مفتاح المستخدم الخاص) ---
  function getAIProvider() {
    return localStorage.getItem(KEYS.AI_PROVIDER) || 'puter';
  }
  function setAIProvider(provider) {
    localStorage.setItem(KEYS.AI_PROVIDER, provider === 'gemini' ? 'gemini' : 'puter');
  }
  // جاهزية الاتصال بالذكاء الاصطناعي، بحسب المزوّد المختار:
  // - 'puter': جاهز دائمًا (بدون مفتاح) طالما مكتبة Puter تحمّلت.
  // - 'gemini': يحتاج API Key محفوظ.
  function isAIReady() {
    if (getAIProvider() === 'puter') return typeof window.puter !== 'undefined';
    return hasApiKey();
  }

  function getServerUrl() {
    return localStorage.getItem(KEYS.SERVER_URL) || '';
  }
  function setServerUrl(url) {
    localStorage.setItem(KEYS.SERVER_URL, (url || '').trim());
  }

  // --- XP والمستويات ---
  // العتبة التراكمية للمستوى n: كل مستوى يضيف 200 نقطة أكثر من سابقه (500, 700, 900, ...)
  function xpForLevel(n) {
    if (n <= 1) return 0;
    const steps = n - 1;
    return 500 * steps + 200 * (steps * (steps - 1)) / 2;
  }
  function levelFromXP(xp) {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) level++;
    return level;
  }
  function getXP() {
    return Number(localStorage.getItem(KEYS.XP) || 0);
  }
  function addXP(amount) {
    const before = getXP();
    const beforeLevel = levelFromXP(before);
    const after = before + Math.max(0, amount || 0);
    localStorage.setItem(KEYS.XP, String(after));
    const afterLevel = levelFromXP(after);
    return {
      xp: after,
      level: afterLevel,
      leveledUp: afterLevel > beforeLevel,
      nextLevelXP: xpForLevel(afterLevel + 1),
      currentLevelXP: xpForLevel(afterLevel)
    };
  }

  // --- الإحصائيات ---
  function getStats() {
    return Object.assign({}, DEFAULT_STATS, readJSON(KEYS.STATS, {}));
  }
  function saveStats(partial) {
    const merged = Object.assign({}, getStats(), partial);
    writeJSON(KEYS.STATS, merged);
    return merged;
  }

  // --- الإنجازات ---
  function getAchievements() {
    return readJSON(KEYS.ACHIEVEMENTS, []);
  }
  function unlockAchievement(id) {
    const list = getAchievements();
    if (!list.includes(id)) {
      list.push(id);
      writeJSON(KEYS.ACHIEVEMENTS, list);
      return true; // جديد
    }
    return false; // كان مفتوحًا مسبقًا
  }

  global.Storage = {
    KEYS,
    getSettings, saveSettings,
    getGameSettings, saveGameSettings,
    getPlayerName, setPlayerName, getPlayerAvatar, setPlayerAvatar,
    getApiKey, setApiKey, clearApiKey, hasApiKey, maskKey,
    getModel, setModel,
    getAIProvider, setAIProvider, isAIReady,
    getServerUrl, setServerUrl,
    xpForLevel, levelFromXP, getXP, addXP,
    getStats, saveStats,
    getAchievements, unlockAchievement
  };
})(window);
