import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { readFileSync, readdirSync } from 'node:fs';
import type { D1Database } from '@cloudflare/workers-types';
import { database, snapshot, saveAccount, saveEntry, saveCategory, deleteAccount, deleteEntry } from '../src/lib/server/service';
import { balance, report } from '../src/lib/ledger';

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: ReturnType<typeof database>;
const form = (values: Record<string, unknown>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, String(value));
  return data;
};
const date = '2026-10-10';
beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  db = database(proxy.env.DB);
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) await proxy.env.DB.prepare(statement).run();
    }
  }
}, 30000);
afterAll(async () => { await proxy?.dispose(); });

describe('persistent ledger mutations on isolated D1', () => {
  it('creates zero/nonzero opening balances and blocks duplicate account names', async () => {
    await saveAccount(db, form({ name: 'Wallet', type: 'Cash', currency: 'USD', balance: '0' }), date);
    expect((await snapshot(db)).entries).toHaveLength(0);
    await saveAccount(db, form({ name: 'Bank', type: 'Bank debit', currency: 'USD', balance: '100.25' }), date);
    const state = await snapshot(db);
    expect(state.entries).toHaveLength(1);
    const bank = state.accounts.find((a) => a.name === 'Bank')!;
    expect(balance(bank.id, state.entries, date)).toBe(10025);
    await expect(saveAccount(db, form({ name: 'bank', type: 'Cash', currency: 'USD', balance: '0' }), date)).rejects.toThrow();
  });
  it('records both transfer sides atomically and rejects cross-currency transfers', async () => {
    await saveAccount(db, form({ name: 'Yen', type: 'Cash', currency: 'JPY', balance: '0' }), date);
    const state = await snapshot(db), bank = state.accounts.find((a) => a.name === 'Bank')!, wallet = state.accounts.find((a) => a.name === 'Wallet')!;
    await saveEntry(db, form({ type: 'Transfer', accountId: bank.id, destinationId: wallet.id, date, amount: '20.00' }));
    const next = await snapshot(db);
    expect(balance(bank.id, next.entries, date)).toBe(8025);
    expect(balance(wallet.id, next.entries, date)).toBe(2000);
    await expect(saveEntry(db, form({ type: 'Transfer', accountId: bank.id, destinationId: state.accounts.find((a) => a.currency === 'JPY')!.id, date, amount: '1' }))).rejects.toThrow('same currency');
    await expect(saveEntry(db, form({ type: 'Transfer', accountId: bank.id, destinationId: bank.id, date, amount: '1' }))).rejects.toThrow();
  });
  it('rejects stale balances and creates exact before/after adjustment notes', async () => {
    const state = await snapshot(db), bank = state.accounts.find((a) => a.name === 'Bank')!;
    await saveEntry(db, form({ type: 'Expense', accountId: bank.id, categoryId: 'food-general', date, amount: '0.29' }));
    await expect(saveAccount(db, form({ id: bank.id, version: bank.version, name: bank.name, balance: '50' }), date)).rejects.toThrow('another tab');
    const current = (await snapshot(db)).accounts.find((a) => a.id === bank.id)!;
    await saveAccount(db, form({ id: bank.id, version: current.version, name: 'Renamed bank', balance: '50', currency: 'JPY', type: 'Other' }), date);
    const next = await snapshot(db), renamed = next.accounts.find((a) => a.id === bank.id)!;
    expect(renamed.currency).toBe('USD'); expect(renamed.type).toBe('Bank debit');
    expect(balance(bank.id, next.entries, date)).toBe(5000);
    const adjustment = next.entries.find((e) => e.type === 'Adjustment' && e.notes === 'Balance change')!;
    expect(adjustment.balanceBefore).toBe(7996); expect(adjustment.balanceAfter).toBe(5000); expect(adjustment.amount).toBe(-2996);
    expect(report(next.entries, next.accounts, next.categories, 'USD', date, date).spent).toBe(29);
    await expect(deleteEntry(db, form({ id: adjustment.id, version: adjustment.version }))).rejects.toThrow();
  });
  it('does not insert an adjustment if the balance is unchanged', async () => {
    const state = await snapshot(db), bank = state.accounts.find((a) => a.name === 'Renamed bank')!;
    await saveAccount(db, form({ id: bank.id, version: bank.version, name: bank.name, balance: '50' }), date);
    expect((await snapshot(db)).entries.length).toBe(state.entries.length);
  });
  it('rolls back a stale concurrent balance edit without an extra adjustment', async () => {
    const state = await snapshot(db), bank = state.accounts.find((a) => a.name === 'Renamed bank')!;
    const results = await Promise.allSettled([
      saveAccount(db, form({ id: bank.id, version: bank.version, name: bank.name, balance: '60' }), date),
      saveAccount(db, form({ id: bank.id, version: bank.version, name: bank.name, balance: '70' }), date)
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const next = await snapshot(db);
    expect(next.entries.length).toBe(state.entries.length + 1);
    expect([6000, 7000]).toContain(balance(bank.id, next.entries, date));
  });
  it('preserves references on category rename/move and protects sibling uniqueness', async () => {
    await saveCategory(db, form({ id: 'food-general', parentId: 'living', name: 'Meals', icon: '🥗' }));
    const state = await snapshot(db);
    expect(state.entries.find((e) => e.type === 'Expense')!.categoryId).toBe('food-general');
    expect(state.categories.find((c) => c.id === 'food-general')!.parentId).toBe('living');
    await expect(saveCategory(db, form({ parentId: 'living', name: 'meals', icon: '🥗' }))).rejects.toThrow();
    await expect(saveCategory(db, form({ name: 'Transfer' }))).rejects.toThrow('reserved');
    await saveCategory(db, form({ name: 'Health' }));
    const next = await snapshot(db), parent = next.categories.find((c) => c.name === 'Health')!;
    expect(next.categories.some((c) => c.parentId === parent.id && c.name === 'General')).toBe(true);
  });
  it('protects used accounts and permits deleting unused ones', async () => {
    const state = await snapshot(db), bank = state.accounts.find((a) => a.name === 'Renamed bank')!, yen = state.accounts.find((a) => a.name === 'Yen')!;
    await expect(deleteAccount(db, form({ id: bank.id, version: bank.version }))).rejects.toThrow();
    await deleteAccount(db, form({ id: yen.id, version: yen.version }));
    expect((await snapshot(db)).accounts.some((a) => a.id === yen.id)).toBe(false);
  });
  it('guards stale note edits and removal', async () => {
    const state = await snapshot(db), entry = state.entries.find((e) => e.type === 'Expense')!;
    await saveEntry(db, form({ ...entry, amount: '1.25', notes: 'Updated' }));
    await expect(saveEntry(db, form({ ...entry, amount: '5' }))).rejects.toThrow('another tab');
    const current = (await snapshot(db)).entries.find((e) => e.id === entry.id)!;
    await deleteEntry(db, form({ id: current.id, version: current.version }));
    expect((await snapshot(db)).entries.some((e) => e.id === current.id)).toBe(false);
  });
  it('rolls back both account creation and bad opening balance in a failed batch', async () => {
    await expect(proxy.env.DB.batch([
      proxy.env.DB.prepare("INSERT INTO accounts(id,name,type,currency) VALUES('rollback','Rollback','Cash','USD')"),
      proxy.env.DB.prepare("INSERT INTO entries(id,type,date,account_id,amount,balance_before,balance_after) VALUES('bad','Adjustment','2026-10-10','rollback',10,0,99)")
    ])).rejects.toThrow();
    expect((await snapshot(db)).accounts.some((a) => a.id === 'rollback')).toBe(false);
  });
});
