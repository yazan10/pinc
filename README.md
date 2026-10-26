# iPanic Lab — منصة تحليل سجلات وأعطال الآيفون

منصة هندسية ثنائية اللغة (عربي / إنجليزي) لتحليل ملفات أخطاء الآيفون (`.ips` / `panic-full` / `ResetCounter`) وتشخيص أعطال الهاردوير وأكواد الريستور، مزودة بنظام API داخلي وتبديل تلقائي بين نماذج الذكاء الاصطناعي.

---

## المطور والتواصل (Developer & Support)
- **Instagram**: [@yaz.salaq2](https://instagram.com/yaz.salaq2)
- **Facebook**: [yazsalaq](https://facebook.com/yazsalaq)

---

## النشر على GitHub و Vercel (Deployment Guide)

### 1. الرفع على GitHub
```bash
git init
git add .
git commit -m "Initial release of iPanic Lab"
git branch -M main
git remote add origin https://github.com/<your-username>/ipanic-lab.git
git push -u origin main
```

### 2. الربط مع Vercel
1. افتح لوحة تحكم **Vercel** واضغط **Add New Project**.
2. اختر مستودع **GitHub** الخاص بالمشروع.
3. سيقرأ Vercel ملف `vercel.json` تلقائياً (أمر البناء `npm run build` ومجلد المخرجات `dist` مع تفعيل دوال `/api/*`).
4. (اختياري) أضف متغيرات البيئة في إعدادات Vercel:
   - `OPENCODE_API_KEY`
   - `GEMINI_API_KEY`
5. اضغط **Deploy**.

---

## نظام الـ API الداخلي (Internal API Endpoints)

- `POST /api/v1/analyze`: تحليل سجل `.ips` أو `panicString` مع التبديل التلقائي بين النماذج.
- `GET /api/v1/status`: فحص حالة الخادم والـ API الداخلي.
- `POST /api/v1/support`: إرسال تذكرة دعم فني.
