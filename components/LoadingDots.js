/**
 * 読み込み中インジケーター（3点が順番に点滅するアニメーション）。
 * 各ページの「読み込み中…」の代わりに表示する。
 */
export default function LoadingDots() {
  return (
    <div className="loading-dots" role="status" aria-label="読み込み中">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
