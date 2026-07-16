import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin, type UserConfig } from "vite";
import solid from "vite-plugin-solid";

const webviewRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(webviewRoot, "..");

export interface WebviewBuildConfig {
  appName: string;
  entryHtml?: string;
  copyPdfWorker?: boolean;
}

export function defineWebviewConfig(config: WebviewBuildConfig): UserConfig {
  const appRoot = resolve(webviewRoot, "apps", config.appName);
  const outDir = resolve(projectRoot, "media", "webview", config.appName);

  return defineConfig({
    root: appRoot,
    base: "",
    plugins: [
      solid(),
      config.copyPdfWorker !== false ? copyPdfJsAssetsPlugin(outDir) : undefined,
    ].filter((plugin): plugin is Plugin => plugin !== undefined),

    resolve: {
      alias: {
        "@webview-shared": resolve(webviewRoot, "shared"),
        "@lgh-crop-pdf-protocol": resolve(
          projectRoot,
          "src",
          "application",
          "crop_pdf_protocol.ts",
        ),
      },
    },

    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: true,
      target: "es2022",
      cssCodeSplit: false,

      rollupOptions: {
        input: resolve(appRoot, config.entryHtml ?? "index.html"),
        output: {
          entryFileNames: "index.js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            if (isCssAsset(assetInfo.names, assetInfo.originalFileNames)) {
              return "index.css";
            }

            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },

    define: {
      __WEBVIEW_APP_NAME__: JSON.stringify(config.appName),
    },
  });
}

function isCssAsset(names: readonly string[], originalFileNames: readonly string[]): boolean {
  return [...names, ...originalFileNames].some((fileName) => fileName.endsWith(".css"));
}

function copyPdfJsAssetsPlugin(outDir: string): Plugin {
  return {
    name: "copy-pdfjs-assets",
    apply: "build",
    closeBundle() {
      const workerSource = resolve(
        projectRoot,
        "node_modules",
        "pdfjs-dist",
        "build",
        "pdf.worker.mjs",
      );

      const workerTarget = resolve(outDir, "pdf.worker.mjs");

      if (!existsSync(workerSource)) {
        throw new Error(`PDF.js worker not found: ${workerSource}. Did you install pdfjs-dist?`);
      }

      mkdirSync(dirname(workerTarget), { recursive: true });
      copyFileSync(workerSource, workerTarget);

      for (const directoryName of ["cmaps", "standard_fonts", "wasm"]) {
        const source = resolve(projectRoot, "node_modules", "pdfjs-dist", directoryName);
        const target = resolve(outDir, directoryName);

        if (!existsSync(source)) {
          throw new Error(`PDF.js asset directory not found: ${source}`);
        }

        cpSync(source, target, { recursive: true });
      }
    },
  };
}
