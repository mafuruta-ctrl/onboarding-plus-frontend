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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task.name} の関連資料</h3>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {materials.length === 0 ? (
          <p className="modal-empty">このタスクにはまだ資料が登録されていません。</p>
        ) : (
          <ul className="materials-list">
            {materials.map((m, i) => (
              <li key={i} className="materials-item admin-materials-item">
                <span>
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer">
                      📄 {m.name}
                    </a>
                  ) : (
                    <span className="materials-item-noURL">📄 {m.name}（リンク未登録）</span>
                  )}
                </span>
                <button className="btn-link admin-materials-delete" disabled={busy} onClick={() => handleDelete(i)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="admin-materials-form" onSubmit={handleAdd}>
          <p className="admin-materials-count">
            {materials.length} / {MAX_MATERIALS_PER_TASK} 件
          </p>
          {isFull ? (
            <p className="viewer-note">上限（{MAX_MATERIALS_PER_TASK}件）に達しています。追加するには先に削除してください。</p>
          ) : (
            <>
              <input
                className="admin-text-input"
                placeholder="資料名（例：手順書.pdf）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <input
                className="admin-text-input"
                placeholder="URL（任意）"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
              />
              <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
                追加
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
