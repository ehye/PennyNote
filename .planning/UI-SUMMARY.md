# PennyNote UI Plan Summary

Updated: 2026-10-09
Status: selected static prototype direction; not a production implementation.

## Visual direction

- Warm notebook: cream backgrounds, forest-green accents, muted borders.
- System sans-serif throughout; tighter 4–8px corners.
- Minimal text: clear labels, no motivational paragraphs or redundant prompts.
- Mobile uses available width with **16px side spacing** (latest decision).
- Desktop uses a sidebar; mobile uses bottom navigation.

## Navigation

| Mobile | Desktop |
|---|---|
| Home, Review, Accounts, Settings | Home, Overview, Accounts, Settings |

No dedicated New note navigation item. Home contains the New note button above recent notes. No desktop sidebar account list.

## Home

- Default landing screen on mobile and desktop; no statistics.
- Recent records show category/subcategory and icon, not notes text.
- Show account, date, amount, and edit access.
- Day / Week / Month switches group the same recent records; weeks start Monday.
- Prototype shows the latest 30 records through today; future-dated records are excluded.

## New note / edit

- Expense / Income / Transfer toggle and prominent amount input.
- Account selection determines currency; no separate currency selector.
- Date defaults to today; expense category defaults to the first Food subcategory.
- Categories use grouped parent/subcategory options with icons.
- Notes remain optional, without example placeholder text.
- No templates, recent-notes panel, “How much?” label, or supporting prose.
- Successful saves return home. Transfers select a destination account; prototype supports same-currency transfers only.

## Review / Overview

### Mobile

- Current month's expense pie chart.
- Grouped category list beneath it, with each category's total and overall total spent.
- Expand a group to view/edit its expense records.
- No income summaries, bar charts, advanced filters, or transaction table.

### Desktop

- Month/year and currency filters.
- Expense, income, and net cash-flow summaries.
- Income/expense bar chart and expense-category donut chart.
- No Your notes transaction table or New note shortcut on Overview.

Currencies remain separate; transfers do not count as income or expenses. Prototype report groups use full parent/subcategory paths. Mobile inherits the report currency (USD by default) and labels it in the chart heading.

## Accounts

- Level 1: collapsible account types (Bank debit, Payment app, Stock broker, Cash, Other).
- Level 2: individual accounts with native-currency balance.
- Add/edit controls inside expanded groups; form appears only on request.
- Configure account name, type, and currency on creation; existing account currency cannot be changed.
- No standalone Currencies section.
- Renaming preserves linked notes; accounts used by records cannot be removed.
- Prototype balances start from zero and include recorded movements through today, not live bank balances or investment valuations.

## Settings

- Category configuration only for now.
- Two levels: parent category → subcategory, each with an editable emoji icon.
- Add/edit both levels; new parents receive a General subcategory.
- Renaming/moving subcategories updates linked records.
- Names are unique within their sibling group; Transfer is reserved.

## Prototype and verification

- Source: `.planning/sketches/001-responsive-concepts/index.html`.
- Shared theme: `.planning/sketches/themes/default.css`.
- Preview: `http://localhost:4173/001-responsive-concepts/` when the static server is running.
- Plain HTML/CSS/JavaScript with fictional data and in-memory interactions; reload resets changes.
- JavaScript syntax checked. Chrome MCP visual verification remains blocked because Chrome is unavailable.
- No framework, backend, authentication, persistence, backup, or exchange-rate conversion has been selected or implemented.
