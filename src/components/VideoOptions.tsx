import type { VideoFormat } from "../formats";

export type VideoOptionsProps = {
  format: VideoFormat;
  videoCrf: number;
  onVideoCrfChange: (value: number) => void;
  webmCrf: number;
  onWebmCrfChange: (value: number) => void;
  aviQV: number;
  onAviQVChange: (value: number) => void;
};

export function VideoOptions({
  format,
  videoCrf,
  onVideoCrfChange,
  webmCrf,
  onWebmCrfChange,
  aviQV,
  onAviQVChange,
}: VideoOptionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {(format === "MP4" || format === "MOV") && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="video-crf"
              className="font-semibold text-[#415166]"
            >
              圧縮レベル(CRF)
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
            <span>0 (高品質)</span>
            <span>51 (低品質)</span>
          </div>
        </div>
      )}
      {format === "WebM" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="webm-crf"
              className="font-semibold text-[#415166]"
            >
              圧縮レベル(CRF)
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
            <span>0 (高品質)</span>
            <span>63 (低品質)</span>
          </div>
        </div>
      )}
      {format === "AVI" && (
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="avi-qv"
              className="font-semibold text-[#415166]"
            >
              圧縮レベル(非可逆圧縮)
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
            onChange={(e) =>
              onAviQVChange(Number.parseInt(e.target.value, 10))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
          />
          <div className="flex justify-between text-[10px] text-[#9aa6b7]">
            <span>1 (高品質)</span>
            <span>31 (低品質)</span>
          </div>
        </div>
      )}
    </div>
  );
}
