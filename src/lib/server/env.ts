import { env } from 'cloudflare:workers';
import type { RequestEvent } from '@sveltejs/kit';

export function environment(event: RequestEvent): App.Platform['env'] {
  // SvelteKit 3 exposes Cloudflare bindings through the runtime module.
  // Explicit platform bindings also permit isolated middleware tests.
  return event.platform?.env ?? env as App.Platform['env'];
}
