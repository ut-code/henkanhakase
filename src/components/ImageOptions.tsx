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
  gifFPS: number;
  onGifFPSChange: (value: number) => void;
  gifMaxColors: number;
  onGifMaxColorsChange: (value: number) => void;
};

export function ImageOptions({
  format,
  sourceFormat,
  pngCompressionLevel,
  onPngCompressionLevelChange,
  jpegQV,
  onJpegQVChange,
  webpQV,
  onWebpQVChange,
  gifFPS,
  onGifFPSChange,
  gifMaxColors,
  onGifMaxColorsChange,
}: ImageOptionsProps) {
  const { t } = useTranslation();
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
            <span>1 (高品質)</span>
            <span>31 (低品質)</span>
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
            <span>1 (低品質)</span>
            <span>100 (高品質)</span>
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
                  FPS
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
                {gifMaxColors} 色
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
              <span>2 色</span>
              <span>256 色</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
