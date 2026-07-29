import { useState } from "react";
import MaterialsModal from "./MaterialsModal";

/**
 * 動画URL欄には2種類の値が入り得る：
 * - 実際にブラウザで開けるURL（http/https） → クリックできるリンクにする
 * - 社内共有フォルダのファイルパス（\\server\share\...） → ブラウザでは直接開けないので、
 *   コピーできるテキストとして表示する（社員がコピーしてエクスプローラーに貼り付ける想定）。
 */
function isWebUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

function CourseLinkOrPath({ url }) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  if (isWebUrl(url)) {
    return (
      <a className="btn btn-outline btn-sm" href={url} target="_blank" rel="noreferrer">
        ▶ リンク先へ飛ぶ ↗
      </a>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* クリップボードが使えない環境でも致命的ではないので無視する */
    }
  }

  return (
    <div className="path-copy-box">
      <span className="path-copy-text">{url}</span>
      <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
        {copied ? "コピーしました" : "📋 パスをコピー"}
      </button>
    </div>
  );
}

export default function TrainingTab({ courses, canEdit, onWatch, onSubmitTest, busyCourseId }) {
  const [scoreInputs, setScoreInputs] = useState({});
  const [materialsFor, setMaterialsFor] = useState(null);

  if (!courses || courses.length === 0) {
    return <p className="empty-state">この配属に割り当てられた研修コースはありません。</p>;
  }

  const doneCount = courses.filter((c) => c.completed).length;

  return (
    <>
      <div className="section-title">
        受講対象コース
        <span className="cat-progress">
          {doneCount}/{courses.length} 完了
        </span>
      </div>

      <div className="course-grid">
        {courses.map((course) => {
          const busy = busyCourseId === course.courseId;
          return (
            <div key={course.courseId} className={`course-card ${course.completed ? "is-complete" : ""}`}>
              <div className="course-top">
                <div>
                  <div className="course-title">{course.name}</div>
                  <div className="course-cat">
                    {course.category}
                    {course.method ? `・${course.method}` : ""}
                    {course.hasTest ? "・確認テストあり" : ""}
                  </div>
                </div>
                {course.completed ? (
                  <span className="pill pill-passed">完了 ✓</span>
                ) : (
                  <span className="pill pill-pending">未完了</span>
                )}
              </div>

              <div className="course-pills">
                {course.watchedAt ? (
                  <span className="pill pill-watched">視聴済み</span>
                ) : (
                  <span className="pill pill-pending">未視聴</span>
                )}
                {course.hasTest &&
                  (course.testPassed === true ? (
                    <span className="pill pill-passed">テスト合格（{course.testScore}点）</span>
                  ) : course.testPassed === false ? (
                    <span className="pill pill-failed">テスト不合格（{course.testScore}点）</span>
                  ) : (
                    <span className="pill pill-pending">テスト未受験</span>
                  ))}
              </div>

              <CourseLinkOrPath url={course.videoUrl} />

              <div className="course-actions">
                {course.materials && course.materials.length > 0 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setMaterialsFor(course)}>
                    📄 資料を見る（{course.materials.length}）
                  </button>
                )}
                {course.glossaryUrl && (
                  <a className="btn btn-outline btn-sm" href={course.glossaryUrl} target="_blank" rel="noreferrer">
                    📖 用語集
                  </a>
                )}

                {!course.hasTest && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!canEdit || busy || !!course.watchedAt}
                    onClick={() => onWatch(course.courseId)}
                  >
                    {course.watchedAt ? "視聴済み" : "視聴済みにする"}
                  </button>
                )}

                {course.hasTest && (
                  <div className="test-submit">
                    {course.testUrl && (
                      <a className="btn btn-outline btn-sm" href={course.testUrl} target="_blank" rel="noreferrer">
                        📝 テストを受ける ↗
                      </a>
                    )}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="得点"
                      className="score-input"
                      disabled={!canEdit || busy}
                      value={scoreInputs[course.courseId] ?? course.testScore ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({ ...prev, [course.courseId]: e.target.value }))
                      }
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!canEdit || busy}
                      onClick={() => onSubmitTest(course.courseId, Number(scoreInputs[course.courseId] || 0))}
                    >
                      得点を提出
                    </button>
                    {course.testScore != null && (
                      <span className="test-result">合格基準 {course.passScore}点</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!canEdit && (
        <p className="viewer-note">※ 動画視聴・テスト受験は本人・人事部のみ操作可能です。現在は閲覧モードです。</p>
      )}

      {materialsFor && (
        <MaterialsModal
          taskName={materialsFor.name}
          materials={materialsFor.materials}
          onClose={() => setMaterialsFor(null)}
        />
      )}
    </>
  );
}
