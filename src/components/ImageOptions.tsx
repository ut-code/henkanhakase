import {
  type Format,
  type ImageFormat,
  VIDEO_FORMATS,
  type VideoFormat,
} from "../formats";
import { useTranslation } from "../i18n";

export type ImageOptionsProps = {
  format: ImageFormat;
  sourceFormat: Format | null;
  pngCompressionLevel: number;
  onPngCompressionLevelChange: (value: number) => void;
  jpegQV: number;
  onJpegQVChange: (value: number) => void;
  webpQV: number;
  onWebpQVChange: (value: number) => void;
  avifQuality?: number;
  onAvifQualityChange?: (value: number) => void;
  avifSpeed?: number;
  onAvifSpeedChange?: (value: number) => void;
  gifFPS: number;
  onGifFPSChange: (value: number) => void;
  gifMaxColors: number;
  onGifMaxColorsChange: (value: number) => void;
  bmpBitDepth?: number;
  onBmpBitDepthChange?: (value: number) => void;
  bmpCompression?: boolean;
  onBmpCompressionChange?: (value: boolean) => void;
  icoSizes?: number[];
  onIcoSizesChange?: (sizes: number[]) => void;
  icoFitMode?: "pad" | "square";
  onIcoFitModeChange?: (mode: "pad" | "square") => void;
};

const ICO_AVAILABLE_SIZES = [32, 64, 128, 256];

