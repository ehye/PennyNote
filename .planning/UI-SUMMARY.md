# PennyNote UI Summary

Updated: 2026-10-10 · Static prototype

## Style & navigation
- Warm notebook only: cream/green, system sans-serif, 4–8px corners, minimal text.
- Mobile: 16px side spacing; Home / Review / Accounts / Settings bottom navigation; no branding header.
- Desktop: Home / Overview / Accounts / Settings sidebar; no account list or New note shortcut.

## Home & notes
- Mobile: monthly spending with eye show/hide toggle and New note button.
- Desktop: blank entry form above recent notes; no New note button.
- Recent notes show category/icon and amount. Day hides row date/account; Week/Month retain them without years. Weeks start Monday; latest 30 non-future notes.
- Entry: Expense / Income / Transfer, amount, account-bound currency, date, subcategory, optional notes. Default today and first Food subcategory; no templates or extra copy. Save returns home.
- Transfers use same-currency accounts; currencies are never combined.

## Review / Overview
- Mobile: current-month expense pie, total spent, expandable category totals and records.
- Desktop: Month default; Month / Year / cross-year date range and currency filters; spending/income/net summaries, cash-flow bars, category donut. No transaction table or introductory copy.
- Pie hover/click (or arrow keys) shows category, amount, and percentage. Mobile inherits the report currency, labeled in the heading.
- Transfers and balance adjustments are excluded from income/expense totals.

## Accounts
- Collapsible account type → accounts with native-currency balances.
- Add inside a type; fixed type on creation. Add/edit uses popup dialogs; no standalone Add account button or Currencies section.
- Edit name/balance; type and currency are immutable and hidden.
- Balance changes create dated adjustment notes with before/after values; nonzero opening balances also create notes.
- Renames preserve linked notes; used accounts cannot be removed. Balances reflect recorded movements through today, not live valuations.

## Settings
- Two-level categories: text-only parent → subcategory with editable icon.
- Add/edit in popup dialogs. Adding within a parent hides/fixes that parent; new parents receive General.
- Renames/moves update linked notes; names unique among siblings; Transfer reserved.

## Prototype
- Source: `.planning/sketches/001-responsive-concepts/index.html`; theme: `.planning/sketches/themes/default.css`.
- Preview: `http://localhost:4173/001-responsive-concepts/` while the server runs.
- Plain HTML/CSS/JS, fictional in-memory data; reload resets changes. Syntax checked; Chrome MCP visual verification pending.
- No production stack, backend, auth, persistence, backup, or exchange-rate conversion.
