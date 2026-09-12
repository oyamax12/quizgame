/**
 * ui.js
 * أدوات واجهة عامة: التنقل بين الشاشات، التنبيهات، والأصوات.
 * الأصوات مولّدة عبر Web Audio API (نغمات بسيطة) لتفادي الحاجة لملفات صوتية خارجية.
 */
(function (global) {
  'use strict';

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.toggle('is-active', el.id === id);
    });
    window.scrollTo(0, 0);
  }

  let toastTimer = null;
  function toast(message, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast is-visible' + (type ? ' toast--' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 3200);
  }

  // --- أصوات بسيطة ---
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function isSoundOn() {
    return Storage.getSettings().sound !== false;
  }

  function beep(freq, durationMs, type) {
    if (!isSoundOn()) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  const Sound = {
    correct: function () { beep(880, 180, 'triangle'); setTimeout(function () { beep(1175, 180, 'triangle'); }, 120); },
    wrong: function () { beep(200, 260, 'sawtooth'); },
    tick: function () { beep(1000, 60, 'square'); },
    click: function () { beep(600, 60, 'sine'); },
    levelUp: function () { [660, 880, 1100].forEach(function (f, i) { setTimeout(function () { beep(f, 200, 'triangle'); }, i * 140); }); }
  };

  function applyTheme() {
    const settings = Storage.getSettings();
    document.documentElement.classList.toggle('light', !settings.darkMode);
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  global.UI = { showScreen, toast, Sound, applyTheme, el };
})(window);
