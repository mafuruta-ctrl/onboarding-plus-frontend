export default function ReportTab({ report }) {
  const reportUrl = process.env.NEXT_PUBLIC_DAILY_REPORT_URL || "#";
  const rate = report && report.required
    ? Math.min(100, Math.round((Number(report.submitted || 0) / Number(report.required)) * 100))
    : null;

  return (
    <>
      <div className="report-box">
        <div>
          <div className="report-left">
            <div className="report-icon">📝</div>
            <div>
              <div className="report-title">日報（外部アプリ連携）</div>
              <div className="report-desc">
                日報の作成・閲覧は既存の日報アプリで行います。本アプリには提出状況のサマリのみを表示します。
              </div>
            </div>
          </div>

          {report ? (
            <div className="report-stats">
              <div>
                <div className="report-stat-label">提出済み日数</div>
                <div className="report-stat-val">{report.submitted ?? "-"} 日</div>
              </div>
              <div>
                <div className="report-stat-label">必要日数</div>
                <div className="report-stat-val">{report.required ?? "-"} 日</div>
              </div>
              {rate != null && (
                <div>
                  <div className="report-stat-label">提出率</div>
                  <div className="report-stat-val" style={{ color: "var(--primary)" }}>
                    {rate}%
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="empty-state">日報の連携情報がまだ登録されていません。</p>
          )}
        </div>
        <a className="btn btn-primary" href={reportUrl} target="_blank" rel="noreferrer">
          日報アプリを開く ↗
        </a>
      </div>
      <p className="report-note">※ 日報タブの提出率は全体進捗率の算出には含めていません（参考表示）。</p>
    </>
  );
}
