/**
 * GoogleのIDトークン（JWT）はサーバー側（GAS）で必ず署名検証してから使うが、
 * フロント側では「表示用」に、ペイロード部分をデコードして
 * 氏名・メールアドレス・アイコン画像を取り出すだけに使う。
 * ここでのデコード結果は権限判定には一切使わないこと（それは必ずGAS側で行う）。
 */
export function decodeJwtPayload(idToken) {
  try {
    const base64Url = idToken.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
