export default function ReportTab({ report }) {
  const reportUrl = process.env.NEXT_PUBLIC_DAILY_REPORT_URL || "#";

  return (
    <div className="tab-panel">
      <div className="report-card">
        {report ? (
          <>
            <p>
              提出済み日数：<strong>{report.submitted ?? "-"}</strong> / {report.required ?? "-"} 日
            </p>
            <p>直近の提出日：{report.lastSubmittedAt || "記録なし"}</p>
          </>
        ) : (
          <p className="empty-state">日報の連携情報がまだ登録されていません。</p>
        )}
        <a className="btn btn-primary" href={reportUrl} target="_blank" rel="noreferrer">
          日報アプリを開く
        </a>
        <p className="report-note">
          ※ 日報は別アプリで運用されています。本タブでは提出状況のサマリのみを表示しています。
        </p>
      </div>
    </div>
  );
}
