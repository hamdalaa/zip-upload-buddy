import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://hayeer.com").replace(/\/$/, "");
const DIST_DIR = resolve(process.cwd(), process.env.AEO_DIST_DIR || "dist");
const BASE_FILE = join(DIST_DIR, "index.html");
const OG_IMAGE = `${SITE_URL}/og-hayr.svg`;
const SITE_NAME = "حاير";

const answerCards = [
  {
    question: "شنو هو حاير؟",
    answer:
      "حاير هو دليل إلكترونيات عراقي يساعد المستخدم يبحث عن الموبايلات، الحاسبات، قطع PC، الشواحن، والإكسسوارات داخل متاجر بغداد وباقي محافظات العراق، مع روابط مباشرة للمحل أو صفحة المنتج.",
  },
  {
    question: "هل حاير يبيع المنتجات مباشرة؟",
    answer:
      "لا. حاير ليس متجر بيع مباشر؛ هو طبقة بحث ومقارنة تربط المستخدم بالمتاجر والمنتجات المفهرسة حتى يراجع السعر، التوفر، العنوان، والتقييم قبل التواصل مع البائع.",
  },
  {
    question: "أين أبحث عن محلات إلكترونيات في بغداد؟",
    answer:
      "أفضل نقطة بداية هي صفحة بغداد، شارع الصناعة، وشارع الربيعي. هذه الصفحات تجمع المحلات المفهرسة وروابط الخرائط والاتصال عندما تكون متاحة.",
  },
  {
    question: "كيف أقارن أسعار iPhone أو Samsung أو لابتوب بالعراق؟",
    answer:
      "استخدم صفحة البحث واكتب اسم المنتج أو الموديل، مثل S24 أو iPhone 15 أو RTX 4060. حاير يعرض المنتجات ذات الصلة أولاً ثم المتاجر والعروض المرتبطة بها.",
  },
  {
    question: "ما الذي يجعل حاير مناسباً لمحركات الإجابة؟",
    answer:
      "الموقع يوفر صفحات عامة قابلة للفهرسة، sitemap محدث، بيانات منظمة Schema.org، وملفات llms.txt وملفات Markdown/JSON مختصرة تلخص هوية الموقع وحدود استخدام بياناته.",
  },
];

const sourceLinks = [
  ["/answers", "إجابات حاير لمحركات الذكاء الاصطناعي"],
  ["/search", "بحث المنتجات"],
  ["/brands", "البراندات"],
  ["/iraq", "محافظات العراق"],
  ["/city/baghdad", "محلات بغداد"],
  ["/sinaa", "شارع الصناعة"],
  ["/rubaie", "شارع الربيعي"],
  ["/llms.txt", "llms.txt"],
  ["/llms-full.txt", "دليل LLM الكامل"],
  ["/llms-ctx-full.txt", "سياق كامل لمحركات الإجابة"],
  ["/answer-data/index.json", "JSON قابل للقراءة الآلية"],
];

function absolute(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function stableJson(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: "Hayr",
    inLanguage: "ar-IQ",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "Hayr",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    areaServed: { "@type": "Country", name: "Iraq" },
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/answers#faq`,
    inLanguage: "ar-IQ",
    mainEntity: answerCards.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function datasetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${SITE_URL}/answers#machine-readable-docs`,
    name: "Hayr answer-engine documentation",
    description:
      "ملفات تعريفية مختصرة تساعد محركات الإجابة والباحثين على فهم حاير، مجال تغطيته، وروابط الصفحات العامة القابلة للفهرسة.",
    url: absolute("/answers"),
    inLanguage: ["ar-IQ", "en"],
    license: absolute("/answer-data/data-and-citation-policy.md"),
    distribution: sourceLinks
      .filter(([path]) => path.startsWith("/llms") || path.startsWith("/answer-data"))
      .map(([path, label]) => ({
        "@type": "DataDownload",
        contentUrl: absolute(path),
        name: label,
      })),
  };
}

