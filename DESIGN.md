# Design Brief: حاير (Hayer)

## 1. ملخص المشروع
حاير هو منتج RTL عربي موجّه للمستخدم العراقي، وظيفته الأساسية أن يكون **أطلس إلكترونيات + دليل محلات + محرك مقارنة أسعار** في مكان واحد.  
هو ليس متجر checkout تقليدي، بل **طبقة قرار واكتشاف وثقة** تساعد المستخدم يعرف:

- وين يلقى المنتج
- شكد سعره عبر أكثر من محل
- أي محل أوثق
- وين موقعه
- شلون يتواصل وياه بسرعة

الفكرة الأساسية: بدل ما المستخدم يضيع بين Google Maps، صفحات فيسبوك، مواقع متاجر متفرقة، أو يطلع للسوق بدون صورة واضحة، حاير يجمع القراءة المهمة داخل تجربة واحدة سريعة ومريحة للموبايل.

## 2. المشكلة التي يحلها
- سوق الإلكترونيات في العراق كبير لكن معلوماته مشتتة.
- المستخدم غالباً ما يعرف إذا السعر مناسب أو لا إلا بعد جولات طويلة واتصالات متعددة.
- الثقة بالمحل عامل حاسم، لكن التقييمات، الوكلاء الرسميين، وروابط الخرائط ليست دائماً مجمّعة بشكل واضح.
- الوصول للمعلومة لازم يكون سريع جداً لأن الاستخدام غالباً يصير من الموبايل قبل الخروج أو أثناء الحركة بين الأسواق.

## 3. هدف المنتج
- تقليل الوقت بين “أريد هذا المنتج” و “عرفت وين أشتريه”.
- رفع الثقة بالقرار الشرائي عبر إظهار الأسعار، التقييمات، الاعتماد، والموقع في نفس الواجهة.
- تقديم تجربة تبدو محلية للعراق، عملية، وراقية بصرياً بدون ما تتحول إلى dashboard مزدحم أو متجر generic.

## 4. منو المستخدم؟
- متسوق يريد أفضل سعر لموبايل، لابتوب، شاشة، إكسسوار، أو قطعة PC.
- مستخدم يريد محل موثوق قريب منه داخل مدينة معينة.
- شخص يريد يقارن بين عدة محلات قبل ما يروح للسوق.
- مستخدم يهتم بالوكيل الرسمي والضمان أكثر من مجرد السعر.
- مستخدم عربي يفضّل واجهة واضحة، سريعة، ومبنية حول البحث والخرائط وليس حول السلة والدفع.

## 5. نطاق المنتج الحالي
يوجد داخل المشروع مستويان من البيانات:

### Directory Layer
طبقة الدليل الميداني للمحلات داخل المدن والأسواق العراقية.

- أكثر من `3000` إدخال محلات
- حالياً `3096` محل ضمن `10` محافظات
- أمثلة مدن: بغداد، أربيل، البصرة، الموصل، النجف، كربلاء، السليمانية، كركوك، ديالى، الناصرية
- صفحات مخصصة لأسواق بغداد المهمة مثل: شارع الصناعة وشارع الربيعي

### Catalog Layer
طبقة الفهرسة السعرية للمنتجات من مواقع المتاجر والمصادر المتصلة.

- حتى تاريخ `22 أبريل 2026`: `163` متجر مفهرس فعلياً
- حتى تاريخ `22 أبريل 2026`: `153,192` منتج مفهرس
- الواجهة تعرض نتائج موحّدة للبحث، تفاصيل منتج، وأفضل العروض عبر عدة متاجر

### Signals Layer
طبقة الثقة والقرار:

- تقييمات ومراجعات
- حالة التوثيق
- وكيل رسمي أو غير رسمي
- روابط Google Maps
- ساعات العمل
- صور المحل أو المنتج
- حداثة آخر مزامنة

## 6. ما الذي يميز حاير؟
- **بحث موحّد**: نفس المكان للبحث عن المنتجات أو المحلات.
- **مقارنة واضحة**: قراءة سريعة لأقل سعر، أعلى سعر، وعدد العروض.
- **ثقة ظاهرة**: badge للتوثيق، الوكيل الرسمي، التقييم، وحداثة البيانات.
- **أولوية للموقع**: الخرائط، الاتجاهات، المدينة، والشارع جزء أساسي من التجربة.
- **سياق عراقي محلي**: السوق ليس abstract marketplace، بل مشاهد فعلية من بغداد والمحافظات.
- **Mobile-first RTL**: كل شيء مبني للمسح السريع بالإبهام.

