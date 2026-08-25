import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@psyblr/contracts': fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)),
      '@psyblr/game-content': fileURLToPath(new URL('../../packages/game-content/src/index.ts', import.meta.url)),
      '@psyblr/game-rules': fileURLToPath(new URL('../../packages/game-rules/src/index.ts', import.meta.url)),
    },
  },
});
