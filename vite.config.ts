import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  root: resolve(__dirname, "src"),
  build: {
    rollupOptions: {
      input: {
        "background/service-worker": resolve(
          __dirname,
          "src/background/service-worker.ts",
        ),
        "content/content-script": resolve(
          __dirname,
          "src/content/content-script.ts",
        ),
        "popup/popup": resolve(__dirname, "src/popup/popup.html"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes("service-worker")) {
            return "background/service-worker.js";
          }
          if (chunkInfo.name.includes("content-script")) {
            return "content/content-script.js";
          }
          if (chunkInfo.name.includes("popup")) {
            return "popup/popup.js";
          }
          return "[name].js";
        },
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "popup.css") {
            return "popup/popup.css";
          }
          if (assetInfo.name?.endsWith(".png")) {
            return "assets/icons/[name].[ext]";
          }
          return "assets/[name].[ext]";
        },
      },
    },
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    {
      name: "copy-extension-files",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");
        const iconsDir = resolve(distDir, "assets/icons");

        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }

        const contentDir = resolve(distDir, "content");
        if (!existsSync(contentDir)) {
          mkdirSync(contentDir, { recursive: true });
        }

        copyFileSync(
          resolve(__dirname, "src/manifest.json"),
          resolve(distDir, "manifest.json"),
        );

        copyFileSync(
          resolve(__dirname, "src/content/modal.css"),
          resolve(contentDir, "modal.css"),
        );

        const iconSizes = ["16", "48", "128"];
        iconSizes.forEach((size) => {
          const iconFile = `icon${size}.png`;
          copyFileSync(
            resolve(__dirname, `src/assets/icons/${iconFile}`),
            resolve(iconsDir, iconFile),
          );
        });
      },
    },
  ],
});
