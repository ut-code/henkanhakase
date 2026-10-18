import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import license, { type Dependency } from "rollup-plugin-license";
import spdxExpressionValidate from "spdx-expression-validate";
import spdxSatisfies from "spdx-satisfies";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

const host = process.env.TAURI_DEV_HOST;
const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function licenseDocument(text: string, title: string): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; background: #f6f8fc; color: #263143; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { box-sizing: border-box; max-width: 960px; margin: 32px auto; padding: 32px; background: #fff; border: 1px solid #e2e7f0; border-radius: 16px; }
      pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 14px/1.7 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      @media (max-width: 640px) { main { margin: 16px; padding: 20px; } }
    </style>
  </head>
  <body><main><pre>${escapeHtml(text)}</pre></main></body>
</html>
`;
}

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

function ffmpegPackageLicenseText(dep: Dependency): string | null {
  if (dep.name === "@ffmpeg/core") {
    return readFileSync("src-tauri/licenses/FFmpeg-COPYING.GPLv3.txt", "utf-8");
  }

  if (dep.name === "@ffmpeg/ffmpeg" || dep.name === "@ffmpeg/util") {
    return `
    MIT License

Copyright (c) 2019 Jerome Wu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
    `;
  }

  return null;
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isBrowserBuild = mode === "browser";
  const isLgplBuild = process.env.VITE_FFMPEG_LICENSE === "lgpl";
  const licenseFiles = isBrowserBuild
    ? [
        "LICENSE",
        "licenses/THIRD_PARTY_LICENSES_FRONTEND.txt",
        "licenses/THIRD_PARTY_LICENSES_OTHER.txt",
        "licenses/FFmpeg-NOTICE.txt",
        "licenses/FFmpeg-COPYING.GPLv3.txt",
      ]
    : [
        "LICENSE",
        "licenses/THIRD_PARTY_LICENSES_FRONTEND.txt",
        "licenses/THIRD_PARTY_LICENSES_OTHER.txt",
        "licenses/THIRD_PARTY_LICENSES_RUST.txt",
        "licenses/FFmpeg-NOTICE.txt",
        isLgplBuild
          ? "licenses/FFmpeg-COPYING.LGPLv2.1.txt"
          : "licenses/FFmpeg-COPYING.GPLv3.txt",
      ];
  const combinedLicenseFiles = licenseFiles.filter(
    (file) => file !== "LICENSE",
  );
  const combinedLicenseName = "THIRD_PARTY_LICENSES.txt";

  return {
    plugins: [
      react(),
      wasm(),
      tailwindcss(),
      // ビルド時にバンドルされたライブラリのライセンス一覧を書き出す
      {
        ...license({
          thirdParty: {
            allow: {
              test: (dependency: Dependency) => {
                // rgbcolor の独自ライセンス表記への対応
                if (
                  dependency.name === "rgbcolor" &&
                  dependency.license === "MIT OR SEE LICENSE IN FEEL-FREE.md"
                ) {
                  return true;
                }

                const allowedLicenses = isBrowserBuild
                  ? "(MIT OR Apache-2.0 OR BSD-3-Clause OR ISC OR 0BSD OR Zlib OR MPL-2.0 OR GPL-2.0-or-later)"
                  : "(MIT OR Apache-2.0 OR BSD-3-Clause OR ISC OR 0BSD OR Zlib OR MPL-2.0)";

                const license = dependency.license;
                return (
                  typeof license === "string" &&
                  spdxExpressionValidate(license) &&
                  spdxSatisfies(license, allowedLicenses)
                );
              },
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
                      ffmpegPackageLicenseText(dep) ?? licenseTextOf(dep),
                      dep.noticeText ?? "",
                    ].join("\n"),
                  ),
                ].join("\n"),
            },
          },
        }),
        apply: "build" as const,
      },
      {
        name: "copy-distributed-licenses",
        writeBundle() {
          const outputDirectory = isBrowserBuild ? "dist-web" : "dist";
          const outputLicenseDirectory = resolve(outputDirectory, "licenses");
          mkdirSync(outputLicenseDirectory, { recursive: true });

          const combinedLicenseText = [
            "THIRD-PARTY SOFTWARE NOTICES",
            "============================",
            "",
            ...combinedLicenseFiles.map((file) => {
              const source = resolve("src-tauri", file);
              const name = file.split("/").at(-1) ?? file;
              return [
                "================================================================================",
                name,
                "================================================================================",
                "",
                readFileSync(source, "utf8"),
              ].join("\n");
            }),
          ].join("\n");
          const combinedDestination = resolve(
            outputLicenseDirectory,
            combinedLicenseName,
          );
          writeFileSync(combinedDestination, combinedLicenseText, "utf8");
          writeFileSync(
            combinedDestination.replace(/\.txt$/, ".html"),
            licenseDocument(combinedLicenseText, combinedLicenseName),
            "utf8",
          );

          for (const file of licenseFiles) {
            const source =
              file === "LICENSE" ? resolve(file) : resolve("src-tauri", file);
            const destination = resolve(
              outputDirectory,
              file === "LICENSE" ? "licenses/LICENSE.txt" : file,
            );
            mkdirSync(resolve(destination, ".."), { recursive: true });
            copyFileSync(source, destination);
            const htmlDestination = destination.replace(/\.txt$/, ".html");
            const title = file.split("/").at(-1) ?? file;
            const html = licenseDocument(readFileSync(source, "utf8"), title);
            writeFileSync(htmlDestination, html, "utf8");
          }
        },
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
