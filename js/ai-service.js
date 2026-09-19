/**
 * ai-service.js
 * الطبقة الوحيدة المسؤولة عن التخاطب مع نموذج الذكاء الاصطناعي.
 *
 * ⚠️ ملاحظة أمنية مهمة:
 * هذا الملف يستدعي الـ API مباشرة من المتصفح (Frontend → AI API) وهذا
 * مناسب فقط للاستخدام الشخصي، لأن أي شخص يفتح "أدوات المطوّر" في متصفحه
 * يستطيع رؤية الـ API Key المرسل ضمن الطلب.
 *
 * عند نشر اللعبة للعموم يجب استبدال دالة callModel() أدناه باستدعاء
 * نقطة نهاية على خادمك الخاص (مثلاً: POST /api/generate-question) بحيث
 * يبقى الـ API Key محفوظًا على الخادم فقط:
 *   Frontend → Backend → AI API
 * انظر مجلد /server لهيكل جاهز لإضافة هذا لاحقًا دون تغيير بقية اللعبة،
 * لأن كل الشاشات تتعامل مع AIService.generateQuestion() فقط ولا تعرف
 * كيف يتم جلب السؤال فعليًا.
 */
(function (global) {
  'use strict';

  const MAX_RETRIES = 2;

  function buildPrompt(params) {
    const { category, categoryLabel, difficulty, mode, previousQuestions } = params;
    const avoid = (previousQuestions || []).slice(-8);

    const chaosInstruction = mode === 'chaos'
      ? 'هذا سؤال ضمن وضع Chaos / Madness: اجعله غريبًا، طريفًا، وغير متوقع مع خيارات مضحكة، لكن يبقى له إجابة واحدة واضحة تُعتبر "الأصح" ضمن منطق السؤال.'
      : 'اجعل السؤال واضحًا ودقيقًا ومناسبًا لثقافة عامة متنوعة.';

    return [
      'أنت مولّد أسئلة لعبة تريفيا. أعد فقط كائن JSON صالح بدون أي نص إضافي قبله أو بعده، وبدون أسوار Markdown.',
      'الصيغة المطلوبة بالضبط:',
      '{"question":"...","options":["...","...","...","..."],"correctAnswer":0,"category":"...","difficulty":"easy|medium|hard","explanation":"...","timeLimit":15,"points":100}',
      `التصنيف المطلوب: ${categoryLabel || category}.`,
      `مستوى الصعوبة المطلوب: ${difficulty}.`,
      chaosInstruction,
      'اكتب السؤال والخيارات والشرح باللغة العربية.',
      '"options" يجب أن تحتوي على 4 خيارات بالضبط لا أكثر ولا أقل، وخيار واحد صحيح فقط.',
      '"correctAnswer" رقم صحيح بين 0 و3 يمثل فهرس الخيار الصحيح داخل options.',
      avoid.length ? `لا تكرر أيًا من هذه الأسئلة السابقة: ${JSON.stringify(avoid)}.` : ''
    ].filter(Boolean).join('\n');
  }

  function extractJSON(text) {
    if (!text) return null;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;
    const jsonSlice = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch (e) {
      return null;
    }
  }

  function validateQuestion(obj) {
    if (!obj || typeof obj !== 'object') return { valid: false, reason: 'الاستجابة ليست كائن JSON' };
    if (!obj.question || typeof obj.question !== 'string') return { valid: false, reason: 'السؤال مفقود' };
    if (!Array.isArray(obj.options) || obj.options.length !== 4) return { valid: false, reason: 'يجب أن يحتوي على 4 خيارات بالضبط' };
    if (obj.options.some(function (o) { return typeof o !== 'string' || !o.trim(); })) return { valid: false, reason: 'أحد الخيارات فارغ' };
    if (typeof obj.correctAnswer !== 'number' || obj.correctAnswer < 0 || obj.correctAnswer > 3 || !Number.isInteger(obj.correctAnswer)) {
      return { valid: false, reason: 'الإجابة الصحيحة يجب أن تكون رقمًا صحيحًا بين 0 و3' };
    }
    if (!obj.category || typeof obj.category !== 'string') return { valid: false, reason: 'التصنيف مفقود' };
    if (!['easy', 'medium', 'hard'].includes(obj.difficulty)) return { valid: false, reason: 'مستوى الصعوبة غير صالح' };
    return { valid: true };
  }

  function normalizeQuestion(obj, fallbackCategory) {
    return {
      question: obj.question.trim(),
      options: obj.options.map(function (o) { return String(o).trim(); }),
      correctAnswer: obj.correctAnswer,
      category: obj.category || fallbackCategory,
      difficulty: obj.difficulty,
      explanation: obj.explanation ? String(obj.explanation).trim() : '',
      timeLimit: Number(obj.timeLimit) > 0 ? Number(obj.timeLimit) : 15,
      points: Number(obj.points) > 0 ? Number(obj.points) : 100,
      source: 'ai'
    };
  }

  // يحدد نقطة النهاية المناسبة حسب المزوّد المختار في الإعدادات:
  // - 'puter': بدون أي API Key، عبر مكتبة Puter.js (مجانية).
  // - 'gemini': اتصال مباشر بـ Gemini بمفتاح المستخدم الخاص.
  async function callModel({ provider, apiKey, model, prompt }) {
    if (provider === 'puter') {
      return callPuter({ model, prompt });
    }
    if (!apiKey) throw new Error('لا يوجد API Key محفوظ.');
    if (!model) throw new Error('لم يتم اختيار Model.');
    if (model.toLowerCase().includes('gemini')) {
      return callGemini({ apiKey, model, prompt });
    }
    // نقطة توسّع: أضف هنا مزودين آخرين حسب اسم الـ Model.
    throw new Error(`النموذج "${model}" غير مدعوم حاليًا في هذا العميل التجريبي.`);
  }

  // Puter.js (https://js.puter.com) يوفر نفس نماذج Gemini مجانًا وبدون مفتاح.
  // أول استخدام قد يطلب من المستخدم تسجيل دخول سريع ومجاني عبر نافذة منبثقة،
  // وهذا يتم مرة واحدة فقط ويُدار بالكامل من مكتبة Puter نفسها.
  async function callPuter({ model, prompt }) {
    if (!global.puter || !global.puter.ai || typeof global.puter.ai.chat !== 'function') {
      throw new Error('تعذر تحميل مكتبة Puter. تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
    }
    const response = await global.puter.ai.chat(prompt, { model: model || 'gemini-3.8-flash' });
    return extractPuterText(response);
  }

  function extractPuterText(response) {
    if (typeof response === 'string') return response;
    if (response && typeof response.message?.content !== 'undefined') {
      const content = response.message.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) return content.map(function (c) { return c.text || ''; }).join('');
    }
    if (response && typeof response.text === 'string') return response.text;
    try { return JSON.stringify(response); } catch (e) { return String(response); }
  }

  async function callGemini({ apiKey, model, prompt }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) { /* ignore */ }
      throw new Error(`فشل الاتصال (HTTP ${res.status}) ${detail}`.trim());
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(function (p) { return p.text; }).join('') || '';
    if (!text) throw new Error('لم يُرجع النموذج أي نص.');
    return text;
  }

  /**
   * يولّد سؤالًا واحدًا صالحًا، مع إعادة المحاولة تلقائيًا إذا كان الناتج غير صحيح.
   * يرمي استثناءً إذا فشلت كل المحاولات، ليتولى المستدعي التحول إلى Demo Mode.
   */
  async function generateQuestion(params) {
    const provider = Storage.getAIProvider();
    const apiKey = Storage.getApiKey();
    const model = Storage.getModel();
    const prompt = buildPrompt(params);

    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const rawText = await callModel({ provider, apiKey, model, prompt });
        const parsed = extractJSON(rawText);
        const validation = validateQuestion(parsed);
        if (!validation.valid) {
          lastError = new Error('استجابة JSON غير صالحة: ' + validation.reason);
          continue;
        }
        return normalizeQuestion(parsed, params.category);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('فشل توليد السؤال لسبب غير معروف.');
  }

  async function testConnection() {
    const provider = Storage.getAIProvider();
    const apiKey = Storage.getApiKey();
    const model = Storage.getModel();
    if (provider === 'gemini' && !apiKey) return { success: false, message: 'لم تتم إضافة API Key بعد.' };
    if (!model) return { success: false, message: 'الرجاء اختيار أو إدخال اسم Model أولًا.' };

    const testPrompt = 'أعد فقط الكائن التالي دون أي إضافة: {"ok":true}';
    try {
      const text = await callModel({ provider, apiKey, model, prompt: testPrompt });
      const parsed = extractJSON(text);
      if (parsed && parsed.ok === true) {
        return { success: true, message: 'تم الاتصال بالذكاء الاصطناعي بنجاح ✅' };
      }
      return { success: true, message: 'تم الاتصال، لكن الاستجابة غير معتادة. سيتم الاعتماد على إعادة المحاولة أثناء اللعب.' };
    } catch (err) {
      return { success: false, message: 'فشل الاتصال ❌ — ' + (err.message || 'خطأ غير معروف') };
    }
  }

  global.AIService = {
    buildPrompt,
    extractJSON,
    validateQuestion,
    generateQuestion,
    testConnection
  };
})(window);
