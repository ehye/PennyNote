<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Account } from '#lib/server/schema.ts';
  import { currencies, moneyInput } from '#lib/money.ts';
  let { account, type, currentBalance = 0, onsaved }: { account?: Account; type: string; currentBalance?: number; onsaved: () => void } = $props();
  let pending = $state(false);
</script>
<form method="POST" action="?/account" use:enhance={() => {
  pending = true;
  return async ({ result, update }) => { pending = false; await update({ reset: false }); if (result.type === 'success') onsaved(); };
}}>
  <input type="hidden" name="id" value={account?.id ?? ''} />
  <input type="hidden" name="version" value={account?.version ?? ''} />
  {#if !account}<input type="hidden" name="type" value={type} /><p>{type}</p>{/if}
  <div class="fields">
    <label class="full">Name<input name="name" value={account?.name ?? ''} maxlength="80" required /></label>
    {#if !account}<label>Currency<select name="currency">{#each currencies as currency}<option>{currency}</option>{/each}</select></label>{/if}
    <label>Balance{#if account} ({account.currency}){/if}<input name="balance" value={account ? moneyInput(currentBalance, account.currency) : '0'} inputmode="decimal" required /></label>
  </div>
  <button class="primary" disabled={pending}>{pending ? 'Saving…' : 'Save account'}</button>
</form>
{#if account}
  <form method="POST" action="?/deleteAccount" use:enhance={({ cancel }) => {
    if (!confirm('Remove this unused account?')) { cancel(); return; }
    return async ({ result, update }) => { await update(); if (result.type === 'success') onsaved(); };
  }}>
    <input type="hidden" name="id" value={account.id} /><input type="hidden" name="version" value={account.version} />
    <button class="danger">Remove account</button>
  </form>
{/if}
