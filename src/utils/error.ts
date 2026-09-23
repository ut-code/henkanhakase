import type { Translation } from "../i18n";

export function apiErrorMessage(error: unknown, t: Translation): string {
  const value = typeof error === "string" ? tryParseError(error) : error;
  const code =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "code" in value
        ? (value as { code: unknown }).code
        : null;
  const errorKeys = {
    conversion_cancelled: "error_conversion_cancelled",
    invalid_options: "error_invalid_options",
    ffmpeg_unavailable: "error_ffmpeg_unavailable",
    ffmpeg_start_failed: "error_ffmpeg_start_failed",
    conversion_failed: "error_conversion_failed",
    probe_failed: "error_probe_failed",
    input_file_not_found: "error_input_file_not_found",
    temp_dir_creation_failed: "error_temp_dir_creation_failed",
    timestamp_fetch_failed: "error_timestamp_fetch_failed",
    output_file_not_generated: "error_output_file_not_generated",
  } as const;
  if (typeof code === "string" && code in errorKeys)
    return t(errorKeys[code as keyof typeof errorKeys]);
  return t("error_unexpected");
}

function tryParseError(error: string): unknown {
  try {
    return JSON.parse(error);
  } catch {
    return error;
  }
}
