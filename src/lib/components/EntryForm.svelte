<script lang="ts">
  import { enhance } from '$app/forms';
  import { untrack } from 'svelte';
  import type { Account, Category, Entry } from '#lib/server/schema.ts';
  import { moneyInput, precision } from '#lib/money.ts';
  let { accounts, categories, today, entry, onsaved }: { accounts: Account[]; categories: Category[]; today: string; entry?: Entry; onsaved: () => void } = $props();
  const initial = untrack(() => ({ entry, accounts, categories }));
  let type = $state(initial.entry?.type ?? 'Expense');
  let accountId = $state(initial.entry?.accountId ?? initial.accounts[0]?.id ?? '');
  let account = $derived(accounts.find((a) => a.id === accountId));
  let pending = $state(false);
  const food = initial.categories.find((c) => !c.parentId && c.name === 'Food');
  const defaultCategory = initial.categories.find((c) => c.parentId === food?.id) ?? initial.categories.find((c) => c.parentId);
  let categoryId = $state(initial.entry?.categoryId ?? defaultCategory?.id ?? '');
  let destinationId = $state(initial.entry?.destinationId ?? '');
</script>
{#if accounts.length === 0}<p>Add an account to start recording.</p>
{:else}
  <form class="entry-form" method="POST" action="?/entry" use:enhance={() => {
    pending = true;
    return async ({ result, update }) => { pending = false; await update(); if (result.type === 'success') onsaved(); };
  }}>
    <input type="hidden" name="id" value={entry?.id ?? ''} /><input type="hidden" name="version" value={entry?.version ?? ''} />
    <div class="segmented">
      {#each ['Expense', 'Income', 'Transfer'] as option}
        <label class:active={type === option}><input type="radio" name="type" value={option} bind:group={type} />{option}</label>
      {/each}
    </div>
    <label class="amount-input"><span>{account?.currency ?? 'Amount'}</span><input aria-label="Amount" name="amount" inputmode="decimal" value={entry && account ? moneyInput(entry.amount, account.currency) : ''} required placeholder={account ? (0).toFixed(precision(account.currency)) : '0'} /></label>
    <div class="fields">
      <label>Account<select name="accountId" bind:value={accountId}>{#each accounts as a}<option value={a.id}>{a.name} · {a.currency}</option>{/each}</select></label>
      <label>Date<input type="date" name="date" value={entry?.date ?? today} required min="1900-01-01" /></label>
      {#if type === 'Transfer'}
        <label>To<select name="destinationId" bind:value={destinationId} required><option value="" disabled>Choose account</option>{#each accounts.filter((a) => a.currency === account?.currency && a.id !== accountId) as a}<option value={a.id}>{a.name}</option>{/each}</select></label>
      {:else}
        <label>Category<select name="categoryId" bind:value={categoryId} required>{#each categories.filter((c) => !c.parentId) as parent}<optgroup label={parent.name}>{#each categories.filter((c) => c.parentId === parent.id) as child}<option value={child.id}>{child.icon} {child.name}</option>{/each}</optgroup>{/each}</select></label>
      {/if}
      <label class="full">Notes<textarea name="notes" maxlength="1000" rows="1">{entry?.notes ?? ''}</textarea></label>
    </div>
    <button class="primary" disabled={pending}>{pending ? 'Saving…' : 'Save note'}</button>
  </form>
  {#if entry}
    <form method="POST" action="?/deleteEntry" use:enhance={({ cancel }) => {
      if (!confirm('Delete this note?')) { cancel(); return; }
      return async ({ result, update }) => { await update(); if (result.type === 'success') onsaved(); };
    }}><input type="hidden" name="id" value={entry.id} /><input type="hidden" name="version" value={entry.version} /><button class="danger">Delete note</button></form>
  {/if}
{/if}
