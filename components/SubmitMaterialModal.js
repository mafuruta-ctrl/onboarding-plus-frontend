import { useRef, useState } from "react";
import { CloudUpload, FileUp, X } from "lucide-react";

/**
 * 研修コースへの資料提出モーダル（ドラッグ&ドロップ or ファイル選択）。
 * アップロード自体はGASが隠しiframe宛のフォームPOSTでしか受け取れないため、
 * 送信中はレスポンスの成否を直接読めない（呼び出し元のonSubmitが、送信後に
 * getEmployeeDetailを再取得して確認する）。ここでは送信完了までスピナー表示のみ行う。
 */
export default function SubmitMaterialModal({ courseName, onClose, onSubmit }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setError(null);
  }

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(file);
      onClose();
    } catch (err) {
      setError(err.message || String(err));
      setSubmitting(false);
    }
  }

  function handleOverlayClick() {
    if (submitting) return; // 送信中は誤って閉じられないようにする
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <FileUp size={16} /> {courseName} の資料を提出する
          </div>
          <button className="modal-close" onClick={onClose} disabled={submitting} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        <div
          className={`dropzone ${dragOver ? "is-dragover" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (submitting) return;
            pickFile(e.dataTransfer.files && e.dataTransfer.files[0]);
          }}
          onClick={() => !submitting && inputRef.current && inputRef.current.click()}
        >
          <CloudUpload size={26} />
          {file ? (
            <p className="dropzone-filename">{file.name}</p>
          ) : (
            <>
              <p>ここにファイルをドロップ、またはクリックして選択</p>
              <p className="dropzone-hint">1ファイルあたり15MBまで</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            disabled={submitting}
            onChange={(e) => pickFile(e.target.files && e.target.files[0])}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
            キャンセル
          </button>
          <button
            className={`btn btn-primary btn-sm ${submitting ? "is-busy" : ""}`}
            onClick={handleSubmit}
            disabled={!file || submitting}
          >
            {submitting ? <span className="btn-busy-dot" /> : "提出する"}
          </button>
        </div>
      </div>
    </div>
  );
}
