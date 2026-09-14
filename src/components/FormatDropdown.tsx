import { useState } from "react";
import AnimatedImageIcon from "../assets/animated-image.svg";
import ImageIcon from "../assets/image.svg";
import VideoIcon from "../assets/video.svg";
import AudioIcon from "../assets/audio.svg";
import type { Format, ImageFormat, VideoFormat } from "../formats";
import { IMAGE_FORMATS, VIDEO_FORMATS } from "../formats";

export function FormatDropdown({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: Format;
  options: readonly Format[];
  disabled?: boolean;
  onChange: (value: Format) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipFormat, setTooltipFormat] = useState<Format | null>(null);

  const formatExplanations: Record<Format, string> = {
    PNG: "可逆圧縮により画質劣化がなく透過処理に対応。色数の多い写真等では容量が肥大化しやすい。輪郭の明瞭さが求められるロゴやイラスト、図表の保存に適している。",
    JPEG: "高い圧縮率によりファイルサイズを大幅に削減でき再生互換性に優れる。非可逆圧縮のため保存時に劣化が生じ透過には非対応。写真の保存やWeb用画像に適している。",
    WebP: "JPEGやPNGより高い圧縮効率を持ち透過やアニメーションにも対応。古いブラウザやレガシーソフトウェアでは非対応。Webサイトの表示速度向上を目的とした画像配置に適している。",
    GIF: "標準機能のみで簡易アニメーションを表示でき互換性が高い。最大256色に制限されグラデーションの再現性に劣る。短いループ画像や簡易アニメーションの共有に適している。",
    MP4: "ほぼ全ての端末やブラウザで再生可能な互換性と高い圧縮効率を兼ね備える。コンテナ内のコーデック仕様に依存する。Web配信やSNS投稿、汎用的な動画共有に適している。",
    WebM: "オープン規格でライセンス料が不要でありWeb環境での圧縮率と親和性に優れる。一部の動画編集ソフトや古い端末では非対応。Webサイト上の動画配置やHTML5配信に適している。",
    AVI: "古い規格との互換性が高く非圧縮データも扱える。ファイルサイズが大きくなりやすくストリーミング配信には不向き。古いWindows環境やレガシーソフトでの動画編集に適している。",
    MOV: "Apple環境との親和性が高く高画質コーデックを扱えるため編集用途に適する。WindowsやAndroid環境での互換性に劣る場合がある。MacやiOS上での動画編集や中間素材の保存に適している。",
    MP3: "再生機器やOSを選ばない高い互換性を持つ。非可逆圧縮による高音域の欠落があり後発規格より圧縮効率が劣る。端末を問わず再生・共有したい音楽や音声コンテンツに適している。",
    M4A: "MP3より圧縮効率に優れ同一ビットレートで高品質を維持できる。古いオーディオ機器では認識されない場合がある。Apple製品での音楽管理やボイスメモの保存に適している。",
    AAC: "MP3より圧縮効率が高く低容量でも音質を維持しやすい。非可逆圧縮のため音質劣化を完全に防ぐことはできない。動画の音声トラックや配信向けオーディオに適している。",
    WAV: "非圧縮のため音質の劣化が一切なく原音を忠実に保持できる。ファイルサイズが非常に大きい。音楽制作やナレーション録音、効果音などのマスター音源保存に適している。",
    AIFF: "WAVと同様に非圧縮で原音を保持できApple環境との親和性が高い。容量が大きくWindows環境での互換性が劣る場合がある。Macでの音楽制作やスタジオ録音素材の管理に適している。",
    FLAC: "可逆圧縮により音質劣化なしでWAVの約半分程度に容量を削減できる。非可逆圧縮よりは容量が大きく一部機器で非対応。ハイレゾ音源やCD音源のアーカイブ保存に適している。",
    WMA: "低ビットレートでも比較的音声を保持できWindows環境との親和性が高い。Apple製品をはじめ非Windows環境での互換性が低い。Windows環境や対応機器での音声管理に適している。",
    OGG: "ライセンス料不要のオープン規格でありMP3より高効率。Apple製品などの標準環境では再生非対応。ゲーム開発への組み込み音源やオープンな配信環境に適している。",
    OPUS: "低遅延かつ低ビットレートでも高い音声品質を維持できる。古い再生機器やソフトウェアでは非対応の場合がある。リアルタイム通話やボイスチャット、通話ログの保存に適している。",
  };

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setIsOpen(false);
          setTooltipFormat(null);
        }
      }}
    >
      <button
        type="button"
        id="format"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setTooltipFormat(null);
        }}
        className="
          flex
          w-31.5
          cursor-pointer
          items-center
          justify-between
          rounded-[9px]
          border border-[#dfe5ef]
          bg-white
          px-3.75
          py-2.5
          text-[13px]
          font-semibold
          text-[#40506a]
          outline-[#6578f7]
          disabled:cursor-not-allowed
          disabled:bg-[#f5f7fa]
          disabled:text-[#9aa6b7]
        "
      >
        <span>{value}</span>
        <svg
          className={`h-3.5 w-3.5 text-[#8491a3] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setTooltipFormat(null);
            }}
          />
          <div
            role="listbox"
            className="
              absolute
              top-[calc(100%+4px)]
              left-0
              z-20
              w-full
              rounded-[9px]
              border border-[#dfe5ef]
              bg-white
              py-1
              shadow-[0_4px_12px_rgba(0,0,0,0.08)]
            "
          >
            {options.map((item) => (
              <div
                key={item}
                className={`
                  group
                  relative
                  flex
                  w-full
                  items-center
                  justify-between
                  text-left
                  text-[13px]
                  font-semibold
                  transition-colors
                  hover:bg-[#f0f4ff]
                  hover:text-[#596ff1]
                  ${
                    item === value
                      ? "bg-[#f0f4ff] text-[#596ff1]"
                      : "text-[#40506a]"
                  }
                `}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={item === value}
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                    setTooltipFormat(null);
                  }}
                  className="flex-1 cursor-pointer py-1.75 pl-3.75 text-left outline-none"
                >
                  {item}
                </button>
                <button
                  type="button"
                  aria-label={`${item}の説明`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTooltipFormat(tooltipFormat === item ? null : item);
                  }}
                  className="mr-3.75 shrink-0 cursor-pointer p-0.5 outline-none"
                >
                  <img
                    src={
                      item === "GIF"
                        ? AnimatedImageIcon
                        : IMAGE_FORMATS.includes(item as ImageFormat)
                          ? ImageIcon
                          : VIDEO_FORMATS.includes(item as VideoFormat)
                            ? VideoIcon
                            : AudioIcon
                    }
                    alt=""
                    className="size-3.5 opacity-60 transition-opacity hover:opacity-100"
                  />
                </button>
                <div
                  className={`
                    pointer-events-none
                    absolute
                    left-[calc(100%+8px)]
                    top-1/2
                    z-30
                    w-56
                    -translate-y-1/2
                    rounded-[9px]
                    border border-[#dfe5ef]
                    bg-white
                    p-2.5
                    text-[11px]
                    font-normal
                    leading-relaxed
                    text-[#40506a]
                    shadow-[0_4px_12px_rgba(0,0,0,0.08)]
                    ${
                      tooltipFormat === item
                        ? "block"
                        : "hidden group-hover:block"
                    }
                  `}
                >
                  <div className="absolute -left-1.25 top-1/2 size-2.5 -translate-y-1/2 rotate-45 border-b border-l border-[#dfe5ef] bg-white" />
                  {formatExplanations[item]}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
