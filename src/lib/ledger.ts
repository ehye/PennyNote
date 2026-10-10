import type { Account, Category, Entry } from './server/schema';
export function balance(accountId: string, entries: Entry[], date: string): number {
  return entries.filter((e) => e.date <= date).reduce((sum, e) => {
    if (e.type === 'Transfer') return sum + (e.destinationId === accountId ? e.amount : 0) - (e.accountId === accountId ? e.amount : 0);
    return sum + (e.accountId === accountId ? (e.type === 'Expense' ? -e.amount : e.amount) : 0);
  }, 0);
}
export function categoryLabel(entry: Entry, categories: Category[]): { name: string; icon: string } {
  if (entry.type === 'Transfer') return { name: 'Transfer', icon: '↔' };
  if (entry.type === 'Adjustment') return { name: 'Balance adjustment', icon: '⚖️' };
  const category = categories.find((c) => c.id === entry.categoryId);
  const parent = categories.find((c) => c.id === category?.parentId);
  return { name: [parent?.name, category?.name].filter(Boolean).join(' / '), icon: category?.icon ?? '' };
}
export function report(entries: Entry[], accounts: Account[], categories: Category[], currency: string, start: string, end: string) {
  const accountIds = new Set(accounts.filter((a) => a.currency === currency).map((a) => a.id));
  const selected = entries.filter((e) => accountIds.has(e.accountId) && e.date >= start && e.date <= end && ['Expense', 'Income'].includes(e.type));
  const expense = selected.filter((e) => e.type === 'Expense');
  const spent = expense.reduce((sum, e) => sum + e.amount, 0);
  const income = selected.filter((e) => e.type === 'Income').reduce((sum, e) => sum + e.amount, 0);
  const groups = Array.from(new Set(expense.map((e) => e.categoryId))).map((id) => {
    const rows = expense.filter((e) => e.categoryId === id);
    return { id: id!, ...categoryLabel(rows[0], categories), amount: rows.reduce((sum, e) => sum + e.amount, 0), entries: rows };
  }).sort((a, b) => b.amount - a.amount);
  const yearly = Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7)) - (Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7))) >= 24;
  const buckets = Array.from(new Set(selected.map((e) => e.date.slice(0, yearly ? 4 : 7)))).sort().map((key) => ({
    key,
    expense: selected.filter((e) => e.date.startsWith(key) && e.type === 'Expense').reduce((sum, e) => sum + e.amount, 0),
    income: selected.filter((e) => e.date.startsWith(key) && e.type === 'Income').reduce((sum, e) => sum + e.amount, 0)
  }));
  return { spent, income, net: income - spent, groups, buckets };
}
export function groupDate(date: string, mode: string): string {
  if (mode === 'Month') return date.slice(0, 7);
  if (mode !== 'Week') return date;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
