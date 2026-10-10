import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import type { RequestEvent } from '@sveltejs/kit';
vi.mock('$app/env', () => ({ dev: false }));
import { handle } from '../src/hooks.server';

const domain = 'pennynote-test.cloudflareaccess.com';
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  keys = await generateKeyPair('RS256');
  const publicKey = await exportJWK(keys.publicKey);
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    expect(String(url)).toBe(`https://${domain}/cdn-cgi/access/certs`);
    return Response.json({ keys: [{ ...publicKey, kid: 'test', alg: 'RS256', use: 'sig' }] });
  }));
});
afterAll(() => vi.unstubAllGlobals());
async function token(email = 'owner@example.com', audience = 'audience', expiry = '5m') {
  return new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(`https://${domain}`).setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(keys.privateKey);
}
function request(jwt?: string, configured = true) {
  return {
    event: {
      request: new Request('https://pennynote.example/', { headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} }),
      platform: { env: configured ? { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'audience', OWNER_EMAIL: 'owner@example.com' } : {} }
    } as unknown as RequestEvent,
    resolve: async () => new Response('private data')
  };
}
describe('production Access guard', () => {
  it('fails closed when not configured', async () => {
    await expect(handle(request(undefined, false))).rejects.toMatchObject({ status: 503 });
  });
  it('rejects missing or forged assertions', async () => {
    await expect(handle(request())).rejects.toMatchObject({ status: 401 });
    await expect(handle(request('forged.jwt.token'))).rejects.toMatchObject({ status: 403 });
  });
  it('accepts only the verified owner and disables response caching', async () => {
    const response = await handle(request(await token()));
    expect(await response.text()).toBe('private data');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('rejects another user, wrong audience and expired tokens', async () => {
    for (const jwt of [await token('other@example.com'), await token('owner@example.com', 'other-audience'), await token('owner@example.com', 'audience', '-1h')]) {
      await expect(handle(request(jwt))).rejects.toMatchObject({ status: 403 });
    }
  });
  it('rejects cross-origin writes even with a valid owner assertion', async () => {
    const input = request(await token());
    const event = { ...input.event, request: new Request('https://pennynote.example/', {
      method: 'POST', headers: { origin: 'https://untrusted.example', 'cf-access-jwt-assertion': await token() }
    }) } as RequestEvent;
    await expect(handle({ ...input, event })).rejects.toMatchObject({ status: 403 });
  });
});
