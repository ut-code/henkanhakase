import type { VideoFormat } from "../formats";
import { useTranslation } from "../i18n";

export type VideoOptionsProps = {
  format: VideoFormat;
  videoCrf: number;
  onVideoCrfChange: (value: number) => void;
  webmCrf: number;
  onWebmCrfChange: (value: number) => void;
  aviQV: number;
  onAviQVChange: (value: number) => void;
  // ★ 追加: ループ回数用 Props
  loopCount: number;
  onLoopCountChange: (value: number) => void;
  isGifSource?: boolean; // GIFからの変換時のみ表示したい場合
};

export function VideoOptions({
  format,
  videoCrf,
  onVideoCrfChange,
  webmCrf,
  onWebmCrfChange,
  aviQV,
  onAviQVChange,
  loopCount,
  onLoopCountChange,
  isGifSource = true,
}: VideoOptionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* 既存: MP4 / MOV画質設定 */}
      {(format === "MP4" || format === "MOV") && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="video-crf" className="font-semibold text-[#415166]">
              {t("videoCompression")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {videoCrf}
            </span>
          </div>
          <input
            type="range"
            id="video-crf"
            min="0"
            max="51"
            value={videoCrf}
            onChange={(e) =>
              onVideoCrfChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("rangeHighQuality", { value: 0 })}</span>
            <span>{t("rangeLowQuality", { value: 51 })}</span>
          </div>
        </div>
      )}

      {/* 既存: WebM画質設定 */}
      {format === "WebM" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="webm-crf" className="font-semibold text-[#415166]">
              {t("videoCompression")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {webmCrf}
            </span>
          </div>
          <input
            type="range"
            id="webm-crf"
            min="0"
            max="63"
            value={webmCrf}
            onChange={(e) =>
              onWebmCrfChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("rangeHighQuality", { value: 0 })}</span>
            <span>{t("rangeLowQuality", { value: 63 })}</span>
          </div>
        </div>
      )}

      {/* 既存: AVI画質設定 */}
      {format === "AVI" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="avi-qv" className="font-semibold text-[#415166]">
              {t("jpegCompression")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {aviQV}
            </span>
          </div>
          <input
            type="range"
            id="avi-qv"
            min="1"
            max="31"
            value={aviQV}
            onChange={(e) => onAviQVChange(Number.parseInt(e.target.value, 10))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>{t("rangeHighQuality", { value: 1 })}</span>
            <span>{t("rangeLowQuality", { value: 31 })}</span>
          </div>
        </div>
      )}

      {/* ★ 追加: ループ回数の設定項目 (GIF入力時などに表示) */}
      {isGifSource && (
        <div className="flex min-w-48 flex-1 max-w-xs flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="video-loop-count"
              className="font-semibold text-[#415166]"
            >
              {t("loopCount")}
            </label>
            <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
              {t("loopCountUnit", { count: loopCount })}
            </span>
          </div>
          <input
            type="range"
            id="video-loop-count"
            min="1"
            max="20"
            value={loopCount}
            onChange={(e) =>
              onLoopCountChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <span className="text-[10px] text-[#9aa6b7]">
            {t("loopCountHint")}
          </span>
        </div>
      )}
    </div>
  );
}
