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

  return (
    <div className="tab-panel">
      <ul className="course-list">
        {courses.map((course) => {
          const busy = busyCourseId === course.courseId;
          return (
            <li key={course.courseId} className={`course-row ${course.completed ? "is-done" : ""}`}>
              <div className="course-main">
                <span className="course-name">{course.name}</span>
                {course.category && <span className="course-category">{course.category}</span>}
                {course.completed && <span className="badge badge-complete">完了</span>}
              </div>

              {course.videoUrl && (
                <a className="btn btn-secondary" href={course.videoUrl} target="_blank" rel="noreferrer">
                  動画を見る
                </a>
              )}

              {!course.hasTest ? (
                <button
                  className="btn btn-primary"
                  disabled={!canEdit || busy || !!course.watchedAt}
                  onClick={() => onWatch(course.courseId)}
                >
                  {course.watchedAt ? "視聴済み" : "視聴済みにする"}
                </button>
              ) : (
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
                    className="btn btn-primary"
                    disabled={!canEdit || busy}
                    onClick={() => onSubmitTest(course.courseId, Number(scoreInputs[course.courseId] || 0))}
                  >
                    テストを提出
                  </button>
                  {course.testScore != null && (
                    <span className="test-result">
                      前回：{course.testScore}点（合格基準 {course.passScore}点）
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
