import { useState } from "react";

/**
 * 研修タブ：動画視聴＋確認テストのコース一覧。
 * テストなしコースは「視聴済みにする」のみ、テストありコースは得点を入力して提出する。
 */
export default function TrainingTab({ courses, canEdit, onWatch, onSubmitTest, busyCourseId }) {
  const [scoreInputs, setScoreInputs] = useState({});

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
                    {course.category} {course.hasTest ? "・確認テストあり" : "・視聴のみ"}
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

              <div className="course-actions">
                {course.videoUrl && (
                  <a className="btn btn-outline btn-sm" href={course.videoUrl} target="_blank" rel="noreferrer">
                    ▶ 動画を視聴する
                  </a>
                )}
                {!course.videoUrl && (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={!canEdit || busy || !!course.watchedAt}
                    onClick={() => onWatch(course.courseId)}
                  >
                    ▶ {course.watchedAt ? "視聴済み" : "視聴済みにする"}
                  </button>
                )}

                {course.hasTest && (
                  <div className="test-submit">
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
                      📝 テストを提出
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
    </>
  );
}
