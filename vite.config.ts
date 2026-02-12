import { defineConfig } from "vite";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { buildSync } from "esbuild";

const targetBrowser = process.env.BROWSER || "chrome";

function generateManifest(distDir: string): void {
  const manifest = JSON.parse(
    readFileSync(resolve(__dirname, "src/manifest.json"), "utf-8"),
  );

  if (targetBrowser === "firefox") {
    // Firefox MV3 uses background.scripts instead of service_worker
    manifest.background = {
      scripts: ["background/service-worker.js"],
      type: "module",
    };

    // Firefox requires browser_specific_settings
    manifest.browser_specific_settings = {
      gecko: {
        id: "anki-dict@example.com",
        strict_min_version: "109.0",
      },
    };
  }

  writeFileSync(
    resolve(distDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

export default defineConfig({
  root: resolve(__dirname, "src"),
  build: {
    rollupOptions: {
      input: {
        "background/service-worker": resolve(
          __dirname,
          "src/background/service-worker.ts",
        ),
        "popup/popup": resolve(__dirname, "src/popup/popup.html"),
        "options/options": resolve(__dirname, "src/options/options.html"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes("service-worker")) {
            return "background/service-worker.js";
          }
          if (chunkInfo.name.includes("popup")) {
            return "popup/popup.js";
          }
          if (chunkInfo.name.includes("options")) {
            return "options/options.js";
          }
          return "[name].js";
        },
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "popup.css") {
            return "popup/popup.css";
          }
          if (assetInfo.name === "options.css") {
            return "options/options.css";
          }
          if (assetInfo.name?.endsWith(".png")) {
            return "assets/icons/[name].[ext]";
          }
          return "assets/[name].[ext]";
        },
      },
    },
    outDir: resolve(__dirname, `dist/${targetBrowser}`),
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
        const distDir = resolve(__dirname, `dist/${targetBrowser}`);
        const iconsDir = resolve(distDir, "assets/icons");

        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }

        const contentDir = resolve(distDir, "content");
        if (!existsSync(contentDir)) {
          mkdirSync(contentDir, { recursive: true });
        }

        // Build content script separately as IIFE (content scripts
        // cannot use ES module imports in browser extensions)
        buildSync({
          entryPoints: [resolve(__dirname, "src/content/content-script.ts")],
          bundle: true,
          format: "iife",
          target: "es2022",
          outfile: resolve(contentDir, "content-script.js"),
          sourcemap: process.env.NODE_ENV === "development",
        });

        // Generate browser-specific manifest
        generateManifest(distDir);

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
