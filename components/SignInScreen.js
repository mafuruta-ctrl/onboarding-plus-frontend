import { useAuth } from "./AuthProvider";

export default function SignInScreen() {
  const { buttonElRef, gisReady, gisError } = useAuth();

  return (
    <div className="signin-screen">
      <div className="signin-card">
        <div className="brand-row">
          <img src="/favicon-64.png" alt="Onboarding+" className="brand-mark" />
          <span className="brand-text">Onboarding+</span>
        </div>
        <p className="signin-copy">
          会社のGoogleアカウントでサインインしてください。
          <br />
          アクセス権限のある新入社員データのみ表示されます。
        </p>

        <div ref={buttonElRef} className="gis-button-slot" />

        {!gisReady && !gisError && <p className="signin-hint">サインインボタンを読み込んでいます…</p>}
        {gisError && <p className="signin-error">{gisError}</p>}
      </div>
    </div>
  );
}
