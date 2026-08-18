import { useEffect, useState } from "react";
import { AlertTriangle, Bot, Check, FileText, MessageSquareText, RefreshCw, Users, X } from "lucide-react";
import LoadingDots from "./LoadingDots";

/**
 * メンター面談タブ：全4回の面談報告フォーム（AI整形付き）・面談記録・分析レポートを扱う。
 * このタブ自体はgetEmployeeDetailには含まれない別系統のデータ（メンター面談記録シート）
 * のため、他のタブと違い自分でgetMentorInterviewDataを呼んで読み込む。
 * 表示条件（そのメンター or 人事部のみ）は呼び出し元（employee/[id].js）が
 * detail.canViewMentorInterview で判定してからこのコンポーネントを描画する。
 */

function InterviewReportForm({ nextRound, onClose, onSubmit, onFormatText }) {
  const [conductedAt, setConductedAt] = useState("");
  const [content, setContent] = useState("");
  const [impression, setImpression] = useState("");
  const [hrQuestion, setHrQuestion] = useState("");
  const [formattingField, setFormattingField] = useState(null); // "content" | "impression" | null
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleFormat(field) {
    const currentText = field === "content" ? content : impression;
    if (!currentText.trim() || formattingField) return;
    setFormattingField(field);
    setError(null);
    try {
      const formatted = await onFormatText(currentText);
      if (field === "content") setContent(formatted);
      else setImpression(formatted);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setFormattingField(null);
    }
  }

  async function handleSubmit() {
    if (!conductedAt || !content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ conductedAt, content, impression, hrQuestion });
      onClose();
    } catch (err) {
      setError(err.message || String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <Users size={16} /> メンター面談報告（{nextRound}回目）
          </div>
          <button className="modal-close" onClick={onClose} disabled={submitting} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        <div className="interview-field">
          <label>面談実施日</label>
          <input
            type="date"
            value={conductedAt}
            onChange={(e) => setConductedAt(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="interview-field">
          <div className="interview-field-head">
            <label>面談した内容</label>
            <button
              type="button"
              className={`btn btn-outline btn-sm ${formattingField === "content" ? "is-busy" : ""}`}
              onClick={() => handleFormat("content")}
              disabled={submitting || !!formattingField || !content.trim()}
            >
              {formattingField === "content" ? (
                <span className="btn-busy-dot" />
              ) : (
                <>
                  <Bot size={13} /> AI整形する
                </>
              )}
            </button>
          </div>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            placeholder="箇条書きのままでも構いません。「AI整形する」で文章に整えられます（内容は変わりません）。"
          />
        </div>

        <div className="interview-field">
          <div className="interview-field-head">
            <label>メンターの所感</label>
            <button
              type="button"
              className={`btn btn-outline btn-sm ${formattingField === "impression" ? "is-busy" : ""}`}
              onClick={() => handleFormat("impression")}
              disabled={submitting || !!formattingField || !impression.trim()}
            >
              {formattingField === "impression" ? (
                <span className="btn-busy-dot" />
              ) : (
                <>
                  <Bot size={13} /> AI整形する
                </>
              )}
            </button>
          </div>
          <textarea
            rows={3}
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            disabled={submitting}
            placeholder="体調、コンディション、業務状況などの共有。その他お気づきの点があれば自由に記載してください。"
          />
        </div>

        <div className="interview-field">
          <label>人事への質問・相談（任意）</label>
          <textarea
            rows={3}
            value={hrQuestion}
            onChange={(e) => setHrQuestion(e.target.value)}
            disabled={submitting}
            placeholder="人事に確認・相談したいことがあれば記載してください。"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
            キャンセル
          </button>
          <button
            className={`btn btn-primary btn-sm ${submitting ? "is-busy" : ""}`}
            onClick={handleSubmit}
            disabled={submitting || !conductedAt || !content.trim()}
          >
            {submitting ? <span className="btn-busy-dot" /> : "報告する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewHistoryModal({ rounds, onClose }) {
  const completedRounds = rounds.filter((r) => r.completed);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <FileText size={16} /> 面談記録
          </div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        {completedRounds.length === 0 ? (
          <p className="modal-empty">まだ報告された面談はありません。</p>
        ) : (
          completedRounds.map((r) => (
            <div key={r.round} className="interview-history-item">
              <div className="interview-history-head">
                <span className="pill pill-passed">
                  <Check size={11} strokeWidth={3} /> {r.round}回目
                </span>
                <span className="interview-history-date">実施日：{r.conductedAt}</span>
              </div>
              <div className="interview-history-label">面談した内容</div>
              <p className="interview-history-text">{r.content}</p>
              {r.impression && (
                <>
                  <div className="interview-history-label">メンターの所感</div>
                  <p className="interview-history-text">{r.impression}</p>
                </>
              )}
              {r.hrQuestion && (
                <>
                  <div className="interview-history-label">人事への質問・相談</div>
                  <p className="interview-history-text">{r.hrQuestion}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InterviewReportModal({ report, onClose, onRegenerate }) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      await onRegenerate();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <MessageSquareText size={16} /> 分析レポート
          </div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        {report ? (
          <>
            <p className="interview-history-date">作成日時：{report.generatedAt}</p>
            <p className="interview-report-body">{report.body}</p>
          </>
        ) : (
          <p className="modal-empty">まだレポートは作成されていません（4回目の面談報告後に自動作成されます）。</p>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            閉じる
          </button>
          {report && (
            <button
              className={`btn btn-primary btn-sm ${regenerating ? "is-busy" : ""}`}
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <span className="btn-busy-dot" />
              ) : (
                <>
                  <RefreshCw size={13} /> 再生成する
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MentorInterviewTab({ targetId, idToken, gasApi }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);

  function load() {
    setError(null);
    return gasApi
      .getMentorInterviewData(idToken, targetId)
      .then(setData)
      .catch((err) => setError(err.message || String(err)));
  }

  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, idToken]);

  if (error) {
    return <div className="error-banner">エラーが発生しました：{error}</div>;
  }

  if (!data) {
    return <LoadingDots />;
  }

  const nextRoundInfo = data.nextRound ? data.rounds[data.nextRound - 1] : null;

  return (
    <div>
      {notice && <div className="notice-banner">{notice}</div>}

      <div className="interview-status-bar">
        {nextRoundInfo ? (
          <span>
            次回：{nextRoundInfo.round}回目（期日：{nextRoundInfo.deadline || "未確定（前回の面談待ち）"}）
            {nextRoundInfo.isOverdue && (
              <span className="interview-overdue-badge">
                <AlertTriangle size={11} /> 期日超過
              </span>
            )}
          </span>
        ) : (
          <span>全4回のメンター面談報告が完了しています。</span>
        )}
      </div>

      <div className="interview-actions">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} disabled={!data.nextRound}>
          <Users size={13} /> メンター面談報告
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(true)}>
          <FileText size={13} /> 面談記録
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowReport(true)} disabled={!data.report}>
          <MessageSquareText size={13} /> レポート
        </button>
      </div>

      {showForm && (
        <InterviewReportForm
          nextRound={data.nextRound}
          onClose={() => setShowForm(false)}
          onFormatText={(text) => gasApi.formatMentorInterviewText(idToken, targetId, text)}
          onSubmit={async ({ conductedAt, content, impression, hrQuestion }) => {
            const result = await gasApi.submitMentorInterview(
              idToken,
              targetId,
              conductedAt,
              content,
              impression,
              hrQuestion
            );
            await load();
            if (result && result.reportGenerated === false) {
              setNotice(
                "面談報告は保存されましたが、分析レポートの自動生成に失敗しました。「レポート」ボタンから再生成をお試しください。"
              );
            } else {
              setNotice(null);
            }
          }}
        />
      )}

      {showHistory && <InterviewHistoryModal rounds={data.rounds} onClose={() => setShowHistory(false)} />}

      {showReport && (
        <InterviewReportModal
          report={data.report}
          onClose={() => setShowReport(false)}
          onRegenerate={async () => {
            await gasApi.regenerateMentorInterviewReport(idToken, targetId);
            await load();
            setNotice(null);
          }}
        />
      )}
    </div>
  );
}
