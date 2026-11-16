import { Icon } from '../components/Icon/Icon';
import { t } from '../lang/helpers';

// For a board's own list of rules. An empty list still overrides the global one, so going back
// to the global list means dropping the board's.
export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label={t('Reset to default')} className="clickable-icon" onClick={onClick}>
      <Icon name="lucide-rotate-ccw" />
    </button>
  );
}
