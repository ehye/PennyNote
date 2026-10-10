<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Category } from '#lib/server/schema.ts';
  let { category, parentId = '', categories, onsaved }: { category?: Category; parentId?: string; categories: Category[]; onsaved: () => void } = $props();
  const child = $derived(!!(category?.parentId || parentId));
  let pending = $state(false);
</script>
<form method="POST" action="?/category" use:enhance={() => {
  pending = true;
  return async ({ result, update }) => { pending = false; await update({ reset: false }); if (result.type === 'success') onsaved(); };
}}>
  <input type="hidden" name="id" value={category?.id ?? ''} />
  {#if child && category}
    <label>Parent<select name="parentId">{#each categories.filter((c) => !c.parentId) as parent}<option value={parent.id} selected={parent.id === category.parentId}>{parent.name}</option>{/each}</select></label>
  {:else}<input type="hidden" name="parentId" value={parentId} />{/if}
  <label>Name<input name="name" value={category?.name ?? ''} maxlength="80" required /></label>
  {#if child}<label>Icon<input name="icon" value={category?.icon || '📁'} required maxlength="32" /></label>{/if}
  <button class="primary" disabled={pending}>{pending ? 'Saving…' : 'Save category'}</button>
</form>
