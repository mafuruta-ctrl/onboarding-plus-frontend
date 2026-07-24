import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function Layout({ children }) {
  const { profile, isSignedIn, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="brand-row">
          <img src="/favicon-64.png" alt="Onboarding+" className="brand-mark" />
          <span className="brand-text">Onboarding+</span>
        </Link>
        {isSignedIn && (
          <div className="header-user">
            <Link href="/admin" className="btn-link header-admin-link">
              管理者ページ
            </Link>
            {profile?.picture && <img src={profile.picture} alt="" className="avatar" />}
            <span className="user-name">{profile?.name || profile?.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              サインアウト
            </button>
          </div>
        )}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
