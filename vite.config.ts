import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/content-script': resolve(__dirname, 'src/content/content-script.ts'),
        'content/modal': resolve(__dirname, 'src/content/modal.css'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes('service-worker')) {
            return 'background/service-worker.js';
          }
          if (chunkInfo.name.includes('content-script')) {
            return 'content/content-script.js';
          }
          if (chunkInfo.name.includes('popup')) {
            return 'popup/popup.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'modal.css') {
            return 'content/modal.css';
          }
          if (assetInfo.name === 'popup.css') {
            return 'popup/popup.css';
          }
          if (assetInfo.name?.endsWith('.png')) {
            return 'assets/icons/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const iconsDir = resolve(distDir, 'assets/icons');

        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }

        copyFileSync(
          resolve(__dirname, 'src/manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        const iconSizes = ['16', '48', '128'];
        iconSizes.forEach(size => {
          const iconFile = `icon${size}.png`;
          copyFileSync(
            resolve(__dirname, `src/assets/icons/${iconFile}`),
            resolve(iconsDir, iconFile)
          );
        });
      }
    }
  ]
});
