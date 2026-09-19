/**
 * questions.js (خادم)
 * بنك أسئلة مدمج يستخدمه الخادم لتوليد جولات اللعب الجماعي وOnline 1v1.
 *
 * ملاحظة: الخادم لا يتصل بالذكاء الاصطناعي حاليًا (لتفادي الحاجة لإدارة
 * مفتاح API على الخادم في هذه المرحلة). لاحقًا يمكن استبدال getRandomQuestions()
 * أدناه باستدعاء نموذج AI من هنا (بنفس منطق ai-service.js من جهة العميل)
 * بحيث يبقى "correctAnswer" على الخادم فقط ولا يُرسل للاعبين قبل الإجابة —
 * وهذا بالضبط ما تفعله هذه الوحدة الآن مع البنك المحلي.
 */
'use strict';

const QUESTIONS = [
  { question: 'ما هي عاصمة المغرب؟', options: ['الدار البيضاء', 'الرباط', 'فاس', 'مراكش'], correctAnswer: 1, category: 'morocco', difficulty: 'easy', explanation: 'الرباط هي العاصمة الإدارية والسياسية للمملكة المغربية.', points: 100 },
  { question: 'كم عدد قارات العالم؟', options: ['خمس', 'ست', 'سبع', 'ثمان'], correctAnswer: 2, category: 'geography', difficulty: 'easy', explanation: 'قارات العالم السبع: آسيا، إفريقيا، أوروبا، أمريكا الشمالية، أمريكا الجنوبية، أستراليا، وأنتاركتيكا.', points: 100 },
  { question: 'من هو مخترع المصباح الكهربائي؟', options: ['نيكولا تسلا', 'ألبرت أينشتاين', 'توماس إديسون', 'إسحاق نيوتن'], correctAnswer: 2, category: 'science', difficulty: 'medium', explanation: 'طوّر توماس إديسون أول مصباح كهربائي عملي سنة 1879.', points: 150 },
  { question: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['الأرض', 'زحل', 'المشتري', 'أورانوس'], correctAnswer: 2, category: 'space', difficulty: 'easy', explanation: 'كوكب المشتري هو الأكبر حجمًا بين كواكب المجموعة الشمسية.', points: 100 },
  { question: 'في أي عام أقيمت أول كأس عالم لكرة القدم؟', options: ['1930', '1950', '1924', '1904'], correctAnswer: 0, category: 'sports', difficulty: 'medium', explanation: 'أقيمت أول نسخة من كأس العالم في الأوروغواي سنة 1930.', points: 150 },
  { question: 'ما هو أطول نهر في العالم؟', options: ['نهر الأمازون', 'نهر النيل', 'نهر اليانغتسي', 'نهر المسيسيبي'], correctAnswer: 1, category: 'geography', difficulty: 'medium', explanation: 'يُعد نهر النيل أطول نهر في العالم بطول يفوق 6600 كم.', points: 150 },
  { question: 'ما هو العنصر الكيميائي الذي رمزه O؟', options: ['الذهب', 'الأكسجين', 'الأوزون', 'الأوسميوم'], correctAnswer: 1, category: 'science', difficulty: 'easy', explanation: 'رمز الأكسجين في الجدول الدوري هو O.', points: 100 },
  { question: 'أي حيوان يُلقب بـ"سفينة الصحراء"؟', options: ['الحصان', 'الجمل', 'الحمار', 'الغزال'], correctAnswer: 1, category: 'animals', difficulty: 'easy', explanation: 'يُلقب الجمل بسفينة الصحراء لقدرته على التنقل الطويل في الصحاري.', points: 100 },
  { question: 'كم عدد اللاعبين الأساسيين في فريق كرة السلة؟', options: ['5', '6', '7', '11'], correctAnswer: 0, category: 'sports', difficulty: 'easy', explanation: 'يتكون فريق كرة السلة من 5 لاعبين أساسيين داخل الملعب.', points: 100 },
  { question: 'ما هي أصغر دولة في العالم من حيث المساحة؟', options: ['موناكو', 'الفاتيكان', 'مالطا', 'سان مارينو'], correctAnswer: 1, category: 'world', difficulty: 'medium', explanation: 'دولة الفاتيكان أصغر دولة مستقلة في العالم بمساحة 0.44 كم² تقريبًا.', points: 150 },
  { question: 'من فاز بأول جائزة نوبل عربية في الأدب؟', options: ['أدونيس', 'نجيب محفوظ', 'طه حسين', 'محمود درويش'], correctAnswer: 1, category: 'history', difficulty: 'hard', explanation: 'حصل نجيب محفوظ على جائزة نوبل للأدب سنة 1988.', points: 200 },
  { question: 'ما أعمق محيط في العالم؟', options: ['المحيط الأطلسي', 'المحيط الهندي', 'المحيط الهادئ', 'المحيط المتجمد الشمالي'], correctAnswer: 2, category: 'geography', difficulty: 'medium', explanation: 'يحتوي المحيط الهادئ على خندق ماريانا، أعمق نقطة معروفة في المحيطات.', points: 150 },
  { question: 'كم يبلغ عدد عظام جسم الإنسان البالغ تقريبًا؟', options: ['196', '206', '216', '226'], correctAnswer: 1, category: 'science', difficulty: 'hard', explanation: 'يحتوي جسم الإنسان البالغ على 206 عظمة تقريبًا.', points: 200 },
  { question: 'ما اسم أول فيلم في سلسلة "المصفوفة"؟', options: ['The Matrix', 'The Matrix Reloaded', 'The Matrix Revolutions', 'The Matrix Resurrections'], correctAnswer: 0, category: 'movies', difficulty: 'medium', explanation: 'صدر الفيلم الأول The Matrix سنة 1999.', points: 150 },
  { question: 'ما هي اللغة الأساسية التي تعمل داخل متصفحات الويب؟', options: ['بايثون', 'جافاسكريبت', '++C', 'روبي'], correctAnswer: 1, category: 'tech', difficulty: 'medium', explanation: 'جافاسكريبت هي اللغة الأساسية التي تعمل داخل المتصفحات منذ 1995.', points: 150 },
  { question: 'أي آلة موسيقية وترية؟', options: ['الطبلة', 'الناي', 'العود', 'الدف'], correctAnswer: 2, category: 'music', difficulty: 'easy', explanation: 'العود آلة موسيقية وترية شهيرة في الموسيقى العربية.', points: 100 },
  { question: 'ما اسم مسلسل الخيال الذي يدور حول "عرش من حديد"؟', options: ['Vikings', 'Game of Thrones', 'The Witcher', 'The Crown'], correctAnswer: 1, category: 'series', difficulty: 'easy', explanation: 'مسلسل Game of Thrones مقتبس من روايات جورج آر. آر. مارتن.', points: 100 },
  { question: 'ما أكبر لعبة فيديو من حيث المبيعات في التاريخ؟', options: ['GTA V', 'Minecraft', 'Tetris', 'FIFA'], correctAnswer: 1, category: 'games', difficulty: 'medium', explanation: 'حققت لعبة Minecraft أكثر من 300 مليون نسخة مباعة.', points: 150 },
  { question: 'كم عدد ألوان قوس قزح؟', options: ['خمسة', 'ستة', 'سبعة', 'ثمانية'], correctAnswer: 2, category: 'general', difficulty: 'easy', explanation: 'يحتوي قوس قزح تقليديًا على سبعة ألوان.', points: 100 },
  { question: 'ما اسم أول من هبط على القمر؟', options: ['يوري غاغارين', 'نيل أرمسترونغ', 'باز ألدرين', 'جون غلين'], correctAnswer: 1, category: 'space', difficulty: 'medium', explanation: 'نيل أرمسترونغ كان أول إنسان يمشي على سطح القمر سنة 1969.', points: 150 }
];

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** يعيد N سؤال عشوائي بدون تكرار داخل نفس الجولة. */
function getRandomQuestions(count) {
  const pool = shuffle(QUESTIONS);
  const picked = [];
  for (let i = 0; i < count; i++) picked.push(pool[i % pool.length]);
  return picked;
}

module.exports = { QUESTIONS, getRandomQuestions };
