/**
 * questions.js
 * قائمة التصنيفات + بنك أسئلة تجريبي (Demo) يُستخدم عند غياب API Key
 * أو عند فشل الاتصال بالذكاء الاصطناعي.
 */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'general', label: 'معلومات عامة', icon: '🧩' },
    { id: 'history', label: 'التاريخ', icon: '📜' },
    { id: 'geography', label: 'الجغرافيا', icon: '🌍' },
    { id: 'science', label: 'العلوم', icon: '🔬' },
    { id: 'sports', label: 'الرياضة', icon: '⚽' },
    { id: 'tech', label: 'التكنولوجيا', icon: '💻' },
    { id: 'games', label: 'الألعاب', icon: '🎮' },
    { id: 'movies', label: 'الأفلام', icon: '🎬' },
    { id: 'series', label: 'المسلسلات', icon: '📺' },
    { id: 'music', label: 'الموسيقى', icon: '🎵' },
    { id: 'space', label: 'الفضاء', icon: '🚀' },
    { id: 'animals', label: 'الحيوانات', icon: '🐾' },
    { id: 'morocco', label: 'المغرب', icon: '🇲🇦' },
    { id: 'world', label: 'العالم', icon: '🗺️' }
  ];

  // بنك أسئلة تجريبي — يُستعمل في Demo Mode فقط.
  const DEMO_QUESTIONS = [
    { question: 'ما هي عاصمة المغرب؟', options: ['الدار البيضاء', 'الرباط', 'فاس', 'مراكش'], correctAnswer: 1, category: 'morocco', difficulty: 'easy', explanation: 'الرباط هي العاصمة الإدارية والسياسية للمملكة المغربية.', timeLimit: 12, points: 100 },
    { question: 'كم عدد قارات العالم؟', options: ['خمس', 'ست', 'سبع', 'ثمان'], correctAnswer: 2, category: 'geography', difficulty: 'easy', explanation: 'قارات العالم السبع هي: آسيا، إفريقيا، أوروبا، أمريكا الشمالية، أمريكا الجنوبية، أستراليا، وأنتاركتيكا.', timeLimit: 12, points: 100 },
    { question: 'من هو مخترع المصباح الكهربائي؟', options: ['نيكولا تسلا', 'ألبرت أينشتاين', 'توماس إديسون', 'إسحاق نيوتن'], correctAnswer: 2, category: 'science', difficulty: 'medium', explanation: 'طوّر توماس إديسون أول مصباح كهربائي عملي قابل للاستخدام التجاري سنة 1879.', timeLimit: 15, points: 150 },
    { question: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['الأرض', 'زحل', 'المشتري', 'أورانوس'], correctAnswer: 2, category: 'space', difficulty: 'easy', explanation: 'كوكب المشتري هو الأكبر حجمًا وكتلة بين كواكب المجموعة الشمسية.', timeLimit: 12, points: 100 },
    { question: 'في أي عام انطلقت أول كأس عالم لكرة القدم؟', options: ['1930', '1950', '1924', '1904'], correctAnswer: 0, category: 'sports', difficulty: 'medium', explanation: 'أقيمت أول نسخة من كأس العالم في الأوروغواي سنة 1930.', timeLimit: 15, points: 150 },
    { question: 'ما اسم شبكة التواصل التي أسسها مارك زوكربيرغ؟', options: ['تويتر', 'فيسبوك', 'سناب شات', 'لينكدإن'], correctAnswer: 1, category: 'tech', difficulty: 'easy', explanation: 'أسس مارك زوكربيرغ فيسبوك سنة 2004 أثناء دراسته الجامعية.', timeLimit: 12, points: 100 },
    { question: 'ما هو أطول نهر في العالم؟', options: ['نهر الأمازون', 'نهر النيل', 'نهر اليانغتسي', 'نهر المسيسيبي'], correctAnswer: 1, category: 'geography', difficulty: 'medium', explanation: 'يُعد نهر النيل أطول نهر في العالم بطول يفوق 6600 كيلومتر.', timeLimit: 15, points: 150 },
    { question: 'من كتب رواية "مئة عام من العزلة"؟', options: ['نجيب محفوظ', 'غابرييل غارسيا ماركيز', 'باولو كويلو', 'خورخي بورخيس'], correctAnswer: 1, category: 'general', difficulty: 'hard', explanation: 'الكاتب الكولومبي غابرييل غارسيا ماركيز هو مؤلف هذه الرواية الشهيرة.', timeLimit: 18, points: 200 },
    { question: 'ما هو العنصر الكيميائي الذي رمزه O؟', options: ['الذهب', 'الأكسجين', 'الأوزون', 'الأوسميوم'], correctAnswer: 1, category: 'science', difficulty: 'easy', explanation: 'رمز الأكسجين في الجدول الدوري هو O.', timeLimit: 10, points: 100 },
    { question: 'أي حيوان يُلقب بـ"سفينة الصحراء"؟', options: ['الحصان', 'الجمل', 'الحمار', 'الغزال'], correctAnswer: 1, category: 'animals', difficulty: 'easy', explanation: 'يُلقب الجمل بسفينة الصحراء لقدرته على التنقل الطويل في الصحاري.', timeLimit: 10, points: 100 },
    { question: 'ما اسم أول فيلم في سلسلة أفلام "المصفوفة"؟', options: ['The Matrix', 'The Matrix Reloaded', 'The Matrix Revolutions', 'The Matrix Resurrections'], correctAnswer: 0, category: 'movies', difficulty: 'medium', explanation: 'صدر الفيلم الأول The Matrix سنة 1999.', timeLimit: 15, points: 150 },
    { question: 'كم عدد اللاعبين الأساسيين في فريق كرة السلة؟', options: ['5', '6', '7', '11'], correctAnswer: 0, category: 'sports', difficulty: 'easy', explanation: 'يتكون فريق كرة السلة من 5 لاعبين أساسيين داخل الملعب.', timeLimit: 10, points: 100 },
    { question: 'ما هي اللغة الرسمية الأولى للبرمجة الموجهة للويب؟', options: ['بايثون', 'جافاسكريبت', '++C', 'روبي'], correctAnswer: 1, category: 'tech', difficulty: 'medium', explanation: 'جافاسكريبت هي اللغة الأساسية التي تعمل داخل المتصفحات منذ 1995.', timeLimit: 15, points: 150 },
    { question: 'ما هي أصغر دولة في العالم من حيث المساحة؟', options: ['موناكو', 'الفاتيكان', 'مالطا', 'سان مارينو'], correctAnswer: 1, category: 'world', difficulty: 'medium', explanation: 'دولة الفاتيكان هي أصغر دولة مستقلة في العالم بمساحة لا تتجاوز 0.44 كم².', timeLimit: 15, points: 150 },
    { question: 'ما هي آلة موسيقية وترية؟', options: ['الطبلة', 'الناي', 'العود', 'الدف'], correctAnswer: 2, category: 'music', difficulty: 'easy', explanation: 'العود آلة موسيقية وترية شهيرة في الموسيقى العربية.', timeLimit: 10, points: 100 },
    { question: 'من فاز بأول جائزة نوبل عربية في الأدب؟', options: ['أدونيس', 'نجيب محفوظ', 'طه حسين', 'محمود درويش'], correctAnswer: 1, category: 'history', difficulty: 'hard', explanation: 'حصل الأديب المصري نجيب محفوظ على جائزة نوبل للأدب سنة 1988.', timeLimit: 18, points: 200 },
    { question: 'ما هي أكبر لعبة فيديو من حيث المبيعات في التاريخ؟', options: ['GTA V', 'Minecraft', 'Tetris', 'FIFA'], correctAnswer: 1, category: 'games', difficulty: 'medium', explanation: 'حققت لعبة Minecraft أكثر من 300 مليون نسخة مباعة.', timeLimit: 15, points: 150 },
    { question: 'ما هو أعمق محيط في العالم؟', options: ['المحيط الأطلسي', 'المحيط الهندي', 'المحيط الهادئ', 'المحيط المتجمد الشمالي'], correctAnswer: 2, category: 'geography', difficulty: 'medium', explanation: 'يحتوي المحيط الهادئ على خندق ماريانا، أعمق نقطة معروفة في المحيطات.', timeLimit: 15, points: 150 },
    { question: 'كم يبلغ عدد عظام جسم الإنسان البالغ تقريبًا؟', options: ['196', '206', '216', '226'], correctAnswer: 1, category: 'science', difficulty: 'hard', explanation: 'يحتوي جسم الإنسان البالغ على 206 عظمة تقريبًا.', timeLimit: 18, points: 200 },
    { question: 'ما اسم مسلسل الخيال العلمي الذي يدور حول "عرش من حديد"؟', options: ['Vikings', 'Game of Thrones', 'The Witcher', 'The Crown'], correctAnswer: 1, category: 'series', difficulty: 'easy', explanation: 'مسلسل Game of Thrones مقتبس من روايات جورج آر. آر. مارتن.', timeLimit: 12, points: 100 }
  ];

  // أسئلة Chaos / Madness التجريبية — غريبة ومضحكة عن قصد.
  const CHAOS_DEMO_QUESTIONS = [
    { question: 'لو استطاعت القطط الكلام، ماذا ستطلب أولًا؟', options: ['سمك مجاني للأبد', 'عقد إيجار للأريكة', 'انتخابات لرئاسة المنزل', 'كل ما سبق'], correctAnswer: 3, category: 'chaos', difficulty: 'medium', explanation: 'في وضع Chaos لا توجد إجابة "خاطئة" حقًا، لكن الأكثر فوضى تفوز!', timeLimit: 15, points: 150 },
    { question: 'أي من هذه ليس طريقة منطقية لعبور الشارع؟', options: ['المشي', 'الجري', 'استئجار طائرة هليكوبتر', 'ركوب الدراجة'], correctAnswer: 2, category: 'chaos', difficulty: 'easy', explanation: 'استئجار هليكوبتر ممكن نظريًا، لكنه بالتأكيد ليس عمليًا لعبور الشارع!', timeLimit: 12, points: 100 }
  ];

  function getQuestionsPool(category, mode) {
    const pool = mode === 'chaos' ? CHAOS_DEMO_QUESTIONS : DEMO_QUESTIONS;
    if (!category || category === 'general' || category === 'random') return pool.slice();
    const filtered = pool.filter(function (q) { return q.category === category; });
    return filtered.length ? filtered : pool.slice();
  }

  global.QuestionBank = {
    CATEGORIES,
    DEMO_QUESTIONS,
    CHAOS_DEMO_QUESTIONS,
    getQuestionsPool
  };
})(window);
