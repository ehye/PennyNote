<script lang="ts">
  import type { Account, Category, Entry } from '#lib/server/schema.ts';
  import { categoryLabel } from '#lib/ledger.ts';
  import { money } from '#lib/money.ts';
  let { entries, accounts, categories, mode = 'Day', onedit }: { entries: Entry[]; accounts: Account[]; categories: Category[]; mode?: string; onedit: (entry: Entry) => void } = $props();
</script>
<div class="notes">
  {#each entries as entry (entry.id)}
    {@const account = accounts.find((a) => a.id === entry.accountId)!}
    {@const category = categoryLabel(entry, categories)}
    <div class="note-row">
      <span class="category"><span class="icon">{category.icon}</span>{category.name}{#if mode !== 'Day'}<small>{entry.date.slice(5).replace('-', '/')} · {account.name}</small>{/if}</span>
      <button class="amount" class:income={entry.type === 'Income' || (entry.type === 'Adjustment' && entry.amount > 0)} onclick={() => onedit(entry)} aria-label={`View or edit ${category.name}, ${money(entry.amount, account.currency)}`}>
        {entry.type === 'Income' || entry.type === 'Adjustment' && entry.amount > 0 ? '+' : ''}{money(entry.amount, account.currency)}
      </button>
    </div>
  {/each}
</div>
