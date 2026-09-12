/**
 * game.js
 * تحكم اللعب الفردي (Single Player): تحميل الأسئلة (AI أو Demo)،
 * إدارة المؤقت، احتساب النقاط، الصعوبة التكيفية، وشاشة النتائج.
 */
(function (global) {
  'use strict';

  const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

  function createGame() {
    let state = null;
    let timerInterval = null;

    function difficultyLabel(d) {
      return { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }[d] || d;
    }

    function pickInitialDifficulty(pref) {
      if (pref === 'auto') return 'medium';
      return pref;
    }

    function adaptDifficulty() {
      if (state.config.difficulty !== 'auto') return state.currentDifficulty;
      const idx = DIFFICULTY_ORDER.indexOf(state.currentDifficulty);
      if (state.recentStreak >= 3) return DIFFICULTY_ORDER[Math.min(idx + 1, DIFFICULTY_ORDER.length - 1)];
      if (state.recentWrongStreak >= 2) return DIFFICULTY_ORDER[Math.max(idx - 1, 0)];
      return state.currentDifficulty;
    }

    function pickRoundType(index, total) {
      if (index === total - 1) return 'final';
      if (state.config.mode === 'chaos') return 'normal';
      const cyclePos = index % 5;
      if (cyclePos === 2) return 'speed';
      if (cyclePos === 4) return 'double';
      return 'normal';
    }

    async function setup(config) {
      state = {
        config: config,
        currentIndex: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        streak: 0,
        bestStreak: 0,
        recentStreak: 0,
        recentWrongStreak: 0,
        currentDifficulty: pickInitialDifficulty(config.difficulty),
        askedQuestionTexts: [],
        answers: [],
        usingDemo: !Storage.hasApiKey(),
        selectedIndex: null,
        answered: false
      };
    }

    function categoryLabel(id) {
      const found = QuestionBank.CATEGORIES.find(function (c) { return c.id === id; });
      return found ? found.label : id;
    }

    async function loadNextQuestion() {
      state.currentDifficulty = adaptDifficulty();
      const params = {
        category: state.config.category,
        categoryLabel: categoryLabel(state.config.category),
        difficulty: state.currentDifficulty,
        mode: state.config.mode,
        previousQuestions: state.askedQuestionTexts
      };

      let question = null;
      if (!state.usingDemo) {
        try {
          question = await AIService.generateQuestion(params);
        } catch (err) {
          console.warn('فشل توليد سؤال AI، التحويل إلى Demo Mode لهذا السؤال:', err.message);
          UI.toast('تعذر إنشاء السؤال حاليًا، تم استخدام سؤال تجريبي.', 'error');
          question = null;
        }
      }
      if (!question) {
        const pool = QuestionBank.getQuestionsPool(state.config.category, state.config.mode)
          .filter(function (q) { return !state.askedQuestionTexts.includes(q.question); });
        const source = pool.length ? pool : QuestionBank.getQuestionsPool(state.config.category, state.config.mode);
        question = Object.assign({}, source[Math.floor(Math.random() * source.length)], { source: 'demo' });
        question.difficulty = question.difficulty || state.currentDifficulty;
      }

      question.timeLimit = state.config.timerDuration || question.timeLimit || 15;
      state.askedQuestionTexts.push(question.question);
      return question;
    }

    function timeUsedMs() {
      return Date.now() - state.questionStartedAt;
    }

    function startTimer(seconds, onTick, onTimeUp) {
      clearInterval(timerInterval);
      let remaining = seconds;
      onTick(remaining, seconds);
      timerInterval = setInterval(function () {
        remaining -= 1;
        if (remaining <= 5 && remaining > 0) UI.Sound.tick();
        onTick(remaining, seconds);
        if (remaining <= 0) {
          clearInterval(timerInterval);
          onTimeUp();
        }
      }, 1000);
    }

    function stopTimer() {
      clearInterval(timerInterval);
    }

    function submitAnswer(question, selectedIndex, roundType) {
      const correct = selectedIndex === question.correctAnswer;
      state.answered = true;
      state.selectedIndex = selectedIndex;

      if (correct) {
        state.correctCount++;
        state.streak++;
        state.recentStreak++;
        state.recentWrongStreak = 0;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
      } else {
        state.wrongCount++;
        state.streak = 0;
        state.recentStreak = 0;
        state.recentWrongStreak++;
      }

      const points = Scoring.calculateAnswerPoints({
        correct: correct,
        basePoints: question.points,
        timeTakenMs: selectedIndex === null ? (question.timeLimit * 1000) : timeUsedMs(),
        timeLimitSec: question.timeLimit,
        difficulty: question.difficulty,
        roundType: roundType,
        streak: state.streak
      });

      state.score += points.total;
      state.answers.push({ question: question.question, correct: correct, points: points.total, category: question.category });

      correct ? UI.Sound.correct() : UI.Sound.wrong();

      return { correct: correct, points: points, streak: state.streak };
    }

    function isLastQuestion() {
      return state.currentIndex >= state.config.questionCount - 1;
    }

    function advance() {
      state.currentIndex++;
    }

    function markQuestionStart() {
      state.questionStartedAt = Date.now();
      state.answered = false;
      state.selectedIndex = null;
    }

    function finalize() {
      stopTimer();
      const stats = Storage.getStats();
      const summary = {
        score: state.score,
        totalQuestions: state.config.questionCount,
        correctAnswers: state.correctCount,
        wrongAnswers: state.wrongCount,
        accuracy: Math.round((state.correctCount / state.config.questionCount) * 100),
        bestStreak: state.bestStreak,
        usedDemo: state.usingDemo
      };

      const xpResult = Storage.addXP(Scoring.calculateGameXP(summary));

      Storage.saveStats({
        gamesPlayed: stats.gamesPlayed + 1,
        wins: stats.wins + (summary.accuracy >= 50 ? 1 : 0),
        correctAnswers: stats.correctAnswers + summary.correctAnswers,
        wrongAnswers: stats.wrongAnswers + summary.wrongAnswers,
        bestStreak: Math.max(stats.bestStreak, summary.bestStreak)
      });

      const newlyUnlocked = checkAchievements(summary, stats);

      return Object.assign({}, summary, { xp: xpResult, newAchievements: newlyUnlocked });
    }

    function checkAchievements(summary, statsBefore) {
      const unlocked = [];
      function unlock(id, label) {
        if (Storage.unlockAchievement(id)) unlocked.push(label);
      }
      if (statsBefore.gamesPlayed === 0 && summary.accuracy >= 50) unlock('first_win', '🏆 أول فوز');
      if (summary.bestStreak >= 10) unlock('streak_10', '🔥 10 إجابات صحيحة متتالية');
      if (summary.accuracy === 100) unlock('perfect', '💯 نتيجة كاملة');
      if (statsBefore.correctAnswers + summary.correctAnswers >= 100) unlock('correct_100', '🧠 100 سؤال صحيح');
      if (state.config.mode === 'chaos') unlock('chaos_done', '🌪 إكمال Chaos Mode');
      return unlocked;
    }

    function getState() { return state; }
    function difficultyText(d) { return difficultyLabel(d); }

    return {
      setup, loadNextQuestion, startTimer, stopTimer, submitAnswer,
      isLastQuestion, advance, markQuestionStart, finalize,
      getState, difficultyText, pickRoundType
    };
  }

  global.Game = createGame();
})(window);
