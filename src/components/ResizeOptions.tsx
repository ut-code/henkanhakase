import type { MediaDimensions } from "../formats";

type ResizeOptionsProps = {
  dimensions: MediaDimensions | null;
  enabled: boolean;
  aspectRatioLocked: boolean;
  width: number;
  height: number;
  isLoading: boolean;
  error: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onAspectRatioLockedChange: (locked: boolean) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
};

export function ResizeOptions({
  dimensions,
  enabled,
  aspectRatioLocked,
  width,
  height,
  isLoading,
  error,
  onEnabledChange,
  onAspectRatioLockedChange,
  onWidthChange,
  onHeightChange,
}: ResizeOptionsProps) {
  const unavailable = isLoading || !dimensions;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-[#415166]">
          <input
            type="checkbox"
            checked={enabled}
            disabled={unavailable}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="size-4 accent-[#586cec]"
          />
          サイズを変更
        </label>

        <span className="text-[11px] text-[#9aa6b7]">
          {isLoading
            ? "元のサイズを取得中…"
            : dimensions
              ? `元のサイズ: ${dimensions.width} × ${dimensions.height} px`
              : "元のサイズを取得できません"}
        </span>
      </div>

      {error && <p className="m-0 text-[11px] text-[#d76269]">{error}</p>}

      {enabled && dimensions && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-35 flex-col gap-1.5 text-xs font-semibold text-[#415166]">
            幅 (px)
            <input
              type="number"
              min={1}
              max={16384}
              value={width}
              onChange={(event) => onWidthChange(Number(event.target.value))}
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs font-normal text-[#40506a] outline-[#6578f7]"
            />
          </label>

          <span className="pb-2 text-xs text-[#9aa6b7]">×</span>

          <label className="flex min-w-35 flex-col gap-1.5 text-xs font-semibold text-[#415166]">
            高さ (px)
            <input
              type="number"
              min={1}
              max={16384}
              value={height}
              onChange={(event) => onHeightChange(Number(event.target.value))}
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs font-normal text-[#40506a] outline-[#6578f7]"
            />
          </label>

          <label className="flex items-center gap-2 pb-2 text-xs text-[#5b687c]">
            <input
              type="checkbox"
              checked={aspectRatioLocked}
              onChange={(event) =>
                onAspectRatioLockedChange(event.target.checked)
              }
              className="size-4 accent-[#586cec]"
            />
            縦横比を固定
          </label>
        </div>
      )}
    </div>
  );
}
