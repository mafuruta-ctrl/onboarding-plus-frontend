# Onboarding+ フロントエンド

Next.js製のフロントエンド。GAS（Google Apps Script）バックエンドとJSONPで通信し、
Googleサインインで取得したIDトークンをすべてのAPIリクエストに添付する。

デプロイの詳しい手順は「Onboarding+ フロントエンド デプロイ手順書」（docx）を参照してください。
ここでは開発者向けの技術メモのみ記載します。

## 環境変数

`.env.local.example` を `.env.local` にコピーして値を設定する（ローカル開発時）。
Vercelにデプロイする場合はVercelのプロジェクト設定 → Environment Variables で同じ変数を設定する。

- `NEXT_PUBLIC_GAS_API_URL` … GASウェブアプリのURL（末尾 `/exec`）
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` … OAuthクライアントID
- `NEXT_PUBLIC_DAILY_REPORT_URL` … （任意）日報アプリのURL

## ローカル開発

```
npm install
npm run dev
```

## 実装範囲（今回のバージョン）

含まれるもの：
- Googleサインイン（Google Identity Services）
- TOP画面（アクセス権のある新入社員一覧・進捗・検索）
- 個人ページ（各種設定／研修／日報の3タブ）
- 各種設定タスクのチェック・資料閲覧
- 研修の視聴済みチェック・テスト得点提出

まだ含まれないもの（後日追加予定）：
- 人事部・研修担当向けのマスタ編集画面（タスクマスタ／研修コースマスタ／資料の追加・削除／配属別セットの編集）
- 全体進捗ダッシュボード

これらはGAS側のAPI（addMaterial / deleteMaterial / updatePlacementTaskSet / updatePlacementCourseSet 等）は
既に実装済みのため、画面を追加すれば有効化できます。
