import { describe, it, expect } from 'vitest';
import { parseMoney, moneyInput, validDate } from '../src/lib/money';
import { balance, groupDate, report } from '../src/lib/ledger';
import type { Account, Entry } from '../src/lib/server/schema';

describe('exact currency amounts', () => {
  it('parses decimal text without floating point arithmetic', () => {
    expect(parseMoney('0.29', 'USD')).toBe(29);
    expect(parseMoney('123', 'JPY')).toBe(123);
    expect(parseMoney('1.234', 'KWD')).toBe(1234);
    expect(parseMoney('-12.34', 'USD', true)).toBe(-1234);
    expect(moneyInput(-1234, 'USD')).toBe('-12.34');
  });
  it('rejects excess precision, zero expenses and malformed numbers', () => {
    for (const value of ['1.001', '1e2', 'Infinity', 'NaN', '-1', '0', '1,000', '']) expect(() => parseMoney(value, 'USD')).toThrow();
    expect(() => parseMoney('1.1', 'JPY')).toThrow();
    expect(() => parseMoney('9007199254740993', 'USD')).toThrow();
  });
  it('validates date-only values including leap years', () => {
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2025-02-29')).toBe(false);
    expect(validDate('2026-04-31')).toBe(false);
  });
});
const account = (id: string, currency = 'USD'): Account => ({ id, name: id, currency, type: 'Cash', version: 1, balanceTarget: null, balanceDate: null });
const entry = (type: Entry['type'], amount: number, overrides: Partial<Entry> = {}): Entry => ({ id: crypto.randomUUID(), type, date: '2026-01-02', accountId: 'a', destinationId: null, categoryId: 'food', amount, notes: '', balanceBefore: null, balanceAfter: null, version: 1, createdAt: '', ...overrides });
describe('ledger and reports', () => {
  const rows = [entry('Income', 10000), entry('Expense', 2000), entry('Transfer', 3000, { destinationId: 'b' }), entry('Adjustment', -1000), entry('Income', 20000, { date: '2027-01-01' }), entry('Expense', 900, { accountId: 'jpy' })];
  it('balances transfers on both sides and excludes future movements', () => {
    expect(balance('a', rows, '2026-12-31')).toBe(4000);
    expect(balance('b', rows, '2026-12-31')).toBe(3000);
  });
  it('excludes adjustments/transfers and keeps currencies separate', () => {
    const result = report(rows, [account('a'), account('b'), account('jpy', 'JPY')], [], 'USD', '2026-01-01', '2026-12-31');
    expect(result.spent).toBe(2000); expect(result.income).toBe(10000); expect(result.net).toBe(8000);
  });
  it('includes both endpoints of cross-year ranges', () => {
    const result = report(rows, [account('a')], [], 'USD', '2026-01-02', '2027-01-01');
    expect(result.income).toBe(30000);
  });
  it('groups weeks Monday-first across year boundaries', () => {
    expect(groupDate('2027-01-03', 'Week')).toBe('2026-12-28');
    expect(groupDate('2027-01-04', 'Week')).toBe('2027-01-04');
  });
});
