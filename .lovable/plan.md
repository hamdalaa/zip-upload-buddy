

# تطوير Creative UI/UX — Vercel/Stripe Vibe

## الفهم
المستخدم اختار:
- **طابع**: عصري وحيوي (Vercel/Stripe) — ألوان أجرأ، gradients واضحة، scroll animations، hover effects ملحوظة.
- **نطاق**: Hero + الصفحة الرئيسية + البطاقات + Micro-interactions + ألوان accent إضافية.
- **UX**: Command Palette (⌘K) + Quick Filters في Hero + Compare drawer أحلى + Skeleton/Empty states أحلى.

الموقع حالياً (Tayeh Lumen): teal primary + amber accent + خلفية بيضاء ناعمة. مرتب وresponsive لكن "هادئ جداً" — يفتقد للحيوية البصرية.

## ما سيتغير

### ١. نظام ألوان موسّع (`src/index.css` + `tailwind.config.ts`)
نظام multi-accent مدروس لتمييز الأقسام:
```
--accent-violet: 262 83% 58%;   /* للـ brands/premium */
--accent-rose:   340 82% 60%;   /* للـ deals/تخفيضات */
--accent-emerald: 158 64% 45%;  /* للـ verified/trust */
--accent-amber:  38 92% 50%;    /* للـ CTAs (موجود) */
--accent-cyan:   190 90% 50%;   /* للـ tech/categories */
```
لكل لون `-soft` variant + gradient pair. يستخدم بحكمة (لون لكل نوع محتوى).

### ٢. Animations & Motion جديدة
- `aurora` — gradient متحرك بطيء للخلفيات
- `shimmer-text` — لمعة على العناوين الرئيسية
- `tilt-3d` — hover tilt على البطاقات
- `bounce-arrow` — للأسهم في الـ CTAs
- `count-up` — للأرقام في الإحصائيات (hook + animation)
- `reveal-up` — scroll-triggered fade up

### ٣. Hero محسّن (`HeroBanner.tsx`)
- خلفية aurora متحركة (gradient mesh + blob shapes)
- العنوان بـ gradient متعدد الألوان (teal → violet → amber)
- **Quick Filter pills** فوق البحث: "مفتوح الآن" · "بـ ٥ نجوم" · "يوصّل" · "وكيل رسمي"
- إحصائيات بـ count-up animation
- شريط trust signals صغير

### ٤. ShopCard / BrandCard / ProductCard
- **3D tilt subtle** عند الـ hover (CSS-only)
- **Gradient ribbon** للزاوية ("⭐ مميز" / "🔥 رائج" / "✓ موثق")
- **Color-coded badges** حسب الفئة (computing=cyan, phones=violet, gaming=rose)
- **Image zoom + overlay shimmer**
- Map pin بـ pulse للـ "موقع محدد"

### ٥. Command Palette جديد (`src/components/CommandPalette.tsx`)
- يفتح بـ `⌘K` / `Ctrl+K` من أي صفحة
- يستخدم `cmdk` (موجود في shadcn `Command`)
- مجموعات: محلات · براندات · محافظات · شوارع · صفحات سريعة
- recent searches في localStorage

### ٦. Compare Drawer محسّن (`CompareBar.tsx`)
- drawer سفلي مع backdrop blur + slide-in-up
- Empty state مع illustration بسيطة
- لما يصير ٢+ محلات: زر "قارن الآن" بـ pulse

### ٧. Skeletons + Empty States
- shimmer effect متقن
- SVG illustrations بسيطة (CSS-only) + microcopy لطيف + CTA واضح

### ٨. Micro-interactions
- Buttons: ripple خفيف
- Links: underline RTL-aware
- Tabs: indicator متحرك
- أرقام: count-up عند ظهور الـ viewport
- أيقونات: rotate/translate عند الـ hover

### ٩. Section Dividers ديناميكية
- gradient lines (transparent → primary → transparent)
- accent dots صغيرة
- SVG wave divider بين الأقسام الكبيرة

### ١٠. CategoryCircles & MetricsStrip
- gradient ring عند hover + label bounce
- MetricsStrip بـ count-up + gradient mesh background

## خارج النطاق
- لا تغيير في data/routing/business logic
- لا تغيير في صفحات الأدمن
- صفحات داخلية (CityPage, ShopView, Brand) تستفيد تلقائياً من المكونات المشتركة بدون تعديل مباشر

## مراحل التنفيذ
1. نظام الألوان والـ animations (index.css + tailwind.config.ts)
2. Hero + Quick Filters + count-up
3. البطاقات الثلاث بـ tilt + ribbons + color-coded badges
4. Command Palette
5. Compare Drawer + Skeletons + Empty States
6. Micro-interactions عامة + Dividers
7. QA على mobile (390px) + desktop (1280px)

