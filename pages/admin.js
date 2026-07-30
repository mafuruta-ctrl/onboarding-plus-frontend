import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import Layout from "../components/Layout";
import SignInScreen from "../components/SignInScreen";
import AdminMatrixTable from "../components/AdminMatrixTable";
import AdminMaterialsModal from "../components/AdminMaterialsModal";
import AdminCourseMaterialsModal from "../components/AdminCourseMaterialsModal";
import { useAuth } from "../components/AuthProvider";
import { gasApi } from "../lib/gasClient";

const TABS = [
  { key: "tasks", label: "配属別タスク設定", permKey: "canEditTaskMaster", tag: "人事部のみ" },
  { key: "courses", label: "配属別研修設定", permKey: "canEditCourseMaster", tag: "研修担当 / 人事部" },
];

function toSetKey(placementCode, itemId) {
  return placementCode + "|" + itemId;
}

// 管理者ページも同じセッション内で再訪問したときに毎回「読み込み中」を表示しなくて
// 済むよう、直前の取得結果をモジュール変数に保持しておく（TOPページと同じ考え方）。
let cachedAdminData = null;

function defaultTabFor(d) {
  if (!d) return null;
  if (d.canEditTaskMaster) return "tasks";
  if (d.canEditCourseMaster) return "courses";
  return null;
}

export default function AdminPage() {
  const { idToken, isSignedIn } = useAuth();

  const [data, setData] = useState(cachedAdminData);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => defaultTabFor(cachedAdminData));
  const [materialsTaskId, setMaterialsTaskId] = useState(null);
  const [materialsCourseId, setMaterialsCourseId] = useState(null);

  const load = useCallback(() => {
    if (!isSignedIn) return;
    setError(null);
    return gasApi
      .getAdminMasterData(idToken)
      .then((d) => {
        setData(d);
        cachedAdminData = d;
        setActiveTab((prev) => prev || defaultTabFor(d));
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
      <Layout title="管理者ページ">
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
      <Layout title="管理者ページ">
        <p className="loading-state">読み込み中…</p>
      </Layout>
    );
  }

  const visibleTabs = TABS.filter((t) => data[t.permKey]);
  const materialsTask = materialsTaskId ? data.tasks.find((t) => t.taskId === materialsTaskId) : null;
  const materialsCourse = materialsCourseId ? data.courses.find((c) => c.courseId === materialsCourseId) : null;

  // 楽観的UI更新：チェックのON/OFF操作は、サーバー応答を待たずに即座にチェック状態を
  // 切り替える。裏で実際の更新を行い、失敗した場合は再読み込みして本来の状態に戻す
  // （エラー自体はAdminMatrixTable側の既存のエラー表示に任せるため再throwする）。
  async function handleToggleTask(placementCode, taskId, included) {
    setData((prev) => {
      if (!prev) return prev;
      const key = toSetKey(placementCode, taskId);
      const exists = prev.placementTaskSet.some((r) => toSetKey(r.placementCode, r.taskId) === key);
      const nextSet = included
        ? (exists ? prev.placementTaskSet : [...prev.placementTaskSet, { placementCode, taskId, order: prev.placementTaskSet.length + 1 }])
        : prev.placementTaskSet.filter((r) => toSetKey(r.placementCode, r.taskId) !== key);
      return { ...prev, placementTaskSet: nextSet };
    });
    try {
      await gasApi.updatePlacementTaskSet(idToken, placementCode, taskId, included);
      await load();
    } catch (err) {
      await load();
      throw err;
    }
  }

  async function handleToggleCourse(placementCode, courseId, included) {
    setData((prev) => {
      if (!prev) return prev;
      const key = toSetKey(placementCode, courseId);
      const exists = prev.placementCourseSet.some((r) => toSetKey(r.placementCode, r.courseId) === key);
      const nextSet = included
        ? (exists ? prev.placementCourseSet : [...prev.placementCourseSet, { placementCode, courseId, order: prev.placementCourseSet.length + 1 }])
        : prev.placementCourseSet.filter((r) => toSetKey(r.placementCode, r.courseId) !== key);
      return { ...prev, placementCourseSet: nextSet };
    });
    try {
      await gasApi.updatePlacementCourseSet(idToken, placementCode, courseId, included);
      await load();
    } catch (err) {
      await load();
      throw err;
    }
  }

  async function handleAddMaterial(taskId, name, url) {
    await gasApi.addMaterial(idToken, taskId, name, url);
    await load();
  }

  async function handleDeleteMaterial(taskId, index) {
    await gasApi.deleteMaterial(idToken, taskId, index);
    await load();
  }

  async function handleAddCourseMaterial(courseId, name, url) {
    await gasApi.addCourseMaterial(idToken, courseId, name, url);
    await load();
  }

  async function handleDeleteCourseMaterial(courseId, index) {
    await gasApi.deleteCourseMaterial(idToken, courseId, index);
    await load();
  }

  return (
    <Layout title="管理者ページ" crumb="配属別のタスク・研修コースの割り当てを管理します">
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

          {activeTab === "tasks" && data.canEditTaskMaster && (
            <div className="admin-panel">
              <div className="admin-title">
                <Wrench size={14} /> 配属別タスクセット・マスタ管理 <span className="admin-tag">人事部のみ</span>
              </div>
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
              <div className="hint">
                チェックのON/OFFで、配属先ごとに割り当てるタスクをカスタマイズできます。「資料」列から資料の追加・削除もできます（最大10件／タスク）。
              </div>
            </div>
          )}

          {activeTab === "courses" && data.canEditCourseMaster && (
            <div className="admin-panel">
              <div className="admin-title">
                <Wrench size={14} /> 配属別研修セット・マスタ管理 <span className="admin-tag">研修担当 / 人事部</span>
              </div>
              <AdminMatrixTable
                items={data.courses.map((c) => ({ id: c.courseId, name: c.name, category: c.category }))}
                placements={data.placements.map((p) => ({ code: p.code, name: p.name }))}
                isIncluded={(code, id) => courseSetKeys.has(toSetKey(code, id))}
                onToggle={handleToggleCourse}
                renderExtraColumn={(item) => (
                  <button className="btn-link" onClick={() => setMaterialsCourseId(item.id)}>
                    管理（{(data.courses.find((c) => c.courseId === item.id)?.materials || []).length}件）
                  </button>
                )}
              />
              <div className="hint">
                チェックのON/OFFで、配属先ごとに受講コースを切り替えられます。「資料」列から資料の追加・削除もできます（最大10件／コース）。
              </div>
            </div>
          )}
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

      {materialsCourse && (
        <AdminCourseMaterialsModal
          course={materialsCourse}
          onClose={() => setMaterialsCourseId(null)}
          onAdd={handleAddCourseMaterial}
          onDelete={handleDeleteCourseMaterial}
        />
      )}
    </Layout>
  );
}
