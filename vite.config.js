import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    assetsInlineLimit: 10 * 1024 * 1024,
    target: 'esnext',
  },
  assetsInclude: ['**/*.fbx'],
})
