import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";
import Layout from "../components/Layout";
import SignInScreen from "../components/SignInScreen";
import ProgressBar from "../components/ProgressBar";
import { useAuth } from "../components/AuthProvider";
import { gasApi } from "../lib/gasClient";

const BADGE_CLASSES = ["badge-c0", "badge-c1", "badge-c2", "badge-c3", "badge-c4", "badge-c5"];

function badgeClassFor(placementCode) {
  const str = String(placementCode || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return BADGE_CLASSES[hash % BADGE_CLASSES.length];
}

function statusTag(overallProgress) {
  if (overallProgress >= 100) return { label: "完了", className: "status-done" };
  if (overallProgress >= 50) return { label: "順調", className: "status-good" };
  return { label: "要フォロー", className: "status-warn" };
}

export default function TopPage() {
  const router = useRouter();
  const { idToken, isSignedIn } = useAuth();
  const [employees, setEmployees] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    setError(null);
    gasApi
      .getEmployeeList(idToken)
      .then((data) => {
        if (!cancelled) setEmployees(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, idToken]);

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  const list = employees || [];
  const filtered = list.filter((e) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (e.name || "").toLowerCase().includes(q) || (e.placementName || "").toLowerCase().includes(q);
  });

  const avg = list.length ? Math.round(list.reduce((s, e) => s + e.overallProgress, 0) / list.length) : 0;
  const doneCount = list.filter((e) => e.overallProgress >= 100).length;
  const warnCount = list.filter((e) => e.overallProgress < 50).length;

  return (
    <Layout title="ダッシュボード" crumb="アクセス権のある新入社員一覧">
      <div className="page-header">
        <h1>新入社員一覧</h1>
        <div className="search-input">
          <Search size={15} />
          <input
            placeholder="氏名・配属で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          データの取得に失敗しました：{error}
          <br />
          アクセス権限がない場合や、サインインの有効期限が切れている場合があります。
        </div>
      )}

      {!error && employees === null && <p className="loading-state">読み込み中…</p>}

      {!error && employees !== null && (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">閲覧可能な新入社員数</div>
              <div className="stat-value">{list.length} 名</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均進捗率</div>
              <div className="stat-value accent">{avg}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">完了済み</div>
              <div className="stat-value" style={{ color: "var(--success)" }}>
                {doneCount} 名
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">要フォロー（進捗50%未満）</div>
              <div className="stat-value" style={{ color: "var(--danger)" }}>
                {warnCount} 名
              </div>
            </div>
          </div>

          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>新入社員</th>
                  <th>配属</th>
                  <th>入社日</th>
                  <th>各種設定</th>
                  <th>研修</th>
                  <th>全体進捗</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">表示できる新入社員が見つかりません。</div>
                    </td>
                  </tr>
                )}
                {filtered.map((emp) => {
                  const status = statusTag(emp.overallProgress);
                  return (
                    <tr key={emp.id} className="row-clickable" onClick={() => router.push(`/employee/${emp.id}`)}>
                      <td>
                        <div className="emp-cell">
                          <div className="avatar">{(emp.name || "?")[0]}</div>
                          <div>
                            <div className="emp-name">{emp.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${badgeClassFor(emp.placementCode)}`}>{emp.placementName}</span>
                      </td>
                      <td>{emp.joinDate}</td>
                      <td>{emp.taskProgress}%</td>
                      <td>{emp.courseProgress}%</td>
                      <td>
                        <ProgressBar value={emp.overallProgress} />
                      </td>
                      <td>
                        <span className={`status-tag ${status.className}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
