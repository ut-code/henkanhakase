import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Locale = "ja" | "en";

const messages = {
  ja: {
    appName: "変換はかせ", converting: "変換中", waiting: "変換待機中", language: "言語",
    conversionWorkspace: "ファイル変換", sourceTitle: "変換するファイル", sourceHint: "ファイルを追加してください",
    dropFile: "ファイルをここにドロップ", chooseAnother: "別のファイルを選択", chooseFile: "または、クリックして選択",
    outputFormat: "変換形式", convertTo: "{format} に変換", cancel: "キャンセル", convert: "ファイルを変換",
    reconvertChanged: "設定を変更して再変換", convertAgain: "もう一度変換", outputTitle: "変換後のファイル",
    outputHint: "変換結果がここに表示されます", noOutput: "まだ変換されたファイルはありません",
    addAndConvert: "ファイルを追加して変換を開始してください", formatLabel: "{format} 形式", saveFile: "ファイルに保存",
    details: "詳細", unsupportedFormat: "{type} はサポートされていない形式です。対応形式：{formats}",
    cancelFailed: "変換のキャンセルに失敗しました。", saveFailed: "ファイルの保存に失敗しました。",
    noOptions: "この変換形式で設定可能な詳細オプションはありません", chooseForOptions: "ファイルを選択するとオプションを設定できます",
    outputSize: "出力サイズ", sourceSizeLoading: "元のサイズを取得中…", sourceSize: "元のサイズ: {width} × {height} px",
    sourceSizeUnavailable: "元のサイズを取得できません", width: "幅 (px)", height: "高さ (px)", lockAspect: "縦横比を固定", antiAliasing: "アンチエイリアス",
    pngCompression: "圧縮レベル（可逆圧縮）", jpegCompression: "圧縮レベル（非可逆圧縮）", webpQuality: "品質（非可逆圧縮）",
    lowCompression: "0（低圧縮）", highCompression: "9（高圧縮）", highQuality: "高品質", lowQuality: "低品質", colors: "色数",
    videoCompression: "圧縮レベル（CRF）", fps: "FPS", sampleRate: "サンプルレート", channels: "チャンネル", auto: "自動（元ファイルと同じ）",
    bitDepth: "ビット深度", flacCompression: "圧縮レベル（可逆圧縮）", vorbisQuality: "音質（Vorbis）", bitrate: "ビットレート",
    bitrateHint: "ビットレートが高いほど一般に音質とファイルサイズが増加します",
    error_conversion_cancelled: "変換をキャンセルしました。", error_invalid_options: "変換設定が正しくありません。",
    error_input_write_failed: "入力ファイルを準備できませんでした。", error_ffmpeg_unavailable: "変換エンジンを起動できませんでした。",
    error_ffmpeg_start_failed: "変換エンジンを開始できませんでした。", error_conversion_failed: "変換処理に失敗しました。",
    error_output_read_failed: "変換結果を読み込めませんでした。", error_probe_failed: "元のサイズを取得できませんでした。",
    error_unexpected: "予期しないエラーが発生しました。",
  },
  en: {
    appName: "Henkan Hakase", converting: "Converting", waiting: "Ready", language: "Language",
    conversionWorkspace: "File conversion", sourceTitle: "Source file", sourceHint: "Add a file to convert",
    dropFile: "Drop a file here", chooseAnother: "Choose another file", chooseFile: "or click to choose a file",
    outputFormat: "Output format", convertTo: "Convert to {format}", cancel: "Cancel", convert: "Convert file",
    reconvertChanged: "Reconvert with changed settings", convertAgain: "Convert again", outputTitle: "Converted file",
    outputHint: "Your converted file appears here", noOutput: "No converted file yet",
    addAndConvert: "Add a file to start converting", formatLabel: "{format} format", saveFile: "Save file",
    details: "Details", unsupportedFormat: "{type} is not supported. Supported formats: {formats}",
    cancelFailed: "Could not cancel the conversion.", saveFailed: "Could not save the file.",
    noOptions: "No detailed options are available for this output format", chooseForOptions: "Choose a file to configure options",
    outputSize: "Output size", sourceSizeLoading: "Reading source dimensions…", sourceSize: "Source size: {width} × {height} px",
    sourceSizeUnavailable: "Could not read source dimensions", width: "Width (px)", height: "Height (px)", lockAspect: "Lock aspect ratio", antiAliasing: "Anti-aliasing",
    pngCompression: "Compression level (lossless)", jpegCompression: "Compression level (lossy)", webpQuality: "Quality (lossy)",
    lowCompression: "0 (low compression)", highCompression: "9 (high compression)", highQuality: "high quality", lowQuality: "low quality", colors: "Colors",
    videoCompression: "Compression level (CRF)", fps: "FPS", sampleRate: "Sample rate", channels: "Channels", auto: "Auto (keep source)",
    bitDepth: "Bit depth", flacCompression: "Compression level (lossless)", vorbisQuality: "Vorbis quality", bitrate: "Bitrate",
    bitrateHint: "Higher bitrates generally increase quality and file size.",
    error_conversion_cancelled: "Conversion was cancelled.", error_invalid_options: "The conversion settings are invalid.",
    error_input_write_failed: "Could not prepare the input file.", error_ffmpeg_unavailable: "Could not start the conversion engine.",
    error_ffmpeg_start_failed: "Could not start the conversion engine.", error_conversion_failed: "Conversion failed.",
    error_output_read_failed: "Could not read the converted file.", error_probe_failed: "Could not read source dimensions.",
    error_unexpected: "An unexpected error occurred.",
  },
} as const;

type MessageKey = keyof typeof messages.ja;
export type Translation = (key: MessageKey, values?: Record<string, string | number>) => string;

const I18nContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: Translation } | null>(null);

function initialLocale(): Locale {
  const saved = localStorage.getItem("locale");
  if (saved === "ja" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "ja";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => localStorage.setItem("locale", locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: MessageKey, values: Record<string, string | number> = {}) => {
    const template = messages[locale][key] as string;
    return Object.entries(values).reduce<string>((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
  } }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useTranslation must be used within I18nProvider");
  return context;
}
