import { NextResponse } from "next/server";
import { isIpAllowed, parseAllowList } from "./lib/ipAllowlist";

/**
 * 社内IPからのアクセスのみ許可するミドルウェア。
 * - 許可IPは環境変数 ALLOWED_IPS（カンマ区切り、CIDR可）で管理する。コードには書かない。
 * - 画面・静的ファイル（/_next/static、public配下の画像など）を含むすべてのパスが対象。
 * - ALLOWED_IPS が未設定・すべて不正な場合は、安全側に倒して全アクセスを拒否する。
 * - ローカル開発（next dev）時のみ制限をかけない。
 * ※ ALLOWED_IPS を変更した場合は、Vercelで再デプロイしないと反映されない。
 */

const { rules, invalid } = parseAllowList(process.env.ALLOWED_IPS);

function getClientIp(request) {
  // Vercelは x-forwarded-for / x-real-ip を自身で上書きして付与するため、
  // 利用者が偽のヘッダーを送っても先頭の値は信頼できる。
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || request.ip || "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function forbidden(ip) {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>403 Forbidden</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f5f6f8;color:#222}div{background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:480px}h1{font-size:20px;margin:0 0 12px}p{margin:6px 0;line-height:1.7}code{background:#f0f0f0;padding:2px 6px;border-radius:4px}</style></head>
<body><div><h1>アクセスが許可されていません</h1><p>Onboarding+ は社内ネットワークからのみご利用いただけます。</p><p>社内ネットワーク（またはVPN）に接続してから、再度お試しください。</p><p style="font-size:12px;color:#888;margin-top:16px">接続元IP：<code>${escapeHtml(ip || "不明")}</code></p></div></body></html>`;
  return new NextResponse(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export function middleware(request) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const ip = getClientIp(request);

  if (rules.length === 0) {
    console.error("[ip-allowlist] ALLOWED_IPS が未設定または不正なため、全アクセスを拒否しています。", { invalid });
    return forbidden(ip);
  }
  if (invalid.length > 0) {
    console.warn("[ip-allowlist] ALLOWED_IPS に解釈できない値があります（無視しました）：", invalid);
  }

  if (isIpAllowed(ip, rules)) return NextResponse.next();

  console.warn("[ip-allowlist] blocked", { ip, path: request.nextUrl.pathname });
  return forbidden(ip);
}

export const config = {
  // すべてのパス（画面・静的ファイル・画像・favicon含む）を対象にする
  matcher: "/:path*",
};
