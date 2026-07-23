import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import SignInScreen from "../components/SignInScreen";
import ProgressBar from "../components/ProgressBar";
import { useAuth } from "../components/AuthProvider";
import { gasApi } from "../lib/gasClient";

function statusTag(overallProgress) {
  if (overallProgress >= 100) return { label: "完了", className: "badge-complete" };
  if (overallProgress < 40) return { label: "遅延あり", className: "badge-behind" };
  return { label: "順調", className: "badge-ontrack" };
}

export default function TopPage() {
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

  const filtered = (employees || []).filter((e) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (e.name || "").toLowerCase().includes(q) || (e.placementName || "").toLowerCase().includes(q);
  });

  return (
    <Layout>
      <div className="page-header">
        <h1>新入社員一覧</h1>
        <input
          className="search-input"
          placeholder="氏名・配属で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-banner">
          データの取得に失敗しました：{error}
          <br />
          アクセス権限がない場合や、サインインの有効期限が切れている場合があります。
        </div>
      )}

      {!error && employees === null && <p className="loading-state">読み込み中…</p>}

      {!error && employees !== null && filtered.length === 0 && (
        <p className="empty-state">表示できる新入社員が見つかりません。</p>
      )}

      <div className="employee-grid">
        {filtered.map((emp) => {
          const tag = statusTag(emp.overallProgress);
          return (
            <Link key={emp.id} href={`/employee/${emp.id}`} className="employee-card">
              <div className="employee-card-top">
                <span className="employee-name">{emp.name}</span>
                <span className={`badge ${tag.className}`}>{tag.label}</span>
              </div>
              <div className="employee-meta">
                <span>{emp.placementName}</span>
                <span>入社日：{emp.joinDate}</span>
              </div>
              <ProgressBar value={emp.overallProgress} />
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
