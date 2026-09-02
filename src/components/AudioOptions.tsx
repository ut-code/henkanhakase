import type {
  AudioBitrate,
  AudioCompressionOptions,
  AudioFormat,
} from "../formats";
import { isLossyAudioFormat } from "../formats";

export type AudioOptionsProps = {
  format: AudioFormat;
  options: AudioCompressionOptions;
  onChange: (options: AudioCompressionOptions) => void;
};

export function AudioOptions({ format, options, onChange }: AudioOptionsProps) {
  const update = <K extends keyof AudioCompressionOptions>(
    key: K,
    value: AudioCompressionOptions[K],
  ) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 共通オプション：サンプルレート＆チャンネル数 */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <label
            htmlFor="audio-sample-rate"
            className="text-xs font-semibold text-[#415166]"
          >
            サンプルレート
          </label>
          <select
            id="audio-sample-rate"
            value={options.sampleRate}
            onChange={(e) => update("sampleRate", Number(e.target.value))}
            className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
          >
            <option value={0}>自動 (元ファイルと同じ)</option>
            <option value={22050}>22.05 kHz</option>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
            <option value={96000}>96 kHz (ハイレゾ)</option>
          </select>
        </div>

        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <label
            htmlFor="audio-channels"
            className="text-xs font-semibold text-[#415166]"
          >
            チャンネル
          </label>
          <select
            id="audio-channels"
            value={options.channels}
            onChange={(e) => update("channels", Number(e.target.value))}
            className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
          >
            <option value={0}>自動 (元ファイルと同じ)</option>
            <option value={1}>1 ch (モノラル)</option>
            <option value={2}>2 ch (ステレオ)</option>
          </select>
        </div>
      </div>

      <div className="h-px w-full bg-[#edf0f5]" />

      {/* フォーマット特有のオプション */}
      <div className="flex flex-wrap items-center gap-6">
        {(format === "WAV" || format === "AIFF") && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <label
              htmlFor="audio-bit-depth"
              className="text-xs font-semibold text-[#415166]"
            >
              ビット深度
            </label>
            <select
              id="audio-bit-depth"
              value={options.pcmBitDepth}
              onChange={(e) =>
                update("pcmBitDepth", Number(e.target.value) as 16 | 24 | 32)
              }
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
            >
              <option value={16}>16 bit (CD標準)</option>
              <option value={24}>24 bit (高音質)</option>
              <option value={32}>32 bit (Float/高精度)</option>
            </select>
          </div>
        )}

        {format === "FLAC" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="flac-compression"
                className="font-semibold text-[#415166]"
              >
                圧縮レベル（可逆圧縮）
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {options.flacCompressionLevel}
              </span>
            </div>
            <input
              type="range"
              id="flac-compression"
              min="0"
              max="12"
              value={options.flacCompressionLevel}
              onChange={(e) =>
                update(
                  "flacCompressionLevel",
                  Number.parseInt(e.target.value, 10),
                )
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>0 (高速)</span>
              <span>12 (高圧縮)</span>
            </div>
          </div>
        )}

        {format === "OGG" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="vorbis-quality"
                className="font-semibold text-[#415166]"
              >
                音質（Vorbis）
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {options.vorbisQuality}
              </span>
            </div>
            <input
              type="range"
              id="vorbis-quality"
              min="-1"
              max="10"
              step="1"
              value={options.vorbisQuality}
              onChange={(e) =>
                update("vorbisQuality", Number.parseInt(e.target.value, 10))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>-1 (低品質)</span>
              <span>10 (高品質)</span>
            </div>
          </div>
        )}

        {isLossyAudioFormat(format) && format !== "OGG" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <label
              htmlFor="audio-bitrate"
              className="text-xs font-semibold text-[#415166]"
            >
              ビットレート
            </label>
            <select
              id="audio-bitrate"
              value={options.bitrate}
              onChange={(e) =>
                update("bitrate", e.target.value as AudioBitrate)
              }
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
            >
              <option value="64k">64 kbps (軽量・音声向き)</option>
              <option value="96k">96 kbps</option>
              <option value="128k">128 kbps (標準音質)</option>
              <option value="160k">160 kbps</option>
              <option value="192k">192 kbps (高音質)</option>
              <option value="256k">256 kbps</option>
              <option value="320k">320 kbps (最高音質)</option>
            </select>
            <span className="text-[10px] text-[#9aa6b7]">
              ビットレートが高いほど一般に音質とファイルサイズが増加します
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
