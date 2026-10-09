---
sketch: 001
name: responsive-concepts
question: "Does a warm notebook or clean minimal direction better encourage daily recording while supporting desktop review?"
winner: "A"
tags: [mobile, desktop, entry, reports, visual-direction]
---

# PennyNote responsive concepts

Open `index.html` using a static server. Both mobile and desktop start on recent notes with a New note button. Reports remain available through Review/Overview navigation, not on the home page. Successful saves return home.

- **A: Warm notebook (selected)** — cream, forest green, system sans-serif, tighter corners.
- **B: Clean minimal** — white, blue, sans-serif headings, tighter corners.

Current decisions are consolidated in [`../../UI-SUMMARY.md`](../../UI-SUMMARY.md); that summary supersedes earlier iteration notes below.
Selected: A (Warm notebook). Keep entry copy minimal and omit recent notes from the entry screen.
Visible in-memory interactions: add/edit records, Day/Week/Month grouping, report filters/charts, account management, and two-level category settings. Reload resets all data. Transfers only support same-currency accounts in this sketch.

All figures are fictional. Full-year sample data includes all months, not a year-to-date statement.
No framework, backend, authentication, exchange-rate conversion, or persistence.

Accounts screen: add/edit account names and types, add recognized currency codes, remove unused accounts/currencies. Account currency is immutable when editing to avoid relabeling existing amounts. Rename updates linked sample records. Accounts/currencies used by notes cannot be deleted. All configuration resets on reload.
Account types are collapsed first-level groups. Expanding reveals second-level accounts and management controls. Add/edit forms appear inside the chosen group only on demand.
Currencies section is hidden on the Accounts screen. Each account displays its native-currency balance, computed from notes through today (zero opening balance); transfers debit the source and credit the destination. Future-dated sample notes are excluded. This is a recorded cash balance, not a live bank or broker valuation.
Desktop retains summaries, time/currency filters, income/expense bars, and category donut; the transaction table and search are hidden. Changing viewport restores the previous desktop period. Mobile inherits the report currency (USD by default), never combines currencies, and labels it in the chart heading.
Mobile Review now replaces the percentage legend with a category-grouped expense list below the pie chart. Shows total spent and each category's expense total. Expand categories to view and edit their notes. Income and transfers are excluded; values stay in the selected report currency.
New notes select from all accounts; currency is derived from the account, not a separate field. Transfers offer destination accounts in the source currency. Desktop home retains New note above recent notes; sidebar entry shortcut and sidebar account list are hidden. Overview omits the transaction table and entry shortcut.
Settings screen is available in mobile and desktop navigation. Categories can be added and renamed; renaming updates existing notes and report groups. Category names are case-insensitively unique, and Transfer is reserved. New notes default to Food when available, otherwise the first category. Configuration remains in memory only.
Categories now support two levels and editable emoji icons. Settings shows collapsible parent categories with child subcategories. Both levels can be added/edited; the note form groups children under parents. Reports display full parent/child paths. Renaming or moving a subcategory updates linked notes. New parents get a General subcategory; duplicate names are checked within each sibling group.
Home recent notes show category paths and icons instead of note text. Day/Week/Month switches group the same latest 30 non-future notes; weeks start Monday. Account, date, amount, and edit access remain visible. Notes text is retained in the edit form.
Warm notebook refinement: system sans-serif throughout, tighter 4–8px corners, full available mobile width with 16px side spacing. Cream/green palette retained.
