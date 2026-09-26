import type { Format } from "../formats";

export function buildProbeArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    outputPath,
  ];
}

export function buildThumbnailArgs(
  inputPath: string,
  outputPath: string,
  inputFormat: Format,
): string[] {
  const args = [
    "-y",
    "-i",
    inputPath,
    "-an",
    "-vf",
    "thumbnail=30,scale=iw*sar:ih,setsar=1,scale=640:640:force_original_aspect_ratio=decrease",
    "-frames:v",
    "1",
    "-update",
    "1",
  ];

  if (inputFormat !== "GIF") {
    args.push("-q:v", "4");
  }

  args.push(outputPath);
  return args;
}

export function parsePngDimensions(data: Uint8Array): {
  width: number;
  height: number;
} {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    data.length < 24 ||
    !signature.every((byte, index) => data[index] === byte) ||
    data[12] !== 73 ||
    data[13] !== 72 ||
    data[14] !== 68 ||
    data[15] !== 82
  ) {
    throw new Error("Invalid PNG data");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG dimensions");
  }

  return { width, height };
}
