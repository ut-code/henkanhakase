// @ts-expect-error node:fs is a nodejs module
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import license, { type Dependency } from "rollup-plugin-license";
import spdxSatisfies from "spdx-satisfies";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

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

// 本体(MIT)と両立するライセンスのみ許可する。src-tauri/about.toml の accepted と揃える
const ALLOWED_LICENSES =
  "(MIT OR MIT-0 OR Apache-2.0 OR Apache-2.0 WITH LLVM-exception OR BSD-2-Clause OR BSD-3-Clause OR 0BSD OR ISC OR Zlib OR Unicode-3.0 OR Unlicense OR CC0-1.0 OR MPL-2.0)";

// license が SPDX の書式になっていないパッケージは、選べるライセンスを明示する。
// 更新でライセンスが変わっても見逃さないよう、バージョンごとに指定する
const LICENSE_OVERRIDES = new Map<string, string>([
  // "MIT OR SEE LICENSE IN FEEL-FREE.md"(jspdf の依存)
  ["rgbcolor@1.0.1", "MIT"],
]);

function isAllowedLicense(dep: Dependency): boolean {
  const spdx =
    LICENSE_OVERRIDES.get(`${dep.name}@${dep.version}`) ?? dep.license;
  if (!spdx) return false;
  try {
    return spdxSatisfies(spdx, ALLOWED_LICENSES);
  } catch {
    // SPDX として解釈できない場合
    return false;
  }
}

function repositoryOf(dep: Dependency): string {
  const repository = dep.repository;
  if (!repository) return dep.homepage ?? "";
  return typeof repository === "string" ? repository : repository.url;
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    wasm(),
    tailwindcss(),
    // ビルド時にバンドルされたライブラリのライセンス一覧を書き出す
    {
      ...license({
        thirdParty: {
          allow: {
            test: isAllowedLicense,
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
                    // MPL-2.0 などはソースの入手先を示す必要があるため、リポジトリを載せる
                    repositoryOf(dep),
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
}));
