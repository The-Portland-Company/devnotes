import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/next.ts', 'src/server/express.ts', 'src/server/deno.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  external: ['react', 'react-dom'],
  clean: true,
  sourcemap: false,
  minify: false,
});
