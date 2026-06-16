export function ScaleLockButton({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="scale-legend-lock-button"
      type="button"
      aria-pressed={locked}
      onClick={onToggle}
    >
      <span className="scale-legend-lock-icon" aria-hidden="true" />
      <span>{locked ? 'Unlock scales' : 'Lock scales'}</span>
    </button>
  );
}
