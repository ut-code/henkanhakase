import type { PdfConversionOptions } from "../utils/pdfConverter";

interface PdfOptionsProps {
  options: PdfConversionOptions;
  onChange: (options: PdfConversionOptions) => void;
}

export function PdfOptions({ options, onChange }: PdfOptionsProps) {
  const update = <K extends keyof PdfConversionOptions>(
    key: K,
    value: PdfConversionOptions[K],
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xs font-bold text-[#3c4a60]">PDF設定</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-[#5b687c]">
          <span className="font-semibold">用紙サイズ</span>
          <select
            value={options.pageSize}
            onChange={(event) =>
              update(
                "pageSize",
                event.target.value as PdfConversionOptions["pageSize"],
              )
            }
            className="rounded-md border border-[#dfe5ef] bg-white px-2.5 py-2 text-xs"
          >
            <option value="a3">A3</option>
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
            <option value="legal">Legal</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#5b687c]">
          <span className="font-semibold">用紙の向き</span>
          <select
            value={options.orientation}
            onChange={(event) =>
              update(
                "orientation",
                event.target.value as PdfConversionOptions["orientation"],
              )
            }
            className="rounded-md border border-[#dfe5ef] bg-white px-2.5 py-2 text-xs"
          >
            <option value="auto">画像に合わせる（自動）</option>
            <option value="portrait">縦向き</option>
            <option value="landscape">横向き</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#5b687c]">
          <span className="font-semibold">余白</span>
          <select
            value={options.marginMm}
            onChange={(event) => update("marginMm", Number(event.target.value))}
            className="rounded-md border border-[#dfe5ef] bg-white px-2.5 py-2 text-xs"
          >
            <option value={0}>なし（0 mm）</option>
            <option value={5}>5 mm</option>
            <option value={10}>10 mm</option>
            <option value={15}>15 mm</option>
            <option value={20}>20 mm</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#5b687c]">
          <span className="font-semibold">画像の配置</span>
          <select
            value={options.fitMode}
            onChange={(event) =>
              update(
                "fitMode",
                event.target.value as PdfConversionOptions["fitMode"],
              )
            }
            className="rounded-md border border-[#dfe5ef] bg-white px-2.5 py-2 text-xs"
          >
            <option value="contain">全体を収める（縦横比を維持）</option>
            <option value="fill">用紙いっぱいに配置（縦横比を変更）</option>
          </select>
        </label>
      </div>

      <p className="text-[11px] leading-5 text-[#8995a7]">
        画像1枚につきPDFを1ファイル作成します。余白を除いた領域の中央に配置します。
      </p>
    </section>
  );
}
