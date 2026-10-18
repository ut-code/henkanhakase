import { jsPDF } from "jspdf";

export type PdfPageSize = "a3" | "a4" | "a5" | "letter" | "legal";
export type PdfOrientation = "portrait" | "landscape" | "auto";
export type PdfFitMode = "contain" | "fill";

export interface PdfConversionOptions {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  marginMm: number;
  fitMode: PdfFitMode;
}

/**
 * PNGの中間ファイルをPDFへ変換します。
 * ページ寸法はmmで扱い、画像は余白内の中央に配置します。
 */
export function createPdfFromPng(
  pngBytes: Uint8Array,
  options: PdfConversionOptions,
): Uint8Array {
  const image = new Uint8Array(pngBytes);
  const imageInfo = new jsPDF().getImageProperties(image);
  const imageIsLandscape = imageInfo.width > imageInfo.height;
  const orientation =
    options.orientation === "auto"
      ? imageIsLandscape
        ? "landscape"
        : "portrait"
      : options.orientation;

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: options.pageSize,
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = Math.max(
    0,
    Math.min(options.marginMm, Math.min(pageWidth, pageHeight) / 2),
  );
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new Error("PDFの余白が大きすぎます。");
  }

  let width = availableWidth;
  let height = availableHeight;
  let x = margin;
  let y = margin;

  if (options.fitMode === "contain") {
    const scale = Math.min(
      availableWidth / imageInfo.width,
      availableHeight / imageInfo.height,
    );
    width = imageInfo.width * scale;
    height = imageInfo.height * scale;
    x = (pageWidth - width) / 2;
    y = (pageHeight - height) / 2;
  }

  pdf.addImage(image, "PNG", x, y, width, height);
  return new Uint8Array(pdf.output("arraybuffer"));
}
