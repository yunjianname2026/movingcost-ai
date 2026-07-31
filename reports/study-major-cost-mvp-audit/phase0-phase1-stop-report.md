# Study, Major & Cost Planner MVP — Phase 0 + Phase 1 Stop Report

**Date:** 2026-07-28  
**Status:** READ-ONLY AUDIT COMPLETE — **NO IMPLEMENTATION CODE CHANGED**  
**Waiting for:** Da Vinci approval before Phase 2+

---

## Phase 0 — Safe branch and baseline

| Item | Value |
|------|--------|
| Working branch (created) | `feature/study-major-cost-mvp` |
| Baseline `origin/main` SHA | `01ab09a6b67b7170c4d305927516d552f74bf292` |
| Baseline commit message | `feat(blog): publish AI college majors 2026 guide` |
| Production URL | https://www.movingcost.ai |
| Production Pathways hub | https://www.movingcost.ai/pathways → **HTTP 200** |
| Target product URL (not live) | https://www.movingcost.ai/pathways/study-major-cost → **HTTP 404** (expected) |
| Nested URL proof | `/pathways/startup-lab` and `/pathways/startup-lab/handbook` → **200** with `cleanUrls: true` and **no rewrite** for Pathways |
| Claude product baseline | Attached ZIP `files (第五次修改留学生项目).zip` (17 files) — Claude sandbox SHA `4049993` (not fetchable; ZIP is the product SSOT) |
| Production deployment ID | **Not refreshed this session** — Vercel CLI auth token invalid (`vercel login` required). Live site headers show `server: Vercel`, `last-modified: Sun, 26 Jul 2026` (blog release window), `x-vercel-cache: HIT`. Prior known Pathways-era deploy reference remains available for Instant Rollback if needed: `dpl_2fKbqQ4MEqH6GZheQd9gUzLNPdvG` (pre-Pathways) / post-Pathways releases after `3ec6cb8`/`43e05d3`/`01ab09a`. |

**Phase 0 actions taken:**

1. Confirmed on `main`, pulled `origin/main` (already up to date).
2. Recorded baseline SHA above.
3. Created branch `feature/study-major-cost-mvp` from that SHA.
4. Did **not** merge, did **not** push Production, did **not** write product code.
5. Extracted ZIP for audit only under:  
   `reports/study-major-cost-mvp-audit/claude-baseline/`  
   (local audit artifact; **not** committed)

---

## Phase 1 — Repository audit

### 1. Pathways architecture (live repo)

| Route | File | Status |
|-------|------|--------|
| `/pathways` | `pathways/index.html` | Live Student Hub |
| `/pathways/opportunity` | `pathways/opportunity.html` | Live (preview / coming-soon style) |
| `/pathways/career` | `pathways/career.html` | Live (coming soon) |
| `/pathways/startup-lab` | `pathways/startup-lab/index.html` | Live |
| `/pathways/startup-lab/handbook` | `pathways/startup-lab/handbook.html` | Live |
| `/pathways/startup-lab/apply` | `pathways/startup-lab/apply.html` | Live + `api/startup-lab-apply.js` |
| `/pathways/study-major-cost` | — | **Does not exist yet** |

**Nav (production pattern to reuse):**

- Desktop Pathways dropdown: Student Hub / City Opportunity / Startup Lab / Career & City Life
- Mobile PATHWAYS group with the same four children
- Standard logo: `/assets/logo/logo-light-transparent.png` (header) / `logo-dark-transparent.png` (footer)
- Typography: Outfit + DM Sans + Playfair Display for Pathways headings
- Manual §Pathways: shared Pathways nav on main marketing pages + all six Pathways pages; **blog articles out of Pathways nav scope**

**Current Student Hub CTAs (no Study/Major/Cost Planner card yet):**

- Explore Costs → `/planner`
- Explore Opportunity → `/pathways/opportunity`
- Explore Startup Lab → `/pathways/startup-lab`
- Explore the Journey → `/pathways/career`

Phase 13 of the task forbids updating the live Pathways card until later approval — audit agrees: **do not modify hub CTAs in first Preview MVP**.

---

### 2. Existing AI-card / Anthropic patterns

| Component | Role | Reuse guidance |
|-----------|------|----------------|
| `api/generate.js` | Thin Anthropic Messages proxy; IP rate limit 10/hour; model `process.env.ANTHROPIC_MODEL \|\| 'claude-sonnet-4-6'` | Pattern for rate limit + model env; **do not overload for SMC** (accepts raw `prompt` from client — too open for this product) |
| `api/send-report.js` | Full city Report Engine: inline system rules, destination KB, two-pass generation, validation notes, Resend email, Supabase `report_orders`, `maxDuration: 800` | **Do not modify.** Study patterns: server-side prompts, validation, retry, redaction, long duration |
| `planner.html` | Multi-step form → generate report JSON → paywall → email | UX flow inspiration only; hardcodes older `CLAUDE_MODEL='claude-sonnet-4-20250514'` in client — **Production SSOT model is Manual/`generate.js`/`send-report.js`: `claude-sonnet-4-6`** |
| `earthsoul.html` | Intro → quiz → loading/calc → result; `localStorage` for results/email | Best in-repo multi-screen interaction reference for questionnaire UX |
| `sample-report.html` | Static sample full report presentation | Visual/report-section presentation reference only |
| Stripe / Resend / Magic Link | Live for city reports & membership | **Out of MVP scope** — do not wire |

