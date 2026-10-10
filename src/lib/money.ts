export const accountTypes = ['Bank debit', 'Payment app', 'Stock broker', 'Cash', 'Other'];
export const currencies = ['USD', 'TWD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'SGD', 'AUD', 'CAD', 'KRW', 'CHF', 'BHD', 'KWD'];
export function precision(currency: string): number {
  if (!currencies.includes(currency)) throw new Error('Unsupported currency.');
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits!;
}
export function parseMoney(value: string, currency: string, signed = false): number {
  const digits = precision(currency);
  const match = value.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match || (!signed && match[1]) || (match[3]?.length ?? 0) > digits) {
    throw new Error(`Enter an amount with up to ${digits} decimal places.`);
  }
  const whole = BigInt(match[2]);
  const minor = whole * (10n ** BigInt(digits)) + BigInt((match[3] ?? '').padEnd(digits, '0') || '0');
  const amount = Number(match[1] ? -minor : minor);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 1_000_000_000_000) throw new Error('Amount is too large.');
  if (!signed && amount <= 0) throw new Error('Amount must be greater than zero.');
  return amount;
}
export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / 10 ** precision(currency));
}
export function moneyInput(amount: number, currency: string): string {
  const digits = precision(currency);
  const absolute = Math.abs(amount).toString().padStart(digits + 1, '0');
  return `${amount < 0 ? '-' : ''}${digits ? `${absolute.slice(0, -digits)}.${absolute.slice(-digits)}` : absolute}`;
}
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '9999-12-31' &&
    !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function today(timeZone = 'Asia/Taipei'): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
