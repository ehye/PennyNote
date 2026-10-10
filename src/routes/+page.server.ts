import { error, fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { database, snapshot, saveAccount, saveCategory, saveEntry, deleteAccount, deleteEntry, ValidationError } from '#lib/server/service.ts';
import { today } from '#lib/money.ts';
import { environment } from '#lib/server/env.ts';

function db(event: RequestEvent) {
  const binding = environment(event).DB;
  if (!binding) error(503, 'Database is not configured.');
  return database(binding);
}
function currentDate(event: RequestEvent) { return today(environment(event).REPORT_TIMEZONE || 'Asia/Taipei'); }
export const load: PageServerLoad = async (event) => ({ ...await snapshot(db(event)), today: currentDate(event) });
function action(kind: string, handler: (event: RequestEvent, form: FormData) => Promise<void>) {
  return async (event: RequestEvent) => {
    try {
      await handler(event, await event.request.formData());
      return { success: true, kind, message: 'Saved.' };
    } catch (e) {
      if (e instanceof ValidationError) return fail(400, { success: false, kind, message: e.message });
      let cause = String(e);
      let nested: unknown = e;
      for (let depth = 0; depth < 5 && nested instanceof Error && nested.cause; depth++) {
        nested = nested.cause;
        cause += ` ${String(nested)}`;
      }
      if (/UNIQUE constraint/i.test(cause)) return fail(400, { success: false, kind, message: 'That name already exists in this group or currency.' });
      if (/FOREIGN KEY constraint/i.test(cause)) return fail(400, { success: false, kind, message: 'This item is used by existing notes and cannot be removed.' });
      if (/adjustment is read.only/i.test(cause)) return fail(400, { success: false, kind, message: 'Balance adjustments are read-only. Edit the account balance instead.' });
      // Do not put financial notes or query parameters in platform logs.
      console.error('Ledger mutation failed.');
      return fail(500, { success: false, kind, message: 'Unable to save. Please refresh and try again.' });
    }
  };
}
export const actions: Actions = {
  account: action('account', async (e, form) => saveAccount(db(e), form, currentDate(e))),
  deleteAccount: action('account', async (e, form) => deleteAccount(db(e), form)),
  category: action('category', async (e, form) => saveCategory(db(e), form)),
  entry: action('entry', async (e, form) => saveEntry(db(e), form)),
  deleteEntry: action('entry', async (e, form) => deleteEntry(db(e), form))
};
