export default function ProgressBar({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  let barClass = "progress-fill";
  if (pct >= 100) barClass += " is-complete";
  else if (pct < 40) barClass += " is-behind";

  return (
    <div className="progress-wrap">
      {label ? <div className="progress-label">{label}</div> : null}
      <div className="progress-track">
        <div className={barClass} style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-pct">{pct}%</div>
    </div>
  );
}
