/**
 * GAS（Google Apps Script）バックエンドをJSONP経由で呼び出すクライアント。
 *
 * GMOグループのGoogleアカウントはOAuth認証必須のため、通常のfetch/XHRで
 * GASのエンドポイントへ直接リクエストするとCORSに阻まれる。そのため、
 * <script>タグを動的に生成してGASのdoGetを呼び出す「JSONP方式」を使う。
 */

const REQUEST_TIMEOUT_MS = 15000;

function jsonpRequest(baseUrl, params) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("JSONP_REQUIRES_BROWSER"));
      return;
    }

    const callbackName = "__gasCallback_" + Math.random().toString(36).slice(2) + Date.now();
    const script = document.createElement("script");
    let settled = false;

    const query = new URLSearchParams({ ...params, callback: callbackName }).toString();
    script.src = `${baseUrl}?${query}`;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("GAS_REQUEST_TIMEOUT"));
    }, REQUEST_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("GAS_NETWORK_ERROR"));
    };

    document.body.appendChild(script);
  });
}

const UPLOAD_TIMEOUT_MS = 60000;
// Code.gs側もbase64Data.length（元ファイルの約4/3倍）で21MBを上限にしているので、
// 元ファイルサイズの目安として同じ基準（約15MB）でここでも早めに弾く。
const MAX_SUBMIT_FILE_SIZE_BYTES = 15 * 1024 * 1024;

/**
 * JSONP（scriptタグのGET）では大きなファイルデータを送れないため、資料提出だけは
 * 隠しiframe宛のフォームPOSTで送る（同一オリジンではないナビゲーション/フォーム送信
 * のため、GMO WorkspaceのCORSブロック対象にならない）。
 * ただし送信先iframeはクロスオリジンなので、レスポンス本文はSame-Origin Policyにより
 * 読めない。ここで分かるのは「送信が完了した（iframeがloadした）」ことだけで、実際に
 * 保存できたかどうかは呼び出し側がgetEmployeeDetailを再取得して確認する必要がある。
 */
function postViaHiddenIframe(baseUrl, fields) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("FORM_UPLOAD_REQUIRES_BROWSER"));
      return;
    }

    const frameName = "__gasUploadFrame_" + Math.random().toString(36).slice(2) + Date.now();
    const iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = baseUrl;
    form.target = frameName;
    form.style.display = "none";

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value == null ? "" : String(value);
      form.appendChild(input);
    });

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("GAS_REQUEST_TIMEOUT"));
    }, UPLOAD_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeoutId);
      if (form.parentNode) form.parentNode.removeChild(form);
      // iframeはonload発火直後に消すとブラウザによっては読み込み自体が
      // キャンセル扱いになることがあるため、少し遅らせて片付ける。
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 0);
    }

    iframe.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    });

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

/** ファイルをbase64文字列に変換する（Data URLのヘッダー部分は取り除く）。 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
    reader.readAsDataURL(file);
  });
}

function getBaseUrl() {
  const url = process.env.NEXT_PUBLIC_GAS_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_GAS_API_URLが設定されていません。Vercelの環境変数を確認してください。"
    );
  }
  return url;
}

/**
 * GASのdoGetを1回呼び出す共通関数。
 * result.ok が false の場合はGAS側のエラーメッセージでthrowする。
 */
async function callGasApi(action, idToken, params = {}) {
  const baseUrl = getBaseUrl();
  const result = await jsonpRequest(baseUrl, { action, idToken: idToken || "", ...params });
  if (!result || result.ok !== true) {
    const message = (result && result.error) || "UNKNOWN_ERROR";
    throw new Error(message);
  }
  return result.data;
}

