import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
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
  path: string | null;
  format: Format | null;
};

export function MediaPreview({ path, format }: MediaPreviewProps) {
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
    if (!path || !format) return;

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
      invoke<number[] | Uint8Array>("generate_thumbnail", {
        request: {
          inputPath: path,
          inputFormat: formatToExtension(format),
        },
      })
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
      readFile(path)
        .then((bytes) => show(new Blob([bytes as BlobPart])))
        .catch((error) => {
          console.error("プレビューの読み込みに失敗しました:", error);
        });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, format]);

  useEffect(() => {
    setAnimatedUrl(null);
    if (!path || !isGif || !hovered) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    readFile(path)
      .then((bytes) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: "image/gif" }),
        );
        setAnimatedUrl(objectUrl);
      })
      .catch((error) => {
        console.error("GIFの読み込みに失敗しました:", error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, isGif, hovered]);

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
