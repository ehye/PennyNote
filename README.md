# PennyNote

A private, responsive spending notebook. SvelteKit + TypeScript, Cloudflare Workers/D1, Drizzle, and ECharts. Warm-notebook styling; mobile recording and desktop reports.

## Local development

Requires Node.js 22.17+ (Node 24 recommended).

```sh
npm ci
npm run db:migrate
npm run dev
```

Open `http://localhost:5173`. Local D1 persists under `.wrangler/`; no financial demo data is inserted. Default categories are created by migrations. Add accounts inside their type groups, then record notes. Vite development intentionally skips Cloudflare Access: **do not expose the development server publicly**.

Copy `.dev.vars.example` to `.dev.vars` to customize your reporting timezone (default `Asia/Taipei`). Dates are calendar dates in that timezone; reports do not convert currencies.

```sh
npm run check
npm test
npm run build
```

Validated: 23 money/ledger/Access/migration tests, clean type check, production build, local and remote D1 migrations, and HTTP form/persistence/CSRF checks. Visual browser testing remains pending because Chrome is unavailable in the development environment. Charts are lazy-loaded; ECharts currently produces a non-blocking bundle-size warning.

## Production on Cloudflare

1. Sign in with `npx wrangler login`, then create D1: `npx wrangler d1 create pennynote`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID. Do not bind development/preview environments to production data.
3. Set `REPORT_TIMEZONE` in `wrangler.jsonc` to your preferred IANA timezone.
4. In Cloudflare Zero Trust, create an Access application for the Worker hostname. Allow only your email, using email one-time PIN or an identity provider. Obtain the team domain and application audience tag.
5. Set Worker secrets `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and `OWNER_EMAIL` using `npx wrangler secret put NAME` for each. Team domain example: `your-team.cloudflareaccess.com` (no `https://`).
6. Apply migrations with `npm run db:migrate:production`; deploy with `npm run deploy`. If secrets must be set after the first deployment, the app returns 503 until configured—no data is exposed.
7. Enable Access protection on the `workers.dev` address. Keep preview URLs disabled (configured in `wrangler.jsonc`). If adding a custom domain, protect that too.
8. In Workers Builds, connect this GitHub repository and select **`main`** as the production branch. Build command: `npm run build`; deploy command: `npx wrangler deploy`. Run remote migrations deliberately before deploying schema-dependent code. Do not auto-deploy `dev` against production D1.
9. Verify login, logout, a rejected non-owner login, refresh persistence, and use on mobile/cellular. Direct requests without a valid Access JWT must return 401/403; unconfigured production returns 503.

The app verifies Access JWT signatures, issuer, audience, expiry, and owner email server-side. Alternate hostnames cannot bypass this check. No credentials or Cloudflare resources are supplied in this repository. Hosting is **not** automatically provisioned by pushing `main`.

## Data integrity

- Integer minor-unit amounts with currency-specific precision; account currency/type are immutable.
- Transfers are a single atomic ledger record referencing both same-currency accounts.
- Balances derive from records through today. Account balance edits create read-only adjustment notes; opening zero balances create no note.
- SQLite triggers atomically calculate balance-change deltas. Optimistic versions reject stale note/account edits, including edits after another tab changes account movements.
- Reports exclude transfers/adjustments; account/category renames preserve stable references. Used accounts cannot be deleted.
- Schema migrations are in `drizzle/`. `npm run db:generate` generates schema changes; custom indexes/triggers must be maintained explicitly.
- Keep trigger CASE expressions parenthesized (`SELECT (CASE … END);`): remote D1 can misparse bare `SELECT CASE … END;` as a trigger terminator, even when local SQLite accepts it.

Backup/export and restore tooling, offline recording, attachments, and currency conversion are not implemented. Configure and test a database recovery process before relying on the app for irreplaceable records.

## References

- [UI summary](.planning/UI-SUMMARY.md)
- [Stack decisions](.planning/TECH-STACK.md)
- Original static prototype: `.planning/sketches/001-responsive-concepts/index.html`

Development branch: `dev`. Production branch: `main`.
