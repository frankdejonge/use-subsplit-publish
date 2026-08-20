import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['index.ts'],
    format: 'cjs',
    platform: 'node',
    target: 'node24',
    minify: true,
    dts: false,
    clean: false,
    // GitHub Actions need a single self-contained file, so inline every dependency.
    deps: { alwaysBundle: [/.*/] },
    // Keep the entrypoint as dist/index.js (action.yml -> main: dist/index.js).
    outExtensions: () => ({ js: '.js' }),
})
