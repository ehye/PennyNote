import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { environment } from '#lib/server/env.ts';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export const handle: Handle = async ({ event, resolve }) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method) &&
    event.request.headers.get('origin') !== new URL(event.request.url).origin) {
    error(403, 'Cross-site requests are forbidden.');
  }
  if (!dev) {
    const env = environment(event);
    if (!env?.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OWNER_EMAIL) error(503, 'Private access is not configured.');
    const domain = env.ACCESS_TEAM_DOMAIN;
    if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)) error(503, 'Invalid Access configuration.');
    const token = event.request.headers.get('cf-access-jwt-assertion');
    if (!token) error(401, 'Sign in through Cloudflare Access.');
    try {
      let keys = keySets.get(domain);
      if (!keys) {
        keys = createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`));
        keySets.set(domain, keys);
      }
      const { payload } = await jwtVerify(token, keys, {
        issuer: `https://${domain}`, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'email']
      });
      if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) throw new Error('Not owner');
    } catch { error(403, 'Access denied.'); }
  }
  const response = await resolve(event);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
};