export const gasApi = {
  /** サインイン確認だけ行う（action未指定でも動くヘルスチェック用途）。 */
  health(baseUrlOverride) {
    return jsonpRequest(baseUrlOverride || getBaseUrl(), {});
  },

  getEmployeeList(idToken) {
    return callGasApi("getEmployeeList", idToken);
  },

  getEmployeeDetail(idToken, targetId) {
    return callGasApi("getEmployeeDetail", idToken, { targetId });
  },

  updateTaskStatus(idToken, targetId, taskId, done, comment = "") {
    return callGasApi("updateTaskStatus", idToken, {
      targetId,
      taskId,
      done: done ? "true" : "false",
      comment,
    });
  },

  updateTrainingProgress(idToken, targetId, courseId, action2, score = 0) {
    return callGasApi("updateTrainingProgress", idToken, {
      targetId,
      courseId,
      action2,
      score: String(score),
    });
  },

  /** 管理者ページ（/admin）用：配属・タスクマスタ・研修コースマスタ・各種セットを一括取得。 */
  getAdminMasterData(idToken) {
    return callGasApi("getAdminMasterData", idToken);
  },

  addMaterial(idToken, taskId, name, url = "") {
    return callGasApi("addMaterial", idToken, { taskId, name, url });
  },

  deleteMaterial(idToken, taskId, index) {
    return callGasApi("deleteMaterial", idToken, { taskId, index: String(index) });
  },

  updatePlacementTaskSet(idToken, placementCode, taskId, included) {
    return callGasApi("updatePlacementTaskSet", idToken, {
      placementCode,
      taskId,
      included: included ? "true" : "false",
    });
  },

  updatePlacementCourseSet(idToken, placementCode, courseId, included) {
    return callGasApi("updatePlacementCourseSet", idToken, {
      placementCode,
      courseId,
      included: included ? "true" : "false",
    });
  },

  addCourseMaterial(idToken, courseId, name, url = "") {
    return callGasApi("addCourseMaterial", idToken, { courseId, name, url });
  },

  deleteCourseMaterial(idToken, courseId, index) {
    return callGasApi("deleteCourseMaterial", idToken, { courseId, index: String(index) });
  },

  /**
   * 研修コースへの資料提出（ドラッグ&ドロップ／ファイル選択でアップロードされた
   * ファイルをGoogleドライブの指定フォルダへ保存する）。
   * JSONP（GET）では送れないため隠しiframeへのフォームPOSTを使う。レスポンス本文は
   * 読めないため、この関数はエラーが起きなければ「送信は完了した」ことまでしか
   * 保証しない。呼び出し側は成功確認のためgetEmployeeDetailを再取得すること。
   */
  async submitCourseMaterial(idToken, targetId, courseId, file) {
    if (!file) throw new Error("FILE_REQUIRED");
    if (file.size > MAX_SUBMIT_FILE_SIZE_BYTES) throw new Error("FILE_TOO_LARGE");

    const fileData = await fileToBase64(file);
    await postViaHiddenIframe(getBaseUrl(), {
      action: "submitCourseMaterial",
      idToken: idToken || "",
      targetId,
      courseId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileData,
    });
  },

  /** メンター面談タブ：回数・報告済み内容・期日・生成済みレポートをまとめて取得する。 */
  getMentorInterviewData(idToken, targetId) {
    return callGasApi("getMentorInterviewData", idToken, { targetId });
  },

  /** メンター面談の報告を1件送信する（回数はサーバー側で自動採番）。 */
  submitMentorInterview(idToken, targetId, conductedAt, content, impression = "") {
    return callGasApi("submitMentorInterview", idToken, {
      targetId,
      conductedAt,
      content,
      impression,
    });
  },

  /** 「AI整形する」ボタン：入力テキストを内容そのままに読みやすい文章へ整形する。 */
  formatMentorInterviewText(idToken, targetId, text) {
    return callGasApi("formatMentorInterviewText", idToken, { targetId, text });
  },

  /** 4回目報告後の分析レポート生成に失敗した場合の手動再試行用。 */
  regenerateMentorInterviewReport(idToken, targetId) {
    return callGasApi("regenerateMentorInterviewReport", idToken, { targetId });
  },
};
