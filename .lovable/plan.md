
# تِيه — دليل إلكترونيات بغداد (MVP)

## Stack & foundations
- React + Vite + Tailwind, RTL-first (`<html dir="rtl" lang="ar">`)
- **Lovable Cloud** (Postgres) for shops, shop_sources, products_index, brands_dealers, crawl_runs
- **Firecrawl connector** (edge function) for shop website scraping — manual per-shop trigger from admin
- Fonts: IBM Plex Sans Arabic (UI) + Space Grotesk (numerals/Latin), loaded via Google Fonts
- Dark design system in `index.css` + `tailwind.config.ts`:
  - bg `#0B1020` charcoal-blue, surface `#121833`, border `#1E2747`
  - primary accent warm orange `#FF7A1A`, secondary cyan `#22D3EE`
  - subtle radial/grid background atmosphere on hero
- **Admin gate:** single shared passcode (client-side prompt, stored in sessionStorage). Honest disclaimer: not real security, fine for MVP demo.

## Routes
- `/` Home
- `/results` Search results
- `/shop-view/:shopId` Shop detail
- `/brand/:slug` Brand/dealer page
- `/dashboard` Admin (passcode-gated)

## Home page
- Top nav (RTL, logo right): الرئيسية · البحث · الوكلاء · الأدمن
- Hero: eyebrow "شارع الصناعة + شارع الربيعي", big Arabic headline, supporting text, then a single panel with **search input + area select + category select + CTA "ابحث بكل المحلات"** and secondary "افتح الداشبورد"
- 3-up metrics strip: shops count · "فهرس محلي، بدون scraping وقت البحث" · "آخر تحديث منذ X"
- Quick query chips: RTX 4060, RX 7800 XT, iPhone 15 Pro Max case, Anker 65W, Wi-Fi 6 router, Power Bank 20000mAh
- Featured shops row (verified first)
- Brands teaser (Apple, Samsung, ASUS, Anker)

## Results page (`/results?q&area&category`)
- Sticky search/filter bar with current q, area, category, sort (relevance / price / freshness)
- **Auto-grouped comparison blocks**: results normalized to the same product (token + brand-aware) collapse into one block showing each shop side-by-side (price, area, last crawled, links). Ungrouped results appear below.
- Each row: product name, shop, area, category, brand, price/priceText, "آخر فهرسة منذ X", buttons: فتح المنتج · فتح المحل · خرائط Google
- Side panel: similar/suggested queries
- Empty state with the exact Arabic copy from the brief
- Stale results (>30 days) get a subtle "قديم" badge

## Shop detail (`/shop-view/:shopId`)
- Header: name, area chip, category chip, verification badge
- Action buttons: خرائط Google · الموقع · هاتف · واتساب (only render if present)
- Indexed products list with disclaimer: "الأسعار والتوفر مبنية على آخر فهرسة، مو لحظية"
- Crawl/source history table (from shop_sources)
- "بدون فهرسة منتجات" empty state for shops without a website

## Brand page (`/brand/:slug`)
- Brand + dealer name, official website, verification state, covered cities, coverage description
- Related indexed products from the platform (filtered by brand)

## Admin dashboard (`/dashboard`)
1. **Telemetry**: total shops, indexed products, indexed shops, crawl success rate, last seed run, last crawl run
2. **Area scans**: "Run area scan: الصناعة" / "Run area scan: الربيعي" — for MVP these are simulated (log a run + bump timestamps) since Google Maps scraping isn't viable
3. **Recrawl tools**: shop multi-select + "Recrawl selected" → calls Firecrawl edge function on each shop's website, parses product-like results, upserts into `products_index`. Per-shop single recrawl button too.
4. **Manual shop creation**: name, area, category, googleMapsUrl, website, phone, whatsapp, notes
5. **Verification**: toggle verified on a shop
6. **Duplicate management**: surface candidates (same googleMapsUrl, or normalized name similarity within same area) → merge primary+secondary
7. **Crawl runs log** table

## Data model (Postgres tables)
`shops`, `shop_sources`, `products_index`, `brands_dealers`, `crawl_runs` — exactly the fields from the brief, plus indexes on `products_index(shopId)`, `products_index(name)` for search, and `shops(area, category)`.

RLS: all tables readable by anon (this is a public directory); writes restricted via edge functions that check the admin passcode header. No user auth in MVP.

## Search & ranking (client-side over fetched index)
- Normalize query: lowercase, strip spaces (`rtx4060` ↔ `rtx 4060` ↔ `4060`), Arabic/English brand aliases
- Score: exact compact match (×5) + token overlap + brand match bonus + freshness bonus (decays after 14 days)
- Filter by area/category before ranking
- Hide results crawled >60 days ago unless sort=freshness explicitly asked

## Real scraping (Firecrawl edge function)
- Single edge function `recrawl-shop` takes `shopId`, fetches the shop's website with Firecrawl (`scrape` + `links` + `markdown`), runs a lightweight extractor for product-like patterns (name + price + url), upserts into `products_index`, writes a row to `crawl_runs` and updates `shop_sources.lastCrawledAt`
- Triggered only from admin, never on user search
- Will need the **Firecrawl connector** linked — I'll prompt for it during build

## Seed data (inserted via migration)
- 3 shops شارع الصناعة (Computing/PC Parts/Networking, one without website, one unverified)
- 3 shops شارع الربيعي (Phones/Chargers/Accessories)
- ~15 realistic products spanning ASUS Dual RTX 4060, MSI RTX 4070 Super, Ryzen 5 7600, TP-Link Archer AX3000, iPhone 15 Pro Max 256GB, Galaxy S24 Ultra 256GB, iPhone clear case, Anker 65W, UGREEN 100W, Anker PowerCore 20000
- 4 brands: Apple, Samsung, ASUS, Anker with Iraqi dealer placeholders

## Reusable components
TopNav, HeroSearch, MetricsStrip, QuickQueryChips, ShopCard, ProductResultRow, ComparisonGroup, BrandCard, TelemetryPanel, AdminActionBlock, FormField primitives, EmptyState, StaleBadge, VerifiedBadge.

## Out of scope (per brief)
No realtime stock, no payments, no user accounts, no notifications, no chatbot, no auto-scheduler, no coverage outside Baghdad's two streets.

## What I'll need from you during build
- Confirm the **shared admin passcode** (or I'll set a placeholder you can change)
- Approve linking the **Firecrawl connector** when I reach the recrawl step
