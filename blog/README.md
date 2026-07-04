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
| Visual-only assets | `blog/images/article-smart-cards/*-visual-only.webp` (+ `.png` fallback) |

**ArticleSmartCard uses real HTML text/buttons on the left and text-free visual-only assets on the right.** Do not use full mockup card images. Do not rely on rough CSS diagrams for final production visuals unless they are design-polished.

### ArticleSmartCard variants

| Variant class | Eyebrow | Button | Link |
|---------------|---------|--------|------|
| `article-smart-card--ai-planner` | ✦ AI Planner | Start Your AI Plan → | `/planner` |
| `article-smart-card--earthsoul` | ✦ EarthSoul | Take the EarthSoul Test → | `/earthsoul` |
| `article-smart-card--relocation-readiness` | ✦ Relocation Readiness | Build My Relocation Plan → | `/planner` |

**Implementation rules:**

- Use real HTML text and real `<a class="article-smart-card__btn">` buttons — never bake CTA copy into images.
- Right-side visuals use text-free illustration assets inside `.article-smart-card__visual` (`ai-planner-visual-only`, `earthsoul-visual-only`, `relocation-readiness-visual-only`). Assets must contain zero readable text and zero button graphics.
- Legacy full-card mockup PNGs in `blog/images/article-smart-cards/` must not be used in production HTML.
- Desktop layout: ~44% content / ~56% visual, min-height ~320px, 28px radius, soft shadow.
- Buttons: 52px height, min-width 220px, 14px radius — bottom-aligned in the left column; full-width on mobile.
- Distribute smart cards evenly through the article. **Avoid placing a smart card immediately after an image/caption block** unless the brief explicitly requests it.
- Default placement for Card 3 (`relocation-readiness`): **after a checklist/framework section**, not directly after an editorial image.
- Do **not** auto-insert smart cards on every article. Add only when the brief requests Template v2.
- Keep the approved **two-card bottom CTA** in addition to in-article smart cards.

### Template v2 article rhythm (recommended)

1. Hero image + opening argument  
2. Smart Card 1 (`ai-planner`) — after early cost-framing section  
3. Body sections + editorial image(s) with captions/pullquotes  
4. Smart Card 2 (`earthsoul`) — mid-article, after mobility/lifestyle section  
5. More body sections + editorial image + caption  
6. Checklist / framework section  
7. Smart Card 3 (`relocation-readiness`) — after checklist, before “questions to ask”  
8. Closing sections → FAQ → bottom two-card CTA → Continue Reading  

**Reference implementation:** `blog/moving-to-a-new-city-real-cost-checklist-2026.html`

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
