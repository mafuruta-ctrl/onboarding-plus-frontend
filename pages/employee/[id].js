import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import SignInScreen from "../../components/SignInScreen";
import ProgressBar from "../../components/ProgressBar";
import SettingsTab from "../../components/SettingsTab";
import TrainingTab from "../../components/TrainingTab";
import ReportTab from "../../components/ReportTab";
import { useAuth } from "../../components/AuthProvider";
import { gasApi } from "../../lib/gasClient";

const TABS = [
  { key: "settings", label: "各種設定" },
  { key: "training", label: "研修" },
  { key: "report", label: "日報" },
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

  return (
    <Layout>
      <Link href="/" className="back-link">
        ← 一覧に戻る
      </Link>

      {error && <div className="error-banner">エラーが発生しました：{error}</div>}

      {!detail && !error && <p className="loading-state">読み込み中…</p>}

      {detail && (
        <>
          <div className="employee-header">
            <div>
              <h1>{detail.name}</h1>
              <p className="employee-header-meta">
                {detail.placementName}　・　入社日：{detail.joinDate}
              </p>
            </div>
            <ProgressBar value={detail.overallProgress} label="全体進捗" />
          </div>

          <nav className="tab-nav">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`tab-nav-item ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "settings" && (
            <SettingsTab
              tasks={detail.tasks}
              canEdit={detail.canEdit}
              onToggleTask={handleToggleTask}
              busyTaskId={busyTaskId}
            />
          )}
          {activeTab === "training" && (
            <TrainingTab
              courses={detail.courses}
              canEdit={detail.canEdit}
              onWatch={handleWatch}
              onSubmitTest={handleSubmitTest}
              busyCourseId={busyCourseId}
            />
          )}
          {activeTab === "report" && <ReportTab report={detail.report} />}

          {!detail.canEdit && (
            <p className="viewer-note">
              閲覧のみの権限です（チェックの変更はご本人または人事部のみ行えます）。
            </p>
          )}
        </>
      )}
    </Layout>
  );
}
