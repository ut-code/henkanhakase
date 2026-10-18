interface LicenseViewerProps {
  title: string;
  text: string;
  onClose: () => void;
}

export function LicenseViewer({ title, text, onClose }: LicenseViewerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5"
    >
      <section className="flex max-h-[min(800px,calc(100vh-40px))] w-[min(960px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#e2e7f0] px-5 py-4">
          <h2 className="text-sm font-bold text-[#26354a]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm text-[#586cec] hover:underline"
          >
            閉じる
          </button>
        </header>
        <pre className="overflow-auto whitespace-pre-wrap p-5 text-left text-xs leading-6 text-[#40506a]">
          {text}
        </pre>
      </section>
    </div>
  );
}
