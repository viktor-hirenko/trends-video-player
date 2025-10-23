import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'

// Если у тебя проект в ESM-среде без CommonJS, 
// то __dirname может не работать по умолчанию. 
// Можно написать так:
// import { fileURLToPath } from 'url'
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@img': path.resolve(__dirname, 'src/assets/img'),
      '@video': path.resolve(__dirname, 'src/assets/img/video'),
      '@posters': path.resolve(__dirname, 'src/assets/img/video/posters'),
      '@thumbs': path.resolve(__dirname, 'src/assets/img/thumbs'),
    },
  },
  build: {
    outDir: 'dist/trends-all-geo',
    assetsDir: 'shorts',
  },
})