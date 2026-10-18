const licensePath = (fileName: string) =>
  `/licenses/${fileName.replace(/\.txt$/, "")}.html`;

const isBrowserBuild = import.meta.env.MODE === "browser";
const isLgplBuild = import.meta.env.VITE_FFMPEG_LICENSE === "lgpl";

export const licenseLinks = {
  mit: licensePath("LICENSE"),
  thirdParty: licensePath("THIRD_PARTY_LICENSES.txt"),
  frontend: licensePath("THIRD_PARTY_LICENSES_FRONTEND.txt"),
  other: licensePath("THIRD_PARTY_LICENSES_OTHER.txt"),
  rust: licensePath("THIRD_PARTY_LICENSES_RUST.txt"),
  ffmpegNotice: licensePath("FFmpeg-NOTICE.txt"),
  ffmpegCopying: licensePath(
    isLgplBuild ? "FFmpeg-COPYING.LGPLv2.1.txt" : "FFmpeg-COPYING.GPLv3.txt",
  ),
  isBrowserBuild,
} as const;

export async function readLicense(fileName: string): Promise<string> {
  const response = await fetch(licensePath(fileName));
  if (!response.ok) {
    throw new Error(`Could not load license: ${response.status}`);
  }

  const document = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const text = document.querySelector("pre")?.textContent;
  if (text === null || text === undefined) {
    throw new Error("License document does not contain license text");
  }
  return text;
}
