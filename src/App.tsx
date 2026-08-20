import { useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const IMAGE_FORMATS = ["PNG", "JPEG", "WebP", "GIF"] as const;
const VIDEO_FORMATS = ["MP4", "WebM", "AVI", "MOV"] as const;
type ImageFormat = (typeof IMAGE_FORMATS)[number];
type VideoFormat = (typeof VIDEO_FORMATS)[number];
type Format = ImageFormat | VideoFormat;

const mimeTypes: Record<Format, string[]> = {
    PNG: ["image/png", "image/x-png"],
    JPEG: ["image/jpeg", "image/pjpeg", "image/jpg"],
    WebP: ["image/webp"],
    GIF: ["image/gif"],


    MP4: ["video/mp4"],
    WebM: ["video/webm"],
    AVI: [
        "video/x-msvideo",
        "video/avi",
        "video/msvideo",
        "video/vnd.avi",
    ],
    MOV: [
        "video/quicktime",
        "video/mov",
        "video/x-quicktime",
    ],
};

function UploadIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-6 fill-none stroke-current stroke-[1.7] stroke-linecap-round stroke-linejoin-round"
        >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
    );
}

function FileIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-6 fill-none stroke-current stroke-[1.7] stroke-linecap-round stroke-linejoin-round"
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h6" />
        </svg>
    );
}

function formatToExtension(format: Format): string {
    switch (format) {
        case "JPEG":
            return "jpg";

        default:
            return format.toLowerCase();
    }
}

