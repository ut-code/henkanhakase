import type { Locale } from "../i18n";
import { AUDIO_FORMATS, IMAGE_FORMATS, SUPPORTED_FORMATS, VIDEO_FORMATS } from "../formats";

const copy = {
  ja: {
    label: "変換はかせとは？",
    title: "ファイル変換、これ一つ",
    description:
      "変換はかせは、画像・動画・音声の形式を変換できるアプリです。複数のファイルをまとめて選ぶことや、出力形式や画質などを調整することも可能です。",
    benefitsTitle: "変換はかせでできること",
    benefits: [
      { title: "形式をまとめて扱う", description: "画像・動画・音声を、ひとつのアプリで変換できます。" },
      { title: "複数ファイルを一度に", description: "同じ種類のファイルをまとめて選び、一括で変換できます。" },
      { title: "仕上がりを調整", description: "形式に応じてサイズや画質、音質などを設定できます。" },
    ],
    formatsTitle: "対応ファイル形式",
    formatsDescription: "画像・動画・音声の形式に対応しています。",
    formatsCountLabel: "形式",
    formatGroups: ["画像", "動画", "音声"],
    formatsNote: "選べる出力形式や設定は、入力ファイルの種類によって異なります。",
    downloadTitle: "デスクトップ版を使う",
    downloadDescription:
      "お使いの OS に対応するデスクトップ版を、GitHub のリリースページから入手できます。",
    downloadAction: "ダウンロードページを見る",
  },
  en: {
    label: "About Henkan Hakase",
    title: "All your file conversions in one place.",
    description:
      "Henkan Hakase converts image, video, and audio formats. Select multiple files and adjust the output format, quality, and size.",
    benefitsTitle: "What you can do",
    benefits: [
      { title: "One place for your files", description: "Convert images, video, and audio in one app." },
      { title: "Work with multiple files", description: "Select files of the same kind and convert them together." },
      { title: "Control the result", description: "Adjust size, image quality, or audio quality where available." },
    ],
    formatsTitle: "Supported file formats",
    formatsDescription: "Work with image, video, and audio formats.",
    formatsCountLabel: "formats",
    formatGroups: ["Images", "Video", "Audio"],
    formatsNote: "Available output formats and settings depend on the input file type.",
    downloadTitle: "Use the desktop app",
    downloadDescription:
      "Find the desktop download for your operating system on the GitHub releases page.",
    downloadAction: "View downloads",
  },
} as const;

const formatGroups = [IMAGE_FORMATS, VIDEO_FORMATS, AUDIO_FORMATS] as const;

export function WebDownloadGuide({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <section
      aria-labelledby="about-henkanhakase"
      className="border-t border-[#e8ecf4] bg-white px-6 py-16"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="text-sm font-bold text-[#586cec]">{text.label}</p>
          <h2
            id="about-henkanhakase"
            className="mt-3 text-2xl font-bold leading-snug text-[#263143] md:text-3xl"
          >
            {text.title}
          </h2>
          <p className="mt-5 leading-7 text-[#526079]">{text.description}</p>
        </div>

        <div className="rounded-[20px] border border-[#dfe5ff] bg-[#f6f8ff] p-7 shadow-[0_12px_35px_rgba(39,61,98,0.055)]">
          <h3 className="text-xl font-bold text-[#263143]">
            {text.downloadTitle}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#526079]">
            {text.downloadDescription}
          </p>
          <a
            href="https://github.com/ut-code/henkanhakase/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#586cec] px-5 py-3 text-sm font-bold text-white hover:bg-[#455ad4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586cec]"
          >
            {text.downloadAction}
            <span aria-hidden="true" className="ml-2">
              ↗
            </span>
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 w-full max-w-5xl">
        <h3 className="text-2xl font-bold text-[#263143]">
          {text.benefitsTitle}
        </h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {text.benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="rounded-[20px] border border-[#e3e8f1] bg-[#f8faff] p-6"
            >
              <span className="text-sm font-bold text-[#586cec]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="mt-4 text-lg font-bold text-[#263143]">
                {benefit.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[#526079]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 w-full max-w-5xl rounded-[28px] border border-[#dfe5ff] bg-[#f6f8ff] p-7 text-[#263143] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold md:text-3xl">
              {text.formatsTitle}
            </h3>
            <p className="mt-3 text-sm text-[#526079]">
              {text.formatsDescription}
            </p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-bold leading-none text-[#586cec]">
              {SUPPORTED_FORMATS.length}
            </span>
            <span className="ml-2 text-sm text-[#526079]">
              {text.formatsCountLabel}
            </span>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {formatGroups.map((formats, index) => (
            <div key={text.formatGroups[index]} className="rounded-2xl border border-[#e3e8f1] bg-white p-5">
              <h4 className="font-bold text-[#263143]">
                {text.formatGroups[index]}
                <span className="ml-2 text-sm font-normal text-[#526079]">
                  {formats.length}
                </span>
              </h4>
              <ul className="mt-4 flex flex-wrap gap-2">
                {formats.map((format) => (
                  <li
                    key={format}
                    className="rounded-lg border border-[#dfe5ff] bg-[#f6f8ff] px-2.5 py-1 text-xs font-semibold text-[#40506a]"
                  >
                    {format}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-5 text-[#526079]">
          {text.formatsNote}
        </p>
        <a
          href="https://github.com/ut-code/henkanhakase/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#586cec] px-5 py-3 text-sm font-bold text-white hover:bg-[#455ad4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586cec]"
        >
          {text.downloadAction}
          <span aria-hidden="true" className="ml-2">
            ↗
          </span>
        </a>
      </div>
    </section>
  );
}
