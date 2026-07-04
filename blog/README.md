# MovingCOST.ai Blog — Article Template Standard

Standard SEO blog articles should use the **premium article template pattern** established by:

`blog/spacex-ipo-brownsville-housing-relocation-costs.html`

## Canonical rules (Template v1)

1. **Copy the SpaceX article HTML file** as the starting point for new SEO/relocation articles.
2. **Do not insert in-body report/smart cards by default.** No mid-article legacy `✦ AI Report` cards unless the article brief explicitly requests them.
3. **Bottom CTA uses the approved two-card layout** outside `</article>`:
   - `✦ AI Planner` → `/planner` — **Start Your AI Plan →**
   - `✦ Mobility Services` → `/services` — **Explore Services →**
4. **Do not use the legacy dark single `cta-box` block** from older City Soul / checklist articles.
5. **Editorial insight lines** use:
   - `.pullquote` for key golden sentences in the body
   - `.img-caption` under hero and inline images
6. **FAQ** (when provided) stays inside `.article-body` before `</article>`. Add `FAQPage` JSON-LD only when visible FAQ exists.
7. **Continue Reading** follows the hardcoded related-links section after the bottom CTA cards.

## Premium Native Article Banner System v1 (optional, long-form)

For long-form premium SEO articles, the recommended in-article promo pattern is **NativeArticleBanner** — a reusable high-end native banner for MovingCOST / EarthSoul self-promo and future sponsor/partner placements.

| Asset | Path |
|-------|------|
| Styles | `blog/native-article-banner.css` |
| Copy-paste reference | `blog/native-article-banner-snippets.html` |
| Background images | `blog/images/native-banners/` |

**Core rules:**

- Background image is decorative only — full-bleed inside a CSS-rounded container (image itself has no rounded corners).
- No baked-in text, logo, or CTA in images.
- Brand label, title, subtitle, and CTA button are real HTML/CSS.
- Whole banner is one clickable `<a>`.
- CTA is a visible HTML/CSS button inside the banner (not an image).
- Use **text-brand mode by default** (`✦ MovingCOST`, `✦ EarthSoul`). Do not use favicon as banner logo. Do not generate or invent logos.
- Logo-image mode (`.native-article-banner__brand--logo`) is supported in CSS for verified sponsor logos only — max-height 28px, max-width 160px, transparent PNG/SVG.
- Subtle overlay, shadow, hover lift, and background zoom are controlled in CSS.
- Do not use full-card mockup images or rough CSS diagram cards.
- Keep the approved **two-card bottom CTA** in addition to in-article banners.

### NativeArticleBanner variants (reference article)

| Variant class | Brand | Title | Link | Background |
|---------------|-------|-------|------|------------|
| `native-article-banner--planner` | ✦ MovingCOST | Estimate your real moving cost. | `/planner` | `planner-workspace-city-bg.webp` |
| `native-article-banner--earthsoul` | ✦ EarthSoul | Find the city that fits your rhythm. | `/earthsoul` | `earthsoul-city-rhythm-bg.webp` |
| `native-article-banner--readiness` | ✦ MovingCOST | Plan smarter before you relocate. | `/planner` | `relocation-readiness-home-bg.webp` |

### Template v2 article rhythm (recommended)

1. Hero image + opening argument  
2. Banner 1 (`--planner`) — after early cost-framing section  
3. Body sections + editorial image(s) with captions/pullquotes  
4. Banner 2 (`--earthsoul`) — mid-article, after mobility/lifestyle section  
5. More body sections + editorial image + caption  
6. Checklist / framework section  
7. Banner 3 (`--readiness`) — after checklist, before “questions to ask”  
8. Closing sections → FAQ → bottom two-card CTA → Continue Reading  

**Reference implementation:** `blog/moving-to-a-new-city-real-cost-checklist-2026.html`

### Template v2 checklist

- [ ] One H1, SEO title, meta description, category, tags
- [ ] Hero + up to 3 editorial inline images with alt text and `.img-caption`
- [ ] Pullquotes / golden insight lines
- [ ] 3 × `NativeArticleBanner` (optional, brief-driven)
- [ ] FAQ section + `FAQPage` schema when FAQ is visible
- [ ] Two-card bottom CTA (`bottom-cta-section`)
- [ ] Continue Reading related links

**Template test article:** `blog/moving-to-a-new-city-real-cost-checklist-2026.html`

### Legacy: ArticleSmartCard

`blog/article-smart-card.css` and related assets remain as design references. Do not use ArticleSmartCard in new production articles unless a brief explicitly requests the legacy pattern.

## Registration checklist

For each new article:

1. Create `blog/{slug}.html` from the SpaceX template
2. Add images under `blog/images/{slug}/`
3. Add entry at top of `blog/posts.json` (featured card + related posts JS)
4. Add card to `blog/index.html` `.articles-grid`
5. Add URL to `sitemap.xml`
6. If using Template v2: link `/blog/native-article-banner.css` and paste banners from `native-article-banner-snippets.html`

## What caused template mismatches

Blog articles are **standalone HTML files**, not a shared React/component system. If a new article is copied from `2026-city-cost-of-living-checklist.html` or other City Soul articles instead of the SpaceX file, it will inherit the wrong CTA pattern (in-body legacy cards and dark single `cta-box` footer).

**Always duplicate `spacex-ipo-brownsville-housing-relocation-costs.html` for premium SEO articles.**

Standard SEO blog articles should use the premium article template pattern established by `spacex-ipo-brownsville-housing-relocation-costs`. Do not insert in-body report/smart cards by default. Use the approved two-card bottom CTA unless the article brief specifies otherwise. For long-form premium articles, optional in-article banners follow `blog/native-article-banner.css`.
