import { useTranslation } from "../i18n";

export function ConversionProgress({ progress }: { progress: number | null }) {
  const { t } = useTranslation();
  const determinate = progress !== null;
  return <div className="mt-3 w-full text-center text-xs text-[#5b687c]" aria-live="polite">
    <div className="h-1.5 overflow-hidden rounded-full bg-[#e3e8f1]">
      <div className={determinate ? "h-full bg-[#6578f7] transition-[width] duration-200" : "h-full w-1/2 animate-[pulse_1s_infinite_alternate] bg-[#6578f7]"} style={determinate ? { width: `${progress}%` } : undefined} />
    </div>
    <span className="mt-1 block">{determinate ? t("progressPercent", { progress }) : t("progressWorking")}</span>
  </div>;
}
