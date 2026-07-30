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

// 個人ページ間を行き来したときに毎回「読み込み中」を表示しなくて済むよう、社員IDごとに
// 直前の取得結果をモジュール変数に保持しておく（TOP/管理者ページと同じ考え方）。
// このページは動的ルート（同じコンポーネントのままIDだけ差し替わる）なので、
// useStateの初期値ではなくidの変化を見るuseEffect側でキャッシュを反映する。
const detailCache = {};

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

  // idが切り替わった瞬間（別の社員のページへ遷移した瞬間）に、まずキャッシュ済みの
  // データ（無ければnull）へ即座に切り替える。これが無いと、このページは動的ルートで
  // コンポーネントが再マウントされない（=stateがリセットされない）ため、実際のデータが
  // 届くまで直前に見ていた「別の社員」のデータが表示され続けてしまう。
  useEffect(() => {
    if (!id) return;
    setDetail(detailCache[id] || null);
  }, [id]);

  const loadDetail = useCallback(() => {
    if (!isSignedIn || !id) return;
    setError(null);
    return gasApi
      .getEmployeeDetail(idToken, id)
      .then((data) => {
        setDetail(data);
        detailCache[id] = data;
      })
      .catch((err) => setError(err.message || String(err)));
  }, [isSignedIn, idToken, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  // 楽観的UI更新：GASからの応答（1〜数秒かかる）を待たずに、クリックした瞬間に
  // 画面上の状態を先に切り替える。裏で実際の更新・再読み込みを行い、失敗した場合だけ
  // 本来のサーバー状態に戻す。ボタンを押してから反映されるまでのタイムラグを解消するため。
  async function handleToggleTask(taskId, done) {
    setBusyTaskId(taskId);
    setError(null);
    const nowIso = new Date().toISOString();
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.taskId === taskId ? { ...t, done, completedAt: done ? nowIso : null } : t)),
      };
    });
    try {
      await gasApi.updateTaskStatus(idToken, id, taskId, done);
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
      await loadDetail(); // 失敗時は実際のサーバー状態に戻す
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleWatch(courseId) {
    setBusyCourseId(courseId);
    setError(null);
    const nowIso = new Date().toISOString();
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courses: prev.courses.map((c) => (c.courseId === courseId ? { ...c, watchedAt: nowIso, completed: true } : c)),
      };
    });
    try {
      await gasApi.updateTrainingProgress(idToken, id, courseId, "watch");
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
      await loadDetail();
    } finally {
      setBusyCourseId(null);
    }
  }

  async function handleSubmitTest(courseId, score) {
    setBusyCourseId(courseId);
    setError(null);
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courses: prev.courses.map((c) => {
          if (c.courseId !== courseId) return c;
          const passed = score >= (c.passScore || 100);
          return { ...c, testScore: score, testPassed: passed, completed: passed };
        }),
      };
    });
    try {
      await gasApi.updateTrainingProgress(idToken, id, courseId, "test", score);
      await loadDetail();
    } catch (err) {
      setError(err.message || String(err));
      await loadDetail();
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
