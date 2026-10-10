<script lang="ts">
  import { onMount } from 'svelte';
  import type { EChartsType } from 'echarts/core';
  import { money, precision } from '#lib/money.ts';
  let { kind = 'pie', groups = [], buckets = [], currency, donut = false }: {
    kind?: 'pie' | 'bar'; groups?: { name: string; amount: number }[];
    buckets?: { key: string; income: number; expense: number }[]; currency: string; donut?: boolean
  } = $props();
  let host: HTMLDivElement;
  let chart = $state<EChartsType>();
  let inspect = $state(-1);
  const colors = ['#245745', '#c78c54', '#829a70', '#d7b97b', '#698f94', '#b37978', '#a7ac7b'];
  let total = $derived(groups.reduce((sum, g) => sum + g.amount, 0));
  function inspectIndex(index: number) {
    if (!groups.length) return;
    inspect = (index + groups.length) % groups.length;
    chart?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: inspect });
  }
  onMount(() => {
    let disposed = false;
    let observer: ResizeObserver;
    void import('#lib/charts.ts').then(({ createChart }) => {
      if (disposed) return;
      chart = createChart(host);
      chart.on('click', (event) => { if (typeof event.dataIndex === 'number') inspectIndex(event.dataIndex); });
      observer = new ResizeObserver(() => chart?.resize()); observer.observe(host);
    });
    return () => { disposed = true; observer?.disconnect(); chart?.dispose(); };
  });
  $effect(() => {
    if (!chart) return;
    inspect = -1;
    const factor = 10 ** precision(currency);
    chart.setOption(kind === 'pie' ? {
      color: colors, aria: { enabled: true },
      tooltip: { trigger: 'item', renderMode: 'richText', formatter: (p: any) => `${p.name}\n${money(p.value, currency)} · ${p.percent}%` },
      series: [{ type: 'pie', radius: donut ? ['48%', '75%'] : '75%', label: { show: false }, data: groups.map((g) => ({ name: g.name, value: g.amount })) }]
    } : {
      color: [colors[0], colors[1]], aria: { enabled: true }, tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: (v: any) => money(Math.round(Number(v) * factor), currency) },
      legend: { data: ['Income', 'Expense'] }, grid: { left: 60, right: 16, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: buckets.map((b) => b.key) }, yAxis: { type: 'value' },
      series: ['Income', 'Expense'].map((name) => ({ name, type: 'bar', data: buckets.map((b) => (name === 'Income' ? b.income : b.expense) / factor) }))
    }, { notMerge: true });
  });
</script>
<div class="chart" bind:this={host}></div>
{#if kind === 'pie' && groups.length}
  <button class="chart-inspector" onkeydown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); inspectIndex(inspect + (e.key === 'ArrowRight' ? 1 : -1)); } }} onclick={() => inspectIndex(inspect + 1)}>
    {#if inspect >= 0 && groups[inspect]}{groups[inspect].name} · {money(groups[inspect].amount, currency)} · {total ? (groups[inspect].amount / total * 100).toFixed(1) : 0}%{:else}Inspect categories →{/if}
  </button>
{/if}