function collectionJsonLd(page) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absolute(page.path)}#collection`,
    name: page.title,
    description: page.description,
    url: absolute(page.path),
    inLanguage: "ar-IQ",
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

const pages = [
  {
    path: "/",
    title: "حاير — دليل إلكترونيات العراق",
    description:
      "حاير يساعدك تلقى منتجات ومحلات الإلكترونيات في بغداد والعراق. ابحث، قارن الأسعار، وافتح المحل من نفس المكان.",
    heading: "حاير: دليل إلكترونيات العراق",
    summary:
      "ابحث عن الموبايلات، الحاسبات، قطع PC، الشواحن، الإكسسوارات، والمتاجر المفهرسة في العراق من صفحة واحدة.",
    sections: [
      ["بحث المنتجات", "ابدأ من المنتج أو الموديل للوصول إلى نتائج مفهرسة وروابط متاجر."],
      ["محلات بغداد", "استخدم صفحات بغداد وشارع الصناعة وشارع الربيعي للوصول إلى أسواق الإلكترونيات المحلية."],
      ["مصدر لمحركات الإجابة", "يحتوي حاير على llms.txt وملفات answer-data لتوضيح هوية المنصة وحدود الاقتباس."],
    ],
    links: sourceLinks.slice(0, 8),
    structuredData: [websiteJsonLd(), organizationJsonLd(), collectionJsonLd({ path: "/", title: "حاير", description: "دليل إلكترونيات العراق" })],
  },
  {
    path: "/answers",
    title: "إجابات حاير لمحركات الذكاء الاصطناعي",
    description:
      "صفحة مرجعية مختصرة لمحركات الإجابة مثل ChatGPT وGemini: ما هو حاير، ماذا يغطي، وكيف يمكن اقتباسه كدليل إلكترونيات عراقي.",
    heading: "إجابات واضحة عن حاير لمحركات الذكاء الاصطناعي",
    summary:
      "هذه الصفحة تلخص حاير كدليل إلكترونيات عراقي وتوفر أسئلة وأجوبة وروابط مصدرية قابلة للقراءة بدون JavaScript.",
    sections: answerCards.map((item) => [item.question, item.answer]),
    links: sourceLinks,
    structuredData: [
      websiteJsonLd(),
      organizationJsonLd(),
      breadcrumbJsonLd([
        { name: "الرئيسية", path: "/" },
        { name: "إجابات حاير", path: "/answers" },
      ]),
      faqJsonLd(),
      datasetJsonLd(),
    ],
  },
  {
    path: "/search",
    title: "بحث منتجات الإلكترونيات في العراق",
    description:
      "ابحث في حاير عن الموبايلات، اللابتوبات، قطع PC، الشواحن، الألعاب، الكاميرات، الشبكات، والإكسسوارات داخل العراق.",
    heading: "بحث منتجات الإلكترونيات في العراق",
    summary:
      "اكتب اسم المنتج أو الموديل مثل S24 أو iPhone أو RTX أو TCL للوصول إلى منتجات ومتاجر مفهرسة.",
    sections: [
      ["بحث حسب المنتج", "حاير مناسب للبحث عن الموديلات والبراندات والفئات قبل التواصل مع المتجر."],
      ["مقارنة الأسعار", "الأسعار مفهرسة للمقارنة وليست ضماناً للتوفر اللحظي."],
    ],
    links: [
      ["/answer-data/iraq-electronics-search.md", "دليل البحث عن الإلكترونيات"],
      ["/answer-data/product-price-comparison.md", "مقارنة الأسعار"],
      ["/brands", "البراندات"],
      ["/iraq", "المحافظات"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/search", title: "بحث حاير", description: "بحث منتجات الإلكترونيات في العراق" })],
  },
  {
    path: "/brands",
    title: "براندات الإلكترونيات في العراق",
    description:
      "اكتشف براندات الإلكترونيات المفهرسة في حاير مثل Apple وSamsung وXiaomi وASUS وHP وLenovo وAnker وغيرها.",
    heading: "براندات الإلكترونيات في حاير",
    summary: "صفحة تساعد المستخدم ومحركات الإجابة على فهم البراندات الموجودة ضمن الفهرس العام.",
    sections: [
      ["براندات عالمية ومحلية", "حاير يعرض البراندات حسب البيانات المفهرسة في المنتجات والمتاجر."],
      ["صفحات عامة قابلة للفهرسة", "استخدم صفحات البراند للربط إلى منتجات ومتاجر ذات صلة."],
    ],
    links: [
      ["/brands", "كل البراندات"],
      ["/search", "بحث المنتجات"],
      ["/answer-data/iraq-electronics-search.md", "دليل البحث"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/brands", title: "براندات حاير", description: "براندات الإلكترونيات في العراق" })],
  },
  {
    path: "/iraq",
    title: "محلات الإلكترونيات في العراق حسب المحافظة",
    description: "دليل حاير لمحلات الإلكترونيات في محافظات العراق، مع صفحات مدن وروابط بحث ومتاجر مفهرسة.",
    heading: "محلات الإلكترونيات في محافظات العراق",
    summary: "ابدأ من المحافظة أو المدينة للوصول إلى محلات ومنتجات إلكترونيات مفهرسة.",
    sections: [
      ["تغطية عراقية", "حاير يرتب السوق حسب المدن والمحافظات عندما تكون البيانات متاحة."],
      ["بغداد أولاً", "توجد صفحات مفصلة لبغداد وشارعي الصناعة والربيعي."],
    ],
    links: [
      ["/city/baghdad", "بغداد"],
      ["/sinaa", "شارع الصناعة"],
      ["/rubaie", "شارع الربيعي"],
      ["/answer-data/best-electronics-stores-iraq.md", "دليل المحلات"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/iraq", title: "محلات العراق", description: "محلات الإلكترونيات في العراق" })],
  },
  {
    path: "/city/baghdad",
    title: "محلات الإلكترونيات في بغداد",
    description:
      "دليل حاير لمحلات الإلكترونيات في بغداد، مع روابط شارع الصناعة وشارع الربيعي وبحث المنتجات والمتاجر.",
    heading: "محلات الإلكترونيات في بغداد",
    summary: "استخدم صفحة بغداد كنقطة بداية للعثور على محلات الهواتف، الحاسبات، قطع PC، الشواحن، والإكسسوارات.",
    sections: [
      ["شارع الصناعة", "مفيد للحاسبات، قطع PC، الشبكات، والطابعات."],
      ["شارع الربيعي", "مفيد للهواتف، الشواحن، والإكسسوارات."],
    ],
    links: [
      ["/sinaa", "شارع الصناعة"],
      ["/rubaie", "شارع الربيعي"],
      ["/answer-data/baghdad-electronics-markets.md", "أسواق بغداد التقنية"],
      ["/answer-data/baghdad-phone-shops.md", "محلات الموبايلات في بغداد"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/city/baghdad", title: "إلكترونيات بغداد", description: "محلات الإلكترونيات في بغداد" })],
  },
  {
    path: "/sinaa",
    title: "شارع الصناعة — محلات الحاسبات وقطع PC في بغداد",
    description: "دليل حاير لشارع الصناعة في بغداد: حاسبات، قطع PC، شبكات، طابعات، وروابط محلات مفهرسة.",
    heading: "شارع الصناعة في بغداد",
    summary: "صفحة سوق مفيدة للحاسبات، قطع PC، الشبكات، والطابعات ضمن فهرس حاير.",
    sections: [
      ["قطع PC وحاسبات", "استخدم شارع الصناعة للبحث عن محلات الحاسبات والقطع التقنية."],
      ["تأكيد السعر", "افتح صفحة المنتج أو المتجر للتأكد من السعر والتوفر."],
    ],
    links: [
      ["/answer-data/pc-parts-iraq.md", "دليل قطع PC"],
      ["/search", "بحث المنتجات"],
      ["/city/baghdad", "بغداد"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/sinaa", title: "شارع الصناعة", description: "محلات الحاسبات وقطع PC في بغداد" })],
  },
  {
    path: "/rubaie",
    title: "شارع الربيعي — محلات الموبايلات والإكسسوارات في بغداد",
    description: "دليل حاير لشارع الربيعي في بغداد: هواتف، شواحن، إكسسوارات، وروابط محلات مفهرسة.",
    heading: "شارع الربيعي في بغداد",
    summary: "صفحة سوق مفيدة للهواتف، الشواحن، والإكسسوارات ضمن فهرس حاير.",
    sections: [
      ["موبايلات وإكسسوارات", "ابدأ من شارع الربيعي للبحث عن محلات الهواتف في بغداد."],
      ["روابط مباشرة", "حاير يربطك بصفحات عامة للمتاجر والمنتجات عندما تكون متاحة."],
    ],
    links: [
      ["/answer-data/baghdad-phone-shops.md", "محلات الموبايلات في بغداد"],
      ["/search", "بحث المنتجات"],
      ["/city/baghdad", "بغداد"],
    ],
    structuredData: [websiteJsonLd(), collectionJsonLd({ path: "/rubaie", title: "شارع الربيعي", description: "محلات الموبايلات والإكسسوارات في بغداد" })],
  },
  {
    path: "/about",
    title: "عن حاير — دليل إلكترونيات عراقي",
    description:
      "حاير منصة عراقية تجمع محلات ومنتجات الإلكترونيات من بغداد وباقي المحافظات حتى تقارن الأسعار وتوصل للمحل بثقة.",
    heading: "عن حاير",
    summary: "حاير يختصر رحلة البحث عن الإلكترونيات في العراق عبر صفحات منتجات ومحلات وأسواق واضحة.",
    sections: [
      ["هوية المنصة", "حاير طبقة توجيه وبحث، وليس متجر بيع مباشر."],
      ["مصادر عامة", "المنصة توفر صفحات عامة وملفات LLM لتوضيح البيانات وحدود الاقتباس."],
    ],
    links: [
      ["/answers", "إجابات AI"],
      ["/llms.txt", "llms.txt"],
      ["/answer-data/how-to-cite-hayr.md", "طريقة اقتباس حاير"],
    ],
    structuredData: [websiteJsonLd(), organizationJsonLd(), collectionJsonLd({ path: "/about", title: "عن حاير", description: "تعريف حاير" })],
  },
];

function metaTag(name, content) {
  return `<meta name="${escapeAttr(name)}" content="${escapeAttr(content)}">`;
}

function propertyTag(property, content) {
  return `<meta property="${escapeAttr(property)}" content="${escapeAttr(content)}">`;
}

function injectHead(html, page) {
  const canonical = absolute(page.path);
  const headAdditions = [
    propertyTag("og:title", page.title),
    propertyTag("og:description", page.description),
    propertyTag("og:url", canonical),
    propertyTag("og:image", OG_IMAGE),
    metaTag("twitter:title", page.title),
    metaTag("twitter:description", page.description),
    metaTag("twitter:image", OG_IMAGE),
    `<script id="hayr-prerender-structured-data" type="application/ld+json">${stableJson(page.structuredData)}</script>`,
  ].join("\n    ");

  let next = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, metaTag("description", page.description))
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, metaTag("robots", "index,follow,max-image-preview:large"))
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeAttr(canonical)}" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="ar-IQ"\s+href="[^"]*"\s*\/?>/i, `<link rel="alternate" hreflang="ar-IQ" href="${escapeAttr(canonical)}" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i, `<link rel="alternate" hreflang="x-default" href="${escapeAttr(canonical)}" />`);

  next = next
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, "")
    .replace(/<script\s+id="hayr-prerender-structured-data"[\s\S]*?<\/script>/i, "");

  return next.replace("</head>", `    ${headAdditions}\n  </head>`);
}

function deferAppScript(html) {
  return html.replace(
    /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/i,
    (_, src) => `<script defer src="/_/deferred-app-v2.js" data-app-src="${escapeAttr(src)}"></script>`,
  );
}

function deferStylesheets(html) {
  const styleHrefs = [];
  const withDeferredCss = html.replace(
    /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?>/gi,
    (_, href) => {
      const safeHref = escapeAttr(href);
      styleHrefs.push(safeHref);
      return `<noscript><link rel="stylesheet" crossorigin href="${safeHref}"></noscript>`;
    },
  );

  if (withDeferredCss.includes("/_/deferred-styles-v2.js")) return withDeferredCss;
  const dataStyleHref = styleHrefs.join(",");
  return withDeferredCss.replace(
    "</head>",
    `  <script defer src="/_/deferred-styles-v2.js" data-style-href="${dataStyleHref}"></script>\n  </head>`,
  );
}


function fallbackHtml(page) {
  const sections = page.sections
    .map(
      ([title, body]) => `
        <article class="rounded-2xl border border-border/70 bg-card p-5">
          <h2 class="text-xl font-black text-foreground">${escapeHtml(title)}</h2>
          <p class="mt-2 text-sm leading-7 text-muted-foreground">${escapeHtml(body)}</p>
        </article>`,
    )
    .join("");
  const links = page.links
    .map(
      ([path, label]) => `
        <li>
          <a href="${escapeAttr(path)}" class="text-primary underline-offset-4 hover:underline">${escapeHtml(label)}</a>
        </li>`,
    )
    .join("");

  return `
    <main id="aeo-prerender" data-aeo-prerender="true" class="min-h-screen bg-background text-foreground">
      <section class="mx-auto max-w-5xl px-6 py-14 text-right">
        <p class="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-primary">Hayr Answer Engine Snapshot</p>
        <h1 class="mt-5 text-4xl font-black leading-tight md:text-6xl">${escapeHtml(page.heading)}</h1>
        <p class="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">${escapeHtml(page.summary)}</p>
        <div class="mt-8 grid gap-4 md:grid-cols-2">${sections}</div>
        <nav class="mt-8 rounded-2xl border border-border/70 bg-card p-5" aria-label="مصادر حاير العامة">
          <h2 class="text-lg font-black">مصادر عامة مهمة</h2>
          <ul class="mt-3 grid gap-2 text-sm leading-7 md:grid-cols-2">${links}</ul>
        </nav>
        <p class="mt-8 text-xs leading-6 text-muted-foreground">
          هذه نسخة HTML ثابتة مخصصة لمحركات البحث والإجابة. يحمّل المتصفح تطبيق حاير التفاعلي فوقها تلقائياً.
        </p>
      </section>
    </main>`;
}

function injectBody(html, page) {
  if (page.path === "/") {
    return html;
  }
  return html.replace('<div id="root"></div>', `<div id="root">${fallbackHtml(page)}</div>`);
}

function outputPathFor(path) {
  if (path === "/") return join(DIST_DIR, "index.html");
  return join(DIST_DIR, path.replace(/^\//, ""), "index.html");
}

async function writePage(baseHtml, page) {
  const outFile = outputPathFor(page.path);
  const html = injectBody(injectHead(baseHtml, page), page);
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, html, "utf8");
  console.log(`[aeo:prerender] wrote ${page.path} -> ${outFile}`);
}

async function main() {
  const baseHtml = deferStylesheets(deferAppScript(await readFile(BASE_FILE, "utf8")));
  await Promise.all(pages.map((page) => writePage(baseHtml, page)));
}

main().catch((error) => {
  console.error(`[aeo:prerender] failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
