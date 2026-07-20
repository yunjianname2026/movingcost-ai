# MovingCOST.ai — Docs Index

**Start here.** This is the docs homepage for every AI engineer (Cursor, Claude, Codex, ChatGPT, Grok) and every human collaborator.

## Mandatory read order (no code before this)

```
Start any new task
        ↓
docs/README.md                          ← you are here
        ↓
docs/production-infrastructure-v1.2.md  ← Production Infrastructure Manual (SSOT)
        ↓
/PROJECT_BOUNDARIES.md                  ← project constitution (repo root)
        ↓
Propose plan → Da Vinci approval → begin coding
```

**Rule:** If you have not completed this read order for the current task, you **must not** modify code.

This prevents repeated clarification, accidental cross-system edits, and production regressions.

---

## Single sources of truth

| Document | Role | Path |
|----------|------|------|
| **Production Infrastructure Manual** | Official production environment & operations (SSOT) | [`production-infrastructure-v1.2.md`](./production-infrastructure-v1.2.md) |
| **Project Boundaries** | System isolation, Git workflow, change governance | [`../PROJECT_BOUNDARIES.md`](../PROJECT_BOUNDARIES.md) |
| Infrastructure Audit v1.0 | Immutable audit baseline (do not rewrite) | [`production-infrastructure-v1.0.md`](./production-infrastructure-v1.0.md) |

The Manual is the **single source of truth for the MovingCOST.ai production environment**.  
Versioning policy: never delete or silently rewrite — evolve as **v1.3 / v2.0**. Prior: v1.1, v1.0 (audit baseline).

---

## After a major module ships

Large modules (Startup Lab, EarthSoul 64, Sponsor Center, etc.) are **not code-only**.

When a major module is completed, also:

1. **Update the Manual** to the next version (e.g. v1.2) with:
   - New Business Flow(s)
   - Deployment notes
   - Related files / env vars if any
2. **Update the Change Log / product history** (month + milestone)

Example future Manual entry:

```
v1.2 — Startup Lab
  - Business Flow
  - Deployment Notes
```

Example Change Log history:

```
2026-07
  - Report Engine 封板
  - Member System 封板
  - Sample Report 上线
  - Startup Lab Beta
  - Production Infrastructure Manual v1.1 Effective
```

---

## Document map

| Area | Document | Status |
|------|----------|--------|
| Docs home | `docs/README.md` | ✅ Current |
| Production Manual | `docs/production-infrastructure-v1.2.md` | ✅ Effective |
| Production Manual (prior) | `docs/production-infrastructure-v1.1.md` | Archived Effective baseline |
| Production Audit | `docs/production-infrastructure-v1.0.md` | ✅ Archived audit baseline |
| Project Constitution | `/PROJECT_BOUNDARIES.md` | ✅ Effective (v2.1+) |
| Article CTA system | `docs/article-cta-system-v1.md` | Reference |
| API Guide | `docs/API_GUIDE.md` | Planned |
| Startup Lab docs | `docs/` (Startup Lab) | Planned / expand with product |
| EarthSoul docs | `docs/` (EarthSoul) | Planned / expand with product |

Related operational reports (not under `docs/`):

| Report | Path |
|--------|------|
| Supabase Phase 1 Audit | `/reports/movingcost-supabase-security-audit-phase1.txt` |
| Supabase Phase 2 Plan | `/reports/movingcost-supabase-security-audit-phase2-plan.txt` |
| Supabase Phase 2 Execution Log | `/reports/movingcost-supabase-phase2-execution-log.txt` |

---

## Production stack (30-second view)

```
GitHub main → Vercel → Supabase Pro (movingcost-rewards)
                    ↘ Stripe Live
                    ↘ Resend
                    ↘ Claude (reports)
```

Canonical URL: `https://www.movingcost.ai`

---

## Before you change anything

1. Complete the **mandatory read order** above
2. Identify which closed system you are in: **Report Engine** | **EarthSoul** | **Member & Rewards**
3. List files you will touch; stop if any file is outside that system
4. Follow Manual §5 (Production Boundaries), §13 (Business Critical Flows), §14 (AI Collaboration Rules)
5. Wait for **Da Vinci approval** before editing critical infrastructure

---

*Maintained by Da Vinci / CLASSIC SPREAD INC*
