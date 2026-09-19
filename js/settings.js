/**
 * settings.js
 * منطق شاشة الإعدادات: مفتاح الذكاء الاصطناعي، اختيار Model، اختبار الاتصال،
 * وإعدادات اللعبة العامة (عدد الأسئلة، الصعوبة، المؤقت، الصوت، الوضع الليلي).
 */
(function (global) {
  'use strict';

  const SUGGESTED_MODELS_GEMINI = [
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview'
  ];

  // النماذج المتاحة مجانًا وبدون مفتاح عبر Puter.js
  const SUGGESTED_MODELS_PUTER = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview'
  ];

  function currentSuggestedModels() {
    return Storage.getAIProvider() === 'gemini' ? SUGGESTED_MODELS_GEMINI : SUGGESTED_MODELS_PUTER;
  }

  function applyProviderVisibility() {
    const provider = Storage.getAIProvider();
    document.getElementById('apiKeySection').hidden = provider !== 'gemini';
    document.getElementById('puterHint').hidden = provider !== 'puter';
    document.getElementById('testApiBtnPuter').hidden = provider !== 'puter';
    setSegmentedActive('providerPicker', provider);
  }

  function setSegmentedActive(containerId, value) {
    document.querySelectorAll('#' + containerId + ' button').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.value === value);
    });
  }

  function refreshConnectionBadge() {
    const badge = document.getElementById('connectionStatus');
    if (!badge) return;
    const provider = Storage.getAIProvider();
    if (provider === 'puter') {
      badge.textContent = '🟡 لم يتم اختبار الاتصال بعد (بدون مفتاح)';
      badge.className = 'status-badge status-badge--warn';
      return;
    }
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
      currentSuggestedModels().map(function (m) { return `<option value="${m}">${m}</option>`; }).join('');
    const current = Storage.getModel();
    const customInput = document.getElementById('modelCustomInput');
    if (current && currentSuggestedModels().includes(current)) {
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
    document.querySelectorAll('#providerPicker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const value = btn.dataset.value;
        Storage.setAIProvider(value);
        if (value === 'puter' && !Storage.getModel()) {
          Storage.setModel(SUGGESTED_MODELS_PUTER[0]);
        }
        applyProviderVisibility();
        populateModelSelect();
        refreshConnectionBadge();
        UI.toast(value === 'puter' ? 'تم اختيار وضع Puter (بدون مفتاح) 🆓' : 'تم اختيار مفتاح Gemini الخاص بك 🔑', 'success');
      });
    });

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
      const model = currentSelectedModel();
      if (model) Storage.setModel(model);
    });

    async function runConnectionTest(btn) {
      const model = currentSelectedModel();
      if (model) Storage.setModel(model);
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ جارٍ الاختبار...';
      const result = await AIService.testConnection();
      btn.disabled = false;
      btn.textContent = originalText;
      setConnected(result.success, result.message);
    }

    document.getElementById('testApiBtn').addEventListener('click', function () { runConnectionTest(this); });
    document.getElementById('testApiBtnPuter').addEventListener('click', function () { runConnectionTest(this); });

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
    if (Storage.getAIProvider() === 'puter' && !Storage.getModel()) {
      Storage.setModel(SUGGESTED_MODELS_PUTER[0]);
    }
    applyProviderVisibility();
    renderKeyField();
    populateModelSelect();
    loadGameSettingsForm();
    refreshConnectionBadge();
    bindEvents();
  }

  global.SettingsScreen = { init };
})(window);
