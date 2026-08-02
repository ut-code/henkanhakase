import { useRef, useState } from "react";
import "./App.css";

const formats = ["PNG", "JPEG", "WebP", "PDF"];

function UploadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5" /></svg>;
}

function FileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6.75A1.75 1.75 0 0 0 5 4.75v14.5C5 20.22 5.78 21 6.75 21h10.5c.97 0 1.75-.78 1.75-1.75V8l-5-5Z" /><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5" /></svg>;
}

function App() {
  const [format, setFormat] = useState("PNG");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectFile = (file?: File) => setFileName(file?.name ?? null);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">H</span><span>変換博士</span></div>
        <div className="status"><span className="status-dot" />変換待機中</div>
      </header>

      <section className="workspace" aria-label="ファイル変換">
        <div className="panel input-panel">
          <div className="panel-heading"><span className="step-number">1</span><div><h1>変換するファイル</h1><p>ファイルを追加してください</p></div></div>
          <button className="drop-zone" onClick={() => fileInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files[0]); }}>
            <span className="upload-icon"><UploadIcon /></span>
            <strong>{fileName ?? "ファイルをここにドロップ"}</strong>
            <span>{fileName ? "別のファイルを選択" : "または、クリックして選択"}</span>
            <em>対応形式：画像、PDF、Office ファイルなど</em>
          </button>
          <input ref={fileInput} type="file" hidden onChange={(e) => selectFile(e.target.files?.[0])} />
        </div>

        <div className="conversion-flow">
          <label htmlFor="format">変換形式</label>
          <select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
            {formats.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="arrow" aria-label={`${format} に変換`}><span /><i /></div>
          <p><b>{format}</b> に変換</p>
        </div>

        <div className="panel output-panel">
          <div className="panel-heading"><span className="step-number">2</span><div><h2>変換後のファイル</h2><p>変換結果がここに表示されます</p></div></div>
          <div className="result-zone">
            <span className="file-icon"><FileIcon /></span>
            <strong>まだ変換されたファイルはありません</strong>
            <span>ファイルを追加して変換を開始してください</span>
          </div>
        </div>
      </section>

      <footer className={`detail-bar ${detailsOpen ? "is-open" : ""}`}>
        <button className="details-toggle" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}>
          <span className="chevron">⌃</span>詳細 <span className="detail-summary">変換設定・処理状況を確認</span>
        </button>
        {detailsOpen && <div className="detail-content"><span>出力形式：{format}</span><span>品質：標準</span><span>保存先：変換完了後に選択</span></div>}
      </footer>
    </main>
  );
}

export default App;
