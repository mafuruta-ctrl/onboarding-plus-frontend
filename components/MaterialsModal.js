export default function MaterialsModal({ taskName, materials, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">📎 {taskName} の関連資料</div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="modal-empty">このタスクにはまだ資料が登録されていません。</p>
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
              {m.url && (
                <div className="material-actions">
                  <a className="btn btn-primary btn-sm" href={m.url} target="_blank" rel="noreferrer">
                    開く ↗
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
