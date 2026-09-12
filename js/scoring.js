/**
 * scoring.js
 * منطق احتساب النقاط، مكافآت السرعة والسلسلة (Streak)، ونوع الجولة.
 * ملاحظة أمنية: هذا الحساب يعمل هنا فقط للعب الفردي offline.
 * في وضع Multiplayer / Online 1v1 (مراحل قادمة) يجب أن يتم هذا الحساب
 * على الخادم حصريًا لمنع الغش (انظر ai-service.js وملاحظات server/).
 */
(function (global) {
  'use strict';

  const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };
  const MAX_SPEED_BONUS = 50;

  function difficultyMultiplier(difficulty) {
    return DIFFICULTY_MULTIPLIER[difficulty] || 1;
  }

  /**
   * @param {Object} p
   * @param {boolean} p.correct
   * @param {number} p.basePoints
   * @param {number} p.timeTakenMs
   * @param {number} p.timeLimitSec
   * @param {string} p.difficulty
   * @param {string} p.roundType normal|speed|double|elimination|aiTrap|final
   * @param {number} p.streak سلسلة الإجابات الصحيحة المتتالية بعد هذه الإجابة
   */
  function calculateAnswerPoints(p) {
    if (!p.correct) return { total: 0, base: 0, speedBonus: 0, streakBonus: 0, breakdown: 'إجابة خاطئة أو بدون إجابة' };

    const mult = difficultyMultiplier(p.difficulty);
    let base = Math.round((p.basePoints || 100) * mult);

    const timeLimitMs = (p.timeLimitSec || 15) * 1000;
    const remainingRatio = Math.max(0, Math.min(1, 1 - (p.timeTakenMs || 0) / timeLimitMs));
    let speedBonus = Math.round(MAX_SPEED_BONUS * remainingRatio);

    if (p.roundType === 'speed') speedBonus *= 2;
    if (p.roundType === 'double') base *= 2;
    if (p.roundType === 'final') base = Math.round(base * 1.5);

    const streakBonus = calculateStreakBonus(p.streak);

    const total = base + speedBonus + streakBonus;
    return { total, base, speedBonus, streakBonus, breakdown: `${base} أساسي + ${speedBonus} سرعة + ${streakBonus} سلسلة` };
  }

  // مكافأة تُمنح عند كل سؤال طالما السلسلة الحالية بلغت العتبة أو تجاوزتها.
  function calculateStreakBonus(streak) {
    if (streak >= 10) return 500;
    if (streak >= 5) return 200;
    if (streak >= 3) return 50;
    return 0;
  }

  // XP يُمنح في نهاية اللعبة بناءً على الأداء الكلي.
  function calculateGameXP(summary) {
    const base = Math.round(summary.score / 4);
    const accuracyBonus = Math.round((summary.correctAnswers / Math.max(1, summary.totalQuestions)) * 100);
    const streakBonus = summary.bestStreak * 5;
    return Math.max(20, base + accuracyBonus + streakBonus);
  }

  global.Scoring = {
    difficultyMultiplier,
    calculateAnswerPoints,
    calculateStreakBonus,
    calculateGameXP
  };
})(window);
