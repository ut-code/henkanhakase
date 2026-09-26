import { invoke, isTauri } from "@tauri-apps/api/core";
import { join, tempDir } from "@tauri-apps/api/path";
import { readFile } from "@tauri-apps/plugin-fs";
import { useEffect, useRef, useState } from "react";
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  type Format,
  type ImageFormat,
  type VideoFormat,
} from "../formats.ts";
import { buildThumbnailArgs } from "../utils/ffmpeg-command.ts";

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
      if (!isTauri()) {
        if (format === "GIF") {
          setThumbnailUrl(path);
        } else {
          const video = document.createElement("video");
          video.src = path;
          video.muted = true;
          video.currentTime = 0.001;
          video.onseeked = () => {
            if (cancelled) return;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")?.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
              if (blob && !cancelled) show(blob);
            }, "image/jpeg");
          };
        }
      } else {
        Promise.all([
          tempDir(),
          crypto.randomUUID(),
        ])
          .then(async ([directory, id]) => {
            const thumbnailPath = await join(
              directory,
              "henkanhakase",
              `thumbnail_${id}.${format === "GIF" ? "png" : "jpg"}`,
            );
            try {
              await invoke("run_ffmpeg", {
                args: buildThumbnailArgs(path, thumbnailPath, format),
              });
              const bytes = await readFile(thumbnailPath);
              show(
                new Blob([bytes as BlobPart], {
                  type: format === "GIF" ? "image/png" : "image/jpeg",
                }),
              );
            } finally {
              await invoke("cleanup_temp_file", { path: thumbnailPath }).catch(
                console.error,
              );
            }
          })
          .catch((error) => {
            console.error("サムネイルの生成に失敗しました:", error);
          });
      }
    } else if (IMAGE_FORMATS.includes(format as ImageFormat)) {
      if (!isTauri()) {
        setThumbnailUrl(path);
      } else {
        readFile(path)
          .then((bytes) => show(new Blob([bytes as BlobPart])))
          .catch((error) => {
            console.error("プレビューの読み込みに失敗しました:", error);
          });
      }
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, format]);

  useEffect(() => {
    setAnimatedUrl(null);
    if (!path || !isGif || !hovered) return;

    if (!isTauri()) {
      setAnimatedUrl(path);
      return;
    }

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
