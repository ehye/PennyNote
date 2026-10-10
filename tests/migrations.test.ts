import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { unstable_splitSqlQuery } from 'wrangler';

const sql = readFileSync('drizzle/0001_ledger_rules.sql', 'utf8');
describe('remote D1 migration compatibility', () => {
  it('avoids bare CASE END terminators that confuse the remote trigger parser', () => {
    // Local SQLite accepts SELECT CASE ... END; but remote D1 can treat that
    // END; as the end of the trigger. SELECT (CASE ... END); is equivalent.
    expect(sql).not.toMatch(/\bSELECT\s+CASE\b/i);
    expect(sql).toContain('SELECT (CASE WHEN');
    expect(sql).not.toContain('\r');
  });
  it('keeps every trigger intact when Wrangler splits the migration', () => {
    const statements = unstable_splitSqlQuery(sql);
    expect(statements).toHaveLength(sql.split('--> statement-breakpoint').length);
    const triggers = statements.filter((statement) => /CREATE TRIGGER/.test(statement));
    expect(triggers).toHaveLength(12);
    for (const trigger of triggers) {
      expect(trigger).toMatch(/\bBEGIN\b/);
      expect(trigger).toMatch(/\bEND\s*$/);
    }
  });
});
