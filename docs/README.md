# MovingCOST.ai — Docs Index

**Start here.** Every AI engineer and human collaborator should read documentation in this order before changing important production surfaces:

```
1. docs/README.md                          ← you are here
2. docs/production-infrastructure-v1.1.md  ← production environment (SSOT)
3. /PROJECT_BOUNDARIES.md                  ← project constitution (repo root)
```

---

## Single sources of truth

| Document | Role | Path |
|----------|------|------|
| **Production Infrastructure Manual** | Official production environment & operations | [`production-infrastructure-v1.1.md`](./production-infrastructure-v1.1.md) |
| **Project Boundaries** | System isolation, Git workflow, change governance | [`../PROJECT_BOUNDARIES.md`](../PROJECT_BOUNDARIES.md) |
| Infrastructure Audit v1.0 | Immutable audit baseline (do not rewrite) | [`production-infrastructure-v1.0.md`](./production-infrastructure-v1.0.md) |

This Manual is the **single source of truth for the MovingCOST.ai production environment**.  
Versioning policy: never delete or silently rewrite — evolve as **v1.2 / v1.3 / v2.0**.

---

## Document map

| Area | Document | Status |
|------|----------|--------|
| Docs home | `docs/README.md` | ✅ Current |
| Production Manual | `docs/production-infrastructure-v1.1.md` | ✅ Effective |
| Production Audit | `docs/production-infrastructure-v1.0.md` | ✅ Archived baseline |
| Project Constitution | `/PROJECT_BOUNDARIES.md` | ✅ Effective |
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

1. Identify which closed system you are in: **Report Engine** | **EarthSoul** | **Member & Rewards**
2. List files you will touch; stop if any file is outside that system
3. Follow Manual §5 (Production Boundaries) and §14 (AI Collaboration Rules)
4. Wait for **Da Vinci approval** before editing critical infrastructure

---

*Maintained by Da Vinci / CLASSIC SPREAD INC*
