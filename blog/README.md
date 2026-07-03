# MovingCOST.ai Blog — Article Template Standard

Standard SEO blog articles should use the **premium article template pattern** established by:

`blog/spacex-ipo-brownsville-housing-relocation-costs.html`

## Canonical rules

1. **Copy the SpaceX article HTML file** as the starting point for new SEO/relocation articles.
2. **Do not insert in-body report/smart cards by default.** No mid-article `✦ AI Report` / smart report / city report cards unless the article brief explicitly requests one.
3. **Bottom CTA uses the approved two-card layout** outside `</article>`:
   - `✦ AI Planner` → `/planner` — **Start Your AI Plan →**
   - `✦ Mobility Services` → `/services` — **Explore Services →**
4. **Do not use the legacy dark single `cta-box` block** from older City Soul / checklist articles.
5. **Editorial insight lines** use:
   - `.pullquote` for key golden sentences in the body
   - `.img-caption` under hero and inline images
6. **FAQ** (when provided) stays inside `.article-body` before `</article>`. Add `FAQPage` JSON-LD only when visible FAQ exists.
7. **Continue Reading** follows the hardcoded related-links section after the bottom CTA cards.

## Registration checklist

For each new article:

1. Create `blog/{slug}.html` from the SpaceX template
2. Add images under `blog/images/{slug}/`
3. Add entry at top of `blog/posts.json` (featured card + related posts JS)
4. Add card to `blog/index.html` `.articles-grid`
5. Add URL to `sitemap.xml`

## What caused template mismatches

Blog articles are **standalone HTML files**, not a shared React/component system. If a new article is copied from `2026-city-cost-of-living-checklist.html` or other City Soul articles instead of the SpaceX file, it will inherit the wrong CTA pattern (in-body `cta-box-1` and dark single `cta-box` footer).

**Always duplicate `spacex-ipo-brownsville-housing-relocation-costs.html` for premium SEO articles.**
