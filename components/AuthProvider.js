import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { decodeJwtPayload } from "../lib/jwt";

const AuthContext = createContext(null);
const SESSION_STORAGE_KEY = "onboardingplus_id_token";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("NO_WINDOW"));
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS_SCRIPT_LOAD_ERROR")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GIS_SCRIPT_LOAD_ERROR"));
    document.head.appendChild(script);
  });
}

export function AuthProvider({ children }) {
  const [idToken, setIdToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [gisReady, setGisReady] = useState(false);
  const [gisError, setGisError] = useState(null);
  const buttonElRef = useRef(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback((response) => {
    const token = response && response.credential;
    if (!token) return;
    setIdToken(token);
    setProfile(decodeJwtPayload(token));
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch (e) {
      /* sessionStorageが使えない環境でも致命的ではないので無視する */
    }
  }, []);

  useEffect(() => {
    // 前回のサインイン状態をこのタブ内で復元する（トークンの有効期限が切れていれば
    // 次にGAS呼び出しがFORBIDDEN/INVALID_ID_TOKENになるので、その場合は再サインインしてもらう）。
    try {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        setIdToken(stored);
        setProfile(decodeJwtPayload(stored));
      }
    } catch (e) {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!clientId) {
      setGisError("NEXT_PUBLIC_GOOGLE_CLIENT_IDが設定されていません。");
      return;
    }
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
        });
        setGisReady(true);
      })
      .catch(() => {
        if (!cancelled) setGisError("Googleサインインの読み込みに失敗しました。通信環境を確認してください。");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, handleCredential]);

  useEffect(() => {
    if (!gisReady || idToken || !buttonElRef.current) return;
    window.google.accounts.id.renderButton(buttonElRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      locale: "ja",
    });
  }, [gisReady, idToken]);

  const signOut = useCallback(() => {
    setIdToken(null);
    setProfile(null);
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      /* noop */
    }
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  const value = {
    idToken,
    profile,
    isSignedIn: !!idToken,
    gisReady,
    gisError,
    buttonElRef,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthはAuthProviderの内側で使ってください。");
  return ctx;
}
