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

For long-form premium SEO articles, the recommended structure adds **three in-article smart cards** using the shared `ArticleSmartCard` component:

| Asset | Path |
|-------|------|
| Styles | `blog/article-smart-card.css` |
| Copy-paste reference | `blog/article-smart-card-snippets.html` |
| Visual backup assets | `blog/images/article-smart-cards/` |

### ArticleSmartCard variants

| Variant class | Eyebrow | Button | Link |
|---------------|---------|--------|------|
| `article-smart-card--ai-planner` | ✦ AI Planner | Start Your AI Plan → | `/planner` |
| `article-smart-card--earthsoul` | ✦ EarthSoul | Take the EarthSoul Test → | `/earthsoul` |
| `article-smart-card--relocation-readiness` | ✦ Relocation Readiness | Build My Relocation Plan → | `/planner` |

**Implementation rules:**

- Use real HTML text and real `<a class="article-smart-card__btn">` buttons — never bake CTA copy into images.
- Reference PNGs are **decorative visuals only** (right panel, cropped to avoid duplicating baked-in text).
- All three cards share layout, border-radius (24px), shadow, spacing, and button size (52px × min 220px).
- Do **not** auto-insert smart cards on every article. Add only when the brief requests Template v2.
- Keep the approved **two-card bottom CTA** in addition to in-article smart cards.

### Template v2 checklist

- [ ] One H1, SEO title, meta description, category, tags
- [ ] Hero + up to 3 editorial inline images with alt text and `.img-caption`
- [ ] Pullquotes / golden insight lines
- [ ] 3 × `ArticleSmartCard` (optional, brief-driven)
- [ ] FAQ section + `FAQPage` schema when FAQ is visible
- [ ] Two-card bottom CTA (`bottom-cta-section`)
- [ ] Continue Reading related links

**Template test article:** `blog/moving-to-a-new-city-real-cost-checklist-2026.html`

## Registration checklist

For each new article:

1. Create `blog/{slug}.html` from the SpaceX template
2. Add images under `blog/images/{slug}/`
3. Add entry at top of `blog/posts.json` (featured card + related posts JS)
4. Add card to `blog/index.html` `.articles-grid`
5. Add URL to `sitemap.xml`
6. If using Template v2: link `/blog/article-smart-card.css` and paste cards from `article-smart-card-snippets.html`

## What caused template mismatches

Blog articles are **standalone HTML files**, not a shared React/component system. If a new article is copied from `2026-city-cost-of-living-checklist.html` or other City Soul articles instead of the SpaceX file, it will inherit the wrong CTA pattern (in-body legacy cards and dark single `cta-box` footer).

**Always duplicate `spacex-ipo-brownsville-housing-relocation-costs.html` for premium SEO articles.**

Standard SEO blog articles should use the premium article template pattern established by `spacex-ipo-brownsville-housing-relocation-costs`. Do not insert in-body report/smart cards by default. Use the approved two-card bottom CTA unless the article brief specifies otherwise. For long-form premium articles, optional `ArticleSmartCard` modules follow `blog/article-smart-card.css`.
