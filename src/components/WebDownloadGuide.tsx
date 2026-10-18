import type { Locale } from "../i18n";

const copy = {
  ja: {
    label: "変換はかせとは？",
    title: "ファイル変換、これ一つ",
    description:
      "変換はかせは、画像・動画・音声の形式を変換できるアプリです。複数のファイルをまとめて選び、出力形式や画質などを調整できます。",
    features: [
      "画像・動画・音声に対応",
      "複数ファイルをまとめて変換",
      "サイズや品質を調整",
    ],
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
    features: [
      "Images, video, and audio",
      "Convert multiple files together",
      "Adjust size and quality",
    ],
    downloadTitle: "Use the desktop app",
    downloadDescription:
      "Find the desktop download for your operating system on the GitHub releases page.",
    downloadAction: "View downloads",
  },
} as const;

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
          <ul className="mt-6 grid gap-3 text-sm text-[#40506a]">
            {text.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span aria-hidden="true" className="font-bold text-[#586cec]">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
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
    </section>
  );
}
