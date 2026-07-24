import { useState } from "react";

const MAX_MATERIALS_PER_TASK = 10;

export default function AdminMaterialsModal({ task, onClose, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const materials = task.materials || [];
  const isFull = materials.length >= MAX_MATERIALS_PER_TASK;

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(task.taskId, name.trim(), url.trim());
      setName("");
      setUrl("");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(index) {
    setBusy(true);
    setError(null);
    try {
      await onDelete(task.taskId, index);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📎 {task.name} の関連資料</div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {materials.length === 0 ? (
          <p className="hint">この項目にはまだ資料が添付されていません。</p>
        ) : (
          materials.map((m, i) => (
            <div key={i} className="material-item">
              <div className="material-icon">📄</div>
              {m.url ? (
                <a className="material-name" href={m.url} target="_blank" rel="noreferrer">
                  {m.name}
                </a>
              ) : (
                <span className="material-name no-url">{m.name}（リンク未登録）</span>
              )}
              <div className="material-actions">
                {m.url && (
                  <a className="btn btn-primary btn-sm" href={m.url} target="_blank" rel="noreferrer">
                    開く ↗
                  </a>
                )}
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => handleDelete(i)}>
                  削除
                </button>
              </div>
            </div>
          ))
        )}

        {isFull ? (
          <div className="material-limit-note" style={{ color: "var(--danger)", fontWeight: 700 }}>
            上限の{MAX_MATERIALS_PER_TASK}件に達しているため、これ以上追加できません。追加するには既存の資料を削除してください。
          </div>
        ) : (
          <form className="add-material-form" onSubmit={handleAdd}>
            <input
              placeholder="資料名（例：手順書.pdf）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              maxLength={60}
            />
            <input
              placeholder="資料URL（未入力なら「リンク未登録」表示）"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !name.trim()}>
              ＋ 資料を追加
            </button>
            <div className="material-limit-note">
              資料は1タスクにつき最大{MAX_MATERIALS_PER_TASK}件まで添付できます（現在{materials.length}/
              {MAX_MATERIALS_PER_TASK}件）。
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
