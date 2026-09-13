import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  type Format,
  type ImageFormat,
  type VideoFormat,
  formatToExtension,
} from "../formats.ts";

type MediaPreviewProps = {
  file: File | null;
  format: Format | null;
};

export function MediaPreview({ file, format }: MediaPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [animatedUrl, setAnimatedUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const isGif = format === "GIF";

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleEnter = () => setHovered(true);
    const handleLeave = () => setHovered(false);
    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    return () => {
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  useEffect(() => {
    setThumbnailUrl(null);
    if (!file || !format) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    const show = (blob: Blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setThumbnailUrl(objectUrl);
    };

    if (
      format === "GIF" ||
      VIDEO_FORMATS.includes(format as VideoFormat)
    ) {
      file
        .arrayBuffer()
        .then((buffer) =>
          invoke<number[] | Uint8Array>("generate_thumbnail", {
            request: {
              data: Array.from(new Uint8Array(buffer)),
              inputFormat: formatToExtension(format),
            },
          }),
        )
        .then((result) => {
          const bytes =
            result instanceof Uint8Array ? result : new Uint8Array(result);
          show(
            new Blob([bytes as BlobPart], {
              type: format === "GIF" ? "image/png" : "image/jpeg",
            }),
          );
        })
        .catch((error) => {
          console.error("サムネイルの生成に失敗しました:", error);
        });
    } else if (IMAGE_FORMATS.includes(format as ImageFormat)) {
      show(file);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, format]);

  useEffect(() => {
    setAnimatedUrl(null);
    if (!file || !isGif || !hovered) return;

    const objectUrl = URL.createObjectURL(file);
    setAnimatedUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isGif, hovered]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {thumbnailUrl && (
        <>
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-contain"
            onError={() => setThumbnailUrl(null)}
          />
          {animatedUrl && (
            <img
              src={animatedUrl}
              alt=""
              className="absolute inset-0 size-full object-contain"
            />
          )}
          <div className="absolute inset-0 bg-white/60" />
        </>
      )}
    </div>
  );
}
