import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SignInScreen from "../components/SignInScreen";
import AdminMatrixTable from "../components/AdminMatrixTable";
import AdminMaterialsModal from "../components/AdminMaterialsModal";
import { useAuth } from "../components/AuthProvider";
import { gasApi } from "../lib/gasClient";

const TABS = [
  { key: "tasks", label: "配属別タスク設定", permKey: "canEditTaskMaster" },
  { key: "courses", label: "配属別研修設定", permKey: "canEditCourseMaster" },
];

function toSetKey(placementCode, itemId) {
  return placementCode + "|" + itemId;
}

export default function AdminPage() {
  const { idToken, isSignedIn } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [materialsTaskId, setMaterialsTaskId] = useState(null);

  const load = useCallback(() => {
    if (!isSignedIn) return;
    setError(null);
    return gasApi
      .getAdminMasterData(idToken)
      .then((d) => {
        setData(d);
        setActiveTab((prev) => {
          if (prev) return prev;
          if (d.canEditTaskMaster) return "tasks";
          if (d.canEditCourseMaster) return "courses";
          return null;
        });
      })
      .catch((err) => setError(err.message || String(err)));
  }, [isSignedIn, idToken]);

  useEffect(() => {
    load();
  }, [load]);

  const taskSetKeys = useMemo(() => {
    if (!data) return new Set();
    return new Set(data.placementTaskSet.map((r) => toSetKey(r.placementCode, r.taskId)));
  }, [data]);

  const courseSetKeys = useMemo(() => {
    if (!data) return new Set();
    return new Set(data.placementCourseSet.map((r) => toSetKey(r.placementCode, r.courseId)));
  }, [data]);

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  if (error) {
    const isForbidden = /FORBIDDEN/.test(error);
    return (
      <Layout>
        <div className="error-banner">
          {isForbidden
            ? "この画面は人事部・研修担当のみアクセスできます。権限が必要な場合は人事部にお問い合わせください。"
            : `データの取得に失敗しました：${error}`}
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <p className="loading-state">読み込み中…</p>
      </Layout>
    );
  }

  const visibleTabs = TABS.filter((t) => data[t.permKey]);
  const materialsTask = materialsTaskId ? data.tasks.find((t) => t.taskId === materialsTaskId) : null;

  async function handleToggleTask(placementCode, taskId, included) {
    await gasApi.updatePlacementTaskSet(idToken, placementCode, taskId, included);
    await load();
  }

  async function handleToggleCourse(placementCode, courseId, included) {
    await gasApi.updatePlacementCourseSet(idToken, placementCode, courseId, included);
    await load();
  }

  async function handleAddMaterial(taskId, name, url) {
    await gasApi.addMaterial(idToken, taskId, name, url);
    await load();
  }

  async function handleDeleteMaterial(taskId, index) {
    await gasApi.deleteMaterial(idToken, taskId, index);
    await load();
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>管理者ページ</h1>
      </div>

      {visibleTabs.length === 0 && (
        <div className="error-banner">
          この画面を編集できる権限がありません（人事部：タスクマスタ編集、研修担当：研修コースマスタ編集）。
        </div>
      )}

      {visibleTabs.length > 0 && (
        <>
          <nav className="tab-nav">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-nav-item ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-panel">
            {activeTab === "tasks" && data.canEditTaskMaster && (
              <>
                <p className="viewer-note admin-tab-intro">
                  チェックを入れると、その配属に配属された新入社員全員に該当タスクが表示されます。「資料」列から資料の追加・削除もできます（最大10件／タスク）。
                </p>
                <AdminMatrixTable
                  items={data.tasks.map((t) => ({ id: t.taskId, name: t.name, category: t.category }))}
                  placements={data.placements.map((p) => ({ code: p.code, name: p.name }))}
                  isIncluded={(code, id) => taskSetKeys.has(toSetKey(code, id))}
                  onToggle={handleToggleTask}
                  renderExtraColumn={(item) => (
                    <button className="btn-link" onClick={() => setMaterialsTaskId(item.id)}>
                      管理（{(data.tasks.find((t) => t.taskId === item.id)?.materials || []).length}件）
                    </button>
                  )}
                />
              </>
            )}

            {activeTab === "courses" && data.canEditCourseMaster && (
              <>
                <p className="viewer-note admin-tab-intro">
                  チェックを入れると、その配属に配属された新入社員全員に該当研修コースが表示されます。
                </p>
                <AdminMatrixTable
                  items={data.courses.map((c) => ({ id: c.courseId, name: c.name, category: c.category }))}
                  placements={data.placements.map((p) => ({ code: p.code, name: p.name }))}
                  isIncluded={(code, id) => courseSetKeys.has(toSetKey(code, id))}
                  onToggle={handleToggleCourse}
                />
              </>
            )}
          </div>
        </>
      )}

      {materialsTask && (
        <AdminMaterialsModal
          task={materialsTask}
          onClose={() => setMaterialsTaskId(null)}
          onAdd={handleAddMaterial}
          onDelete={handleDeleteMaterial}
        />
      )}
    </Layout>
  );
}
