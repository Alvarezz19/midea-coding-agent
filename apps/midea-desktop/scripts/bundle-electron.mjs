import { build } from 'esbuild'

await Promise.all([
  build({
    entryPoints: ['electron/main.ts'],
    bundle: true,
    outfile: 'dist/electron-main.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    sourcemap: true
  }),
  build({
    entryPoints: ['electron/preload.ts'],
    bundle: true,
    outfile: 'dist/preload.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    sourcemap: true
  })
])
