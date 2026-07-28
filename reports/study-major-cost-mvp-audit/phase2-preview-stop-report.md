# Study, Major & Cost Planner — Phase 2 Preview Stop Report

**Status:** STOP — awaiting Da Vinci approval. No merge. No Production deploy. Hub card unchanged.

**Date:** 2026-07-28

---

## 1. Branch

`feature/study-major-cost-mvp`

## 2. Baseline SHA

`01ab09a` (approved main baseline)

## 3. Files created

| Path | Role |
|------|------|
| `pathways/study-major-cost/index.html` | Landing + 5 UI states shell |
| `pathways/study-major-cost/app.js` | Questionnaire, draft, free/full render |
| `pathways/study-major-cost/smc-calc.js` | Browser deterministic cost engine |
| `api/pathways-study-major-cost.js` | Isolated Claude + cost API |
| `api/study-major-cost/validate-report.js` | Schema v3 + fixed checks + cost alignment |
| `api/study-major-cost/schema-v3.json` | Output schema (server-only) |
| `api/study-major-cost/prompts/*.md` | System + report prompts (server-only) |
| `api/study-major-cost/rules-v3.md` | Rules SSOT copy (server-only) |
| `api/study-major-cost/calculation-trace-v3.md` | Trace SSOT copy (server-only) |
| `api/study-major-cost/question-matrix.md` | Matrix + approved length note |
| `lib/study-major-cost/*` | Validate + calculate + versions + constants |
| `fixtures/study-major-cost/*` | Profiles A/B/C + fixture-report-a |
| `tests/study-major-cost/*` | Golden tests + schema tests + quality runner |
| `reports/study-major-cost-mvp-audit/phase0-phase1-stop-report.md` | Prior audit |
| `reports/study-major-cost-mvp-audit/screenshots/*` | Local UI screenshots |

## 4. Files modified

None on Production-critical paths. `vercel.json`, Pathways hub, Startup Lab, Report Engine, Stripe, Member, existing APIs: **untouched**.

## 5. Exact Claude model

| Source | Value |
|--------|-------|
| Stable report code (`api/send-report.js`, `api/generate.js`) | `process.env.ANTHROPIC_MODEL \|\| 'claude-sonnet-4-6'` |
| New SMC API | **same default: `claude-sonnet-4-6`** |
| Manual v1.2 | Documents `claude-sonnet-4-6` |
| Vercel env `ANTHROPIC_MODEL` (prior audit) | **Not set** → code default applies |
| Drift noted | `planner.html` hardcodes older `claude-sonnet-4-20250514` — **not used** for SMC |

**Confirmed model for SMC:** `claude-sonnet-4-6`

## 6. API endpoint

`POST /api/pathways-study-major-cost`

Physical nested page: `/pathways/study-major-cost` → `pathways/study-major-cost/index.html` (cleanUrls; no vercel.json rewrite added).

## 7. Rules version

`rules_v3_prototype_deterministic`

## 8. Schema version

`v3`

## 9. Question count and branches

| Path | Count |
|------|-------|
| Standard (non-enrolled) | **30** (29 if `just_exploring` hides Q19) |
| Longest conditional (enrolled + Q09b) | **31** (30 if Q19 hidden) |
| Target time | 6–8 minutes |

MVP locks: `target_country=US`, `target_degree=bachelor` (others Coming Soon / disabled).

## 10. Deterministic test results

```
node --test tests/study-major-cost/*.test.js
# tests 9 / pass 9 / fail 0
```

Browser `smc-calc.js` matches lib engine for Profiles A/B/C.

## 11. Calculation-trace comparison

| Profile | Year1/first Std | Program Std | Pressure | Transfer stress | Match |
|---------|-----------------|-------------|----------|-----------------|-------|
| A | $90,400 | $356,200 | very_high | n/a base | **Exact** |
| B | $48,600 | $189,000 | very_high | n/a base | **Exact** |
| C | $68,500 | $208,300 | very_high | $68,500 | **Exact** |

No silent edits to Rules / Trace / Profiles / engine to force agreement.

## 12. Three real Claude report results

**BLOCKED — not executed in this session.**

Reasons:
1. Local `CLAUDE_API_KEY` / `.env` not available to the agent.
2. `vercel env pull` / `vercel deploy` CLI auth token invalid (`vercel login` required).
3. GitHub-linked Preview exists but returns **Deployment Protection** (SSO 302 / API 401).

