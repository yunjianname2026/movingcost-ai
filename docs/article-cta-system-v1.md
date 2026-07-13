# MovingCOST Article CTA System v1 — Concept A

## Purpose

Reusable CTA system for **MovingCOST Signal** articles, SEO editorial articles, and paid-acquisition editorial pages.

Reference implementation: `blog/spacex-ipo-brownsville-housing-relocation-costs.html`

## Rules

- Use the same card structure across all three in-article CTA moments
- Use the same typography rhythm (eyebrow → title → copy)
- Use the same spacing, border radius, and light editorial background family
- Use the same button system (`article-cta-btn` variants)
- Do **not** create one-off CTA styles per article
- Only button color variants may change (primary / outline / dark)
- All CTA links must include `class="cta-btn"` for `blog_cta_click` tracking
- No UTM parameters on internal links

## Card system

| Property | Value |
|----------|-------|
| Background | `#ffffff` or pale blue tint (`#eef5fc` for decision card) |
| Border | `1px solid #d8e4f0` |
| Border radius | `20px` |
| Shadow | `0 2px 12px rgba(15, 39, 71, 0.05)` |
| Padding | `32px 36px` (mobile: `26px 22px`) |
| Layout | Desktop two-column (~64% copy / ~36% actions); mobile stacked |

## Typography

- **Eyebrow:** `.article-cta-eyebrow` — 10px uppercase, letter-spaced, brand blue, `✦` prefix
- **Title:** `.article-cta-title` — Playfair Display, dark navy `#0f2747`, max ~26ch
- **Copy:** `.article-cta-copy` — 14px DM Sans, muted slate `#475569`, max ~40ch

## Button variants

| Class | Use |
|-------|-----|
| `.article-cta-btn--primary` | Sky blue filled — `#0EA5E9` bg, `#ffffff` text |
| `.article-cta-btn--outline` | Light blue outlined — white bg, `#087fc4` text, `#c5d9ef` border |
| `.article-cta-btn--dark` | Navy filled — `#0f2747` bg, `#ffffff` text |
| `.article-cta-link` | Blue text link (no button chrome) — for secondary actions in decision card |

**Critical:** Always set explicit `color` and `-webkit-text-fill-color` on buttons. Text must be visible without hover.

Button dimensions: height ~54px, radius 14px, font 15px / weight 600.

## Class naming guide

```
.article-cta-system          /* optional wrapper scope */
.article-cta-card            /* base card */
.article-cta-card--soft      /* CTA 1 */
.article-cta-card--decision  /* CTA 2 — blue tint */
.article-cta-card--final     /* CTA 3 — top accent */
.article-cta-content         /* left column */
.article-cta-eyebrow
.article-cta-title
.article-cta-copy
.article-cta-actions
.article-cta-actions--decision   /* primary + divider + link stack */
.article-cta-actions--stack      /* two stacked buttons */
.article-cta-actions-divider
.cta-btn                       /* required for tracking */
.article-cta-btn
.article-cta-btn--primary
.article-cta-btn--outline
.article-cta-btn--dark
.article-cta-link
```

---

## HTML skeleton — CTA 1 (Soft editorial prompt)

Place after early tension paragraph (e.g. after “A major IPO can create opportunity…”).

```html
<div class="article-cta-system">
  <div class="article-cta-card article-cta-card--soft">
    <div class="article-cta-content">
      <div class="article-cta-eyebrow">✦ MOVINGCOST SIGNAL</div>
      <h3 class="article-cta-title">Want to compare the full cost before you move?</h3>
      <p class="article-cta-copy">Compare housing, taxes, transportation, insurance, and lifestyle costs in one structured view before you commit to a boomtown move.</p>
    </div>
    <div class="article-cta-actions">
      <a href="/planner" class="cta-btn article-cta-btn article-cta-btn--primary" data-track-location="article_soft_cta" data-track-label="build_ai_move_plan">Build my AI move plan →</a>
    </div>
  </div>
</div>
```

---

## HTML skeleton — CTA 2 (Decision support card)

Place after practical comparison checklist / decision framework section.

```html
<div class="article-cta-system">
  <div class="article-cta-card article-cta-card--decision">
    <div class="article-cta-content">
      <div class="article-cta-eyebrow">✦ MOVINGCOST PLANNER</div>
      <h3 class="article-cta-title">Turn this signal into a smarter move plan.</h3>
      <p class="article-cta-copy">See how housing, services, transportation, lifestyle, and hidden costs could change your real budget before you commit to a move.</p>
    </div>
    <div class="article-cta-actions article-cta-actions--decision">
      <a href="/planner" class="cta-btn article-cta-btn article-cta-btn--primary" data-track-location="article_mid_cta" data-track-label="generate_ai_plan">Generate my AI moving plan →</a>
      <span class="article-cta-actions-divider" aria-hidden="true"></span>
      <a href="/services" class="cta-btn article-cta-btn article-cta-link" data-track-location="article_mid_cta" data-track-label="explore_services">Explore mobility services →</a>
    </div>
  </div>
</div>
```

---

## HTML skeleton — CTA 3 (Final conversion card)

Place after final editorial paragraph, before source note / Continue Reading.

```html
<div class="article-cta-system">
  <div class="article-cta-card article-cta-card--final">
    <div class="article-cta-content">
      <div class="article-cta-eyebrow">✦ PLAN BEFORE YOU MOVE</div>
      <h3 class="article-cta-title">Before chasing the next boomtown, know your real cost.</h3>
      <p class="article-cta-copy">Use MovingCOST.ai to compare housing, transportation, services, lifestyle, and hidden relocation costs before you make the move.</p>
    </div>
    <div class="article-cta-actions article-cta-actions--stack">
      <a href="/planner" class="cta-btn article-cta-btn article-cta-btn--primary" data-track-location="article_final_cta" data-track-label="start_ai_planner">Start your AI planner →</a>
      <a href="/services" class="cta-btn article-cta-btn article-cta-btn--outline" data-track-location="article_final_cta" data-track-label="explore_services">Explore Mobility Services →</a>
    </div>
  </div>
</div>
```

---

## CSS reference

Copy the `/* MovingCOST Article CTA System v1 — Concept A */` block from the reference article's inline `<style>` section. Keep CSS scoped to the article page until a future shared partial is approved.

## Conversion hierarchy

1. **Primary:** `/planner` (most CTA emphasis)
2. **Secondary:** `/services` (text link or outline button)
3. **Tertiary:** related blog reading (Continue Reading section)
