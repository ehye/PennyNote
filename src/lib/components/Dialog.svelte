<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input:not([type="hidden"]), select, textarea')?.focus();
  });
</script>

<dialog bind:this={dialog} onclose={onclose} aria-label={title} onclick={(event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}}>
  <header><h2>{title}</h2><button type="button" aria-label="Close dialog" onclick={() => dialog.close()}>×</button></header>
  {@render children()}
</dialog>