function App() {
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [convertedFile, setConvertedFile] = useState<File | null>(null);
    const sourceFormat = useMemo<Format | null>(
        () =>
            sourceFile
                ? (Object.keys(mimeTypes).find((format) =>
                    mimeTypes[format as Format].includes(sourceFile.type),
                ) as Format)
                : null,
        [sourceFile],
    );
    const [convertedFormat, setConvertedFormat] =
        useState<Format>("PNG");
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInput = useRef<HTMLInputElement>(null);

    const availableOutputFormats = useMemo<Format[]>(() => {
        if (!sourceFormat) {
            return [];
        }

    if (sourceFormat === "GIF") {
      return [...IMAGE_FORMATS, ...VIDEO_FORMATS];
    }

    if (VIDEO_FORMATS.includes(sourceFormat as VideoFormat)) {
      return [...VIDEO_FORMATS, "GIF"];
    }

    return [...IMAGE_FORMATS];
    }, [sourceFormat]);

    const selectFile = (file?: File) => {
        if (!file) return;

        const detectedFormat = Object.keys(mimeTypes).find((format) =>
            mimeTypes[format as Format].includes(file.type),
        ) as Format | undefined;

        if (!detectedFormat) {
            setError(
                `${file.type} はサポートされていない形式です。`,
            );
            return;
        }

        setSourceFile(file);
        setConvertedFile(null);
        setError(null);

        if (detectedFormat === "GIF") {
            setConvertedFormat("MP4");
        } else if (
            VIDEO_FORMATS.includes(detectedFormat as VideoFormat)
        ) {
            setConvertedFormat("GIF");
        } else {
            setConvertedFormat("PNG");
        }
    };

    const convertFile = async () => {
        if (!sourceFile || !sourceFormat) return;

        setIsConverting(true);
        setError(null);

        try {
            const extension = formatToExtension(convertedFormat);
            const inputExtension = formatToExtension(sourceFormat);

            const stem = sourceFile.name.replace(/\.[^.]+$/, "");

            const buffer = await sourceFile.arrayBuffer();

            const result = await invoke<number[] | Uint8Array>("convert_file", {
                request: {
                    data: Array.from(new Uint8Array(buffer)),
                    stem,
                    inputFormat: inputExtension,
                    outputFormat: extension,

                    // 今はUI未実装なので空。
                    // 将来的にここへFPS等を渡す。
                    options: {},
                },
            });

            const uint8Array =
                result instanceof Uint8Array
                    ? result
                    : new Uint8Array(result);

            setConvertedFile(
                new File(
                    [uint8Array as BlobPart],
                    `${stem}.${extension}`,
                    {
                        type:
                            mimeTypes[convertedFormat][0] ||
                            `application/octet-stream`,
                    },
                ),
            );
        } catch (error) {
            setError(
                `Error during conversion: ${error instanceof Error
                    ? error.message
                    : String(error)
                }`,
            );
        } finally {
            setIsConverting(false);
        }
    };

    const saveFile = async () => {
        if (!convertedFile) return;

        try {
            const filePath = await save({
                defaultPath: convertedFile.name,
            });

            if (!filePath) {
                return;
            }

            const buffer = await convertedFile.arrayBuffer();

            await writeFile(filePath, new Uint8Array(buffer));
        } catch (error) {
            console.error("ファイルの保存に失敗しました:", error);
        }
    };

    const handleFormatChange = (newFormat: Format) => {
        setConvertedFormat(newFormat);
        setConvertedFile(null);
    };

    const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        selectFile(event.dataTransfer.files[0]);
    };

    return (
        <main
            className="
        flex min-h-screen flex-col
        bg-[radial-gradient(circle_at_50%_45%,#fff_0,#f6f8fc_57%)]
        font-['Noto_Sans_JP',sans-serif]
        text-[#263143]
        antialiased
      "
        >
            {/* Header */}
            <header
                className="
          flex h-17.5 shrink-0 items-center justify-between
          border-b border-[#e8ecf4]
          bg-white/80
          px-10.5
          max-[980px]:px-5.5
        "
            >
                <div
                    className="
            flex items-center gap-2.75
            font-['Plus_Jakarta_Sans','Noto_Sans_JP',sans-serif]
            text-lg font-bold
            tracking-[-0.3px]
            text-[#1d2c43]
          "
                >
                    <span
                        className="
              grid size-7 place-items-center
              rounded-lg
              bg-linear-to-br from-[#5d75f6] to-[#8768ec]
              text-[15px] text-white
            "
                    >
                        H
                    </span>
                    変換博士
                </div>

                <div className="flex items-center gap-1.75 text-xs text-[#8390a3]">
                    <span
                        className={[
                            "size-1.75 rounded-full bg-[#aeb8c7]",
                            isConverting &&
                            "animate-[pulse_1s_infinite_alternate] bg-[#6578f7]",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    />

                    {isConverting ? "変換中" : "変換待機中"}
                </div>
            </header>

            {/* Workspace */}
            <section
                className="
          mx-auto grid flex-1 items-center gap-7
          w-[min(1190px,calc(100%-96px))]
          grid-cols-[minmax(260px,1fr)_180px_minmax(260px,1fr)]
          py-12 pb-14.5

          max-[980px]:w-[min(680px,calc(100%-40px))]
          max-[980px]:grid-cols-1
          max-[980px]:gap-6
          max-[980px]:py-7.5
        "
                aria-label="ファイル変換"
            >
                {/* Input Panel */}
                <div
                    className="
            min-h-99.5
            rounded-[20px]
            border border-[#e3e8f1]
            bg-white/90
            p-6.25
            shadow-[0_12px_35px_rgba(39,61,98,0.055)]

            max-[980px]:order-0
            max-[980px]:min-h-0
          "
                >
                    <div className="mb-6.25 flex items-start gap-3">
                        <span
                            className="
                grid size-6.25 shrink-0 place-items-center
                rounded-full
                bg-[#eef1ff]
                font-['Plus_Jakarta_Sans',sans-serif]
                text-xs font-bold
                text-[#586cec]
              "
                        >
                            1
                        </span>

                        <div>
                            <h1 className="mb-0.75 text-base font-bold text-[#26354a]">
                                変換するファイル
                            </h1>

                            <p className="m-0 text-xs text-[#99a4b5]">
                                ファイルを追加してください
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="
              flex h-70 w-full cursor-pointer
              flex-col items-center justify-center
              rounded-[14px]
              border-[1.5px] border-dashed
              border-[#9eabff]
              bg-[#fafbff]
              p-6
              text-[#657184]
              transition duration-200
              hover:border-[#6477f6]
              hover:bg-[#f4f6ff]

              max-[980px]:h-57.5
            "
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <span
                            className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#ebefff]
                text-[#6276f7]
              "
                        >
                            <UploadIcon />
                        </span>

                        <strong
                            className="
                mt-3.5 mb-1.25
                max-w-full
                overflow-hidden
                text-ellipsis
                whitespace-nowrap
                text-sm
                text-[#3c4a60]
              "
                        >
                            {sourceFile?.name ?? "ファイルをここにドロップ"}
                        </strong>

                        <span className="text-xs">
                            {sourceFile ? "別のファイルを選択" : "または、クリックして選択"}
                        </span>
                    </button>

                    <input
                        ref={fileInput}
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/avi,video/mov"
                        onChange={(event) => selectFile(event.target.files?.[0])}
                    />

                    {error && (
                        <p className="my-2 text-[11px] leading-[1.6] text-[#d76269]">
                            {error}
                        </p>
                    )}
                </div>

                {/* Conversion Flow */}
                <div
                    className="
            relative flex flex-col items-center self-center pb-3

            max-[980px]:order-1
          "
                >
                    <label
                        htmlFor="format"
                        className="mb-1.75 text-[11px] text-[#94a0b3]"
                    >
                        変換形式
                    </label>

                    <select
                        id="format"
                        value={convertedFormat}
                        onChange={(event) =>
                            handleFormatChange(event.target.value as Format)
                        }
                        className="
              w-31.5
              rounded-[9px]
              border border-[#dfe5ef]
              bg-white
              px-3.75
              py-2.5
              pr-7.75
              text-[13px]
              font-semibold
              text-[#40506a]
              outline-[#6578f7]
            "
                    >
                        {availableOutputFormats.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    {/* Arrow */}
                    <div
                        className="
              mt-7 flex w-38.5 items-center

              max-[980px]:my-11.25
              max-[980px]:mb-8.25
              max-[980px]:rotate-90
            "
                        aria-label={`${convertedFormat} に変換`}
                    >
                        <span className="h-px flex-1 bg-linear-to-r from-[#cad2f9] to-[#7081ef]" />

                        <i
                            className="
                -ml-1.5
                size-2.75
                rotate-45
                border-r
                border-t
                border-[#7081ef]
              "
                        />
                    </div>

                    <p
                        className="
              mt-3.5 text-xs text-[#9aa6b7]

              max-[980px]:absolute
              max-[980px]:bottom-0
            "
                    >
                        <b className="text-[#596ff1]">{convertedFormat}</b> に変換
                    </p>

                    <button
                        type="button"
                        className="
              mt-6.25
              min-w-31.5
              rounded-[9px]
              border-0
              bg-linear-to-br from-[#6177f6] to-[#7c69e9]
              px-4
              py-2.75
              text-xs
              font-bold
              text-white
              shadow-[0_5px_13px_rgba(93,111,232,0.22)]
              transition duration-200
              hover:-translate-y-px
              hover:brightness-[1.04]
              disabled:cursor-not-allowed
              disabled:bg-[#c7ceda]
              disabled:bg-none
              disabled:shadow-none
              disabled:transform-none
            "
                        onClick={convertFile}
                        disabled={!sourceFile || isConverting}
                    >
                        {isConverting ? "変換中…" : "変換を開始"}
                    </button>
                </div>

                {/* Output Panel */}
                <div
                    className="
            min-h-99.5
            rounded-[20px]
            border border-[#e3e8f1]
            bg-white/90
            p-6.25
            shadow-[0_12px_35px_rgba(39,61,98,0.055)]

            max-[980px]:order-2
            max-[980px]:min-h-0
          "
                >
                    <div className="mb-6.25 flex items-start gap-3">
                        <span
                            className="
                grid size-6.25 shrink-0 place-items-center
                rounded-full
                bg-[#eef1ff]
                font-['Plus_Jakarta_Sans',sans-serif]
                text-xs font-bold
                text-[#586cec]
              "
                        >
                            2
                        </span>

                        <div>
                            <h2 className="mb-0.75 text-base font-bold text-[#26354a]">
                                変換後のファイル
                            </h2>

                            <p className="m-0 text-xs text-[#99a4b5]">
                                変換結果がここに表示されます
                            </p>
                        </div>
                    </div>

                    <div
                        className={[
                            "flex h-70 flex-col items-center justify-center rounded-[14px] border bg-[#fcfdff] p-5.5 text-center text-[#8e9aab] max-[980px]:h-57.5",
                            convertedFile
                                ? "border-[#dce3ff] bg-[#fbfcff]"
                                : "border-[#edf0f5]",
                        ].join(" ")}
                    >
                        <span
                            className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#f0f3f7]
                text-[#a9b4c4]
              "
                        >
                            <FileIcon />
                        </span>

                        <strong
                            className="
                mt-3.5 mb-1.25
                max-w-full
                overflow-hidden
                text-ellipsis
                whitespace-nowrap
                text-sm
                text-[#3c4a60]
              "
                        >
                            {convertedFile?.name ?? "まだ変換されたファイルはありません"}
                        </strong>

                        <span className="text-xs">
                            {convertedFile
                                ? `${Math.ceil(
                                    convertedFile.size / 1024,
                                ).toLocaleString()} KB ・ ${convertedFormat} 形式`
                                : "ファイルを追加して変換を開始してください"}
                        </span>

                        {convertedFile && (
                            <button
                                type="button"
                                className="
                  mt-4.5
                  rounded-[9px]
                  border-0
                  bg-linear-to-br from-[#6177f6] to-[#7c69e9]
                  px-3.75
                  py-2.25
                  text-xs
                  font-bold
                  text-white
                  shadow-[0_5px_13px_rgba(93,111,232,0.22)]
                  transition duration-200
                  hover:-translate-y-px
                  hover:brightness-[1.04]
                "
                                onClick={saveFile}
                            >
                                ファイルに保存
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Details */}
            <footer
                className="
          mx-auto mb-5.5
          w-[min(1190px,calc(100%-96px))]
          overflow-hidden
          rounded-xl
          border border-[#e2e7f0]
          bg-white/85

          max-[980px]:w-[calc(100%-40px)]
        "
            >
                <button
                    type="button"
                    className="
            h-11.5
            w-full
            cursor-pointer
            border-0
            bg-transparent
            px-4.5
            text-left
            text-xs
            font-semibold
            text-[#5b687c]
          "
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    aria-expanded={detailsOpen}
                >
                    <span
                        className={[
                            "mr-2.25 inline-block text-sm text-[#8491a3]",
                            detailsOpen ? "rotate-0" : "rotate-180",
                        ].join(" ")}
                    >
                        ⌃
                    </span>
                    詳細
                    <span className="ml-2.75 font-normal text-[#abb4c1]">
                        変換設定・処理状況を確認
                    </span>
                </button>

                {detailsOpen && (
                    <div className="flex gap-8.5 border-t border-[#edf0f5] px-4.5 pt-3.25 pb-4 text-xs text-[#7b8799]">
                        <span>入力：{sourceFile?.name ?? "未選択"}</span>
                        <span>出力形式：{convertedFormat}</span>
                        <span>保存先：変換完了後に選択</span>
                    </div>
                )}
            </footer>
        </main>
    );
}

export default App;
