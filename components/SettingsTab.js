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

  const categories = [...new Set(tasks.map((t) => t.category || "その他"))];

  return (
    <>
      {categories.map((category) => {
        const categoryTasks = tasks.filter((t) => (t.category || "その他") === category);
        const doneN = categoryTasks.filter((t) => t.done).length;
        return (
          <div key={category}>
            <div className="section-title">
              {category}
              <span className="cat-progress">
                {doneN}/{categoryTasks.length} 完了
              </span>
            </div>
            <ul className="task-list">
              {categoryTasks.map((task) => {
                const busy = !canEdit || busyTaskId === task.taskId;
                return (
                  <li key={task.taskId} className={`task-row ${task.done ? "is-done" : ""}`}>
                    <button
                      type="button"
                      className={`chk ${task.done ? "is-checked" : ""}`}
                      disabled={busy}
                      onClick={() => onToggleTask(task.taskId, !task.done)}
                      aria-label={task.done ? "未完了に戻す" : "完了にする"}
                    >
                      {task.done ? "✓" : ""}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div className="task-name">{task.name}</div>
                      {task.dept && <div className="task-meta">担当部門：{task.dept}</div>}
                    </div>
                    {task.materials && task.materials.length > 0 && (
                      <button className="btn btn-outline btn-sm" onClick={() => setMaterialsFor(task)}>
                        📄 資料を見る（{task.materials.length}）
                      </button>
                    )}
                    <div className="task-right">{task.done ? "完了" : "未完了"}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {!canEdit && (
        <p className="viewer-note">閲覧のみの権限です（チェックの変更はご本人または人事部のみ行えます）。</p>
      )}

      {materialsFor && (
        <MaterialsModal
          taskName={materialsFor.name}
          materials={materialsFor.materials}
          onClose={() => setMaterialsFor(null)}
        />
      )}
    </>
  );
}
