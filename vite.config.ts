// @ts-expect-error node:fs is a nodejs module
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import license, { type Dependency } from "rollup-plugin-license";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// LICENSE ファイルが SPDX のメタデータしかないパッケージ(Tauri のプラグインなど)は、
// 著作権表示を取り出して MIT の本文を補う
function licenseTextOf(dep: Dependency): string {
  const text = dep.licenseText ?? "";
  if (!/^SPDXVersion:/.test(text)) return text;
  const copyright = text.match(/^PackageCopyrightText: (.*)$/m)?.[1];
  if (!copyright) throw new Error(`No copyright found for ${dep.name}`);
  return readFileSync("LICENSE", "utf-8").replace(
    /^Copyright .*$/m,
    `Copyright (c) ${copyright}`,
  );
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isBrowserBuild = mode === "browser";

  return {
    plugins: [
      react(),
      tailwindcss(),
      // ビルド時にバンドルされたライブラリのライセンス一覧を書き出す
      {
        ...license({
          thirdParty: {
            allow: {
              test: isBrowserBuild
                ? "(MIT OR Apache-2.0 OR BSD-3-Clause OR ISC OR 0BSD OR GPL-2.0-or-later)"
                : "(MIT OR Apache-2.0 OR BSD-3-Clause OR ISC OR 0BSD)",
              failOnUnlicensed: true,
              failOnViolation: true,
            },
            output: {
              file: "src-tauri/licenses/THIRD_PARTY_LICENSES_FRONTEND.txt",
              template: (dependencies) =>
                [
                  "THIRD-PARTY SOFTWARE NOTICES (Frontend)",
                  "=======================================",
                  "",
                  "henkanhakase には以下のオープンソースソフトウェアが含まれています。",
                  "This software includes the following open source software.",
                  "",
                  ...dependencies.map((dep) =>
                    [
                      "--------------------------------------------------------------------------------",
                      `${dep.name} ${dep.version} (${dep.license})`,
                      "",
                      licenseTextOf(dep),
                      dep.noticeText ?? "",
                    ].join("\n"),
                  ),
                ].join("\n"),
            },
          },
        }),
        apply: "build" as const,
      },
    ],

    resolve: {
      alias: {
        "@browser-ffmpeg": resolve(
          __dirname,
          isBrowserBuild
            ? "src/utils/browser-ffmpeg-browser.ts"
            : "src/utils/browser-ffmpeg-desktop.ts",
        ),
      },
    },

    build: {
      outDir: isBrowserBuild ? "dist-web" : "dist",
    },

    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    preview: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  };
});
