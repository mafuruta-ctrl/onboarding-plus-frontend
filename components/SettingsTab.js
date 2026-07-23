import { useState } from "react";
import MaterialsModal from "./MaterialsModal";

/**
 * 各種設定タブ：配属に応じたタスク一覧。本人 or 人事部のみチェックを変更できる
 * （canEditはGAS側 canEditOwnData_ の結果をそのまま反映）。
 */
export default function SettingsTab({ tasks, canEdit, onToggleTask, busyTaskId }) {
  const [materialsFor, setMaterialsFor] = useState(null);

  if (!tasks || tasks.length === 0) {
    return <p className="empty-state">この配属に割り当てられた設定タスクはありません。</p>;
  }

  const grouped = tasks.reduce((acc, t) => {
    const key = t.category || "その他";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="tab-panel">
      {Object.entries(grouped).map(([category, categoryTasks]) => (
        <div key={category} className="task-category">
          <h3 className="task-category-title">{category}</h3>
          <ul className="task-list">
            {categoryTasks.map((task) => (
              <li key={task.taskId} className={`task-row ${task.done ? "is-done" : ""}`}>
                <label className="task-checkbox-label">
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={!canEdit || busyTaskId === task.taskId}
                    onChange={(e) => onToggleTask(task.taskId, e.target.checked)}
                  />
                  <span className="task-name">{task.name}</span>
                </label>
                {task.dept && <span className="task-dept">{task.dept}</span>}
                {task.materials && task.materials.length > 0 && (
                  <button
                    className="btn btn-link"
                    onClick={() => setMaterialsFor(task)}
                  >
                    資料を見る（{task.materials.length}）
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {materialsFor && (
        <MaterialsModal
          taskName={materialsFor.name}
          materials={materialsFor.materials}
          onClose={() => setMaterialsFor(null)}
        />
      )}
    </div>
  );
}
