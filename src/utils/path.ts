import { type Format, mimeTypes } from "../formats";

// パス文字列から拡張子を取得するヘルパー関数
export function getExtensionFromPath(filePath: string): string {
  const parts = filePath.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

// 拡張子からサポートされている Format を判定するヘルパー関数
export function detectFormatFromPath(filePath: string): Format | undefined {
  const ext = getExtensionFromPath(filePath);
  const matchedEntry = Object.entries(mimeTypes).find(([_, extensions]) =>
    extensions.some(
      (e) => e.toLowerCase().includes(ext) || ext.includes(e.toLowerCase()),
    ),
  );
  return matchedEntry ? (matchedEntry[0] as Format) : undefined;
}
