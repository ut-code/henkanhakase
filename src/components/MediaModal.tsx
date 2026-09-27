import { useEffect } from "react";
import type { Format } from "../formats";
import { MediaPreview } from "./MediaPreview";

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string | null;
  format: Format | null;
  title?: string;
}

export function MediaModal({
  isOpen,
  onClose,
  path,
  format,
  title,
}: MediaModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !path || !format) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 backdrop-blur-xs animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="モーダルを閉じる"
        className="absolute inset-0 size-full cursor-default border-none bg-black/70 p-0"
        onClick={onClose}
      />

      {/* ダイアログコンテンツ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "プレビュー"}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] max-w-[90vw] w-fit min-w-[320px] mx-auto flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-[#edf0f5] pb-2 shrink-0">
          <span className="truncate text-sm font-bold text-[#26354a]">
            {title || "プレビュー"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-[#f0f3f7] text-sm text-[#657184] transition hover:bg-[#d76269] hover:text-white"
            title="閉じる (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Media Preview Area */}
        <div className="relative flex max-h-[calc(90vh-80px)] min-h-50 w-full items-center justify-center overflow-auto rounded-xl bg-[radial-gradient(#e1e7f0_1px,transparent_1px)] bg-size-[12px_12px] bg-[#f8fafc] p-2 [&_img]:max-h-[calc(96vh-100px)] [&_img]:w-auto [&_img]:object-contain [&_video]:max-h-[calc(96vh-100px)] [&_video]:w-auto">
          <MediaPreview path={path} format={format} />
        </div>
      </div>
    </div>
  );
}
