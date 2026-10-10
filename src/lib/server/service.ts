import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
import { accounts, categories, entries } from './schema';
import { accountTypes, currencies, parseMoney, validDate } from '#lib/money.ts';
import type { D1Database } from '@cloudflare/workers-types';

export class ValidationError extends Error {}
export function database(binding: D1Database) { return drizzle(binding); }
type DB = ReturnType<typeof database>;
function field(form: FormData, name: string): string { return String(form.get(name) ?? '').trim(); }
function name(form: FormData): string {
  const value = field(form, 'name');
  if (!value || value.length > 80) throw new ValidationError('Name must be 1–80 characters.');
  return value;
}
function amount(value: string, currency: string, signed = false): number {
  try { return parseMoney(value, currency, signed); } catch (e) { throw new ValidationError((e as Error).message); }
}
function date(value: string): string {
  if (!validDate(value)) throw new ValidationError('Enter a valid date.');
  return value;
}
function stale() { throw new ValidationError('This item changed in another tab. Refresh before saving.'); }
export async function snapshot(db: DB) {
  const [accountRows, categoryRows, entryRows] = await db.batch([
    db.select().from(accounts).orderBy(accounts.name),
    db.select().from(categories).orderBy(categories.name),
    db.select().from(entries).orderBy(desc(entries.date), desc(entries.createdAt), desc(entries.id))
  ]);
  return { accounts: accountRows, categories: categoryRows, entries: entryRows };
}
export async function saveAccount(db: DB, form: FormData, today: string) {
  const id = field(form, 'id');
  const valueName = name(form);
  if (id) {
    const account = (await db.select().from(accounts).where(eq(accounts.id, id)))[0];
    if (!account) throw new ValidationError('Account not found.');
    const version = Number(field(form, 'version'));
    if (version !== account.version) stale();
    const result = await db.update(accounts).set({
      name: valueName, version: version + 1, balanceTarget: amount(field(form, 'balance'), account.currency, true), balanceDate: today
    }).where(and(eq(accounts.id, id), eq(accounts.version, version))).returning({ id: accounts.id });
    if (!result.length) stale();
  } else {
    const currency = field(form, 'currency'), type = field(form, 'type');
    if (!currencies.includes(currency) || !accountTypes.includes(type)) throw new ValidationError('Choose a valid currency and account type.');
    const accountId = crypto.randomUUID(), opening = amount(field(form, 'balance'), currency, true);
    // D1 batches are atomic. A transfer is one row with both account references.
    await db.batch([
      db.insert(accounts).values({ id: accountId, name: valueName, type, currency }),
      db.insert(entries).values({
        id: crypto.randomUUID(), type: 'Adjustment', date: today, accountId, amount: opening,
        notes: 'Opening balance', balanceBefore: 0, balanceAfter: opening, createdAt: new Date().toISOString()
      })
    ]);
    // Zero adjustments are suppressed by a database trigger.
  }
}
export async function deleteAccount(db: DB, form: FormData) {
  const id = field(form, 'id');
  const result = await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.version, Number(field(form, 'version'))))).returning();
  if (!result.length) stale();
}
export async function saveEntry(db: DB, form: FormData) {
  const id = field(form, 'id'), type = field(form, 'type');
  if (!['Expense', 'Income', 'Transfer'].includes(type)) throw new ValidationError('Choose a note type.');
  const accountId = field(form, 'accountId');
  const account = (await db.select().from(accounts).where(eq(accounts.id, accountId)))[0];
  if (!account) throw new ValidationError('Choose an account.');
  const categoryId = type === 'Transfer' ? null : field(form, 'categoryId');
  const destinationId = type === 'Transfer' ? field(form, 'destinationId') : null;
  if (type === 'Transfer') {
    const destination = (await db.select().from(accounts).where(eq(accounts.id, destinationId!)))[0];
    if (!destination || destination.id === accountId || destination.currency !== account.currency) throw new ValidationError('Choose another account in the same currency.');
  } else {
    const category = (await db.select().from(categories).where(eq(categories.id, categoryId!)))[0];
    if (!category?.parentId) throw new ValidationError('Choose a subcategory.');
  }
  const notes = field(form, 'notes');
  if (notes.length > 1000) throw new ValidationError('Notes must be at most 1,000 characters.');
  const values = { type: type as 'Expense' | 'Income' | 'Transfer', date: date(field(form, 'date')), accountId, categoryId, destinationId,
    amount: amount(field(form, 'amount'), account.currency), notes };
  if (id) {
    const old = (await db.select().from(entries).where(eq(entries.id, id)))[0];
    if (!old || old.type === 'Adjustment') throw new ValidationError('Balance adjustment notes are read-only.');
    const version = Number(field(form, 'version'));
    const result = await db.update(entries).set({ ...values, version: version + 1 }).where(and(eq(entries.id, id), eq(entries.version, version))).returning();
    if (!result.length) stale();
  } else {
    await db.insert(entries).values({ ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }
}
export async function deleteEntry(db: DB, form: FormData) {
  const result = await db.delete(entries).where(and(eq(entries.id, field(form, 'id')), eq(entries.version, Number(field(form, 'version'))))).returning();
  if (!result.length) stale();
}
export async function saveCategory(db: DB, form: FormData) {
  const id = field(form, 'id'), parentId = field(form, 'parentId') || null, valueName = name(form);
  if (valueName.toLowerCase() === 'transfer') throw new ValidationError('Transfer is reserved.');
  if (parentId) {
    const parent = (await db.select().from(categories).where(eq(categories.id, parentId)))[0];
    if (!parent || parent.parentId || parent.id === id) throw new ValidationError('Choose a parent category.');
  }
  const icon = parentId ? field(form, 'icon') : '';
  if (parentId && (!icon || [...icon].length > 16)) throw new ValidationError('Enter a short subcategory icon.');
  if (id) {
    const old = (await db.select().from(categories).where(eq(categories.id, id)))[0];
    if (!old || !!old.parentId !== !!parentId) throw new ValidationError('Category level cannot change.');
    await db.update(categories).set({ name: valueName, parentId, icon }).where(eq(categories.id, id));
  } else {
    const newId = crypto.randomUUID();
    if (parentId) await db.insert(categories).values({ id: newId, parentId, name: valueName, icon });
    else await db.batch([
      db.insert(categories).values({ id: newId, name: valueName }),
      db.insert(categories).values({ id: crypto.randomUUID(), parentId: newId, name: 'General', icon: '📁' })
    ]);
  }
}
