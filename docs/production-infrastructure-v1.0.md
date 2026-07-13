# Production Infrastructure v1.0

**MovingCOST.ai — 生产基础设施审计与交接文档**

| Field | Value |
|-------|-------|
| Document | Production Infrastructure v1.0 |
| Status | Effective |
| Audit Date | 2026-07-11 |
| Approved By | Da Vinci / CLASSIC SPREAD INC |
| Maintainer | Da Vinci / CLASSIC SPREAD INC |
| Repository | [github.com/yunjianname2026/movingcost-ai](https://github.com/yunjianname2026/movingcost-ai) |
| Canonical URL | `https://www.movingcost.ai` |

> **Purpose:** 任何人接手本项目时，可通过本文档了解**真正的生产环境**是什么、四个核心平台如何串联、以及当前一致性与已知缺口。

---

## Executive Summary — 生产清单

| Item | Status | Notes |
|------|--------|-------|
| ✓ Vercel | **Live** | `okayus/movingcost-ai` · Production Ready · `iad1` |
| ✓ Supabase Pro | **Live** | Project `movingcost-rewards` · main · PRODUCTION（已由 Da Vinci 确认升级 Pro） |
| ✓ Stripe Live | **Live** | Checkout + Webhook 已配置；密钥存于 Vercel（加密，需 Dashboard 确认 Live 模式） |
| ✓ Resend | **Live** | `reports@movingcost.ai` / `support@movingcost.ai` · DKIM/SPF 已配置 |
| ✓ Domain | **Live** | `movingcost.ai` · Vercel 托管 |
| ✓ DNS | **Live** | Apex → Vercel · `www` 为 canonical · MX → Google |
| ✓ Environment Variables | **Mostly aligned** | 核心链路齐全；2 个可选/管理变量未在 Vercel 列出 |
| ✓ Backup Strategy | **Pro tier** | Supabase Pro 自动备份 + PITR；无额外 off-site 自动化 |
| ⚠ Monitoring | **Partial** | GA4 + 各平台 Dashboard；无统一告警 / APM |

**Production chain（主链路）:**

```
GitHub main
    ↓ auto deploy
Vercel (static + serverless, iad1)
    ↓ env: SUPABASE_URL + SERVICE_ROLE_KEY
Supabase movingcost-rewards (Postgres, service_role only)
    ↓
Resend (transactional email)  +  Stripe (payments)  +  Claude (report generation)
```

---

## 1. Vercel

### 1.1 Project Identity

| Key | Value |
|-----|-------|
| Team / Scope | `okayus` |
| Project Name | `movingcost-ai` |
| Project ID | `prj_4FjiCTMGyi91vFODTJlDAsJZWhmf` |
| Org ID | `team_V90XKoxHkIBVmOZ7Y78wXi1N` |
| Deploy Source | GitHub `main` → automatic production deployment |
| Node Runtime | `24.x` (`package.json` `engines`) |
| Edge Region (observed) | `iad1` (Washington, D.C.) |

### 1.2 Production URLs & Aliases

| URL | Role |
|-----|------|
| `https://www.movingcost.ai` | **Canonical production** (HTTP 200) |
| `https://movingcost.ai` | Apex alias → **307 redirect** to `https://www.movingcost.ai/` |
| `https://movingcost-ai.vercel.app` | Vercel default alias |
| `https://movingcost-ai-git-main-okayus.vercel.app` | Git-main preview alias |

**Verified (2026-07-11):**
- Homepage: `200`
- `movingcost.ai` → `www.movingcost.ai`: `307`
- `strict-transport-security: max-age=63072000`
- `server: Vercel`

### 1.3 Latest Production Deployment

| Field | Value |
|-------|-------|
| Status | ● Ready |
| Last observed deploy | 2026-07-06 (5 days before audit) |
| Latest merge on main (audit time) | `d20ed73` — startup lab program at a glance |

### 1.4 Serverless API Routes (Production)

All under `/api/*` — **12 functions**:

| Route | Module | Primary Dependencies |
|-------|--------|----------------------|
| `/api/create-checkout` | `create-checkout.js` | Stripe |
| `/api/webhook` | `webhook.js` | Stripe, Resend, Supabase |
| `/api/send-report` | `send-report.js` | Claude, Resend, Supabase |
| `/api/resend-report` | `resend-report.js` | Resend, Supabase |
| `/api/generate` | `generate.js` | Claude |
| `/api/magic-link` | `magic-link.js` | Supabase, Resend |
| `/api/verify-token` | `verify-token.js` | Supabase |
| `/api/user` | `user.js` | Supabase, Resend |
| `/api/rewards` | `rewards.js` | Supabase |
| `/api/referral` | `referral.js` | Supabase |
| `/api/startup-lab-apply` | `startup-lab-apply.js` | Supabase |
| `/api/wx-signature` | `wx-signature.js` | WeChat API |

### 1.5 `vercel.json` Production Rules

- `cleanUrls: true` — `/about` serves `about.html`
- **No `redirects` block** — intentional (prevents localStorage cross-domain bug; see `PROJECT_BOUNDARIES.md`)
- `send-report.js` `maxDuration: 800` — only function with extended timeout
- API responses: `Cache-Control: no-store`
- Static assets (jpg/png/svg/ico): `max-age=86400`

### 1.6 Vercel Environment Variables (CLI audit)

**Production:**

| Variable | Environments | In Code | Notes |
|----------|--------------|---------|-------|
| `BASE_URL` | Preview, Production | `magic-link.js` | Magic Link base URL |
| `SUPABASE_URL` | **Production only** | All DB APIs | Preview 无此变量 → Preview 不连生产库 |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | All DB APIs | Preview 有 key 但无 URL → 实际隔离 |
| `STRIPE_SECRET_KEY` | Preview, Production | `create-checkout`, `webhook` | Encrypted |
| `STRIPE_WEBHOOK_SECRET` | Preview, Production | `webhook` | Encrypted |
| `RESEND_API_KEY` | Preview, Production | Email APIs | Encrypted |
| `CLAUDE_API_KEY` | Production, Preview | `generate`, `send-report` | Encrypted |
| `WX_APP_ID` | Production only | `wx-signature.js` | WeChat |
| `WX_APP_SECRET` | Production only | `wx-signature.js` | WeChat |

**Referenced in code but NOT in Vercel env list:**

| Variable | Used By | Impact if Missing |
|----------|---------|-------------------|
| `ADMIN_SECRET` | `rewards.js` `admin-adjust` | Admin 手动调积分接口返回 401 |
| `IP_HASH_SALT` | `startup-lab-apply.js` | IP 哈希跳过（非阻断） |
| `STARTUP_LAB_ALLOWED_ORIGINS` | `startup-lab-apply.js` | 可选；默认仅 production origins |
| `ANTHROPIC_MODEL` | `generate.js`, `send-report.js` | 可选；默认 `claude-sonnet-4-6` |

---

## 2. Supabase

### 2.1 Project Identity

| Key | Value |
|-----|-------|
| Project Name | **movingcost-rewards** |
| Environment | **main · PRODUCTION** |
| Plan | **Pro**（Da Vinci 2026-07-11 确认已升级） |
| Access Pattern | **Server-only** — 前端不直连 Supabase；所有 DB 操作经 Vercel `service_role` |

> **Note:** Supabase URL 与 project ref 存于 Vercel 加密变量，仓库内无硬编码 `*.supabase.co`。

### 2.2 Production Tables (confirmed + inferred)

| Table | Used By | Purpose |
|-------|---------|---------|
| `users` | `user.js`, `magic-link.js`, `verify-token.js`, `rewards.js`, `referral.js` | 用户主表 |
| `magic_tokens` | `magic-link.js`, `verify-token.js` | Magic Link 一次性 token |
| `reward_events` | `rewards.js`, `user.js`, `referral.js` | 积分流水 |
| `referrals` | `referral.js` | 推荐归因 |
| `quiz_results` | `user.js` | EarthSoul 测试结果 |
| `support_cases` | `rewards.js` | 客服工单 |
| `report_orders` | `webhook.js`, `send-report.js`, `resend-report.js` | 报告订单与重发 token |
| `startup_lab_applications` | `startup-lab-apply.js` | Startup Lab 申请 |
| `audit_logs` | — | Dashboard 确认存在；代码未直接引用 |
| `redemptions` | — | Dashboard 确认存在；代码未直接引用 |

### 2.3 Database Functions

| Function | Called From App |
|----------|-----------------|
| `recalculate_points_balance(target_user_id uuid)` | `user.js`, `rewards.js`, `referral.js` |
| `generate_referral_code()` | **Not called** — app uses JS-generated codes |
| `fn_update_updated_at()` | Trigger helper |

### 2.4 Security Posture (as of Phase 2 logs)

| Item | Status |
|------|--------|
| `magic_tokens` RLS + REVOKE anon/authenticated | ✅ Batch 1 complete (2026-06-17) |
| `recalculate_points_balance` EXECUTE lockdown | ⏸ Batch 2 **paused** |
| Function `search_path` hardening | ⏸ Batch 3 **not started** |
| Application-layer session auth | ❌ Not implemented — APIs trust `user_id` |

Reference: `reports/movingcost-supabase-phase2-execution-log.txt`

### 2.5 What Supabase Does NOT Store

- **Full $9.90 report body** — generated by Claude, delivered via Resend email
- **Payment card data** — handled entirely by Stripe
- **Stripe webhook business logic for referral rewards** — `friend_purchase_completed` not wired

---

## 3. Resend

### 3.1 Configuration

| Key | Value |
|-----|-------|
| API Key | `RESEND_API_KEY` in Vercel (Production + Preview) |
| From Address | `MovingCOST.ai <reports@movingcost.ai>` |
| Reply-To | `support@movingcost.ai` |
| API Endpoint | `https://api.resend.com/emails` |

### 3.2 Email Flows (Production)

| Flow | Trigger | API |
|------|---------|-----|
| Magic Link login | User submits email on `/login` | `POST /api/magic-link` |
| Welcome email | New user registration | `POST /api/user?action=create` |
| Payment confirmation | Stripe `checkout.session.completed` | `POST /api/webhook` |
| Full relocation report | Post-payment on `/thank-you` | `POST /api/send-report` |
| Report resend (7-day window) | User clicks resend link | `GET /api/resend-report?token=...` |

### 3.3 Domain & DNS (Email Deliverability)

**Verified DNS records for `movingcost.ai`:**

| Record | Status | Value (summary) |
|--------|--------|-----------------|
| SPF (TXT) | ✅ | `v=spf1 include:dc-aa8e722993._spfm.movingcost.ai ~all` (Resend) + Google verification TXT |
| SPF sub-delegate | ✅ | `dc-aa8e722993._spfm.movingcost.ai` → `include:_spf.google.com` |
| DKIM | ✅ | `resend._domainkey.movingcost.ai` — RSA public key present |
| DMARC | ✅ | `v=DMARC1; p=quarantine; ...` |
| MX | ✅ | Google Workspace (`aspmx.l.google.com` + alternates) |

**Consistency check:** All application `from` / `replyTo` / `mailto:` references use `@movingcost.ai` — aligned with Resend domain verification.

---

## 4. Stripe

### 4.1 Configuration

| Key | Value |
|-----|-------|
| Secret Key | `STRIPE_SECRET_KEY` in Vercel (Production + Preview) |
| Webhook Secret | `STRIPE_WEBHOOK_SECRET` in Vercel (Production + Preview) |
| Webhook Endpoint | `https://www.movingcost.ai/api/webhook` |
| Product Price | **$9.90 USD** (`unit_amount: 990`) |

### 4.2 Payment Paths

**Primary (canonical):**

```
planner.html
  → POST /api/create-checkout  (Stripe Checkout Session)
  → success: https://www.movingcost.ai/thank-you?d={base64url}
  → cancel:  https://www.movingcost.ai/planner
  → Stripe webhook → /api/webhook → Resend confirmation email
  → thank-you page → POST /api/send-report → Claude + Resend full report
```

**Fallback (degraded):**

- Payment Link: `https://buy.stripe.com/aFa6oG51x1KUgXT0C2cfK00`
- Used in `planner.html` catch path when Checkout API fails

### 4.3 Stripe ↔ Supabase ↔ Resend Chain

| Step | Platform | Action |
|------|----------|--------|
| 1 | Stripe | `checkout.session.completed` webhook |
| 2 | Vercel `/api/webhook` | Verify signature → send confirmation email (Resend) |
| 3 | Vercel `/api/webhook` | Insert `report_orders` pending row (Supabase, non-fatal) |
| 4 | Browser `/thank-you` | Trigger `/api/send-report` |
| 5 | Vercel `/api/send-report` | Claude generate → Resend deliver → update `report_orders` |

### 4.4 Live vs Test

- Repository contains **no** `sk_live` / `sk_test` strings (correct — secrets only in Vercel).
- Production site serves real domain and real payment flow.
- **Operator action:** Confirm in [Stripe Dashboard](https://dashboard.stripe.com) that webhook endpoint is **Live mode** and points to `https://www.movingcost.ai/api/webhook`.

---

## 5. Domain & DNS

### 5.1 Registrar & Nameservers

| Key | Value |
|-----|-------|
| Domain | `movingcost.ai` |
| Registrar | Third Party (Vercel Domains UI) |
| Nameservers | `ns09.domaincontrol.com`, `ns10.domaincontrol.com` (GoDaddy) |
| Vercel Domain Age | ~54 days (as of audit) |
| Domain Creator (Vercel) | `yunjianname2026` |

### 5.2 DNS Records (observed)

| Host | Type | Resolves To | Purpose |
|------|------|-------------|---------|
| `movingcost.ai` | A | `216.150.1.1` | Vercel apex |
| `www.movingcost.ai` | CNAME | `movingcost.ai.` | WWW → apex chain |
| `movingcost.ai` | MX | Google Workspace | `support@movingcost.ai` inbox |
| `movingcost.ai` | TXT | SPF + Google site verification | Email + Search Console |

### 5.3 Canonical Domain Policy

| Rule | Implementation |
|------|----------------|
| Canonical host | `www.movingcost.ai` |
| Apex behavior | 307 redirect to `www` |
| Code references | Mix of `www` and bare `movingcost.ai` — both resolve correctly via redirect |
| `BASE_URL` default | `https://www.movingcost.ai` (`magic-link.js` fallback) |
| CORS allowed origins | `https://www.movingcost.ai`, `https://movingcost.ai` |

---

## 6. Environment Variables — Cross-Platform Matrix

| Variable | Vercel Prod | Vercel Preview | Supabase | Resend | Stripe | Used In Production Flow |
|----------|-------------|----------------|----------|--------|--------|-------------------------|
| `SUPABASE_URL` | ✅ Prod only | ❌ | ✅ source | — | — | All member/DB APIs |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ source | — | — | All member/DB APIs |
| `RESEND_API_KEY` | ✅ | ✅ | — | ✅ source | — | Email delivery |
| `STRIPE_SECRET_KEY` | ✅ | ✅ | — | — | ✅ source | Checkout + webhook |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ✅ | — | — | ✅ source | Webhook verify |
| `CLAUDE_API_KEY` | ✅ | ✅ | — | — | — | Report generation |
| `BASE_URL` | ✅ | ✅ | — | — | — | Magic Link URLs |
| `WX_APP_ID` / `WX_APP_SECRET` | ✅ Prod only | ❌ | — | — | — | WeChat share signature |
| `ADMIN_SECRET` | ❌ not listed | ❌ | — | — | — | Admin-only (optional) |
| `IP_HASH_SALT` | ❌ not listed | ❌ | — | — | — | Startup Lab (optional) |

**Consistency verdict:** Core revenue + auth + email chain is **aligned**. Preview is intentionally isolated from production Supabase URL.

---

## 7. Backup Strategy

### 7.1 Supabase Pro (primary)

| Capability | Pro Tier | Status |
|------------|----------|--------|
| Daily automated backups | Included | ✅ Assumed active post-upgrade |
| Point-in-Time Recovery (PITR) | Included (Pro) | ✅ Available — retention per Supabase plan settings |
| Manual SQL export | Dashboard → Database → Backups | ✅ Operator can run on demand |

**Operator checklist:**
1. Supabase Dashboard → Project Settings → **confirm plan = Pro**
2. Database → Backups → verify latest backup timestamp
3. Confirm PITR window meets business RPO (recommend documenting chosen retention in v1.1)

### 7.2 Application-Layer Data

| Data | Storage | Backup |
|------|---------|--------|
| User profiles, points, tokens | Supabase | Covered by Supabase backups |
| Report content ($9.90) | **Email only** (Resend delivery) | User inbox = de facto copy; no DB archive |
| Payment records | Stripe Dashboard | Stripe retention + exports |
| Sent email logs | Resend Dashboard | 30-day default (verify in Resend settings) |
| Source code | GitHub `main` | Git history + Vercel deployment history |

### 7.3 Gaps

- No documented off-site Supabase backup export schedule
- No automated `report_orders` → cold storage pipeline
- No infrastructure-as-code for Supabase schema (migrations live in SQL Editor / manual)

---

## 8. Monitoring & Observability

### 8.1 What Exists Today

| Layer | Tool | Coverage |
|-------|------|----------|
| Web analytics | **Google Analytics 4** (`G-22NEPD9J8R`) via `assets/tracking.js` | Page views, CTA clicks, UTM capture |
| Deployment | **Vercel Dashboard** | Build status, function logs, edge cache headers |
| Database | **Supabase Dashboard** | Query performance, advisors, logs |
| Email | **Resend Dashboard** | Delivery, bounces, domain health |
| Payments | **Stripe Dashboard** | Payments, disputes, webhook delivery log |
| API errors | Vercel Function Logs | Per-invocation `console.log` / `console.error` |

### 8.2 What Does NOT Exist

| Gap | Risk |
|-----|------|
| No Sentry / error tracking | Silent API failures may go unnoticed |
| No uptime monitor (Pingdom, Better Uptime, etc.) | Site outage not externally alerted |
| No centralized log aggregation | Cross-platform incident correlation is manual |
| No Stripe webhook failure auto-alert | Missed webhooks require manual Dashboard check |
| No Supabase connection pool / latency alerts | DB issues discovered reactively |

### 8.3 Recommended Minimum (future v1.1)

1. Stripe webhook delivery alert (Stripe Dashboard email notifications — enable if not on)
2. Resend bounce/complaint notification
3. External uptime check on `https://www.movingcost.ai` + `POST /api/magic-link` health
4. Weekly Supabase backup timestamp verification

---

## 9. Four-Platform Consistency Audit

| Check | Vercel | Supabase | Resend | Stripe | Verdict |
|-------|--------|----------|--------|--------|---------|
| Production domain | `www.movingcost.ai` | N/A (API only) | `movingcost.ai` verified | Success URL on `www` | ✅ Aligned |
| HTTPS / HSTS | Enabled | HTTPS API | HTTPS API | HTTPS | ✅ Aligned |
| Secrets in repo | None | None | None | None | ✅ Aligned |
| Preview isolation | Preview lacks `SUPABASE_URL` | Prod DB protected | Shared API keys ⚠ | Shared keys ⚠ | ⚠ Preview uses live Stripe/Resend keys |
| Email sender domain | N/A | N/A | `reports@movingcost.ai` | N/A | ✅ Aligned |
| Payment amount | N/A | N/A | N/A | $9.90 | ✅ Matches code |
| Report recovery | `/api/resend-report` | `report_orders` table | Resend resend | Session ID in webhook | ✅ Aligned |
| Member auth | `/api/magic-link` | `magic_tokens` | Magic Link email | N/A | ✅ Aligned |

**Preview environment note:** Preview deployments share `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` with production-capable values, but lack `SUPABASE_URL` — reducing DB risk. Stripe/Resend preview tests could still hit live accounts if keys are Live mode.

---

## 10. Operator Onboarding — Quick Start

### 10.1 Dashboard URLs

| Platform | URL |
|----------|-----|
| Vercel | [vercel.com/okayus/movingcost-ai](https://vercel.com) |
| Supabase | [supabase.com/dashboard](https://supabase.com/dashboard) → `movingcost-rewards` |
| Resend | [resend.com/domains](https://resend.com/domains) → `movingcost.ai` |
| Stripe | [dashboard.stripe.com](https://dashboard.stripe.com) |
| Google Analytics | [analytics.google.com](https://analytics.google.com) → `G-22NEPD9J8R` |
| GitHub | [github.com/yunjianname2026/movingcost-ai](https://github.com/yunjianname2026/movingcost-ai) |

### 10.2 Deploy Workflow

```
1. PR or direct commit → main (per PROJECT_BOUNDARIES.md governance)
2. Vercel auto-builds → Production alias updates
3. Verify https://www.movingcost.ai
4. For API changes: check Vercel Function logs
5. For payment changes: Stripe webhook test + test purchase
6. For email changes: Resend logs + inbox test
```

### 10.3 Never Do Without Approval

- Modify `vercel.json` `redirects` (localStorage cross-domain bug)
- Change `SUPABASE_URL` target project
- Rotate Stripe webhook secret without updating Vercel
- Execute Supabase Phase 2 Batch 2/3 SQL (currently paused)
- Commit secrets to repository

### 10.4 Related Internal Docs

| Document | Path |
|----------|------|
| Project Constitution | `/PROJECT_BOUNDARIES.md` |
| Supabase Phase 1 Audit | `/reports/movingcost-supabase-security-audit-phase1.txt` |
| Supabase Phase 2 Plan | `/reports/movingcost-supabase-security-audit-phase2-plan.txt` |
| Supabase Phase 2 Execution Log | `/reports/movingcost-supabase-phase2-execution-log.txt` |

---

## 11. Known Gaps & v1.1 Recommendations

| Priority | Item | Recommendation |
|----------|------|----------------|
| P1 | Confirm Stripe Live mode + webhook health | Dashboard verification; document webhook ID |
| P1 | Supabase Pro backup/PITR settings | Screenshot settings into v1.1 appendix |
| P2 | `ADMIN_SECRET` not in Vercel | Add if admin-adjust is needed; else document as intentionally disabled |
| P2 | Preview uses Live Stripe/Resend keys | Consider Test keys for Preview env |
| P2 | No external uptime monitoring | Add free tier uptime check |
| P3 | Supabase Phase 2 Batch 2/3 paused | Resume after member identity fix verified |
| P3 | Mixed `www` vs bare domain in code | Cosmetic; apex redirect covers it |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-07-11 | Cursor Agent (audit) + Da Vinci | Initial production infrastructure audit across Vercel, Supabase Pro, Resend, Stripe |

---

*This document is the single source of truth for MovingCOST.ai production infrastructure as of the audit date. Update to v1.1 when Supabase Pro backup settings are screenshot-confirmed and Stripe Live webhook ID is recorded.*
