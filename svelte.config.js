import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // Node.js adapter for Render deployment
    adapter: adapter({
      out: 'build',
      precompress: false,
      envPrefix: '',
    }),
  },
};

export default config;
