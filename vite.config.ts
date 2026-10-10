import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [sveltekit({
    adapter: adapter(),
    preprocess: vitePreprocess(),
    csp: { directives: { 'script-src': ['self'], 'object-src': ['none'], 'base-uri': ['self'], 'frame-ancestors': ['none'] } }
  })],
  test: { include: ['tests/**/*.test.ts'] }
});
