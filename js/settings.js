/**
 * settings.js
 * منطق شاشة الإعدادات: مفتاح الذكاء الاصطناعي، اختيار Model، اختبار الاتصال،
 * وإعدادات اللعبة العامة (عدد الأسئلة، الصعوبة، المؤقت، الصوت، الوضع الليلي).
 */
(function (global) {
  'use strict';

  // ملاحظة: نماذج Gemini تتغير وتُلغى بشكل متكرر من جوجل.
  // الأسماء أدناه "أسماء دائمة" (aliases) تديرها جوجل وتشير تلقائيًا لأحدث
  // نموذج مناسب، فتتفادى مشكلة توقف نموذج محدد فجأة (مثل gemini-2.5-flash).
  // يمكن للمستخدم دائمًا كتابة اسم نموذج آخر يدويًا في الحقل المخصص أدناه.
  const SUGGESTED_MODELS = [
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview'
  ];

  function refreshConnectionBadge() {
    const badge = document.getElementById('connectionStatus');
    if (!badge) return;
    if (!Storage.hasApiKey()) {
      badge.textContent = '🟡 لم تتم إضافة API Key';
      badge.className = 'status-badge status-badge--warn';
    } else {
      badge.textContent = '🔴 غير متصل (اضغط اختبار API للتأكد)';
      badge.className = 'status-badge status-badge--off';
    }
  }

  function setConnected(ok, message) {
    const badge = document.getElementById('connectionStatus');
    if (!badge) return;
    if (ok) {
      badge.textContent = '🟢 متصل';
      badge.className = 'status-badge status-badge--on';
    } else {
      badge.textContent = '🔴 غير متصل';
      badge.className = 'status-badge status-badge--off';
    }
    if (message) UI.toast(message, ok ? 'success' : 'error');
  }

  function renderKeyField() {
    const input = document.getElementById('apiKeyInput');
    const key = Storage.getApiKey();
    if (key) {
      input.value = key;
      input.dataset.masked = '1';
      input.type = 'password';
    } else {
      input.value = '';
      input.dataset.masked = '0';
    }
  }

  function populateModelSelect() {
    const select = document.getElementById('modelSelect');
    select.innerHTML = '<option value="">— اختر نموذجًا أو اكتب واحدًا مخصصًا أدناه —</option>' +
      SUGGESTED_MODELS.map(function (m) { return `<option value="${m}">${m}</option>`; }).join('');
    const current = Storage.getModel();
    const customInput = document.getElementById('modelCustomInput');
    if (current && SUGGESTED_MODELS.includes(current)) {
      select.value = current;
      customInput.value = '';
    } else if (current) {
      select.value = '';
      customInput.value = current;
    }
  }

  function currentSelectedModel() {
    const select = document.getElementById('modelSelect');
    const customInput = document.getElementById('modelCustomInput');
    return (customInput.value.trim()) || select.value || '';
  }

  function loadGameSettingsForm() {
    const gs = Storage.getGameSettings();
    document.getElementById('setQuestionCount').value = gs.questionCount;
    document.getElementById('setDifficulty').value = gs.difficulty;
    document.getElementById('setTimer').value = gs.timerDuration;
    const settings = Storage.getSettings();
    document.getElementById('setSound').checked = settings.sound !== false;
    document.getElementById('setDarkMode').checked = settings.darkMode !== false;
  }

  function bindEvents() {
    document.getElementById('toggleKeyVisibility').addEventListener('click', function () {
      const input = document.getElementById('apiKeyInput');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁' : '🙈';
    });

    document.getElementById('saveApiKeyBtn').addEventListener('click', function () {
      const input = document.getElementById('apiKeyInput');
      const value = input.value.trim();
      if (!value) { UI.toast('أدخل مفتاحًا صالحًا أولًا.', 'error'); return; }
      Storage.setApiKey(value);
      const model = currentSelectedModel();
      if (model) Storage.setModel(model);
      renderKeyField();
      refreshConnectionBadge();
      UI.toast('تم حفظ الإعدادات ✅', 'success');
    });

    document.getElementById('clearApiKeyBtn').addEventListener('click', function () {
      Storage.clearApiKey();
      renderKeyField();
      refreshConnectionBadge();
      UI.toast('تم مسح المفتاح.', 'success');
    });

    document.getElementById('modelSelect').addEventListener('change', function () {
      document.getElementById('modelCustomInput').value = '';
    });

    document.getElementById('testApiBtn').addEventListener('click', async function () {
      const btn = this;
      const model = currentSelectedModel();
      if (model) Storage.setModel(model);
      btn.disabled = true;
      btn.textContent = '⏳ جارٍ الاختبار...';
      const result = await AIService.testConnection();
      btn.disabled = false;
      btn.textContent = '🔎 اختبار API';
      setConnected(result.success, result.message);
    });

    document.getElementById('saveGameSettingsBtn').addEventListener('click', function () {
      Storage.saveGameSettings({
        questionCount: Number(document.getElementById('setQuestionCount').value),
        difficulty: document.getElementById('setDifficulty').value,
        timerDuration: Number(document.getElementById('setTimer').value)
      });
      Storage.saveSettings({
        sound: document.getElementById('setSound').checked,
        darkMode: document.getElementById('setDarkMode').checked
      });
      UI.applyTheme();
      UI.toast('تم حفظ إعدادات اللعبة ✅', 'success');
    });
  }

  function init() {
    renderKeyField();
    populateModelSelect();
    loadGameSettingsForm();
    refreshConnectionBadge();
    bindEvents();
  }

  global.SettingsScreen = { init };
})(window);