export function ImageOptions({
  format,
  sourceFormat,
  pngCompressionLevel,
  onPngCompressionLevelChange,
  jpegQV,
  onJpegQVChange,
  webpQV,
  onWebpQVChange,
  avifQuality = 23,
  onAvifQualityChange,
  avifSpeed = 6,
  onAvifSpeedChange,
  gifFPS,
  onGifFPSChange,
  gifMaxColors,
  onGifMaxColorsChange,
  bmpBitDepth = 24,
  onBmpBitDepthChange,
  bmpCompression = false,
  onBmpCompressionChange,
  icoSizes = [64, 256],
  onIcoSizesChange,
  icoFitMode = "pad",
  onIcoFitModeChange,
}: ImageOptionsProps) {
  const { t } = useTranslation();

  const toggleIcoSize = (size: number) => {
    if (!onIcoSizesChange) return;
    if (icoSizes.includes(size)) {
      if (icoSizes.length > 1) {
        onIcoSizesChange(icoSizes.filter((s) => s !== size));
      }
    } else {
      onIcoSizesChange([...icoSizes, size].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-6">
      {format === "PNG" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="png-compression"
              className="font-semibold text-[#415166]"
            >
              {t("pngCompression")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {pngCompressionLevel}
            </span>
          </div>
          <input
            type="range"
            id="png-compression"
            min="0"
            max="9"
            value={pngCompressionLevel}
            onChange={(e) =>
              onPngCompressionLevelChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("lowCompression")}</span>
            <span>{t("highCompression")}</span>
          </div>
        </div>
      )}
      {format === "JPEG" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="jpeg-quality"
              className="font-semibold text-[#415166]"
            >
              {t("jpegCompression")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {jpegQV}
            </span>
          </div>
          <input
            type="range"
            id="jpeg-quality"
            min="1"
            max="31"
            value={jpegQV}
            onChange={(e) =>
              onJpegQVChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("rangeHighQuality", { value: 1 })}</span>
            <span>{t("rangeLowQuality", { value: 31 })}</span>
          </div>
        </div>
      )}
      {format === "WebP" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="webp-quality"
              className="font-semibold text-[#415166]"
            >
              {t("webpQuality")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {webpQV}
            </span>
          </div>
          <input
            type="range"
            id="webp-quality"
            min="1"
            max="100"
            value={webpQV}
            onChange={(e) =>
              onWebpQVChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("rangeLowQuality", { value: 1 })}</span>
            <span>{t("rangeHighQuality", { value: 100 })}</span>
          </div>
        </div>
      )}
      {format === "AVIF" && (
        <>
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="avif-quality"
                className="font-semibold text-[#415166]"
              >
                {t("avifQuality")}
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {avifQuality}
              </span>
            </div>
            <input
              type="range"
              id="avif-quality"
              min="0"
              max="63"
              value={avifQuality}
              onChange={(e) =>
                onAvifQualityChange?.(Number.parseInt(e.target.value, 10))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>{t("rangeHighQuality", { value: 0 })}</span>
              <span>{t("rangeLowQuality", { value: 63 })}</span>
            </div>
          </div>
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="avif-speed"
                className="font-semibold text-[#415166]"
              >
                {t("avifSpeed")}
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {avifSpeed}
              </span>
            </div>
            <input
              type="range"
              id="avif-speed"
              min="0"
              max="8"
              value={avifSpeed}
              onChange={(e) =>
                onAvifSpeedChange?.(Number.parseInt(e.target.value, 10))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>0 ({t("highCompression")})</span>
              <span>8 ({t("lowCompression")})</span>
            </div>
          </div>
        </>
      )}
      {format === "BMP" && (
        <>
          <div className="flex min-w-45 flex-1 max-w-xs flex-col gap-1.5">
            <label
              htmlFor="bmp-bit-depth"
              className="text-xs font-semibold text-[#415166]"
            >
              {t("bitDepth")}
            </label>
            <select
              id="bmp-bit-depth"
              value={bmpBitDepth}
              onChange={(e) =>
                onBmpBitDepthChange?.(Number.parseInt(e.target.value, 10))
              }
              className="rounded-lg border border-[#dfe5ef] bg-white px-2.5 py-1.5 text-xs text-[#3c4a60] outline-none focus:border-[#586cec]"
            >
              <option value={1}>1 bit</option>
              <option value={8}>
                8 bit ({t("colorCount", { value: 256 })})
              </option>
              <option value={16}>16 bit</option>
              <option value={24}>24 bit</option>
              <option value={32}>32 bit (Alpha)</option>
            </select>
          </div>
          <div className="flex min-w-45 flex-1 max-w-xs flex-col gap-1.5 justify-center">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#415166] mt-4">
              <input
                type="checkbox"
                checked={bmpCompression}
                onChange={(e) => onBmpCompressionChange?.(e.target.checked)}
                className="size-4 rounded border-[#dfe5ef] accent-[#586cec]"
              />
              {t("enableRleCompression")}
            </label>
          </div>
        </>
      )}
      {format === "ICO" && (
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#415166]">
              {t("outputSize")}
            </span>
            <div className="flex flex-wrap gap-2">
              {ICO_AVAILABLE_SIZES.map((size) => {
                const checked = icoSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleIcoSize(size)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                      checked
                        ? "border-[#586cec] bg-[#eef1ff] text-[#586cec]"
                        : "border-[#dfe5ef] bg-white text-[#5b687c] hover:bg-[#f4f6ff]"
                    }`}
                  >
                    {size}x{size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#415166]">
              {t("details")}
            </span>
            <div className="flex items-center gap-4 text-xs text-[#5b687c]">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="icoFitMode"
                  value="pad"
                  checked={icoFitMode === "pad"}
                  onChange={() => onIcoFitModeChange?.("pad")}
                  className="accent-[#586cec]"
                />
                {t("keepRatioPadding")}
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="icoFitMode"
                  value="square"
                  checked={icoFitMode === "square"}
                  onChange={() => onIcoFitModeChange?.("square")}
                  className="accent-[#586cec]"
                />
                {t("stretchToSquare")}
              </label>
            </div>
          </div>
        </div>
      )}
      {format === "GIF" && (
        <>
          {(sourceFormat === "GIF" ||
            VIDEO_FORMATS.includes(sourceFormat as VideoFormat)) && (
            <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="gif-fps"
                  className="font-semibold text-[#415166]"
                >
                  {t("fps")}
                </label>
                <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                  {gifFPS} fps
                </span>
              </div>
              <input
                type="range"
                id="gif-fps"
                min="1"
                max="120"
                value={gifFPS}
                onChange={(e) =>
                  onGifFPSChange(Number.parseInt(e.target.value, 10))
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
              />
              <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                <span>1 fps</span>
                <span>120 fps</span>
              </div>
            </div>
          )}
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="gif-max-colors"
                className="font-semibold text-[#415166]"
              >
                {t("colors")}
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {t("colorCount", { value: gifMaxColors })}
              </span>
            </div>
            <input
              type="range"
              id="gif-max-colors"
              min="2"
              max="256"
              value={gifMaxColors}
              onChange={(e) =>
                onGifMaxColorsChange(Number.parseInt(e.target.value, 10))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>{t("colorCount", { value: 2 })}</span>
              <span>{t("colorCount", { value: 256 })}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
