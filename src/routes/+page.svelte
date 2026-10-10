<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import type { PageData, ActionData } from './$types';
  import type { Account, Category, Entry } from '#lib/server/schema.ts';
  import { accountTypes, money } from '#lib/money.ts';
  import { balance, groupDate, report } from '#lib/ledger.ts';
  import Dialog from '#lib/components/Dialog.svelte';
  import AccountForm from '#lib/components/AccountForm.svelte';
  import CategoryForm from '#lib/components/CategoryForm.svelte';
  import EntryForm from '#lib/components/EntryForm.svelte';
  import Notes from '#lib/components/Notes.svelte';
  import Chart from '#lib/components/Chart.svelte';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  const initial = untrack(() => data);
  let view = $derived(page.url.searchParams.get('view') || 'home');
  let mode = $state('Day');
  let hideSpending = $state(false);
  let dialog = $state<'account' | 'category' | 'entry' | null>(null);
  let editingAccount = $state<Account>();
  let accountType = $state('');
  let editingCategory = $state<Category>();
  let parentId = $state('');
  let editingEntry = $state<Entry>();
  let formKey = $state(0);
  let reportMode = $state('Month');
  let month = $state(initial.today.slice(0, 7));
  let year = $state(Number(initial.today.slice(0, 4)));
  let start = $state(`${initial.today.slice(0, 7)}-01`);
  let end = $state(initial.today);
  let currency = $state(initial.accounts.find((a) => a.currency === 'USD')?.currency ?? initial.accounts[0]?.currency ?? 'USD');
  let currencyOptions = $derived(Array.from(new Set(data.accounts.map((a) => a.currency))).sort());
  const navigation = [{ id: 'home', name: 'Home', icon: '⌂' }, { id: 'review', name: 'Overview', icon: '◔' }, { id: 'accounts', name: 'Accounts', icon: '▣' }, { id: 'settings', name: 'Settings', icon: '⚙' }];
  let recent = $derived(data.entries.filter((e) => e.date <= data.today).slice(0, 30));
  let recentGroups = $derived(Array.from(new Set(recent.map((e) => groupDate(e.date, mode)))).map((key) => ({ key, entries: recent.filter((e) => groupDate(e.date, mode) === key) })));
  let monthlyTotals = $derived(currencyOptions.map((c) => ({ currency: c, amount: report(data.entries, data.accounts, data.categories, c, `${data.today.slice(0, 7)}-01`, data.today).spent })));
  function monthEnd(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) return data.today;
    return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5)), 0)).toISOString().slice(0, 10);
  }
  let reportStart = $derived(reportMode === 'Range' ? start : reportMode === 'Year' ? `${year}-01-01` : `${month}-01`);
  let reportEnd = $derived(reportMode === 'Range' ? end : reportMode === 'Year' ? `${year}-12-31` : monthEnd(month));
  let desktopReport = $derived(report(data.entries, data.accounts, data.categories, currency, reportStart, reportEnd));
  let mobileReport = $derived(report(data.entries, data.accounts, data.categories, currency, `${data.today.slice(0, 7)}-01`, data.today));
  function openAccount(type: string, account?: Account) { accountType = type; editingAccount = account; dialog = 'account'; }
  function openCategory(parent = '', category?: Category) { parentId = parent; editingCategory = category; dialog = 'category'; }
  function openEntry(entry?: Entry) { editingEntry = entry; dialog = 'entry'; }
  async function noteSaved() { dialog = null; formKey++; await goto('/'); }
  function heading(key: string) {
    if (mode === 'Month') return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en', { month: 'long', timeZone: 'UTC' });
    return `${mode === 'Week' ? 'Week of ' : ''}${new Date(`${key}T00:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  }
</script>

