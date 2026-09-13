import { useEffect, useState } from "react";
import type { MediaDimensions } from "../formats";
import { useTranslation } from "../i18n";

type ResizeOptionsProps = {
  dimensions: MediaDimensions | null;
  aspectRatioLocked: boolean;
  antiAliasing: boolean;
  width: number;
  height: number;
  isLoading: boolean;
  error: string | null;
  onAspectRatioLockedChange: (locked: boolean) => void;
  onAntiAliasingChange: (enabled: boolean) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
};

export function ResizeOptions({
  dimensions,
  aspectRatioLocked,
  antiAliasing,
  width,
  height,
  isLoading,
  error,
  onAspectRatioLockedChange,
  onAntiAliasingChange,
  onWidthChange,
  onHeightChange,
}: ResizeOptionsProps) {
  const { t } = useTranslation();
  const [widthInput, setWidthInput] = useState(String(width));
  const [heightInput, setHeightInput] = useState(String(height));

  useEffect(() => {
    setWidthInput(String(width));
  }, [width]);

  useEffect(() => {
    setHeightInput(String(height));
  }, [height]);

  const commitWidth = () => {
    onWidthChange(Number(widthInput));
    setWidthInput(String(width));
  };

  const commitHeight = () => {
    onHeightChange(Number(heightInput));
    setHeightInput(String(height));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#415166]">{t("outputSize")}</span>

        <span className="text-[11px] text-[#9aa6b7]">
          {isLoading
            ? t("sourceSizeLoading")
            : dimensions
              ? t("sourceSize", dimensions)
              : t("sourceSizeUnavailable")}
        </span>
      </div>

      {error && <p className="m-0 text-[11px] text-[#d76269]">{error}</p>}

      {dimensions && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-35 flex-col gap-1.5 text-xs font-semibold text-[#415166]">
            {t("width")}
            <input
              type="number"
              min={1}
              max={16384}
              value={widthInput}
              onChange={(event) => setWidthInput(event.target.value)}
              onBlur={commitWidth}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs font-normal text-[#40506a] outline-[#6578f7]"
            />
          </label>

          <span className="pb-2 text-xs text-[#9aa6b7]">×</span>

          <label className="flex min-w-35 flex-col gap-1.5 text-xs font-semibold text-[#415166]">
            {t("height")}
            <input
              type="number"
              min={1}
              max={16384}
              value={heightInput}
              onChange={(event) => setHeightInput(event.target.value)}
              onBlur={commitHeight}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
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
            {t("lockAspect")}
          </label>

          <label className="flex items-center gap-2 pb-2 text-xs text-[#5b687c]">
            <input
              type="checkbox"
              checked={antiAliasing}
              onChange={(event) => onAntiAliasingChange(event.target.checked)}
              className="size-4 accent-[#586cec]"
            />
            {t("antiAliasing")}
          </label>
        </div>
      )}
    </div>
  );
}