## 7. الصفحات الأساسية التي يجب أن يفهمها التصميم

### Home
الواجهة الرئيسية يجب أن تشعر مثل “بوابة سوق إلكترونيات العراق”.

تحتوي على:
- Hero كبير مع بحث بارز جداً
- مداخل سريعة إلى شارع الصناعة، شارع الربيعي، وكل المحافظات
- فئات رئيسية
- أقسام منتجات مثل التخفيضات، الأكثر تقييماً، والإضافات الحديثة
- محلات مختارة
- وكلاء رسميون
- مؤشرات سريعة عن حجم الدليل والتحديث

### Unified Search
أهم شاشة وظيفية في المنتج.

تحتوي على:
- بحث مباشر مع autocomplete
- تبويبين واضحين: `Products` و `Shops`
- Filters و sort
- Chips للحالة النشطة
- نتائج سهلة المسح بصرياً
- أولوية لإظهار السعر والثقة والموقع

### Product Detail
صفحة قرار شرائي، وليست مجرد صفحة وصف منتج.

تحتوي على:
- صورة/معرض
- أقل سعر وأعلى سعر
- أفضل عرض الآن
- عدد المتاجر التي تقارن عليها
- عدد المصادر الموثقة
- مواصفات مختصرة
- جدول/قائمة عروض من عدة متاجر

### Street Pages
صفحات خاصة لأسواق بغداد التقنية:

- شارع الصناعة
- شارع الربيعي

هذه الصفحات يجب أن تبدو مثل **market guide** وليس archive عادي.

### Iraq / Cities
أطلس مدن ومحافظات.

- مدخل بصري للمحافظات
- كل مدينة لها هويتها لكن ضمن نفس النظام
- يجب أن تشعر أن المنتج يغطي العراق فعلاً، لا بغداد فقط

### Shop Detail
صفحة محل تركّز على:

- صورة المحل
- العنوان
- الخرائط
- الهاتف / واتساب
- ساعات العمل
- تقييمات
- المنتجات المرتبطة
- إشارات الثقة

### Brands / Official Dealers
صفحات تبني الثقة للمستخدم الذي يبحث عن المصدر الرسمي والضمان.

## 8. قواعد UX الأساسية
- الواجهة **RTL أولاً**.
- البحث هو الـ primary action في كل مكان.
- كل شاشة لازم تختصر المسافة إلى المحل أو المنتج.
- الثقة لازم تظهر خلال أول نظرة: rating، verified، official dealer، freshness.
- لا يوجد cart أو checkout كمحور بصري.
- CTA الأساسية عادة تكون واحدة فقط: بحث، فتح منتج، فتح خرائط، أو الذهاب إلى عرض الشراء.
- الـ hierarchy لازم يخدم scanning السريع، مو القراءة الطويلة.
- الموبايل هو الحالة الأساسية، والديسكتوب يأتي كتوسعة وليس العكس.

## 9. Visual Theme & Atmosphere
نريد واجهة تبدو مثل:

**Editorial Market Atlas**  
خفيفة، نظيفة، موثوقة، محلية، ومودرن.  
ليست SaaS dashboard، وليست متجر e-commerce تقليدي، وليست واجهة neon tech.

### Desired Mood
- هادئة ومريحة للعين
- دقيقة وواثقة
- محلية ولكن راقية
- عملية أكثر من كونها decorative
- دافئة قليلاً في السطوح، باردة قليلاً في الaccent الأساسي

### Density / Variance / Motion
- Density: `4/10`
- Variance: `6/10`
- Motion: `4/10`

يعني: مساحة بيضاء جيدة، composition غير ممل، وحركة خفيفة محسوبة.

## 10. Color Palette & Roles
هذه palette مناسبة جداً للمشروع لأنها نظيفة، حديثة، مريحة، وتبني الثقة بدون برودة زائدة:

- **Paper Canvas** `#F6F3EE`
  الخلفية العامة. تعطي إحساس warm clean بدل الأبيض الطبي القاسي.

- **Pure Surface** `#FFFFFF`
  البطاقات، الصناديق، panels، وداخل الـ sheets.

- **Whisper Border** `#E3DDD3`
  الحدود والخطوط الدقيقة والفواصل.

- **Ink Navy** `#18212B`
  النص الأساسي، الهيدر، والعناوين الثقيلة.

- **Slate Meta** `#667085`
  النص الثانوي، الوصف، metadata، labels.

- **Calm Teal** `#1F7A7A`
  اللون الأساسي الوحيد للهوية: CTA، active states، focus ring، links، selected chips.

