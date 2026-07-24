/**
 * プロフィールヘッダー用の円形プログレスリング（紫グラデーション背景の上に表示）。
 */
export default function ProgressRing({ value = 0, label = "全体進捗" }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="ring-wrap">
      <div>
        <div className="ring-label">{label}</div>
        <div className="ring-sub">{pct}%</div>
      </div>
      <div
        className="ring"
        style={{ background: `conic-gradient(#fff ${pct * 3.6}deg, rgba(255,255,255,.25) 0deg)` }}
      >
        <div className="ring-inner">{pct}%</div>
      </div>
    </div>
  );
}