**Recommended Claude model for SMC MVP (pending confirmation in Phase 2 plan):**

- **`claude-sonnet-4-6`** via `ANTHROPIC_MODEL` / same default as `api/send-report.js` and Production Manual  
- Reason: matches stable city-report Production path; do **not** silently switch to planner.html’s older client string

---

### 3. Report Engine — what can / cannot be reused

**Safe to reuse as patterns:**

- Anthropic Messages API call shape (`x-api-key`, `anthropic-version: 2023-06-01`)
- Server-only prompts (never ship system prompt to browser)
- Response validation + limited retry
- Safe user-facing errors
- Optional long `maxDuration` for new function in `vercel.json` (only if needed; requires explicit approval because `vercel.json` is gated)

**Must remain untouched:**

- `api/send-report.js`, `api/generate.js` behavior for city reports
- Stripe checkout / webhook / Resend report email flows
- Report Engine section prompts and destination KB
- Member points / rewards / referral APIs

**SMC requires new isolated endpoint** (per task): `/api/pathways-study-major-cost`  
Costs must be **deterministic in Node**, not Claude-calculated.

---

### 4. Member / database / persistence

| Capability | Finding |
|------------|---------|
| Anonymous draft saving API | **Not found** as a shared product API |
| Client storage patterns | Widespread `localStorage` for `mc_email`, EarthSoul results, planner `movingData` / `movingReport` |
| Supabase tables in use | Rewards/member, `report_orders`, `startup_lab_applications` — **do not extend for MVP without approval** |
| Recommended MVP persistence | `sessionStorage` or `localStorage` draft only (EarthSoul/planner pattern); no login gate; no new DB tables in first Preview |

---

### 5. Routing

- `vercel.json` has `"cleanUrls": true`.
- Nested Pathways files already work: `pathways/startup-lab/index.html` → `/pathways/startup-lab`.
- **Safest MVP path:** create `pathways/study-major-cost/index.html` (and optional assets under that folder).
- **No new rewrite required** for the page URL.
- Possible later `vercel.json` change: only `functions["api/pathways-study-major-cost.js"].maxDuration` — treat as gated; propose in Phase 2, do not silently edit.

---

### 6. Attached ZIP — 17-file classification

Extracted for audit at `reports/study-major-cost-mvp-audit/claude-baseline/`.

#### Visual / interaction references (NOT production code)

| File | Role |
|------|------|
| `study-major-cost-preview.html` | Landing visual reference |
| `study-major-cost-questionnaire-preview.html` | Questionnaire interaction reference |
| `study-major-cost-loading-preview.html` | Loading-state reference |
| `study-major-cost-free-result-preview.html` | Free-result reference |
| `study-major-cost-full-report-preview.html` | Full-report layout reference |

These previews **must not** be renamed/published. They may contain outdated logo/nav/fonts relative to live Pathways.

#### Authoritative product specifications / runtime inputs

| File | Role |
|------|------|
| `study-major-cost-question-matrix.md` | Questionnaire SSOT (≤30 standard / ≤31 longest; 7 steps) |
| `study-major-cost-rules.md` | Deterministic cost SSOT (`rules_v3_prototype_deterministic`) |
| `study-major-cost-schema.json` | Structured output SSOT (`schema_version: v3`) |
| `study-major-cost-system-prompt.md` | System prompt v3 |
| `study-major-cost-report-prompt.md` | Report field-writing prompt v3 |
| `study-major-cost-calculation-trace.md` | Golden expected numbers for Profiles A/B/C |

#### Quality bar / fixtures

| File | Role |
|------|------|
| `sample-profile-a.json` / `b` / `c` | Approved input fixtures |
| `sample-report-a.md` / `b` / `c` | Approved narrative quality baseline |

#### Contradictions / notes found

1. **Question-count policy already self-documented:** matrix notes that splitting Q22 into Q22a/Q22b raised enrolled path to **31** (beyond older absolute 30). Task + matrix agree on max 31 for longest path — implement as written; do not “silently trim.”
2. **Preview HTML ≠ live brand:** expect outdated chrome; rebuild UI from live Pathways/`index.html` patterns.
3. **Model string drift in repo:** client `planner.html` vs server default `claude-sonnet-4-6` — SMC must follow **server/Manual** path.
4. **Product already soft-announced** in blog article CTA (“Study, Major & Cost Planner — Coming Soon” → `/pathways`) — consistent positioning; still **no hub card update** until later approval.
5. **No contradiction** found between rules v3, schema v3, prompts v3, and calculation-trace naming (`rules_v3_prototype_deterministic` / `schema_version: v3`).