- **Soft Teal Wash** `#E7F3F2`
  hover states، selected backgrounds، subtle highlights.

- **Trust Sage** `#2F7D68`
  استخدام دلالي محدود فقط لـ verified/success.

- **Clay Amber** `#B86A3E`
  استخدام دلالي محدود فقط للتحذير أو price-change emphasis، وليس كلون brand أساسي.

### Color Strategy
- استخدم `Calm Teal` كلون accent رئيسي وحيد.
- استخدم `Trust Sage` و `Clay Amber` فقط للحالات الدلالية.
- لا تستخدم purple أو neon blue أو gradients مشبعة.
- لا تستخدم pure black.

## 11. Typography
يفضّل في الـ UI sketch:

- **Arabic UI / Headings:** `SF Arabic`
- **Latin / Numbers / Mixed Labels:** `SF Pro`
- **Mono / Technical Meta:** `SF Pro`

### Typography Rules
- العناوين واضحة ومشدودة tracking لكن ليست صاخبة.
- النص الثانوي مريح للقراءة مع line-height سخية.
- الأرقام والسعر لازم تكون prominent وواضحة جداً.
- لا تستخدم خطوط generic أو rounded playful fonts.

## 12. Component Styling
- **Search Bar:** كبيرة، نظيفة، round لكن مو bubble toy، مع icon واضح وplaceholder مختصر.
- **Buttons:** primary ممتلئ بالـ teal، secondary outline أو ghost، active state tactile بسيط.
- **Cards:** rounded generous، shadows خفيفة جداً، والاعتماد الأكبر على border + spacing بدل الظلال الثقيلة.
- **Trust Badges:** صغيرة، نظيفة، semantic، ولا تتحول إلى زحمة stickers.
- **Product Cards:** الصورة، الاسم، أقل سعر، عدد العروض، وثقة المتجر هي الأولوية.
- **Shop Cards:** اسم المحل، التقييم، المدينة/الشارع، واتساب/خرائط كأفعال مباشرة.
- **Section Headers:** editorial، واضحة، مع kicker صغير فوق العنوان.
- **Loaders:** skeletons بنفس أبعاد التخطيط. لا spinner عام.

## 13. Layout Principles
- Hero غير centered بشكل ممل. الأفضل split أو layered composition مع search dominant.
- لا تستخدم صفوف generic من 3 بطاقات متساوية كحل افتراضي لكل شيء.
- لازم يكون هناك rhythm بين sections: بحث، وجهات، فئات، منتجات، محلات، مدن.
- الصور تستخدم لبناء الجو، لكن بدون overlap فوضوي فوق النص.
- كل شيء يجب أن ينهار clean إلى عمود واحد على الموبايل.
- touch targets لا تقل عن `44px`.

## 14. What The UI Should Feel Like
إذا أردنا وصفاً سريعاً جداً:

> حاير يجب أن يشعر كأنه مزيج بين دليل مدن ذكي، مجلّة تقنية محلية، ومحرك مقارنة أسعار موثوق للموبايل.

## 15. Anti-Patterns (Banned)
- لا purple neon
- لا dark cyberpunk look
- لا glassmorphism مبالغ
- لا dashboard clutter
- لا tables ثقيلة في أول نظرة
- لا hero centered generic
- لا 3-column cards متطابقة في كل section
- لا gradients صاخبة على النصوص الكبيرة
- لا مبالغة في الأيقونات أو stickers
- لا copy عام من نوع “Next-gen / Seamless / Elevate”
- لا أي vibe يشبه template SaaS أجنبي غير محلي

## 16. Screens To Generate First In Stitch
ابدأ بهذه الشاشات:

1. Home page
2. Unified search results
3. Product detail page
4. Shop detail page
5. Iraq cities atlas page

## 17. Ready Prompt For Stitch
Design a premium mobile-first RTL Arabic interface for an Iraqi electronics discovery platform called "حاير". The product is not a checkout marketplace. It is a trusted electronics market atlas that helps users compare prices, discover stores, verify trust signals, and open maps or contact stores quickly. Use a light theme only. The visual mood should feel like an editorial market guide: warm paper-like backgrounds, deep ink text, one calm teal accent, clean spacing, strong hierarchy, and subtle motion. Prioritize search, product comparison, store trust, city navigation, and Baghdad market streets like شارع الصناعة and شارع الربيعي. Avoid neon, purple gradients, generic SaaS cards, dark mode aesthetics, and cluttered dashboards. Make the UI elegant, local, calm, and highly scannable on mobile.
