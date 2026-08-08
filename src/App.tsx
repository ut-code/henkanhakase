import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import "./App.css";

const formats = ["PNG", "JPEG", "WebP"];

const mimeTypes: Record<string, string> = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WebP: "image/webp",
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H6.75A1.75 1.75 0 0 0 5 4.75v14.5C5 20.22 5.78 21 6.75 21h10.5c.97 0 1.75-.78 1.75-1.75V8l-5-5Z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 16.5h5" />
    </svg>
  );
}

function App() {
  const [format, setFormat] = useState("PNG");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("仮配線では画像ファイル（PNG・JPEG・WebP）のみ変換できます。");
      return;
    }

    setSourceFile(file);
    setConvertedFile(null);
    setError(null);
  };

  const convertFile = async () => {
    if (!sourceFile) return;

    setIsConverting(true);
    setError(null);

    try {
      const converted = await imageCompression(sourceFile, {
        fileType: mimeTypes[format],
        useWebWorker: true,
        initialQuality: 0.92,
      });
      const extension = format === "JPEG" ? "jpg" : format.toLowerCase();
      const stem = sourceFile.name.replace(/\.[^.]+$/, "");
      const outputFile = new File([converted], `${stem}.${extension}`, {
        type: mimeTypes[format],
      });

      setConvertedFile(outputFile);
    } catch {
      setError("変換に失敗しました。別の画像ファイルでお試しください。");
    } finally {
      setIsConverting(false);
    }
  };

  const saveFile = () => {
    if (!convertedFile) return;

    const url = URL.createObjectURL(convertedFile);
    const link = document.createElement("a");

    link.href = url;
    link.download = convertedFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    setConvertedFile(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>変換博士</span>
        </div>
        <div className="status">
          <span className={`status-dot ${isConverting ? "is-working" : ""}`} />
          {isConverting ? "変換中" : "変換待機中"}
        </div>
      </header>

      <section className="workspace" aria-label="ファイル変換">
        <div className="panel input-panel">
          <div className="panel-heading">
            <span className="step-number">1</span>
            <div>
              <h1>変換するファイル</h1>
              <p>ファイルを追加してください</p>
            </div>
          </div>

          <button
            className="drop-zone"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span className="upload-icon"><UploadIcon /></span>
            <strong>{sourceFile?.name ?? "ファイルをここにドロップ"}</strong>
            <span>{sourceFile ? "別のファイルを選択" : "または、クリックして選択"}</span>
            <em>仮配線の対応形式：PNG、JPEG、WebP</em>
          </button>

          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="conversion-flow">
          <label htmlFor="format">変換形式</label>
          <select
            id="format"
            value={format}
            onChange={(event) => handleFormatChange(event.target.value)}
          >
            {formats.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="arrow" aria-label={`${format} に変換`}>
            <span />
            <i />
          </div>
          <p><b>{format}</b> に変換</p>
          <button
            className="convert-button"
            onClick={convertFile}
            disabled={!sourceFile || isConverting}
          >
            {isConverting ? "変換中…" : "変換を開始"}
          </button>
        </div>

        <div className="panel output-panel">
          <div className="panel-heading">
            <span className="step-number">2</span>
            <div>
              <h2>変換後のファイル</h2>
              <p>変換結果がここに表示されます</p>
            </div>
          </div>

          <div className={`result-zone ${convertedFile ? "has-result" : ""}`}>
            <span className="file-icon"><FileIcon /></span>
            <strong>{convertedFile?.name ?? "まだ変換されたファイルはありません"}</strong>
            <span>
              {convertedFile
                ? `${Math.ceil(convertedFile.size / 1024).toLocaleString()} KB ・ ${format} 形式`
                : "ファイルを追加して変換を開始してください"}
            </span>
            {convertedFile && (
              <button className="save-button" onClick={saveFile}>
                ファイルに保存
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className={`detail-bar ${detailsOpen ? "is-open" : ""}`}>
        <button
          className="details-toggle"
          onClick={() => setDetailsOpen(!detailsOpen)}
          aria-expanded={detailsOpen}
        >
          <span className="chevron">⌃</span>
          詳細
          <span className="detail-summary">変換設定・処理状況を確認</span>
        </button>
        {detailsOpen && (
          <div className="detail-content">
            <span>入力：{sourceFile?.name ?? "未選択"}</span>
            <span>出力形式：{format}</span>
            <span>品質：92%（仮設定）</span>
            <span>保存先：変換完了後に選択</span>
          </div>
        )}
      </footer>
    </main>
  );
}

export default App;
