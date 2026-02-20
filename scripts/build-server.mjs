import * as esbuild from 'esbuild'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outfile = join(root, 'dist', 'index.cjs')

mkdirSync(dirname(outfile), { recursive: true })

await esbuild.build({
  entryPoints: [join(root, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  external: ['vite'],
  minify: true,
})

console.log('Server bundled to dist/index.cjs')