**Runner ready:** `tests/study-major-cost/run-api-quality.js`  
After auth:  
`CLAUDE_API_KEY=… node tests/study-major-cost/run-api-quality.js`  
or with Preview bypass:  
`SMC_API_URL=https://…/api/pathways-study-major-cost node tests/study-major-cost/run-api-quality.js`

## 13. Structured-output validation

Implemented in `api/study-major-cost/validate-report.js`:
- Schema subset (required, const, enum, additionalProperties:false)
- Fixed constraints (schema_version, rules_version, ROI false, feasibility not_assessed, disclaimer const)
- Deterministic money alignment vs engine
- Unit tests: fixture passes; undeclared field rejected; altered Standard total rejected

## 14. Retry behavior

API retries structured generation **once** on schema/parse failure; returns safe user-facing error after final failure. Response includes `retry_used` when applicable.

## 15. Error tests (local handler, no Claude)

| Case | HTTP | Result |
|------|------|--------|
| non-US country | 400 | ok:false, safe validation message |
| non-bachelor degree | 400 | ok:false |
| Q08 none+math | 400 | ok:false |

## 16. Preview URL

GitHub auto Preview (branch push detected):

**https://movingcost-ai-git-feature-study-major-cost-mvp-okayus.vercel.app/pathways/study-major-cost**

Protected by Vercel Auth (SSO). Production not promoted.

## 17. Desktop screenshots (local mirror)

Under `reports/study-major-cost-mvp-audit/screenshots/`:
- `01-landing-desktop.png`
- `02-questionnaire-desktop.png`
- `03-free-result-desktop.png` (Profile A: $90,400 / $356,200 / 很高)
- `04-full-report-desktop.png` (fixture Beta report)

## 18. Mobile screenshots (390px local)

- `05-landing-mobile.png`
- `06-free-result-mobile.png`

## 19. Response times

| Path | Time |
|------|------|
| Deterministic unit tests (9) | ~115 ms total |
| Local validation error cases | &lt;1 s |
| Real Claude Preview timing | **Not measured** (auth blocked) |

Function config: `module.exports.config = { maxDuration: 120 }` on the new endpoint only. **`vercel.json` not modified.** If Preview Claude calls exceed 120s, propose smallest bump for this endpoint only after measurement.

## 20. Known limitations

- US bachelor only; no live school/market DB
- Prototype cost tables (not verified school quotes)
- No payment / email / PDF / Member save
- Hub card / sitemap / Manual not updated
- Full Claude quality trio pending auth
- Preview behind Deployment Protection
- Fixture full report used for UI confirmation when API unavailable (`?mock=1` / fallback)
- `fixtures/` is statically fetchable (sample data only; prompts remain under `api/`)

## 21. Security and privacy controls

- Prompts / rules / schema under `api/study-major-cost/` (not designed as public HTML)
- API never returns prompts, stack traces, env, or API keys
- localStorage draft stores only answers, step, timestamp, product/rules versions
- Clear-draft control on questionnaire
- Rate limit ~8 req/IP/hour on new API
- Page `noindex,nofollow`
- Money fields overwritten/locked from deterministic engine before accept

## 22. git diff --stat

Against baseline `01ab09a` (feature commit):

```
25 files changed, 5547 insertions(+)
```

(Plus follow-up commit for mock demo hook + this stop report if committed.)

## 23. Commit SHA

Primary implementation: **`b1ed84b758aa4b5c1b3308a2f2855aa007b0577d`** (`b1ed84b`)

## 24. Removal / rollback procedure

1. Do **not** merge the branch.
2. Delete or archive Preview deployment in Vercel dashboard if desired.
3. Optional: `git push origin --delete feature/study-major-cost-mvp` after archival.
4. Production remains at baseline `01ab09a` (+ any later unrelated main commits); no hub/sitemap/Manual changes to revert.
5. No Stripe/Member/Report Engine changes to roll back.

---

## Model confirmation appendix (required before Claude)

Code default = Manual = effective env default → **`claude-sonnet-4-6`**. No silent model substitution.

## Next approval asks

1. `vercel login` (or valid token) so agent/Da Vinci can run Profiles A/B/C Claude quality tests on Preview.
2. Optional: Preview Deployment Protection bypass for API quality runner.
3. Explicit approval before any hub card, sitemap, Manual, or Production merge.
