export default function MaterialsModal({ taskName, materials, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{taskName} の関連資料</h3>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="modal-empty">このタスクにはまだ資料が登録されていません。</p>
        ) : (
          <ul className="materials-list">
            {materials.map((m, i) => (
              <li key={i} className="materials-item">
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    📄 {m.name}
                  </a>
                ) : (
                  <span className="materials-item-noURL">📄 {m.name}（リンク未登録）</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
