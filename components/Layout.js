import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function Layout({ children, title, crumb }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <img src="/favicon-64.png" alt="Onboarding+" className="brand-mark" />
          <div>
            <div className="brand-text">Onboarding+</div>
            <div className="brand-sub">新入社員管理</div>
          </div>
        </div>

        <Link href="/" className={`nav-item ${router.pathname === "/" ? "is-active" : ""}`}>
          <span className="nav-icon">📊</span>ダッシュボード
        </Link>
        <Link href="/admin" className={`nav-item ${router.pathname === "/admin" ? "is-active" : ""}`}>
          <span className="nav-icon">🛠️</span>管理者ページ
        </Link>

        <div className="user-card">
          <div className="user-card-name">
            {profile?.picture && <img src={profile.picture} alt="" className="user-card-avatar" />}
            <span>{profile?.name || profile?.email}</span>
          </div>
          {profile?.email && <div className="user-card-email">{profile.email}</div>}
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            サインアウト
          </button>
        </div>
      </aside>

      <div className="main">
        {(title || crumb) && (
          <div className="topbar">
            <div>
              {title && <div className="topbar-title">{title}</div>}
              {crumb && <div className="topbar-crumb">{crumb}</div>}
            </div>
          </div>
        )}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
