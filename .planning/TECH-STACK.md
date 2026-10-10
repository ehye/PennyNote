# PennyNote: Proposed Stack & Hosting

Updated: 2026-10-10
Status: implemented in the codebase; Cloudflare provisioning and production deployment remain pending. See `README.md` for setup.

## Goal
One user can securely access PennyNote from desktop/mobile over home Wi-Fi or 4G, without leaving a home computer running.

## Recommended stack

| Layer | Choice |
|---|---|
| Application | SvelteKit + TypeScript |
| Styling | Plain CSS with shared warm-notebook tokens |
| Charts | Apache ECharts |
| Hosting | Cloudflare Workers + SvelteKit Cloudflare adapter |
| Database | Cloudflare D1 + Drizzle ORM |
| Access control | Cloudflare Access, restricted to the owner's email |
| Deployment | GitHub integration; `main` for production, `dev` for development |

Use one full-stack application, not a separate API service. D1 replaces the earlier local SQLite/better-sqlite3 recommendation for this hosting target. Do not use Node-only native database drivers in Workers.

## Setup outline
1. Convert the static prototype into SvelteKit screens using `.planning/UI-SUMMARY.md`.
2. Configure the Cloudflare adapter and D1 database binding.
3. Define schema and version-controlled Drizzle migrations; use separate development and production data.
4. Implement server-side validation, CRUD, reports, and atomic ledger writes.
5. Connect GitHub deployment: deploy `main` to production; keep development work on `dev` and merge reviewed changes into `main`.
6. Enable Access for the production `workers.dev` hostname; allow only the owner's email. Ensure alternate/preview routes cannot bypass protection.
7. Test authenticated use on desktop, mobile, Wi-Fi, and cellular networks.

No custom domain is required initially. Access can provide email-based browser login; no separate registration flow is needed for this single-user scope. Never expose production financial data through an unprotected demo endpoint.

## Financial data requirements
- Store amounts as integer minor units, with currency-specific precision; never use floating-point arithmetic for money.
- Currency belongs to the account. Account type and currency are immutable after creation.
- Keep different currencies separate; no exchange-rate conversion initially.
- Use stable IDs for accounts/categories so renaming does not break references.
- Categories have two levels; icons belong only to subcategories.
- Derive balances from ledger records; balance edits create adjustment records with before/after values.
- Transfers and adjustments are excluded from income/expense totals.
- Save transfers and adjustment-related changes atomically. Verify D1 transaction/batch semantics before implementation; do not assume local SQLite transaction APIs work unchanged.
- Define the owner's reporting timezone; preserve date-only transaction dates and use inclusive report ranges.

## Cost & constraints
The free tiers are expected to cover normal single-user usage, not guaranteed unlimited hosting. At research time, D1 Free includes 5 GB total storage, 5 million rows read/day, and 100,000 rows written/day. Exceeding daily query limits can interrupt queries until reset. Recheck Workers, D1, and Access pricing/limits before deployment.

Cloud services are managed dependencies even when application libraries are open source. Keep SQL migrations and application code portable where practical. Backup/recovery planning remains deferred, not solved by this recommendation.

## Alternative
Paid Render with Node.js, SvelteKit's Node adapter, SQLite/better-sqlite3, Drizzle, and a persistent disk preserves the original conventional-server approach. It has recurring costs and still needs access control. Do not store production SQLite data on Render Free's ephemeral filesystem; free Render Postgres is also unsuitable for ongoing storage because it expires after 30 days.

## References
- UI contract: `.planning/UI-SUMMARY.md`
- [Cloudflare SvelteKit guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/sveltekit/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [SvelteKit](https://svelte.dev/docs/kit)
- [Drizzle](https://orm.drizzle.team/docs/overview)
- [ECharts](https://echarts.apache.org/handbook/en/)
- [Render Free limitations](https://render.com/docs/free)
