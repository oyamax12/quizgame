/**
 * app.js
 * نقطة الدخول: يربط كل الوحدات ببعضها (Storage, QuestionBank, Scoring,
 * AIService, UI, Game, SettingsScreen) ويدير التنقل بين الشاشات وحلقة اللعب.
 */
(function () {
  'use strict';

  const AVATARS = ['🙂', '😎', '🤖', '🦁', '🐼', '🦊', '🐸', '🧙', '🚀', '🔥'];
  const ACHIEVEMENTS_CATALOG = [
    { id: 'first_win', icon: '🏆', label: 'أول فوز' },
    { id: 'streak_10', icon: '🔥', label: '10 متتالية' },
    { id: 'perfect', icon: '💯', label: 'نتيجة كاملة' },
    { id: 'correct_100', icon: '🧠', label: '100 إجابة صحيحة' },
    { id: 'chaos_done', icon: '🌪', label: 'Chaos مكتمل' },
    { id: 'fast_answer', icon: '⚡', label: 'أسرع إجابة' }
  ];

  let pendingMode = 'normal';
  let lastConfig = null;
  let currentQuestion = null;
  let currentRoundType = 'normal';
  let currentRemaining = 0;
  let powerups = { fifty: 2, freeze: 1, change: 1 };

  function navigateTo(id) {
    UI.showScreen(id);
    if (id === 'screen-home') renderHome();
    if (id === 'screen-profile') renderProfile();
    if (id === 'screen-setup') renderSetupScreen();
  }

  // ---------- الشاشة الرئيسية ----------
  function renderHome() {
    document.getElementById('homeAvatar').textContent = Storage.getPlayerAvatar();
    const xp = Storage.getXP();
    const level = Storage.levelFromXP(xp);
    document.getElementById('homeLevel').textContent = 'المستوى ' + level;
    const curFloor = Storage.xpForLevel(level);
    const nextFloor = Storage.xpForLevel(level + 1);
    const pct = Math.min(100, Math.round(((xp - curFloor) / (nextFloor - curFloor)) * 100));
    document.getElementById('homeXpFill').style.width = pct + '%';
    document.getElementById('demoBanner').hidden = Storage.isAIReady();
  }

  // ---------- شاشة الإعداد ----------
  let setupConfig = { category: 'general', difficulty: 'auto', questionCount: 10, timerDuration: 15 };

  function renderSetupScreen() {
    const gs = Storage.getGameSettings();
    setupConfig = {
      category: 'general',
      difficulty: gs.difficulty,
      questionCount: gs.questionCount,
      timerDuration: gs.timerDuration
    };

    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = '';
    QuestionBank.CATEGORIES.forEach(function (cat, i) {
      const chip = UI.el(`<button class="category-chip${i === 0 ? ' is-active' : ''}" data-value="${cat.id}"><span>${cat.icon}</span>${cat.label}</button>`);
      chip.addEventListener('click', function () {
        grid.querySelectorAll('.category-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        setupConfig.category = cat.id;
        UI.Sound.click();
      });
      grid.appendChild(chip);
    });

    setSegmented('difficultyPicker', setupConfig.difficulty, function (v) { setupConfig.difficulty = v; });
    setSegmented('countPicker', String(setupConfig.questionCount), function (v) { setupConfig.questionCount = Number(v); });
    setSegmented('timerPicker', String(setupConfig.timerDuration), function (v) { setupConfig.timerDuration = Number(v); });
  }

  function setSegmented(containerId, activeValue, onPick) {
    const container = document.getElementById(containerId);
    Array.from(container.children).forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.value === activeValue);
      btn.onclick = function () {
        Array.from(container.children).forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        onPick(btn.dataset.value);
        UI.Sound.click();
      };
    });
  }

  document.getElementById('startGameBtn').addEventListener('click', function () {
    const config = Object.assign({}, setupConfig, { mode: pendingMode });
    startGame(config);
  });

  // ---------- حلقة اللعب ----------
  async function startGame(config) {
    lastConfig = config;
    powerups = { fifty: 2, freeze: 1, change: 1 };
    updatePowerupButtons();
    await Game.setup(config);
    navigateTo('screen-game');
    document.getElementById('gameScore').textContent = '0';
    document.getElementById('gameStreak').textContent = '🔥 0';
    playRound();
  }

  async function playRound() {
    document.getElementById('questionArea').hidden = true;
    document.getElementById('loadingQuestion').hidden = false;
    document.getElementById('explanationBox').hidden = true;

    const state = Game.getState();
    document.getElementById('gameProgress').textContent = (state.currentIndex + 1) + ' / ' + state.config.questionCount;

    currentQuestion = await Game.loadNextQuestion();
    currentRoundType = Game.pickRoundType(state.currentIndex, state.config.questionCount);

    renderQuestion(currentQuestion);
    Game.markQuestionStart();

    document.getElementById('loadingQuestion').hidden = true;
    document.getElementById('questionArea').hidden = false;

    Game.startTimer(currentQuestion.timeLimit, onTick, function () { handleAnswer(null); });
  }

  function roundTypeLabel(type) {
    return { normal: '', speed: '⚡ جولة سريعة', double: '✨ نقاط مضاعفة', final: '🏁 السؤال الأخير' }[type] || '';
  }

  function renderQuestion(q) {
    document.getElementById('difficultyChip').textContent =
      Game.difficultyText(q.difficulty) + (roundTypeLabel(currentRoundType) ? ' • ' + roundTypeLabel(currentRoundType) : '') +
      (q.source === 'demo' ? ' • تجريبي' : '');

    document.getElementById('questionText').textContent = q.question;
    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';
    q.options.forEach(function (opt, idx) {
      const btn = UI.el(`<button class="option-btn" data-index="${idx}">${opt}</button>`);
      btn.addEventListener('click', function () { handleAnswer(idx); });
      grid.appendChild(btn);
    });
  }

  function onTick(remaining, total) {
    currentRemaining = remaining;
    const ring = document.getElementById('timerRing');
    document.getElementById('timerValue').textContent = remaining;
    ring.classList.toggle('is-low', remaining <= 5);
  }

  function handleAnswer(selectedIndex) {
    const state = Game.getState();
    if (state.answered) return;
    Game.stopTimer();

    const result = Game.submitAnswer(currentQuestion, selectedIndex, currentRoundType);

    document.querySelectorAll('.option-btn').forEach(function (btn) {
      const idx = Number(btn.dataset.index);
      btn.classList.add('is-disabled');
      if (idx === currentQuestion.correctAnswer) btn.classList.add('is-correct');
      else if (idx === selectedIndex) btn.classList.add('is-wrong');
    });

    document.getElementById('gameScore').textContent = String(state.score);
    document.getElementById('gameStreak').textContent = '🔥 ' + state.streak;

    const explanationBox = document.getElementById('explanationBox');
    const explanationText = document.getElementById('explanationText');
    explanationText.textContent = (currentQuestion.explanation || 'لا يوجد شرح لهذا السؤال.') +
      (result.correct ? `  (+${result.points.total} نقطة)` : '');
    explanationBox.hidden = false;

    const nextBtn = document.getElementById('nextQuestionBtn');
    nextBtn.textContent = Game.isLastQuestion() ? 'عرض النتائج 🏁' : 'التالي ←';
    nextBtn.onclick = function () {
      if (Game.isLastQuestion()) {
        finalizeGame();
      } else {
        Game.advance();
        playRound();
      }
    };
  }

  function finalizeGame() {
    const summary = Game.finalize();
    document.getElementById('resultScore').textContent = summary.score;
    document.getElementById('resultCorrect').textContent = summary.correctAnswers;
    document.getElementById('resultWrong').textContent = summary.wrongAnswers;
    document.getElementById('resultAccuracy').textContent = summary.accuracy + '%';
    document.getElementById('resultStreak').textContent = summary.bestStreak;
    document.getElementById('resultXpGained').textContent = Scoring.calculateGameXP(summary);
    document.getElementById('resultLevel').textContent = 'المستوى ' + summary.xp.level;

    const achBox = document.getElementById('resultAchievements');
    achBox.innerHTML = summary.newAchievements.length
      ? summary.newAchievements.map(function (a) { return `<span>${a}</span>`; }).join('')
      : '';

    if (summary.xp.leveledUp) { UI.Sound.levelUp(); UI.toast('🎉 وصلت إلى مستوى جديد!', 'success'); }

    navigateTo('screen-results');
  }

  document.getElementById('playAgainBtn').addEventListener('click', function () {
    if (lastConfig) startGame(lastConfig);
  });

  document.getElementById('shareResultBtn').addEventListener('click', async function () {
    const text = `حصلت على ${document.getElementById('resultScore').textContent} نقطة في لعبة فيصل! 🧠🔥`;
    if (navigator.share) {
      try { await navigator.share({ text: text }); } catch (e) { /* تم الإلغاء من المستخدم */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        UI.toast('تم نسخ النتيجة للحافظة 📋', 'success');
      } catch (e) {
        UI.toast(text, 'success');
      }
    }
  });

  // ---------- Power-Ups ----------
  function updatePowerupButtons() {
    document.getElementById('pu-fifty-count').textContent = powerups.fifty;
    document.getElementById('pu-freeze-count').textContent = powerups.freeze;
    document.getElementById('pu-change-count').textContent = powerups.change;
    document.querySelectorAll('.powerup-btn').forEach(function (btn) {
      const key = btn.dataset.powerup;
      btn.disabled = powerups[key] <= 0;
    });
  }

  document.querySelectorAll('.powerup-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.dataset.powerup;
      const state = Game.getState();
      if (!state || state.answered || powerups[key] <= 0) return;
      powerups[key]--;
      updatePowerupButtons();
      UI.Sound.click();

      if (key === 'fifty') {
        const wrongIndexes = currentQuestion.options
          .map(function (_, i) { return i; })
          .filter(function (i) { return i !== currentQuestion.correctAnswer; });
        const toHide = wrongIndexes.sort(function () { return Math.random() - 0.5; }).slice(0, 2);
        document.querySelectorAll('.option-btn').forEach(function (b) {
          if (toHide.includes(Number(b.dataset.index))) b.classList.add('is-hidden');
        });
      }

      if (key === 'freeze') {
        Game.stopTimer();
        UI.toast('❄️ تم تجميد الوقت لـ 5 ثوانٍ', 'success');
        setTimeout(function () {
          if (!Game.getState().answered) {
            Game.startTimer(currentRemaining, onTick, function () { handleAnswer(null); });
          }
        }, 5000);
      }

      if (key === 'change') {
        playRound();
      }
    });
  });

  // ---------- الملف الشخصي ----------
  function renderProfile() {
    const picker = document.getElementById('avatarPicker');
    const current = Storage.getPlayerAvatar();
    picker.innerHTML = '';
    AVATARS.forEach(function (a) {
      const btn = UI.el(`<button class="${a === current ? 'is-active' : ''}">${a}</button>`);
      btn.addEventListener('click', function () {
        Storage.setPlayerAvatar(a);
        renderProfile();
        renderHome();
      });
      picker.appendChild(btn);
    });

    const nameInput = document.getElementById('playerNameInput');
    nameInput.value = Storage.getPlayerName();
    nameInput.onchange = function () { Storage.setPlayerName(nameInput.value.trim() || 'لاعب مجهول'); };

    const xp = Storage.getXP();
    const level = Storage.levelFromXP(xp);
    const curFloor = Storage.xpForLevel(level);
    const nextFloor = Storage.xpForLevel(level + 1);
    document.getElementById('profileLevel').textContent = 'المستوى ' + level;
    document.getElementById('profileXpText').textContent = xp + ' XP';
    document.getElementById('profileXpFill').style.width = Math.min(100, Math.round(((xp - curFloor) / (nextFloor - curFloor)) * 100)) + '%';

    const stats = Storage.getStats();
    const winRate = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('profileStats').innerHTML = [
      ['🎮', stats.gamesPlayed, 'مباريات'],
      ['🏆', stats.wins, 'انتصارات'],
      ['✅', stats.correctAnswers, 'إجابات صحيحة'],
      ['🔥', stats.bestStreak, 'أفضل سلسلة'],
      ['📊', winRate + '%', 'نسبة الفوز']
    ].map(function (row) {
      return `<div class="stat-item">${row[0]}<strong>${row[1]}</strong><span>${row[2]}</span></div>`;
    }).join('');

    const unlocked = Storage.getAchievements();
    document.getElementById('profileAchievements').innerHTML = ACHIEVEMENTS_CATALOG.map(function (a) {
      const isUnlocked = unlocked.includes(a.id);
      return `<div class="achievement-item${isUnlocked ? ' is-unlocked' : ''}"><span class="ic">${a.icon}</span>${a.label}</div>`;
    }).join('');
  }

  // ---------- التنقل العام ----------
  document.addEventListener('click', function (e) {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      if (navBtn.dataset.mode) pendingMode = navBtn.dataset.mode;
      navigateTo(navBtn.dataset.nav);
      return;
    }
    const soonBtn = e.target.closest('[data-action="soon"]');
    if (soonBtn) {
      UI.toast('هذه الميزة قيد التطوير وستتوفر في تحديث قادم 🚧', 'success');
    }
  });

  // ---------- الإقلاع ----------
  document.addEventListener('DOMContentLoaded', function () {
    UI.applyTheme();
    SettingsScreen.init();
    renderHome();
    navigateTo('screen-home');
  });
})();
