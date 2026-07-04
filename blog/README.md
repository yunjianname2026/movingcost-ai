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

## Premium SEO Article Template v2 (optional, long-form)

Long-form premium SEO articles use the **clean editorial pattern** — no in-article promotional banners or cards by default.

**Reference implementation:** `blog/moving-to-a-new-city-real-cost-checklist-2026.html`

### Template v2 article rhythm (recommended)

1. Hero image + opening argument  
2. Body sections + editorial image(s) with captions/pullquotes  
3. Checklist / framework section (when applicable)  
4. Closing sections → FAQ → bottom two-card CTA → Continue Reading  

### Template v2 checklist

- [ ] One H1, SEO title, meta description, category, tags
- [ ] Hero + up to 3 editorial inline images with alt text and `.img-caption`
- [ ] Pullquotes / golden insight lines
- [ ] FAQ section + `FAQPage` schema when FAQ is visible
- [ ] Two-card bottom CTA (`bottom-cta-section`)
- [ ] Continue Reading related links
- [ ] **No in-article promo banners/cards** unless an approved design system is explicitly requested

## NativeArticleBanner (experimental — not approved for production)

**NativeArticleBanner is currently experimental and should not be used in production articles until a final approved visual design system is created.** Standard premium SEO articles should remain clean editorial articles with approved images, pullquotes, FAQ, bottom two-card CTA, and Continue Reading.

Experimental reference files (do not load in production articles):

| Asset | Path |
|-------|------|
| Styles | `blog/native-article-banner.css` |
| Copy-paste reference | `blog/native-article-banner-snippets.html` |
| Background images | `blog/images/native-banners/` |

### Legacy: ArticleSmartCard

`blog/article-smart-card.css` and related assets remain as design references. Do not use ArticleSmartCard in production articles unless a brief explicitly requests the legacy pattern.

## Registration checklist

For each new article:

1. Create `blog/{slug}.html` from the SpaceX template
2. Add images under `blog/images/{slug}/`
3. Add entry at top of `blog/posts.json` (featured card + related posts JS)
4. Add card to `blog/index.html` `.articles-grid`
5. Add URL to `sitemap.xml`

## What caused template mismatches

Blog articles are **standalone HTML files**, not a shared React/component system. If a new article is copied from `2026-city-cost-of-living-checklist.html` or other City Soul articles instead of the SpaceX file, it will inherit the wrong CTA pattern (in-body legacy cards and dark single `cta-box` footer).

**Always duplicate `spacex-ipo-brownsville-housing-relocation-costs.html` for premium SEO articles.**

Standard SEO blog articles should use the premium article template pattern established by `spacex-ipo-brownsville-housing-relocation-costs`. Do not insert in-body report/smart cards or experimental banners by default. Use the approved two-card bottom CTA unless the article brief specifies otherwise.
