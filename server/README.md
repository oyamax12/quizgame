# خادم فيصل — اللعب الجماعي وOnline 1v1

خادم Node.js بسيط (WebSocket + HTTP) لا يعتمد إلا على حزمة `ws`. مسؤول عن:
إنشاء الغرف، مزامنة الأسئلة، احتساب النقاط والوقت (لمنع الغش)، والمتصدرين العالميين.

## التشغيل محليًا

```bash
cd server
npm install
npm start
```

سيعمل على `http://localhost:3001` والـ WebSocket على `ws://localhost:3001`.

## النشر (استضافة مجانية تدعم Node.js طويل الأمد)

**GitHub Pages لا يصلح لهذا الملف** — فهو يستضيف ملفات ثابتة فقط. استخدم بدلاً منه:

### Render (الأسهل)
1. أنشئ حساب على [render.com](https://render.com) واربطه بمستودع GitHub الخاص بك.
2. **New → Web Service**، اختر المستودع، واضبط:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. بعد النشر ستحصل على رابط مثل `https://your-app.onrender.com`.
4. في إعدادات اللعبة، أدخل: `wss://your-app.onrender.com` (لاحظ `wss` بدل `https`).

### بدائل أخرى
Railway وFly.io وGlitch تدعم نفس الفكرة (تشغيل `npm start` على منفذ `process.env.PORT`).

## ملاحظات

- الغرف والألعاب محفوظة في الذاكرة (تُمسح عند إعادة تشغيل الخادم). المتصدرون فقط محفوظون في ملف `data/leaderboard.json` على القرص.
- الاستضافات المجانية غالبًا "تنام" بعد فترة خمول، فأول اتصال قد يستغرق بضع ثوانٍ إضافية — هذا طبيعي.
- لا يتصل هذا الخادم بالذكاء الاصطناعي حاليًا (يستخدم بنك أسئلة محلي في `questions.js`)؛ يمكن ربطه لاحقًا بنفس منطق `js/ai-service.js` من جهة العميل.
