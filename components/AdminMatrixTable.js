import { useState } from "react";

/**
 * 配属×項目（タスク or 研修コース）のマトリクス編集テーブル。
 *
 * items:      [{ id, name, category, extra? }]
 * placements: [{ code, name }]
 * isIncluded(placementCode, itemId): boolean
 * onToggle(placementCode, itemId, nextIncluded): Promise
 * renderExtraColumn?: (item) => ReactNode  … 資料管理ボタンなど、項目ごとの追加列
 */
export default function AdminMatrixTable({ items, placements, isIncluded, onToggle, renderExtraColumn }) {
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);

  async function handleToggle(placementCode, itemId, next) {
    const key = placementCode + "|" + itemId;
    setBusyKey(key);
    setError(null);
    try {
      await onToggle(placementCode, itemId, next);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusyKey(null);
    }
  }

  if (!items.length) {
    return <p className="empty-state">まだ項目が登録されていません。</p>;
  }
  if (!placements.length) {
    return <p className="empty-state">配属が登録されていません。先に配属マスタを設定してください。</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {error && <div className="error-banner">{error}</div>}
      <table className="matrix">
        <thead>
          <tr>
            <th>項目</th>
            {placements.map((p) => (
              <th key={p.code}>{p.name}</th>
            ))}
            {renderExtraColumn && <th>資料</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.name}
                {item.category && (
                  <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{item.category}</div>
                )}
              </td>
              {placements.map((p) => {
                const key = p.code + "|" + item.id;
                const checked = isIncluded(p.code, item.id);
                return (
                  <td key={p.code}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busyKey === key}
                      onChange={(e) => handleToggle(p.code, item.id, e.target.checked)}
                    />
                  </td>
                );
              })}
              {renderExtraColumn && <td>{renderExtraColumn(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
