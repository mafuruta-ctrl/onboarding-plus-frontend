import { useState } from "react";
import { BookOpen, Calendar, Check, ClipboardCheck, Copy, ExternalLink, FileText, RotateCcw } from "lucide-react";
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

// 対応期日に「カレンダー」という文言が含まれる場合は、各自のGoogleカレンダートップへ
// 遷移できるリンクとして表示する（実際の研修日はカレンダー上でしか分からないため）。
const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";
function isCalendarDeadline(value) {
  return (value || "").includes("カレンダー");
}

function CourseLinkOrPath({ url }) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  if (isWebUrl(url)) {
    return (
      <a className="btn btn-outline btn-sm" href={url} target="_blank" rel="noreferrer">
        <ExternalLink size={13} /> リンク先へ飛ぶ
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
        {copied ? (
          <>
            <Check size={13} /> コピーしました
          </>
        ) : (
          <>
            <Copy size={13} /> パスをコピー
          </>
        )}
      </button>
    </div>
  );
}

export default function TrainingTab({ courses, canEdit, onWatch, onUnwatch, onSubmitTest, onUntest, busyCourseId }) {
  const [materialsFor, setMaterialsFor] = useState(null);

  if (!courses || courses.length === 0) {
    return <p className="empty-state">この配属に割り当てられた研修コースはありません。</p>;
  }

  const categories = [...new Set(courses.map((c) => c.category || "その他"))];

  return (
    <>
      {categories.map((category) => {
        const categoryCourses = courses.filter((c) => (c.category || "その他") === category);
        const doneN = categoryCourses.filter((c) => c.completed).length;
        return (
          <div key={category}>
            <div className="section-title">
              {category}
              <span className="cat-progress">
                {doneN}/{categoryCourses.length} 完了
              </span>
            </div>

            <div className="course-grid">
              {categoryCourses.map((course) => {
                const busy = busyCourseId === course.courseId;
                const passScore = course.passScore || 100;
                return (
                  <div key={course.courseId} className={`course-card ${course.completed ? "is-complete" : ""}`}>
                    <div className="course-top">
                      <div>
                        <div className="course-title">{course.name}</div>
                        <div className="course-cat">
                          {course.method}
                          {course.hasTest ? "・確認テストあり" : ""}
                        </div>
                        {course.deadline && isCalendarDeadline(course.deadline) && (
                          <a
                            className="course-meta course-meta-link"
                            href={GOOGLE_CALENDAR_URL}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Calendar size={11} /> 対応期日：{course.deadline}
                          </a>
                        )}
                        {course.deadline && !isCalendarDeadline(course.deadline) && (
                          <div className="course-meta">対応期日：{course.deadline}</div>
                        )}
                      </div>
                      {course.completed ? (
                        <span className="pill pill-passed">
                          <Check size={11} strokeWidth={3} /> 完了
                        </span>
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
                          <FileText size={13} /> 資料を見る（{course.materials.length}）
                        </button>
                      )}
                      {course.glossaryUrl && (
                        <a className="btn btn-outline btn-sm" href={course.glossaryUrl} target="_blank" rel="noreferrer">
                          <BookOpen size={13} /> 用語集
                        </a>
                      )}

                      {!course.hasTest && (
                        course.watchedAt ? (
                          // 誤って「完了」を押してしまった場合に取り消せるようにする
                          // （視聴済みのまま固定されず、押し間違いをやり直せる）。
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={!canEdit || busy}
                            onClick={() => onUnwatch(course.courseId)}
                          >
                            <RotateCcw size={13} /> 完了を取り消す
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!canEdit || busy}
                            onClick={() => onWatch(course.courseId)}
                          >
                            完了
                          </button>
                        )
                      )}

                      {course.hasTest && (
                        <div className="test-submit">
                          {course.testUrl && (
                            <a className="btn btn-outline btn-sm" href={course.testUrl} target="_blank" rel="noreferrer">
                              <ClipboardCheck size={13} /> テストを受ける
                            </a>
                          )}
                          {course.testPassed === true ? (
                            // 誤って「テスト完了」を押してしまった場合に取り消せるようにする。
                            <button
                              className="btn btn-outline btn-sm"
                              disabled={!canEdit || busy}
                              onClick={() => onUntest(course.courseId)}
                            >
                              <RotateCcw size={13} /> 完了を取り消す
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!canEdit || busy}
                              onClick={() => onSubmitTest(course.courseId, passScore)}
                            >
                              {`テスト完了（${passScore}点）`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
