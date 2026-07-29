import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, Calendar, GraduationCap, NotebookText, Settings } from "lucide-react";
import Layout from "../../components/Layout";
import SignInScreen from "../../components/SignInScreen";
import ProgressRing from "../../components/ProgressRing";
import SettingsTab from "../../components/SettingsTab";
import TrainingTab from "../../components/TrainingTab";
import ReportTab from "../../components/ReportTab";
import { useAuth } from "../../components/AuthProvider";
import { gasApi } from "../../lib/gasClient";

// 日報タブは日報アプリ連携の対象である sales_member（営業・MGR未満）配属のみ表示する。
const ALL_TABS = [
  { key: "settings", icon: Settings, label: "各種設定" },
  { key: "training", icon: GraduationCap, label: "研修" },
  { key: "report", icon: NotebookText, label: "日報", placementOnly: "sales_member" },
];

export default function EmployeeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { idToken, isSignedIn } = useAuth();

  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [busyCourseId, setBusyCourseId] = useState(null);

  const loadDetail = useCallback(() => {
    if (!isSignedIn || !id) return;
    setError(null);
    return gasApi
      .getEmployeeDetail(idToken, id)
      .then((data) => setDetail(data))
      .catch((err) => setError(err.message || String(err)));
  }, [isSignedIn, idToken, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  async function handleToggleTask(taskId, done) {
    setBusyTaskId(taskId);
    try {
      await gasApi.updateTaskStatus(idToken, id, taskId, done);
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleWatch(courseId) {
    setBusyCourseId(courseId);
    try {
      await gasApi.updateTrainingProgress(idToken, id, courseId, "watch");
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusyCourseId(null);
    }
  }

  async function handleSubmitTest(courseId, score) {
    setBusyCourseId(courseId);
    try {
      await gasApi.updateTrainingProgress(idToken, id, courseId, "test", score);
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusyCourseId(null);
    }
  }

  const taskPct = detail && detail.tasks.length
    ? Math.round((detail.tasks.filter((t) => t.done).length / detail.tasks.length) * 100)
    : 0;
  const coursePct = detail && detail.courses.length
    ? Math.round((detail.courses.filter((c) => c.completed).length / detail.courses.length) * 100)
    : 0;

  return (
    <Layout title={detail ? `${detail.name} さんのページ` : "個人ページ"} crumb="個人ページ">
      <div className="back-link" onClick={() => router.push("/")}>
        <ArrowLeft size={15} /> 一覧へ戻る
      </div>

      {error && <div className="error-banner">エラーが発生しました：{error}</div>}

      {!detail && !error && <p className="loading-state">読み込み中…</p>}

      {detail && (
        <>
          <div className="profile-header">
            <div className="profile-header-left">
              <div className="avatar-lg">{(detail.name || "?")[0]}</div>
              <div>
                <div className="profile-name">{detail.name}</div>
                <div className="profile-meta">
                  <span>
                    <Building2 size={13} /> {detail.placementName}
                  </span>
                  <span>
                    <Calendar size={13} /> 入社日：{detail.joinDate}
                  </span>
                </div>
              </div>
            </div>
            <ProgressRing value={detail.overallProgress} />
          </div>

          {(() => {
            const visibleTabs = ALL_TABS.filter(
              (tab) => !tab.placementOnly || detail.placementCode === tab.placementOnly
            );
            const effectiveTab = visibleTabs.some((t) => t.key === activeTab)
              ? activeTab
              : visibleTabs[0]?.key;

            return (
              <>
                <nav className="tab-nav">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        className={`tab-nav-item ${effectiveTab === tab.key ? "is-active" : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        <Icon size={15} /> {tab.label}
                        {tab.key === "settings" && <span className="tab-count">{taskPct}%</span>}
                        {tab.key === "training" && <span className="tab-count">{coursePct}%</span>}
                      </button>
                    );
                  })}
                </nav>

                <div className="tab-panel">
                  {effectiveTab === "settings" && (
                    <SettingsTab
                      tasks={detail.tasks}
                      canEdit={detail.canEdit}
                      onToggleTask={handleToggleTask}
                      busyTaskId={busyTaskId}
                    />
                  )}
                  {effectiveTab === "training" && (
                    <TrainingTab
                      courses={detail.courses}
                      canEdit={detail.canEdit}
                      onWatch={handleWatch}
                      onSubmitTest={handleSubmitTest}
                      busyCourseId={busyCourseId}
                    />
                  )}
                  {effectiveTab === "report" && <ReportTab report={detail.report} />}
                </div>
              </>
            );
          })()}
        </>
      )}
    </Layout>
  );
}