---

## Proposed architecture (for approval — not built)

### Exact Product URL

`https://www.movingcost.ai/pathways/study-major-cost`  
Physical: `pathways/study-major-cost/index.html` (+ optional static assets under same folder)

### Files proposed for **creation** (Phase 2+)

| Path | Purpose |
|------|---------|
| `pathways/study-major-cost/index.html` | SPA-style 5-state UI (Landing → Questionnaire → Loading → Free → Full Beta) |
| `pathways/study-major-cost/` JS/CSS modules as needed (page-local only) | Questionnaire + renderers |
| `api/pathways-study-major-cost.js` | Isolated API: validate → cost engine → Claude → schema validate → respond |
| `lib/study-major-cost/cost-engine.js` (or equivalent) | Deterministic rules v3 |
| `lib/study-major-cost/validate-input.js` | Enums, mutual exclusion, US/bachelor gates |
| `lib/study-major-cost/schema.json` + validator | Copy of approved schema v3 |
| `lib/study-major-cost/prompts/*.md` **server-only** | system + report prompts v3 |
| `tests/study-major-cost/*` | Profiles A/B/C cost parity vs calculation-trace + API edge cases |
| Audit/docs fixtures (optional under `reports/` or `fixtures/`) | Sample profiles for CI |

### Files proposed for **modification** (minimal; some deferred)

| File | When | Change |
|------|------|--------|
| `vercel.json` | Only if API needs longer timeout | Add `functions` maxDuration for new API — **requires explicit approval** |
| `sitemap.xml` | After Preview approval / before Production | Add product URL |
| `pathways/index.html` (+ shared nav pages) | **Deferred** per Phase 13 | Add card/CTA later — **not in first MVP Preview** |
| Manual → v1.3 | After major module ships | Business Flow + changelog — not in Phase 1 |

**Must not modify in this MVP:** Startup Lab, Report Engine APIs, Stripe, member center, EarthSoul quiz logic, global.css, package.json, blog articles.

### Frontend architecture

- Single Pathways-branded page with 5 UI states.
- Chinese-primary / English-secondary copy per product rules.
- Questionnaire driven strictly by Question Matrix (not preview HTML).
- Draft in `sessionStorage`/`localStorage`.
- Free result + internal “View Full Beta Report” control (no fake paywall).

### API architecture

1. POST `/api/pathways-study-major-cost`
2. Reject non-US / non-bachelor
3. Run deterministic cost engine
4. Call Anthropic with system+report prompts + calculations + schema constraints
5. Validate JSON (`additionalProperties: false`, const fields)
6. One structured-output retry only
7. Rate limit + payload limits + redacted logs

### Deterministic-cost module

- Implement `study-major-cost-rules.md` exactly.
- Golden tests must match `study-major-cost-calculation-trace.md` for A/B/C; **stop on mismatch**.

### Anthropic integration

- Model: `claude-sonnet-4-6` (Production default) unless Da Vinci orders otherwise.
- Structured JSON output; server validates against schema v3.

### Persistence

- Client draft only for MVP.
- No new Supabase tables / no email / no Stripe.

---

## Current risks

1. Cost-engine rounding must match trace exactly (hundreds rounding).
2. Schema is strict (`additionalProperties: false`, many `const` fields) — Claude may need careful prompting + one retry.
3. Chinese report quality bar is high vs sample reports — Preview AI quality loop required.
4. `vercel.json` / long-running function may be needed; gated file.
5. Preview HTML brand mismatch if anyone copies it mechanically.
6. Enrolled path 31 questions + branching complexity.
7. Accidental scope creep into member/Stripe/hub card updates.

---

## Smallest safe implementation plan (after approval)

1. Port rules → cost engine + unit tests for A/B/C (must match trace).
2. Build questionnaire UI on live Pathways chrome (7 steps).
3. Add isolated API + schema validation + rate limit.
4. Wire loading → free result → full Beta reveal (no payment).
5. Preview-only deploy; run 3 live sample profiles; stop for review.

---

## Role record (this session)

| Role | Assignee |
|------|----------|
| Decision Owner | Da Vinci |
| Architect / Analyst | Auto (this audit) |
| Executor | **Not authorized yet** (Phase 2+ pending) |
| Release Approver | Da Vinci |

---

## Stop confirmation

- Branch ready: `feature/study-major-cost-mvp` @ `01ab09a`
- **No product code commits**
- **No merge / no Production deploy**
- Next action: await Da Vinci review of this audit, then approve Phase 2 whitelist
