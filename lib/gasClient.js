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
};