<svelte:head><title>PennyNote</title><meta name="description" content="Your private spending notebook" /></svelte:head>
<div class="layout">
  <aside><h1>PennyNote<span>YOUR MONEY NOTEBOOK</span></h1><nav aria-label="Main navigation">{#each navigation as item}<a class:active={view === item.id} href={item.id === 'home' ? '/' : `/?view=${item.id}`}><span>{item.icon}</span><span class="desktop-only">{item.name}</span><span class="mobile-only">{item.id === 'review' ? 'Review' : item.name}</span></a>{/each}</nav></aside>
  <main>
    {#if form?.message && !dialog}<p class="notice" class:error={!form.success} role="status">{form.message}</p>{/if}
    {#if view === 'home'}
      <header class="home-header"><h2 class="desktop-only">Recent notes</h2><div class="mobile-only month-spend"><span>This month</span><strong>{hideSpending ? '••••' : monthlyTotals.map((t) => money(t.amount, t.currency)).join(' · ') || money(0, currency)}</strong><button aria-label={hideSpending ? 'Show monthly spending' : 'Hide monthly spending'} aria-pressed={hideSpending} onclick={() => hideSpending = !hideSpending}>{hideSpending ? '◉' : '◎'}</button></div><button class="primary mobile-only" onclick={() => openEntry()}>＋ New note</button></header>
      <section class="card desktop-only inline-entry">{#key formKey}<EntryForm accounts={data.accounts} categories={data.categories} today={data.today} onsaved={noteSaved} />{/key}</section>
      <div class="segmented compact" aria-label="Group recent notes">{#each ['Day', 'Week', 'Month'] as value}<button class:active={mode === value} onclick={() => mode = value}>{value}</button>{/each}</div>
      {#each recentGroups as group}<section class="note-group"><h3>{heading(group.key)}</h3><Notes entries={group.entries} accounts={data.accounts} categories={data.categories} {mode} onedit={openEntry} /></section>{/each}
      {#if !recent.length}<p class="empty">No notes yet.</p>{/if}
    {:else if view === 'accounts'}
      <header><h2>Accounts</h2></header>
      {#each accountTypes as type}<details class="card account-group" open><summary>{type}<small>{data.accounts.filter((a) => a.type === type).length}</small></summary><div class="group-content">
        {#each data.accounts.filter((a) => a.type === type) as account}<div class="account-row"><button onclick={() => openAccount(type, account)}>{account.name}<small>{account.currency}</small></button><button class="amount" onclick={() => openAccount(type, account)}>{money(balance(account.id, data.entries, data.today), account.currency)}</button></div>{/each}
        <button class="text-button" onclick={() => openAccount(type)}>＋ Add account</button>
      </div></details>{/each}
    {:else if view === 'settings'}
      <header><h2>Categories</h2></header>
      {#each data.categories.filter((c) => !c.parentId) as parent}<details class="card" open><summary>{parent.name}</summary><div class="group-content"><button class="text-button" onclick={() => openCategory('', parent)}>Edit category</button>
        {#each data.categories.filter((c) => c.parentId === parent.id) as child}<div class="account-row"><span>{child.icon} {child.name}</span><button onclick={() => openCategory('', child)}>Edit</button></div>{/each}
        <button class="text-button" onclick={() => openCategory(parent.id)}>＋ Add subcategory</button>
      </div></details>{/each}
      <button class="primary" onclick={() => openCategory()}>＋ Add category</button>
    {:else if view === 'review'}
      <header><h2 class="desktop-only">Overview</h2><h2 class="mobile-only">{new Date(`${data.today}T00:00:00Z`).toLocaleDateString('en', { month: 'long', timeZone: 'UTC' })} · {currency}</h2><label class="currency-filter"><span class="sr-only">Report currency</span><select bind:value={currency}>{#each currencyOptions.length ? currencyOptions : ['USD'] as c}<option>{c}</option>{/each}</select></label></header>
      <div class="desktop-only">
        <div class="filters"><label>Period<select bind:value={reportMode}><option>Month</option><option>Year</option><option>Range</option></select></label>
          {#if reportMode === 'Month'}<label>Month<input type="month" bind:value={month} required /></label>{:else if reportMode === 'Year'}<label>Year<input type="number" min="1900" max="9999" bind:value={year} /></label>{:else}<label>From<input type="date" bind:value={start} /></label><label>Through<input type="date" bind:value={end} min={start} /></label>{/if}
        </div>
        {#if reportStart > reportEnd}<p class="notice error">End date must be on or after the start date.</p>{/if}
        <div class="stats"><section class="card"><small>Spent</small><strong>{money(desktopReport.spent, currency)}</strong></section><section class="card"><small>Income</small><strong>{money(desktopReport.income, currency)}</strong></section><section class="card"><small>Net cash flow</small><strong>{money(desktopReport.net, currency)}</strong></section></div>
        <div class="report-charts"><section class="card"><h3>Cash flow</h3><Chart kind="bar" buckets={desktopReport.buckets} {currency} /></section><section class="card"><h3>Spending by category</h3><Chart groups={desktopReport.groups} {currency} donut /><div class="legend">{#each desktopReport.groups as group}<div><span>{group.icon} {group.name}</span><strong>{money(group.amount, currency)}</strong></div>{/each}</div></section></div>
      </div>
      <div class="mobile-only"><section class="card"><Chart groups={mobileReport.groups} {currency} /><div class="total"><span>Total spent</span><strong>{money(mobileReport.spent, currency)}</strong></div></section>{#each mobileReport.groups as group}<details class="card"><summary>{group.icon} {group.name}<strong>{money(group.amount, currency)}</strong></summary><Notes entries={group.entries} accounts={data.accounts} categories={data.categories} mode="Month" onedit={openEntry} /></details>{/each}{#if !mobileReport.groups.length}<p class="empty">No spending this month.</p>{/if}</div>
    {:else}<p>Page not found. <a href="/">Home</a></p>{/if}
  </main>
</div>

{#if dialog}
  <Dialog title={dialog === 'account' ? (editingAccount ? 'Edit account' : 'Add account') : dialog === 'category' ? (editingCategory ? 'Edit category' : parentId ? 'Add subcategory' : 'Add category') : editingEntry?.type === 'Adjustment' ? 'Balance change' : editingEntry ? 'Edit note' : 'New note'} onclose={() => dialog = null}>
    {#if form?.message && !form.success}<p class="notice error" role="alert">{form.message}</p>{/if}
    {#if dialog === 'account'}<AccountForm account={editingAccount} type={accountType} currentBalance={editingAccount ? balance(editingAccount.id, data.entries, data.today) : 0} onsaved={() => dialog = null} />
    {:else if dialog === 'category'}<CategoryForm category={editingCategory} {parentId} categories={data.categories} onsaved={() => dialog = null} />
    {:else if editingEntry?.type === 'Adjustment'}
      {@const account = data.accounts.find((a) => a.id === editingEntry?.accountId)!}
      <p>{account.name} · {editingEntry.date}</p><p>{editingEntry.notes}</p><div class="total"><span>{money(editingEntry.balanceBefore ?? 0, account.currency)} → {money(editingEntry.balanceAfter ?? 0, account.currency)}</span><strong>{money(editingEntry.amount, account.currency)}</strong></div>
    {:else}<EntryForm accounts={data.accounts} categories={data.categories} today={data.today} entry={editingEntry} onsaved={noteSaved} />{/if}
  </Dialog>
{/if}
