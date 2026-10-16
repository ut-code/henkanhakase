import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeFile } from "@tauri-apps/plugin-fs";

export interface SvgDimension {
  width: number;
  height: number;
}

let isWasmInitialized = false;

/**
 * WASMモジュールを初期化します（初回のみ実行）
 */
async function ensureWasmInitialized(): Promise<void> {
  if (isWasmInitialized) return;
  try {
    await initWasm(resvgWasmUrl);
    isWasmInitialized = true;
  } catch (err) {
    if (String(err).includes("already initialized")) {
      isWasmInitialized = true;
      return;
    }
    throw new Error(`resvg-wasmの初期化に失敗しました: ${String(err)}`);
  }
}

/**
 * SVGテキストからサイズ情報を解析します。
 */
export function parseSvgDimensions(svgText: string): SvgDimension {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");

  if (!svgEl) {
    throw new Error("無効なSVGファイルです。");
  }

  let width = parseFloat(svgEl.getAttribute("width") || "0");
  let height = parseFloat(svgEl.getAttribute("height") || "0");

  if ((!width || !height) && svgEl.getAttribute("viewBox")) {
    const viewBox = svgEl.getAttribute("viewBox")?.split(/[\s,]+/) || [];
    if (viewBox.length === 4) {
      const vbWidth = parseFloat(viewBox[2]);
      const vbHeight = parseFloat(viewBox[3]);
      if (vbWidth > 0 && vbHeight > 0) {
        width = width || vbWidth;
        height = height || vbHeight;
      }
    }
  }

  // デフォルト値補正
  width = width > 0 ? width : 512;
  height = height > 0 ? height : 512;

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * @resvg/resvg-wasm を使用してSVGをPNGのUint8Arrayに変換します。
 */
export async function convertSvgToPngBuffer(
  svgPath: string,
  targetWidth?: number,
  targetHeight?: number,
): Promise<Uint8Array> {
  await ensureWasmInitialized();

  const svgText = await readTextFile(svgPath);

  if (!svgText?.includes("<svg")) {
    throw new Error("指定されたファイルは有効なSVGではありません。");
  }

  try {
    let fitToOptions:
      | { mode: "original" }
      | { mode: "width"; value: number }
      | { mode: "height"; value: number }
      | { mode: "zoom"; value: number } = { mode: "original" };

    if (targetWidth && targetWidth > 0) {
      fitToOptions = { mode: "width", value: targetWidth };
    } else if (targetHeight && targetHeight > 0) {
      fitToOptions = { mode: "height", value: targetHeight };
    }

    const resvg = new Resvg(svgText, {
      fitTo: fitToOptions,
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    resvg.free();

    return pngBuffer;
  } catch (err) {
    throw new Error(`SVGのレンダリングに失敗しました: ${String(err)}`);
  }
}

/**
 * SVGを一時PNGファイルとして生成し、その絶対パスを返します。
 */
export async function convertSvgToPngTempFile(
  svgPath: string,
  targetWidth?: number,
  targetHeight?: number,
): Promise<string> {
  const pngBuffer = await convertSvgToPngBuffer(
    svgPath,
    targetWidth,
    targetHeight,
  );

  // Tauri側のコマンドを呼び出して一時ファイルの出力パスを取得
  const tempPngPath = await invoke<string>("create_temp_file_path", {
    extension: "png",
  });

  await writeFile(tempPngPath, pngBuffer);
  return tempPngPath;
}
